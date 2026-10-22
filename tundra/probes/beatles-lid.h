/* SPDX-License-Identifier: MPL-2.0 */
/* Panel policy belongs to the Nokia adapter, outside the browser sandbox. */
#include "beatles-hall.h"
struct lid_state {
  int inner, outer, opened, outer_on, ready, candidate;
  int keys_brightness;
  double last_poll, closed_at, candidate_at;
};
#ifndef BEATLES_KEYS_BRIGHTNESS
#define BEATLES_KEYS_BRIGHTNESS "/sys/class/leds/button-backlight/brightness"
#endif
static int lid_keys_read(void) {
  FILE *f=fopen(BEATLES_KEYS_BRIGHTNESS,"r");
  if(!f)return -1;
  int value=-1;if(fscanf(f,"%d",&value)!=1)value=-1;
  fclose(f);return value;
}
static void lid_keys_write(int value) {
  if(value<0)return;
  FILE *f=fopen(BEATLES_KEYS_BRIGHTNESS,"w");
  if(!f){perror("keypad brightness");return;}
  if(fprintf(f,"%d\n",value)<0)perror("keypad brightness write");
  if(fclose(f))perror("keypad brightness close");
}
static int lid_read_open(void) {
  FILE *f=fopen("/sys/devices/soc.0/hall_sensor1.73/hall_status","r");
  if(!f)return -1;
  int value=-1;
  if(fscanf(f,"%d",&value)!=1)value=-1;
  fclose(f);return beatles_hall_open(value);
}
static void lid_publish(const struct lid_state *lid) {
  FILE *f=fopen(ROOT "/work/lid-state.tmp","w");
  if(!f)return;
  fchmod(fileno(f),0644);
  fprintf(f,"{\"opened\":%s,\"externalOn\":%s}\n",lid->opened?"true":"false",lid->outer_on?"true":"false");
  fclose(f);rename(ROOT "/work/lid-state.tmp",ROOT "/work/lid-state.json");
}
static void lid_init(struct lid_state *lid,int inner) {
  memset(lid,0,sizeof(*lid));lid->inner=inner;lid->opened=-1;lid->candidate=-1;
  lid->keys_brightness=lid_keys_read();
  lid->outer=open("/dev/graphics/fb1",O_RDWR|O_CLOEXEC);
  unlink(ROOT "/work/cover-ready");unlink(ROOT "/work/lid-state.json");
}
static void lid_apply(struct lid_state *lid,int opened,int ready,double now) {
  if(opened!=0 && opened!=1)return;
  /* Xorg can wake fb0 during initialization after our first closed-lid poll.
   * cover-ready is published after Xorg/keypad startup: reapply the panel
   * selection then, before presenting the first external frame. */
  int changed=opened!=lid->opened || (ready && !lid->ready && !opened);
  if(changed) {
    /* Finish blanking the cover before waking the inner display. */
    if(opened && lid->outer>=0) {
      if(ioctl(lid->outer,FBIOBLANK,FB_BLANK_POWERDOWN)){perror("lid outer blank");return;}
      lid->outer_on=0;
    }
    if(ioctl(lid->inner,FBIOBLANK,opened?FB_BLANK_UNBLANK:FB_BLANK_POWERDOWN)) {
      perror("lid inner blank");return;
    }
    lid_keys_write(opened?lid->keys_brightness:0);
    lid->opened=opened;lid->closed_at=opened?0:now;
    printf("Clamshell: %s; internal screen %s\n",opened?"open":"closed",opened?"on":"off");
  }
  if(ready && !lid->ready && !opened)lid->closed_at=now;
  lid->ready=ready;
  int outer=lid->outer>=0 && !opened && now-lid->closed_at<15 && ready;
  int outer_changed=outer!=lid->outer_on;
  if(outer_changed || (changed && !opened)) {
    if(lid->outer>=0 && ioctl(lid->outer,FBIOBLANK,outer?FB_BLANK_UNBLANK:FB_BLANK_POWERDOWN))perror("lid outer blank");
    else lid->outer_on=outer;
    printf("External screen: %s\n",lid->outer_on?"on":"off");
  }
  if(changed || outer_changed)lid_publish(lid);
}
static void lid_update(struct lid_state *lid,double now) {
  if(now-lid->last_poll<.1)return;
  lid->last_poll=now;
  int opened=lid_read_open();
  if(opened<0)return;
  if(opened!=lid->candidate) {
    lid->candidate=opened;lid->candidate_at=now;return;
  }
  if(now-lid->candidate_at<.15)return;
  lid_apply(lid,opened,!access(ROOT "/work/cover-ready",F_OK),now);
}
static void lid_restore(struct lid_state *lid) {
  if(lid->outer>=0) {ioctl(lid->outer,FBIOBLANK,FB_BLANK_POWERDOWN);close(lid->outer);}
  if(lid->inner>=0 && ioctl(lid->inner,FBIOBLANK,FB_BLANK_UNBLANK))perror("restore internal panel");
  lid_keys_write(lid->keys_brightness);
}
