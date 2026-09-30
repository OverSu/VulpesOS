/* SPDX-License-Identifier: MPL-2.0
 * Read-only, development-only USB diagnostics over Linux FunctionFS.
 * No shell, block-device access, reboot command or arbitrary file service.
 */
#define _start stage0_start
#include "init.c"
#undef _start
#if defined(__x86_64__)
#define NR_mkdirat 258
#define NR_symlinkat 266
#define NR_getdents64 217
#else
#define NR_mkdirat 34
#define NR_symlinkat 36
#define NR_getdents64 61
#endif
#define G "/sys/kernel/config/usb_gadget/tundra"
typedef unsigned int u32;
static long length(const char *s) { long n=0; while(s[n]) ++n; return n; }
static void pause_ms(long ms) {
  long t[2]={ms/1000,(ms%1000)*1000000}; call(NR_nanosleep,(long)t,0,0,0,0);
}
static void fail(const char *s) {
  say("TUNDRA_USB_FAILED ");say(s);say("\n");
  for (;;) pause_ms(10000);
}
static void directory(const char *p) {
  long r=call(NR_mkdirat,-100,(long)p,0755,0,0);
  if(r<0 && r!=-17) fail(p);
}
static void put(const char *p,const char *value) {
  long fd=call(NR_openat,-100,(long)p,1,0,0);
  if(fd<0) fail(p);
  long n=length(value);
  if(call(NR_write,fd,(long)value,n,0,0)!=n) fail(p);
  call(NR_close,fd,0,0,0,0);
}
static void send(long fd,const char *value) {
  long n=length(value);
  while(n) {
    long r=call(NR_write,fd,(long)value,n,0,0);
    if(r<=0) return;
    n-=r;value+=r;
  }
}
static int equal(const char *a,const char *b) {
  while(*a && *b && *a==*b) {++a;++b;}return *a==*b;
}
static const unsigned char descriptors[]={
  /* v2 header: magic, length, FS+HS+SS flags and descriptor counts */
  3,0,0,0, 105,0,0,0, 7,0,0,0, 3,0,0,0, 3,0,0,0, 5,0,0,0,
  9,4,0,0,2,255,0,0,1, 7,5,0x81,2,64,0,0, 7,5,0x02,2,64,0,0,
  9,4,0,0,2,255,0,0,1, 7,5,0x81,2,0,2,0, 7,5,0x02,2,0,2,0,
  9,4,0,0,2,255,0,0,1,
  7,5,0x81,2,0,4,0, 6,48,0,0,0,0,
  7,5,0x02,2,0,4,0, 6,48,0,0,0,0
};
static const struct __attribute__((packed)) {
  u32 magic,length,count,languages;
  unsigned short language;
  char name[18];
} strings={2,36,1,1,0x0409,"Tundra diagnostic"};
static void bind_udc(void) {
  char data[4096];
  for(int retry=0;retry<300;retry++) {
    long fd=call(NR_openat,-100,(long)"/sys/class/udc",0,0,0);
    if(fd>=0) {
      long n=call(NR_getdents64,fd,(long)data,sizeof(data),0,0);
      call(NR_close,fd,0,0,0,0);
      for(long i=0;i+19<n;) {
        unsigned short size=*(unsigned short *)(data+i+16);
        if(size<20 || i+size>n) break;
        char *name=data+i+19;
        if(name[0]!='.') {put(G "/UDC",name);say("TUNDRA_USB_BOUND ");say(name);say("\n");return;}
        i+=size;
      }
    }
    pause_ms(100);
  }
  fail("no USB device controller");
}
__attribute__((noreturn)) void _start(void) {
  if(call(NR_getpid,0,0,0,0,0)!=1) {
    say("USB diagnostic must be PID 1 in its diagnostic environment.\n");
    call(NR_exit,2,0,0,0,0);for(;;){}
  }
  call(NR_mount,(long)"proc",(long)"/proc",(long)"proc",14,0);
  char buffer[4096];file("/proc/cmdline",buffer,sizeof(buffer));
  if(!contains(buffer,"tundra.usb=1")) fail("explicit kernel flag required");
  call(NR_mount,(long)"sysfs",(long)"/sys",(long)"sysfs",14,0);
  /* Sargo's stock kernel has no devtmpfs. FunctionFS creates its own nodes. */
  if(call(NR_mount,(long)"tmpfs",(long)"/dev",(long)"tmpfs",2,0)<0) fail("dev tmpfs");
  directory("/sys/kernel/config");
  if(call(NR_mount,(long)"configfs",(long)"/sys/kernel/config",(long)"configfs",14,0)<0) fail("configfs");
  directory(G);
  /* Linux development gadget IDs, not an assigned Vulpes product identity. */
  put(G "/idVendor","0x1d6b");put(G "/idProduct","0x0104");
  put(G "/bcdUSB","0x0300");
  directory(G "/strings/0x409");
  put(G "/strings/0x409/manufacturer","Tundra development");
  put(G "/strings/0x409/product","Read-only boot diagnostic");
  put(G "/strings/0x409/serialnumber","TUNDRA-DIAG");
  directory(G "/configs/c.1");put(G "/configs/c.1/MaxPower","250");
  directory(G "/functions/ffs.tundra");directory("/dev/ffs-tundra");
  if(call(NR_mount,(long)"tundra",(long)"/dev/ffs-tundra",(long)"functionfs",0,0)<0) fail("FunctionFS mount");
  long ep0=call(NR_openat,-100,(long)"/dev/ffs-tundra/ep0",2|2048,0,0);
  if(ep0<0 || call(NR_write,ep0,(long)descriptors,sizeof(descriptors),0,0)!=sizeof(descriptors)) fail("descriptors");
  if(call(NR_write,ep0,(long)&strings,sizeof(strings),0,0)!=sizeof(strings)) fail("strings");
  if(call(NR_symlinkat,(long)G "/functions/ffs.tundra",-100,(long)G "/configs/c.1/diagnostic",0,0)<0) fail("function link");
  bind_udc();
  long input=call(NR_openat,-100,(long)"/dev/ffs-tundra/ep2",2048,0,0);
  long output=call(NR_openat,-100,(long)"/dev/ffs-tundra/ep1",1,0,0);
  if(input<0 || output<0) fail("endpoints");
  say("TUNDRA_USB_READY protocol=1 commands=status,version,mounts\n");
  for(;;) {
    /* Drain bind/enable events. Unsupported control requests remain stalled. */
    char events[96];call(NR_read,ep0,(long)events,sizeof(events),0,0);
    long n=call(NR_read,input,(long)buffer,63,0,0);
    if(n>0) {
      buffer[n]=0;
      const char *path=0;
      if(equal(buffer,"status\n")) send(output,"TUNDRA_USB_STATUS protocol=1 readOnly=true\nEND\n");
      else {
        if(equal(buffer,"version\n")) path="/proc/version";
        if(equal(buffer,"mounts\n")) path="/proc/mounts";
        if(path) {file(path,buffer,sizeof(buffer));send(output,buffer);send(output,"\nEND\n");}
        else send(output,"ERROR unsupported command\nEND\n");
      }
    }
    pause_ms(20);
  }
}
