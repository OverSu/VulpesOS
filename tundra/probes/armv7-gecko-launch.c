/* SPDX-License-Identifier: MPL-2.0 */
/* Temporary ARM EABI runtime probe. Private mount namespace; Gecko runs as shell. */
#ifndef ROOT
#define ROOT "/data/local/tmp/vulpes-gecko-armhf/rootfs"
#endif
#ifndef GECKO
#define GECKO "/usr/lib/firefox-esr/firefox-esr"
#endif
static long call(long n, long a, long b, long c, long d, long e) {
  register long r0 __asm__("r0") = a;
  register long r1 __asm__("r1") = b;
  register long r2 __asm__("r2") = c;
  register long r3 __asm__("r3") = d;
  register long r4 __asm__("r4") = e;
  register long r7 __asm__("r7") = n;
  __asm__ volatile("svc 0" : "+r"(r0) : "r"(r1), "r"(r2), "r"(r3), "r"(r4), "r"(r7) : "memory", "cc");
  return r0;
}
static void output(const char *s) {
  long len=0; while(s[len])len++;
  call(4,2,(long)s,len,0,0);
}
static void check(long result, const char *operation) {
  if(result>=0)return;
  output(operation);output(" failed, errno=");
  char buf[16];long i=15;buf[i]=0;result=-result;
  do {buf[--i]='0'+result%10;result/=10;}while(result);
  output(buf+i);output("\n");call(1,1,0,0,0,0);for(;;){}
}
static void device(const char *path, long minor) {
  check(call(14,(long)path,8192|0666,256|minor,0,0),"mknod");
  check(call(15,(long)path,0666,0,0,0),"device permissions");
}
__attribute__((noreturn)) void run(long *stack) {
  long argc=stack[0]; char **argv=(char **)(stack+1);
  int render=argc==2 && argv[1][0]=='r';
  if(argc!=2 || (!render && argv[1][0]!='v')) {
    output("Use version or render\n");call(1,2,0,0,0,0);for(;;){}
  }
  long fd=call(5,(long)"/proc/self/oom_score_adj",1,0,0,0);
  check(fd,"oom_score_adj open");check(call(4,fd,(long)"1000",4,0,0),"oom_score_adj write");call(6,fd,0,0,0,0);
  check(call(337,0x20000|0x40000000,0,0,0,0),"unshare mount and network namespaces");
  check(call(21,0,(long)"/",0,16384|262144,0),"private mount propagation");
  check(call(21,(long)"/proc",(long)ROOT "/proc",0,4096,0),"bind proc");
  /* /data is nodev: character devices need a private tmpfs mount. */
  check(call(21,(long)"tmpfs",(long)ROOT "/dev",(long)"tmpfs",2,(long)"size=1m,mode=0755"),"private devices");
  device(ROOT "/dev/null",3);device(ROOT "/dev/zero",5);
  device(ROOT "/dev/random",8);device(ROOT "/dev/urandom",9);
  check(call(39,(long)ROOT "/dev/shm",01777,0,0,0),"shared memory directory");
  check(call(21,(long)"tmpfs",(long)ROOT "/dev/shm",(long)"tmpfs",2|4,(long)"size=64m,mode=1777"),"private shared memory");
  check(call(61,(long)ROOT,0,0,0,0),"chroot");
  check(call(12,(long)"/",0,0,0,0),"chdir");
  check(call(206,0,0,0,0,0),"drop supplementary groups");
  check(call(214,2000,0,0,0,0),"setgid");
  check(call(213,2000,0,0,0,0),"setuid");
  check(call(172,38,1,0,0,0),"no new privileges");
  char *env[]={"HOME=/work", "TMPDIR=/tmp", "MOZ_HEADLESS=1",
    "MOZ_HEADLESS_WIDTH=240", "MOZ_HEADLESS_HEIGHT=320", "LANG=C",
    "FONTCONFIG_PATH=/etc/fonts", "MOZ_CRASHREPORTER_DISABLE=1",
    "LD_LIBRARY_PATH=/opt/firefox:/usr/lib/firefox-esr:/lib/arm-linux-gnueabihf:/usr/lib/arm-linux-gnueabihf",0};
  char *versionArgs[]={GECKO,"--version",0};
  char *renderArgs[]={GECKO,"--headless","--no-remote",
    "--profile","/work/profile","--window-size","240,320",
    "--screenshot","/work/gecko.png","file:///work/test.html",0};
  output("VULPES ARMv7 Gecko probe: isolated mounts/network, uid=2000\n");
  check(call(11,(long)versionArgs[0],(long)(render?renderArgs:versionArgs),(long)env,0,0),"exec Gecko");
  call(1,1,0,0,0,0);for(;;){}
}
__attribute__((naked,noreturn)) void _start(void) {
  __asm__ volatile("mov r0, sp\nb run");
}
