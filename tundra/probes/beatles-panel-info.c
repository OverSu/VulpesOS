/* SPDX-License-Identifier: MPL-2.0 */
#include <fcntl.h>
#include <linux/fb.h>
#include <linux/input.h>
#include <stdio.h>
#include <sys/ioctl.h>
#include <sys/stat.h>
#include <unistd.h>
int main(void) {
  FILE *out=fopen("/data/local/tmp/vulpes-panel-info.json","w");
  if(!out)return 1;
  fchmod(fileno(out),0644);
  fprintf(out,"{\"panels\":[");
  for(int i=0;i<2;i++) {
    char path[64];snprintf(path,sizeof(path),"/dev/graphics/fb%d",i);
    int fd=open(path,O_RDONLY);struct fb_var_screeninfo v;struct fb_fix_screeninfo f;
    if(fd<0 || ioctl(fd,FBIOGET_VSCREENINFO,&v) || ioctl(fd,FBIOGET_FSCREENINFO,&f))return 2;
    fprintf(out,"%s{\"width\":%u,\"height\":%u,\"virtualHeight\":%u,\"bpp\":%u,\"stride\":%u,\"bytes\":%u}",i?",":"",v.xres,v.yres,v.yres_virtual,v.bits_per_pixel,f.line_length,f.smem_len);
    close(fd);
  }
  unsigned char keys[(KEY_MAX+8)/8]={0};int fd=open("/dev/input/event1",O_RDONLY);
  if(fd<0 || ioctl(fd,EVIOCGKEY(sizeof(keys)),keys)<0)return 3;
  fprintf(out,"],\"hallKey249\":%s}\n",(keys[249/8]&(1<<(249%8)))?"true":"false");
  close(fd);fclose(out);return 0;
}
