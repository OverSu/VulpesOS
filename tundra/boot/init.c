/* SPDX-License-Identifier: MPL-2.0
 * Stage-zero diagnostic init. No disks, network or Android framework.
 * Keep this executable independent of libc to use it on both test targets.
 */
#if defined(__x86_64__)
#define NR_write 1
#define NR_read 0
#define NR_close 3
#define NR_openat 257
#define NR_mount 165
#define NR_getpid 39
#define NR_exit 60
#define NR_reboot 169
#define NR_nanosleep 35
static long call(long n, long a, long b, long c, long d, long e) {
  register long r10 __asm__("r10") = d;
  register long r8 __asm__("r8") = e;
  long result;
  __asm__ volatile("syscall" : "=a"(result)
                   : "a"(n), "D"(a), "S"(b), "d"(c), "r"(r10), "r"(r8)
                   : "rcx", "r11", "memory");
  return result;
}
#elif defined(__aarch64__)
#define NR_write 64
#define NR_read 63
#define NR_close 57
#define NR_openat 56
#define NR_mount 40
#define NR_getpid 172
#define NR_exit 93
#define NR_reboot 142
#define NR_nanosleep 101
static long call(long n, long a, long b, long c, long d, long e) {
  register long x8 __asm__("x8") = n;
  register long x0 __asm__("x0") = a;
  register long x1 __asm__("x1") = b;
  register long x2 __asm__("x2") = c;
  register long x3 __asm__("x3") = d;
  register long x4 __asm__("x4") = e;
  __asm__ volatile("svc 0" : "+r"(x0)
                   : "r"(x8), "r"(x1), "r"(x2), "r"(x3), "r"(x4)
                   : "memory");
  return x0;
}
#else
#error Unsupported architecture
#endif

static void say(const char *s) {
  long n = 0;
  while (s[n]) ++n;
  while (n > 0) {
    long written = call(NR_write, 1, (long)s, n, 0, 0);
    if (written <= 0) break;
    s += written;
    n -= written;
  }
}

static int contains(const char *s, const char *needle) {
  for (; *s; ++s) {
    long i = 0;
    while (needle[i] && s[i] == needle[i]) ++i;
    if (!needle[i]) return 1;
  }
  return 0;
}

static void file(const char *path, char *buffer, long capacity) {
  long fd = call(NR_openat, -100, (long)path, 0, 0, 0);
  buffer[0] = 0;
  if (fd < 0) return;
  long n = call(NR_read, fd, (long)buffer, capacity - 1, 0, 0);
  if (n > 0) buffer[n] = 0;
  call(NR_close, fd, 0, 0, 0, 0);
}

__attribute__((noreturn)) void _start(void) {
  if (call(NR_getpid, 0, 0, 0, 0, 0) != 1) {
    say("Tundra init must only run as PID 1 in the diagnostic ramdisk.\n");
    call(NR_exit, 2, 0, 0, 0, 0);
    for (;;) {}
  }
  say("TUNDRA_STAGE0_START\n");
  long proc = call(NR_mount, (long)"proc", (long)"/proc", (long)"proc", 14, 0);
  long sys = call(NR_mount, (long)"sysfs", (long)"/sys", (long)"sysfs", 14, 0);
  char buffer[4096];
  file("/proc/version", buffer, sizeof(buffer));
  say(buffer);
  file("/proc/cmdline", buffer, sizeof(buffer));
  int selftest = contains(buffer, "tundra.selftest=1");
  if (proc == 0 && sys == 0 && buffer[0]) {
    say("TUNDRA_STAGE0_OK pid1 proc sysfs cmdline\n");
  } else {
    say("TUNDRA_STAGE0_FAILED pseudo-filesystems\n");
  }
  say("Diagnostic only: no Gecko, Gaia, HAL, USB service or persistent mounts.\n");
  if (selftest) {
    say("TUNDRA_STAGE0_POWEROFF\n");
    call(NR_reboot, 0xfee1dead, 672274793, 0x4321fedc, 0, 0);
  }
  for (;;) {
    long delay[2] = {15, 0};
    call(NR_nanosleep, (long)delay, 0, 0, 0, 0);
    say("TUNDRA_STAGE0_ALIVE\n");
  }
}
