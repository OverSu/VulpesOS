/* SPDX-License-Identifier: MPL-2.0
 * Read stdin only. Emit offsets and nonzero 64 KiB blocks for a host-side backup.
 * No device is opened or written by this process.
 */
#define _start unused_stage0_start
#include "init.c"
#undef _start
static unsigned long buffer[8192];
static void stop(long code) {
  call(NR_exit, code, 0, 0, 0, 0);
  for (;;) {}
}
static void write_all(const void *data, long length) {
  const char *p = data;
  while (length) {
    long n = call(NR_write, 1, (long)p, length, 0, 0);
    if (n == -4) continue;
    if (n <= 0) stop(3);
    p += n;
    length -= n;
  }
}
__attribute__((noreturn)) void _start(void) {
  unsigned long offset = 0;
  write_all("TUNRAW1\0", 8);
  for (;;) {
    long n = call(NR_read, 0, (long)buffer, sizeof(buffer), 0, 0);
    if (n == -4) continue;
    if (n < 0) stop(2);
    if (!n) break;
    unsigned long bits = 0;
    long i = 0;
    for (; i + 8 <= n; i += 8) bits |= buffer[i / 8];
    for (; i < n; ++i) bits |= ((unsigned char *)buffer)[i];
    if (bits) {
      unsigned long header[2] = {offset, (unsigned long)n};
      write_all(header, sizeof(header));
      write_all(buffer, n);
    }
    offset += n;
  }
  unsigned long end[2] = {offset, 0};
  write_all(end, sizeof(end));
  call(NR_exit, 0, 0, 0, 0, 0);
  for (;;) {}
}
