/* SPDX-License-Identifier: MPL-2.0 */
#include <X11/Xlib.h>
#include <X11/Xutil.h>
#include <stdio.h>
#include <string.h>
#include <time.h>
#include <unistd.h>

int main(void) {
  Display *display=XOpenDisplay(NULL);
  if(!display){fputs("Cannot connect to Xorg\n",stderr);return 1;}
  int screen=DefaultScreen(display);
  Window window=XCreateSimpleWindow(display,RootWindow(display,screen),0,0,240,320,
                                    0,0,0x0010);
  XSetWindowAttributes attributes={.override_redirect=True};
  XChangeWindowAttributes(display,window,CWOverrideRedirect,&attributes);
  XSelectInput(display,window,ExposureMask|KeyPressMask|KeyReleaseMask);
  XMapRaised(display,window); XSetInputFocus(display,window,RevertToParent,CurrentTime);
  GC gc=XCreateGC(display,window,0,NULL);
  char keytext[128]="Press a physical key";
  time_t start=time(NULL);
  int count=0;
  while(time(NULL)-start<25) {
    while(XPending(display)) {
      XEvent event; XNextEvent(display,&event);
      if(event.type==KeyPress||event.type==KeyRelease) {
        KeySym key=XLookupKeysym(&event.xkey,0);
        snprintf(keytext,sizeof(keytext),"%s: %s",event.type==KeyPress?"Down":"Up",
                 XKeysymToString(key)?XKeysymToString(key):"unknown");
        printf("keycode=%u keysym=%lu %s\n",event.xkey.keycode,key,keytext);fflush(stdout);
      }
    }
    XSetForeground(display,gc,0x0010);XFillRectangle(display,window,gc,0,0,240,320);
    XSetForeground(display,gc,0xffff);
    const char *lines[]={"VULPES DISPLAY TEST","Linux / Xorg / ARMv7","240 x 320 / physical keypad",keytext,"KaiOS returns automatically"};
    for(unsigned i=0;i<sizeof(lines)/sizeof(lines[0]);i++)
      XDrawString(display,window,gc,10,35+i*35,lines[i],strlen(lines[i]));
    XSetForeground(display,gc,0x07ff); XFillRectangle(display,window,gc,10+(count++%160),235,50,25);
    XFlush(display);usleep(100000);
  }
  XImage *image=XGetImage(display,window,0,0,240,320,AllPlanes,ZPixmap);
  if(image){FILE *file=fopen("/work/x11-test.ppm","wb");if(file){
    fprintf(file,"P6\n240 320\n255\n");
    for(int y=0;y<320;y++) {
      for(int x=0;x<240;x++) {
        unsigned long pixel=XGetPixel(image,x,y);
        unsigned char rgb[]={((pixel>>11)&31)*255/31,((pixel>>5)&63)*255/63,(pixel&31)*255/31};
        fwrite(rgb,1,3,file);
      }
    }
    fclose(file);
  }
  XDestroyImage(image);}
  XCloseDisplay(display);return 0;
}
