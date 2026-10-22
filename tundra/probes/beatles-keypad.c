/* SPDX-License-Identifier: MPL-2.0 */
#include <X11/Xlib.h>
#include <X11/keysym.h>
#include <X11/XF86keysym.h>
#include <X11/extensions/XTest.h>
#include <errno.h>
#include <fcntl.h>
#include <linux/input.h>
#include <poll.h>
#include <stdio.h>
#include <string.h>
#include <sys/ioctl.h>
#include <unistd.h>
#include "beatles-hall.h"

static int allow_key(unsigned code, int value, int hall) {
  return !value || beatles_hall_open(hall)!=0 ||
    code==KEY_VOLUMEUP || code==KEY_VOLUMEDOWN;
}

static KeySym symbol(unsigned code) {
  if(code>=KEY_1 && code<=KEY_9)return XK_1+code-KEY_1;
  switch(code) {
    case KEY_0:return XK_0;
    case KEY_VOLUMEUP:return XF86XK_AudioRaiseVolume;
    case KEY_VOLUMEDOWN:return XF86XK_AudioLowerVolume;
    case KEY_UP:return XK_Up; case KEY_DOWN:return XK_Down;
    case KEY_LEFT:return XK_Left; case KEY_RIGHT:return XK_Right;
    case KEY_OK:case KEY_ENTER:return XK_Return;
    case KEY_BACK:return XK_Escape; case KEY_BACKSPACE:return XK_BackSpace;
    case KEY_MENU:return XK_Menu; case KEY_SEND:return XK_F1;
    case KEY_POWER:return XK_F4; /* qpnp_pon.kl: ENDCALL */
    case KEY_CAMERA:return XK_F2; /* matrix_keypad.kl: NOTIFICATION */
    case KEY_NUMERIC_STAR:return XK_8;
    case KEY_NUMERIC_POUND:return XK_3;
    default:return NoSymbol;
  }
}
/* Exercise the evdev reader as well as X11. These diagnostic commands are
 * used only while our reader owns the keypad; they do not bypass its mapping. */
static unsigned native_code(const char *key) {
  if(!strcmp(key,"ArrowRight"))return KEY_RIGHT;
  if(!strcmp(key,"ArrowLeft"))return KEY_LEFT;
  if(!strcmp(key,"ArrowUp"))return KEY_UP;
  if(!strcmp(key,"ArrowDown"))return KEY_DOWN;
  if(!strcmp(key,"Enter"))return KEY_OK;
  if(!strcmp(key,"Escape"))return KEY_BACK;
  if(!strcmp(key,"EndCall"))return KEY_POWER;
  if(!strcmp(key,"Notifications"))return KEY_CAMERA;
  if(!strcmp(key,"AudioVolumeUp"))return KEY_VOLUMEUP;
  if(!strcmp(key,"AudioVolumeDown"))return KEY_VOLUMEDOWN;
  if(!strcmp(key,"Backspace"))return KEY_BACKSPACE;
  if(!key[0] || key[1])return 0;
  if(key[0]>='1' && key[0]<='9')return KEY_1+key[0]-'1';
  if(key[0]=='0')return KEY_0;
  if(key[0]=='*')return KEY_NUMERIC_STAR;
  if(key[0]=='#')return KEY_NUMERIC_POUND;
  return 0;
}
static int inject(int fd,unsigned code) {
  struct input_event events[4]={
    {.type=EV_KEY,.code=code,.value=1}, {.type=EV_SYN,.code=SYN_REPORT},
    {.type=EV_KEY,.code=code,.value=0}, {.type=EV_SYN,.code=SYN_REPORT},
  };
  ssize_t written=write(fd,events,sizeof(events));
  if(written!=(ssize_t)sizeof(events)){perror("keypad inject");return 1;}
  return 0;
}
static int inject_keys(const char *keys,int sequence) {
  size_t length=strlen(keys);
  if((sequence && (!length || length>40 || strspn(keys,"0123456789*#")!=length)) ||
     (!sequence && !native_code(keys)))return 2;
  unsigned code=sequence?0:native_code(keys);
  const char *path=code==KEY_VOLUMEUP ? "/dev/input/event3" :
    (code==KEY_POWER || code==KEY_VOLUMEDOWN) ? "/dev/input/event2" : "/dev/input/event0";
  int fd=open(path,O_WRONLY|O_CLOEXEC);
  if(fd<0){perror("keypad injection open");return 2;}
  if(!ioctl(fd,EVIOCGRAB,1)) {
    ioctl(fd,EVIOCGRAB,0);close(fd);
    fputs("Keypad reader must own the device before injection\n",stderr);return 3;
  }
  if(errno!=EBUSY){perror("keypad ownership");close(fd);return 3;}
  int result=0;
  for(size_t i=0;i<(sequence?length:1);i++) {
    char single[2]={keys[i],0};
    if(inject(fd,native_code(sequence?single:keys))){result=1;break;}
    usleep(130000);
  }
  close(fd);return result;
}
int main(int argc,char **argv) {
  if(argc==3 && !strcmp(argv[1],"--inject-key"))return inject_keys(argv[2],0);
  if(argc==3 && !strcmp(argv[1],"--inject-keys"))return inject_keys(argv[2],1);
  Display *display=NULL;
  for(unsigned attempt=0;attempt<100 && !display;attempt++) {
    display=XOpenDisplay(NULL);
    if(!display)usleep(100000);
  }
  if(!display){fputs("Keypad: X server not ready after 10 seconds\n",stderr);return 1;}
  if(argc==3 && !strcmp(argv[1],"--type-keys")) {
    size_t length=strlen(argv[2]);
    if(!length || length>40 || strspn(argv[2],"0123456789*#")!=length)return 2;
    for(size_t i=0;i<length;i++) {
      char key=argv[2][i];int shifted=key=='*'||key=='#';
      KeyCode code=XKeysymToKeycode(display,key=='*'?XK_8:key=='#'?XK_3:XK_0+key-'0');
      if(shifted)XTestFakeKeyEvent(display,XKeysymToKeycode(display,XK_Shift_L),True,CurrentTime);
      XTestFakeKeyEvent(display,code,True,CurrentTime);
      XTestFakeKeyEvent(display,code,False,CurrentTime);
      if(shifted)XTestFakeKeyEvent(display,XKeysymToKeycode(display,XK_Shift_L),False,CurrentTime);
      XFlush(display);usleep(130000);
    }
    XSync(display,False);XCloseDisplay(display);return 0;
  }
  if(argc==3 && !strcmp(argv[1],"--send-key")) {
    KeySym key=!strcmp(argv[2],"ArrowRight")?XK_Right:
      !strcmp(argv[2],"ArrowLeft")?XK_Left:!strcmp(argv[2],"ArrowUp")?XK_Up:
      !strcmp(argv[2],"ArrowDown")?XK_Down:!strcmp(argv[2],"Backspace")?XK_BackSpace:
      !strcmp(argv[2],"Enter")?XK_Return:!strcmp(argv[2],"Escape")?XK_Escape:
      !strcmp(argv[2],"2")?XK_2:NoSymbol;
    if(key==NoSymbol){XCloseDisplay(display);return 2;}
    KeyCode code=XKeysymToKeycode(display,key);
    XTestFakeKeyEvent(display,code,True,CurrentTime);
    XTestFakeKeyEvent(display,code,False,CurrentTime);
    XSync(display,False);XCloseDisplay(display);return 0;
  }
  if(argc==2 && !strcmp(argv[1],"--self-test")) {
    unsigned keys[]={KEY_UP,KEY_OK,KEY_BACK};
    for(unsigned i=0;i<sizeof(keys)/sizeof(keys[0]);i++) {
      KeyCode code=XKeysymToKeycode(display,symbol(keys[i]));
      XTestFakeKeyEvent(display,code,True,CurrentTime);
      XTestFakeKeyEvent(display,code,False,CurrentTime);
    }
    XSync(display,False);XCloseDisplay(display);return 0;
  }
  int fd=open("/dev/input/event0",O_RDONLY|O_NONBLOCK);
  if(fd<0){perror("keypad open");return 2;}
  if(ioctl(fd,EVIOCGRAB,1)){perror("keypad grab");return 3;}
  int power=open("/dev/input/event2",O_RDONLY|O_NONBLOCK);
  char name[80]={0};
  if(power<0 || ioctl(power,EVIOCGNAME(sizeof(name)),name)<0 || strcmp(name,"qpnp_pon") || ioctl(power,EVIOCGRAB,1)) {
    fprintf(stderr,"Nokia end-call input unavailable: %s (name=%s)\n",strerror(errno),name);
    if(power>=0)close(power);
    ioctl(fd,EVIOCGRAB,0);close(fd);XCloseDisplay(display);return 3;
  }
  int side=open("/dev/input/event3",O_RDONLY|O_NONBLOCK);
  memset(name,0,sizeof(name));
  if(side<0 || ioctl(side,EVIOCGNAME(sizeof(name)),name)<0 || strcmp(name,"gpio-keys") || ioctl(side,EVIOCGRAB,1)) {
    fprintf(stderr,"Nokia volume input unavailable: %s (name=%s)\n",strerror(errno),name);
    if(side>=0)close(side);
    ioctl(power,EVIOCGRAB,0);close(power);ioctl(fd,EVIOCGRAB,0);close(fd);XCloseDisplay(display);return 3;
  }
  puts("Nokia keypad bridge ready");fflush(stdout);
  struct pollfd pollers[3]={{.fd=fd,.events=POLLIN},{.fd=power,.events=POLLIN},{.fd=side,.events=POLLIN}};
  for(;;) {
    if(poll(pollers,3,1000)<0)break;
    for(unsigned source=0;source<3;source++) {
    if(!(pollers[source].revents&POLLIN))continue;
    struct input_event event;
    while(read(pollers[source].fd,&event,sizeof(event))==sizeof(event)) {
      if(source==1 && event.code!=KEY_POWER && event.code!=KEY_VOLUMEDOWN)continue;
      if(source==2 && event.code!=KEY_VOLUMEUP && event.code!=KEY_VOLUMEDOWN)continue;
      /* Long holds must not hang up and then immediately dismiss the screen. */
      if((event.code==KEY_POWER || event.code==KEY_VOLUMEUP || event.code==KEY_VOLUMEDOWN) && event.value==2)continue;
      if(event.type!=EV_KEY)continue;
      /* Always release keys, but ignore presses from the closed inner keypad. */
      if(event.value) {
        FILE *hall=fopen("/sys/devices/soc.0/hall_sensor1.73/hall_status","r");
        int opened=-1;
        if(hall){if(fscanf(hall,"%d",&opened)!=1)opened=-1;fclose(hall);}
        if(!allow_key(event.code,event.value,opened))continue;
      }
      KeySym key=symbol(event.code);
      if(key==NoSymbol)continue;
      int shifted=event.code==KEY_NUMERIC_STAR||event.code==KEY_NUMERIC_POUND;
      if(shifted && event.value)XTestFakeKeyEvent(display,XKeysymToKeycode(display,XK_Shift_L),True,CurrentTime);
      XTestFakeKeyEvent(display,XKeysymToKeycode(display,key),event.value!=0,CurrentTime);
      if(shifted && !event.value)XTestFakeKeyEvent(display,XKeysymToKeycode(display,XK_Shift_L),False,CurrentTime);
      XFlush(display);
    }
    }
  }
  ioctl(side,EVIOCGRAB,0);close(side);
  ioctl(power,EVIOCGRAB,0);close(power);
  ioctl(fd,EVIOCGRAB,0);close(fd);XCloseDisplay(display);return 0;
}
