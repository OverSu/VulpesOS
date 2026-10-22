/* SPDX-License-Identifier: MPL-2.0 */
/* Read-only Android 6 ARM32 HAL enumeration in an isolated bionic process.
 * ABI: AOSP android-6.0.1_r1 hardware/libhardware/include/hardware/
 * hardware.h, sensors.h. No sensor activation or camera device open. */
typedef unsigned int u32;
typedef unsigned short u16;
extern void *dlopen(const char *,int);
extern void *dlsym(void *,const char *);
extern int printf(const char *,...);
extern int putchar(int);
extern int fflush(void *);
extern unsigned alarm(unsigned);
extern void _exit(int) __attribute__((noreturn));
struct module {u32 tag;u16 version,hal;const char *id,*name,*author;void *methods,*dso;u32 reserved[25];};
struct sensor {const char *name,*vendor;int version,handle,type;float range,resolution,power;int min_delay;u32 fifo_reserved,fifo_max;const char *string_type,*permission;int max_delay;u32 flags;void *reserved[2];};
struct sensors {struct module common;int (*list)(struct sensors *,const struct sensor **);};
_Static_assert(sizeof(struct module)==128,"Android 6 ARM32 module ABI");
_Static_assert(sizeof(struct sensor)==68,"Android 6 ARM32 sensor ABI");
static void string(const char *value) {
  putchar('"');
  if(value)for(unsigned i=0;value[i] && i<160;i++) {
    unsigned char c=value[i];
    if(c=='"'||c=='\\')putchar('\\');
    if(c<32)printf("\\u%04x",c);else putchar(c);
  }
  putchar('"');
}
__attribute__((constructor)) static void inventory(void) {
  alarm(8);
  void *library=dlopen("/system/lib/hw/sensors.msm8909.so",2);
  struct sensors *module=library?dlsym(library,"HMI"):0;
  if(!module || !module->list){printf("{\"error\":\"SENSOR_HAL_UNAVAILABLE\"}\n");fflush(0);_exit(1);}
  const struct sensor *list=0;
  int count=module->list(module,&list);
  if(count<0 || count>128 || (count && !list)){printf("{\"error\":\"INVALID_SENSOR_LIST\"}\n");fflush(0);_exit(2);}
  printf("{\"moduleVersion\":%u,\"count\":%d,\"sensors\":[",module->common.version,count);
  for(int i=0;i<count;i++) {
    if(i)putchar(',');
    printf("{\"type\":%d,\"name\":",list[i].type);string(list[i].name);
    printf(",\"vendor\":");string(list[i].vendor);putchar('}');
  }
  printf("]}\n");fflush(0);_exit(0);
}
