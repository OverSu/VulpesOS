/* SPDX-License-Identifier: MPL-2.0 */
#include <assert.h>
#include <fcntl.h>
#include <linux/fb.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <unistd.h>
#define ROOT "/nonexistent-vulpes-lid-test"
static char keys_path[]="/tmp/vulpes-lid-keys-XXXXXX";
#define BEATLES_KEYS_BRIGHTNESS keys_path
static int last_panel=-1;
static int inner=-1,outer=-1,fail_inner=0;
static int panel_ioctl(int fd,unsigned long request,int value) {
  assert(request==FBIOBLANK);
  last_panel=fd;
  if(fd==10){if(fail_inner)return -1;inner=value;}
  else {assert(fd==11);outer=value;}
  return 0;
}
#define ioctl panel_ioctl
#include "../probes/beatles-lid.h"
int main(void) {
  assert(beatles_hall_open(0)==1);
  assert(beatles_hall_open(1)==0);
  assert(beatles_hall_open(-1)==-1);
  assert(beatles_hall_open(2)==-1);
  int fixture=mkstemp(keys_path);assert(fixture>=0);close(fixture);
  lid_keys_write(40);assert(lid_keys_read()==40);
  struct lid_state lid={.inner=10,.outer=11,.opened=-1,.keys_brightness=40};
  lid_apply(&lid,1,1,100);assert(inner==FB_BLANK_UNBLANK && outer==FB_BLANK_POWERDOWN);
  lid_apply(&lid,0,1,101);assert(inner==FB_BLANK_POWERDOWN && outer==FB_BLANK_UNBLANK);
  assert(lid_keys_read()==0);
  lid_apply(&lid,0,1,117);assert(outer==FB_BLANK_POWERDOWN);
  lid_apply(&lid,-1,1,118);assert(inner==FB_BLANK_POWERDOWN);
  lid_apply(&lid,1,1,119);assert(inner==FB_BLANK_UNBLANK && outer==FB_BLANK_POWERDOWN);
  assert(last_panel==10 && lid_keys_read()==40);
  fail_inner=1;lid_apply(&lid,0,1,120);assert(lid.opened==1 && !lid.outer_on);
  fail_inner=0;lid_apply(&lid,0,0,121);assert(!lid.outer_on);
  lid_apply(&lid,0,1,150);assert(lid.outer_on); /* late renderer still gets 15s */
  lid_apply(&lid,0,1,166);assert(!lid.outer_on);
  struct lid_state closed={.inner=10,.outer=11,.opened=-1,.keys_brightness=40};
  lid_apply(&closed,0,0,200);
  assert(inner==FB_BLANK_POWERDOWN && !closed.outer_on && lid_keys_read()==0);
  /* Xorg unblanks fb0 while initializing, without a physical lid transition. */
  inner=FB_BLANK_UNBLANK;
  lid_apply(&closed,0,0,205);
  lid_apply(&closed,0,1,220);
  assert(inner==FB_BLANK_POWERDOWN && closed.outer_on && lid_keys_read()==0);
  lid_apply(&closed,0,1,234);assert(closed.outer_on);
  lid_apply(&closed,0,1,235);assert(!closed.outer_on);
  lid.outer=-1;lid_apply(&lid,1,1,170);lid_apply(&lid,0,1,171);assert(!lid.outer_on);
  lid_restore(&lid);assert(lid_keys_read()==40);unlink(keys_path);
  puts("Clamshell panel transitions and keypad backlight: OK");return 0;
}
