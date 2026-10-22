/* SPDX-License-Identifier: MPL-2.0 */
/* Linux EABI smoke test: no libc, filesystem writes, or privileged operations. */
static long syscall3(long number, long a, long b, long c) {
  register long r0 __asm__("r0") = a;
  register long r1 __asm__("r1") = b;
  register long r2 __asm__("r2") = c;
  register long r7 __asm__("r7") = number;
  __asm__ volatile("svc 0" : "+r"(r0) : "r"(r1), "r"(r2), "r"(r7) : "memory", "cc");
  return r0;
}

static void print(const char *text) {
  long length = 0;
  while (text[length]) ++length;
  while (length > 0) {
    long count = syscall3(4, 1, (long)text, length);
    if (count <= 0) return;
    text += count;
    length -= count;
  }
}

static void number(unsigned long value) {
  char buffer[16];
  int end = 15;
  buffer[end] = 0;
  do {
    buffer[--end] = '0' + value % 10;
    value /= 10;
  } while (value);
  print(buffer + end);
}

__attribute__((noreturn)) void _start(void) {
  struct { char system[65], node[65], release[65], version[65], machine[65], domain[65]; } uts;
  long status = syscall3(122, (long)&uts, 0, 0);
  print("VULPES_ARMV7_PROBE=1\n");
  print("This is a native diagnostic, not Gecko or a replacement OS.\nuid=");
  number((unsigned long)syscall3(24, 0, 0, 0));
  print("\n");
  if (status == 0) {
    print("kernel="); print(uts.release);
    print("\narchitecture="); print(uts.machine); print("\n");
  }
  print(status == 0 ? "result=PASS\n" : "result=FAIL\n");
  syscall3(1, status == 0 ? 0 : 1, 0, 0);
  for (;;) {}
}
