/* SPDX-License-Identifier: MPL-2.0
 * Temporary boot deadline. No files are needed after exec, including across
 * switch_root. Only started as root by the explicit development initramfs.
 */
#define _start unused_stage0_start
#include "init.c"
#undef _start
__attribute__((noreturn)) void _start(void) {
  long remaining[2] = {600, 0};
  while (call(NR_nanosleep, (long)remaining, (long)remaining, 0, 0, 0) == -4) {}
  say("TUNDRA_TRIAL_DEADLINE_REBOOT\n");
  call(NR_reboot, 0xfee1dead, 672274793, 0x01234567, 0, 0);
  for (;;) {long t[2]={1,0};call(NR_nanosleep,(long)t,0,0,0,0);}
}
