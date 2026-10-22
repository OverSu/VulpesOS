/* SPDX-License-Identifier: MPL-2.0 */
#define _GNU_SOURCE
#include <dirent.h>
#include <errno.h>
#include <fcntl.h>
#include <grp.h>
#include <linux/fb.h>
#include <linux/videodev2.h>
#include <net/if.h>
#include <sched.h>
#include <signal.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/file.h>
#include <sys/ioctl.h>
#include <sys/mount.h>
#include <sys/mman.h>
#include <sys/prctl.h>
#include <sys/socket.h>
#include <sys/stat.h>
#include <sys/sysmacros.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <time.h>
#include <unistd.h>

#define BASE "/data/local/vulpes-beatles"
#define ROOT BASE "/rootfs"
#include "beatles-lid.h"
static volatile sig_atomic_t interrupted;
static int phone_controls;
static void interrupt(int sig) { interrupted = sig; }
static void inventory_camera_nodes(void) {
  static const int minors[] = {0, 1, 32, 33};
  for (unsigned i = 0; i < sizeof(minors)/sizeof(minors[0]); i++) {
    char path[32];
    snprintf(path, sizeof(path), "/dev/video%d", minors[i]);
    int fd = open(path, O_RDWR | O_NONBLOCK | O_CLOEXEC);
    if (fd < 0) { printf("Camera probe %s: open failed (%d)\n", path, errno); continue; }
    struct v4l2_capability caps = {0};
    if (ioctl(fd, VIDIOC_QUERYCAP, &caps)) {
      printf("Camera probe %s: VIDIOC_QUERYCAP failed (%d)\n", path, errno);
      close(fd); continue;
    }
    uint32_t device_caps = (caps.capabilities & V4L2_CAP_DEVICE_CAPS) ? caps.device_caps : caps.capabilities;
    printf("Camera probe %s: driver=%s card=%s caps=%08x\n", path, caps.driver, caps.card, device_caps);
    for (unsigned type_index = 0; type_index < 2; type_index++) {
      uint32_t type = type_index ? V4L2_BUF_TYPE_VIDEO_CAPTURE_MPLANE : V4L2_BUF_TYPE_VIDEO_CAPTURE;
      if (!(device_caps & (type_index ? V4L2_CAP_VIDEO_CAPTURE_MPLANE : V4L2_CAP_VIDEO_CAPTURE))) continue;
      for (uint32_t index = 0; index < 16; index++) {
        struct v4l2_fmtdesc format = {.index = index, .type = type};
        if (ioctl(fd, VIDIOC_ENUM_FMT, &format)) break;
        printf("Camera probe %s: capture format=%c%c%c%c flags=%08x\n", path,
          format.pixelformat & 0xff, (format.pixelformat >> 8) & 0xff,
          (format.pixelformat >> 16) & 0xff, (format.pixelformat >> 24) & 0xff, format.flags);
      }
    }
    close(fd);
  }
}
static int copy_camera_dump(const char *directory, const char *extension,
                            const char *destination, const char *label) {
  DIR *camera_dir = opendir(directory);
  if (!camera_dir) return 0;
  struct dirent *entry;
  size_t extension_length = strlen(extension);
  int copied = 0;
  while ((entry = readdir(camera_dir))) {
    size_t name_length = strlen(entry->d_name);
    if (name_length <= extension_length ||
        strcmp(entry->d_name + name_length - extension_length, extension)) continue;
    char source[256];
    snprintf(source, sizeof(source), "%s/%s", directory, entry->d_name);
    int in = open(source, O_RDONLY | O_CLOEXEC);
    int out = open(destination, O_CREAT | O_TRUNC | O_WRONLY | O_CLOEXEC, 0644);
    if (in >= 0 && out >= 0) {
      char buffer[65536]; ssize_t bytes;
      while ((bytes = read(in, buffer, sizeof(buffer))) > 0) {
        ssize_t offset = 0;
        while (offset < bytes) {
          ssize_t written = write(out, buffer + offset, (size_t)(bytes - offset));
          if (written <= 0) break;
          offset += written;
        }
        if (offset != bytes) break;
      }
      struct stat copied_stat;
      if (!fstat(out, &copied_stat) && copied_stat.st_size > 0) {
        printf("QCamera captured %s %s (%ld bytes)\n", label, entry->d_name,
               (long)copied_stat.st_size);
        copied = 1;
      }
      fchmod(out, 0644); close(out);
    } else {
      if (out >= 0) close(out);
      if (in >= 0) close(in);
    }
    if (in >= 0) close(in);
    if (copied) break;
  }
  closedir(camera_dir);
  return copied;
}
static void require(int result, const char *what) {
  if (result < 0) { perror(what); _exit(1); }
}
static void node(const char *path, int major, int minor, mode_t mode) {
  require(mknod(path, S_IFCHR | mode, makedev(major, minor)), path);
  require(chmod(path, mode), "chmod device");
}
static int android_service(const char *operation) {
  pid_t child = fork();
  if (!child) { execl(operation, operation, "b2g", NULL); _exit(127); }
  int status;
  return child > 0 && waitpid(child, &status, 0) == child && WIFEXITED(status)
         ? WEXITSTATUS(status) : -1;
}
/* nsIProcess may pass open descriptors from B2G. Keeping a RIL socket alive
 * after stopping B2G prevents the vendor daemon from accepting our reader. */
static int close_inherited(int *sockets) {
  DIR *dir = opendir("/proc/self/fd");
  if (!dir) return -1;
  int count = 0;
  struct dirent *entry;
  while ((entry = readdir(dir))) {
    char *end, path[64], target[128];
    long fd = strtol(entry->d_name, &end, 10);
    if (*end || fd < 3 || fd == dirfd(dir)) continue;
    snprintf(path,sizeof(path),"/proc/self/fd/%ld",fd);
    ssize_t n = readlink(path,target,sizeof(target)-1);
    if (n > 0) {target[n] = 0; if (!strncmp(target,"socket:[",8)) (*sockets)++;}
    if (!close((int)fd)) count++;
  }
  closedir(dir);
  return count;
}
static void clean_runtime(void) {
  DIR *dir = opendir("/proc");
  if (!dir) return;
  struct dirent *entry;
  while ((entry = readdir(dir))) {
    char *end, path[128], target[512];
    long pid = strtol(entry->d_name, &end, 10);
    if (*end || pid <= 1 || pid == getpid()) continue;
    snprintf(path, sizeof(path), "/proc/%ld/root", pid);
    ssize_t n = readlink(path, target, sizeof(target) - 1);
    if (n > 0) {
      target[n] = 0;
      if (!strcmp(target, ROOT)) kill((pid_t)pid, SIGKILL);
    }
  }
  closedir(dir);
}
static void capture_framebuffer(int fd) {
  struct fb_var_screeninfo v;
  struct fb_fix_screeninfo f;
  if (ioctl(fd,FBIOGET_VSCREENINFO,&v) || ioctl(fd,FBIOGET_FSCREENINFO,&f)) return;
  if (v.xres != 240 || v.yres != 320 || v.bits_per_pixel != 16) return;
  size_t length=(size_t)(v.yoffset+v.yres)*f.line_length;
  if (length>f.smem_len || (v.xoffset+v.xres)*2>f.line_length) return;
  unsigned char *pixels=mmap(NULL,length,PROT_READ,MAP_SHARED,fd,0);
  if (pixels==MAP_FAILED) { perror("framebuffer capture mmap");return; }
  FILE *image=fopen(BASE "/framebuffer.ppm","wb");
  if (image) {
    fchmod(fileno(image),0644);fprintf(image,"P6\n%u %u\n255\n",v.xres,v.yres);
    unsigned char row[240*3];
    for (unsigned y=0;y<v.yres;y++) {
      for (unsigned x=0;x<v.xres;x++) {
        uint16_t pixel;
        memcpy(&pixel,pixels+(y+v.yoffset)*f.line_length+(x+v.xoffset)*2,2);
        const struct fb_bitfield channels[]={v.red,v.green,v.blue};
        for (unsigned c=0;c<3;c++) {
          unsigned mask=(1u<<channels[c].length)-1;
          row[x*3+c]=mask?((pixel>>channels[c].offset)&mask)*255/mask:0;
        }
      }
      fwrite(row,1,sizeof(row),image);
    }
    fclose(image);puts("Framebuffer captured after Gaia screenshot");
  }
  munmap(pixels,length);
}
/* Hardware brokers own the vendor sockets; Gecko never receives their mounts. */
static void radio_inside(void) {
  require(setsid(), "radio setsid");
  require(unshare(CLONE_NEWNS), "radio mount namespace");
  require(mount(NULL,"/",NULL,MS_REC | MS_PRIVATE,NULL),"radio private mounts");
  require(mount("tmpfs",ROOT "/dev","tmpfs",MS_NOSUID,"size=1m,mode=0755"),"radio devices");
  node(ROOT "/dev/null",1,3,0666);node(ROOT "/dev/urandom",1,9,0666);
  require(mount("/sys",ROOT "/sys",NULL,MS_BIND,NULL),"radio sys");
  require(mount(NULL,ROOT "/sys",NULL,MS_BIND | MS_REMOUNT | MS_RDONLY,NULL),"radio readonly sys");
  if (mkdir(ROOT "/work/radio-sockets",0700) && errno != EEXIST) _exit(1);
  require(mount("/dev/socket",ROOT "/work/radio-sockets",NULL,MS_BIND,NULL),"radio socket mount");
  if(phone_controls) {
    /* Keep /sys read-only. Expose only these controls to the root broker,
     * never to the browser's separate mount namespace. */
    if(mkdir(ROOT "/work/hardware-controls",0700) && errno!=EEXIST)_exit(1);
    require(chmod(ROOT "/work/hardware-controls",0700),"hardware permissions");
    const char *sources[]={"/sys/class/leds/lcd-backlight/brightness",
      "/sys/class/leds/lcd-backlight/max_brightness","/sys/class/timed_output/vibrator/enable"};
    const char *targets[]={ROOT "/work/hardware-controls/backlight",
      ROOT "/work/hardware-controls/backlight-max",ROOT "/work/hardware-controls/vibrator"};
    for(unsigned i=0;i<3;i++) {
      int control=open(targets[i],O_CREAT|O_WRONLY|O_CLOEXEC,0600);
      require(control,"hardware control file");close(control);
      require(mount(sources[i],targets[i],NULL,MS_BIND,NULL),"hardware control mount");
    }
    if(mkdir(ROOT "/dev/socket",0700) && errno!=EEXIST)_exit(1);
    const char *property_sources[]={"/dev/__properties__","/dev/socket/property_service"};
    const char *property_targets[]={ROOT "/dev/__properties__",ROOT "/dev/socket/property_service"};
    for(unsigned i=0;i<2;i++) {
      int target=open(property_targets[i],O_CREAT|O_WRONLY|O_CLOEXEC,0600);
      require(target,"property endpoint");close(target);
      require(mount(property_sources[i],property_targets[i],NULL,MS_BIND,NULL),"property endpoint mount");
    }
    struct stat binder;
    require(stat("/dev/binder",&binder),"binder device");
    node(ROOT "/dev/binder",major(binder.st_rdev),minor(binder.st_rdev),0600);
    if(mkdir(ROOT "/system",0755) && errno!=EEXIST)_exit(1);
    require(mount("/system",ROOT "/system",NULL,MS_BIND,NULL),"radio system");
    require(mount(NULL,ROOT "/system",NULL,MS_BIND|MS_REMOUNT|MS_RDONLY,NULL),"radio readonly system");
  }
  require(chroot(ROOT),"radio chroot");require(chdir("/"),"radio chdir");
  clearenv();setenv("PATH","/usr/bin:/bin",1);setenv("HOME","/work",1);
  setenv("VULPES_RIL_SOCKET_DIR","/work/radio-sockets",1);
  setenv("LD_LIBRARY_PATH","/usr/lib/arm-linux-gnueabihf:/lib/arm-linux-gnueabihf",1);
  int log=open("/work/radio-status.log",O_CREAT | O_TRUNC | O_WRONLY,0644);
  require(log,"radio log");require(fchmod(log,0644),"radio log mode");dup2(log,1);dup2(log,2);close(log);
  execl("/usr/bin/python3.11","python3.11",phone_controls?"/work/radio_control.py":"/work/radio_status.py",NULL);
  _exit(127);
}
static void inside(int seconds) {
  require(setsid(), "worker setsid");
  require(unshare(CLONE_NEWNS | (phone_controls ? 0 : CLONE_NEWNET)), "unshare");
  require(mount(NULL, "/", NULL, MS_REC | MS_PRIVATE, NULL), "private mounts");
  require(mount("/proc", ROOT "/proc", NULL, MS_BIND, NULL), "bind proc");
  require(mount("/sys", ROOT "/sys", NULL, MS_BIND, NULL), "bind sys");
  require(mount(NULL, ROOT "/sys", NULL, MS_BIND | MS_REMOUNT | MS_RDONLY, NULL), "readonly sys");
  require(mount("tmpfs", ROOT "/dev", "tmpfs", MS_NOSUID, "size=1m,mode=0755"), "devices");
  node(ROOT "/dev/null",1,3,0666); node(ROOT "/dev/zero",1,5,0666);
  node(ROOT "/dev/random",1,8,0666); node(ROOT "/dev/urandom",1,9,0666);
  node(ROOT "/dev/tty",5,0,0600); node(ROOT "/dev/tty0",4,0,0600);
  node(ROOT "/dev/tty1",4,1,0600); node(ROOT "/dev/fb0",29,0,0600);
  node(ROOT "/dev/fb1",29,1,0600);
  require(mkdir(ROOT "/dev/input",0755), "input directory");
  node(ROOT "/dev/input/event0",13,64,0600);
  node(ROOT "/dev/input/event2",13,66,0600);
  node(ROOT "/dev/input/event3",13,67,0600);
  require(mkdir(ROOT "/dev/shm",01777), "shm directory");
  require(mount("tmpfs", ROOT "/dev/shm", "tmpfs", MS_NOSUID | MS_NODEV,
                "size=64m,mode=1777"), "shared memory");
  int sock = socket(AF_INET,SOCK_DGRAM,0);
  require(sock,"loopback socket");
  struct ifreq request = {0}; strcpy(request.ifr_name,"lo");
  request.ifr_flags = IFF_UP | IFF_RUNNING;
  require(ioctl(sock,SIOCSIFFLAGS,&request),"loopback up"); close(sock);
  require(chroot(ROOT),"chroot"); require(chdir("/"),"chdir");
  clearenv(); setenv("PATH","/usr/bin:/bin",1); setenv("HOME","/work",1);
  setenv("VULPES_TRIAL_MANUAL",seconds >= 900 ? "1" : "0",1);
  setenv("VULPES_TUNDRA_RADIO",phone_controls?"1":"0",1);
  setenv("VULPES_TUNDRA_WIFI",phone_controls?"1":"0",1);
  setenv("LANG","C",1); setenv("DISPLAY",":0",1);
  setenv("LD_LIBRARY_PATH","/usr/lib/arm-linux-gnueabihf:/lib/arm-linux-gnueabihf",1);
  execl("/bin/sh","sh","/work/display-test.sh",NULL);
  perror("session script"); _exit(1);
}
int main(int argc, char **argv) {
  if (getuid() || argc != 2) return 2;
  phone_controls=!strcmp(argv[1],"--phone-1800s") || !strcmp(argv[1],"--phone-900s") || !strcmp(argv[1],"--phone-180s");
  int seconds = !strcmp(argv[1],"--temporary-45s") ? 45 :
                !strcmp(argv[1],"--temporary-90s") ? 90 :
                (!strcmp(argv[1],"--temporary-180s") || !strcmp(argv[1],"--phone-180s")) ? 180 :
                (!strcmp(argv[1],"--interactive-900s") || !strcmp(argv[1],"--phone-900s")) ? 900 :
                (!strcmp(argv[1],"--interactive-1800s") || !strcmp(argv[1],"--phone-1800s")) ? 1800 : 0;
  if (!seconds) return 2;
  int inherited_sockets = 0;
  int inherited = close_inherited(&inherited_sockets);
  if (inherited < 0) return 6;
  int lock = open(BASE "/session.lock",O_CREAT | O_RDWR,0600);
  if (lock < 0 || flock(lock,LOCK_EX | LOCK_NB)) return 3;
  int fb = open("/dev/graphics/fb0",O_RDWR | O_CLOEXEC);
  struct fb_var_screeninfo original;
  if (fb < 0 || ioctl(fb,FBIOGET_VSCREENINFO,&original)) return 4;
  pid_t detached = fork();
  if (detached < 0) return 5;
  if (detached) return 0;
  require(setsid(),"watchdog setsid");
  const char *groups[] = {"/acct/cgroup.procs", "/dev/cpuctl/tasks"};
  char pidtext[32]; int length=snprintf(pidtext,sizeof(pidtext),"%d",getpid());
  for(unsigned i=0;i<sizeof(groups)/sizeof(groups[0]);i++) {
    int group=open(groups[i],O_WRONLY);
    require(group,"watchdog cgroup");
    require(write(group,pidtext,length),"detach watchdog cgroup"); close(group);
  }
  signal(SIGTERM,interrupt); signal(SIGINT,interrupt); signal(SIGHUP,SIG_IGN);
  int log = open(BASE "/display-session.log",O_CREAT | O_TRUNC | O_WRONLY,0644);
  require(log,"log"); fchmod(log,0644); dup2(log,1); dup2(log,2); close(log);
  setvbuf(stdout,NULL,_IONBF,0); setvbuf(stderr,NULL,_IONBF,0);
  printf("Closed inherited descriptors: %d, sockets: %d\n",inherited,inherited_sockets);
  inventory_camera_nodes();
  printf("Temporary display session: automatic KaiOS return in %d seconds\n",seconds);
  unlink(BASE "/stop-session");
  unlink(BASE "/framebuffer.ppm");
  unlink(ROOT "/work/gaia-native.png");
  unlink(ROOT "/work/gaia-audit.json");
  /* Camera output is also stored in the RAM-backed Gaia root. Never let a
   * previous run's image be mistaken for a frame from this session. */
  unlink(ROOT "/work/camera-frame.yuv");
  unlink(ROOT "/work/camera-photo.jpg");
  sleep(2);
  if (!access(BASE "/camera-probe-once", F_OK)) {
    unlink(BASE "/camera-probe-once");
    pid_t probe = fork();
    if (!probe) { execl("/data/local/tmp/vulpes-camera-stream", "vulpes-camera-stream", NULL); _exit(127); }
    if (probe > 0) {
      int probe_status = 0, finished = 0;
      for (int attempt = 0; attempt < 100; attempt++) {
        if (waitpid(probe, &probe_status, WNOHANG) == probe) { finished = 1; break; }
        usleep(100000);
      }
      if (!finished) { kill(probe, SIGKILL); waitpid(probe, &probe_status, 0); puts("camera probe timed out after 10 seconds"); }
      else printf("camera probe exit: %d\n", WIFEXITED(probe_status) ? WEXITSTATUS(probe_status) : -1);
    }
  }
  int result = android_service("/system/bin/stop");
  printf("stop b2g: %d\n",result);
  pid_t child = -1, radio = -1;
  struct lid_state lid;lid_init(&lid,fb);
  if (!result) {
    sleep(1);
    puts("Camera node inventory after stopping B2G");
    inventory_camera_nodes();
    int preview_dump_probe = !access(BASE "/qcamera-preview-dump-once", F_OK);
    if (!access(BASE "/qcamera-probe-once", F_OK) || preview_dump_probe) {
      unlink(BASE "/qcamera-probe-once");
      unlink(BASE "/qcamera-preview-dump-once");
      const char *dump_path = "/data/misc/camera";
      if (mkdir("/data/misc", 0755) && errno != EEXIST) perror("camera misc directory");
      if (mkdir(dump_path, 0770) && errno != EEXIST) perror("camera dump directory");
      char snapshot_dir[256];
      snprintf(snapshot_dir, sizeof(snapshot_dir), "%s/test", dump_path);
      if (mount("tmpfs", dump_path, "tmpfs", MS_NOSUID, "size=24m,mode=0770,uid=1006,gid=1006")) perror("camera dump tmpfs");
      else {
        puts("QCamera snapshot output uses bounded volatile storage");
        if (mkdir(snapshot_dir, 0770) && errno != EEXIST) perror("camera snapshot directory");
        if (chown(snapshot_dir, 1006, 1006)) perror("camera snapshot ownership");
      }
      pid_t prop = fork();
      if (!prop) { execl("/system/bin/setprop", "setprop", "persist.camera.dumpimg", "1", NULL); _exit(127); }
      if (prop > 0) waitpid(prop, NULL, 0);
      int input[2];
      if (pipe(input) == 0) {
        pid_t probe = fork();
        if (!probe) {
          close(input[1]);
          dup2(input[0], STDIN_FILENO);
          close(input[0]);
          int output = open(BASE "/qcamera-probe.log", O_CREAT | O_TRUNC | O_WRONLY, 0644);
          if (output >= 0) { fchmod(output, 0644); dup2(output, STDOUT_FILENO); dup2(output, STDERR_FILENO); close(output); }
          gid_t groups[] = {1006};
          if (setgroups(1, groups) || setgid(1006) || setuid(1006)) _exit(126);
          const char *qcamera = preview_dump_probe ? BASE "/qcamera-preview-dump" : "/system/bin/mm-qcamera-app";
          execl(qcamera, qcamera, NULL);
          _exit(127);
        }
        close(input[0]);
        if (probe > 0) {
          const char *camera_input = preview_dump_probe ? "0\nA\n" : "0\na\nA\n";
          (void)write(input[1], camera_input, strlen(camera_input));
          /* Give the sensor's auto-exposure and white balance time to settle. */
          sleep(10);
          (void)write(input[1], "P\n", 2);
          sleep(12);
          (void)write(input[1], "B\nZ\n", 4);
          close(input[1]);
          int probe_status = 0, finished = 0;
          for (int attempt = 0; attempt < 250; attempt++) {
            if (waitpid(probe, &probe_status, WNOHANG) == probe) { finished = 1; break; }
            usleep(100000);
          }
          if (!finished) { kill(probe, SIGKILL); waitpid(probe, &probe_status, 0); puts("QCamera menu probe timed out"); }
          else printf("QCamera menu exit: %d\n", WIFEXITED(probe_status) ? WEXITSTATUS(probe_status) : -1);
        } else close(input[1]);
      } else perror("QCamera probe pipe");
      int frame_copied = copy_camera_dump(dump_path, ".yuv", ROOT "/work/camera-frame.yuv", "YUV frame");
      if (!frame_copied) frame_copied = copy_camera_dump(snapshot_dir, ".yuv", ROOT "/work/camera-frame.yuv", "snapshot YUV");
      int jpeg_copied = copy_camera_dump(snapshot_dir, ".jpg", ROOT "/work/camera-photo.jpg", "JPEG photo");
      if (!frame_copied && !jpeg_copied) puts("QCamera acquired preview buffers but did not export a frame or photo");
      prop = fork();
      if (!prop) { execl("/system/bin/setprop", "setprop", "persist.camera.dumpimg", "0", NULL); _exit(127); }
      if (prop > 0) waitpid(prop, NULL, 0);
      if (!umount(dump_path)) rmdir(dump_path);
    }
    if (seconds >= 180) {
      radio = fork();
      if (!radio) radio_inside();
    }
    child = fork();
    if (!child) inside(seconds);
    struct timespec begin, now;
    clock_gettime(CLOCK_MONOTONIC,&begin);
    int frames=0,captured=0;
    double sample_start=begin.tv_sec+begin.tv_nsec/1e9,pan_seconds=0;
    int sample_frames=0,pan_attempts=0;
    for (int tick=0; child > 0 && !interrupted; tick++) {
      clock_gettime(CLOCK_MONOTONIC,&now);
      if (now.tv_sec-begin.tv_sec >= seconds) break;
      int status;
      if (waitpid(child,&status,WNOHANG)==child) {
        printf("session ended: %d\n",status); break;
      }
      if (!access(BASE "/stop-session",F_OK)) break;
      if (!captured && !access(ROOT "/work/gaia-native.png",F_OK)) {
        capture_framebuffer(fb);captured=1;
      }
      if(seconds>=180)lid_update(&lid,now.tv_sec+now.tv_nsec/1e9);
      struct fb_var_screeninfo current;
      if (lid.opened != 0 && !ioctl(fb,FBIOGET_VSCREENINFO,&current)) {
        struct timespec pan_start,pan_end;
        clock_gettime(CLOCK_MONOTONIC,&pan_start);
        int pan=ioctl(fb,FBIOPAN_DISPLAY,&current);
        clock_gettime(CLOCK_MONOTONIC,&pan_end);
        pan_seconds+=pan_end.tv_sec-pan_start.tv_sec+(pan_end.tv_nsec-pan_start.tv_nsec)/1e9;
        pan_attempts++;
        if (pan && tick==20) perror("display refresh");
        if (!pan) {frames++;sample_frames++;}
      }
      double sample_now=now.tv_sec+now.tv_nsec/1e9;
      if(sample_now-sample_start>=10) {
        printf("Display sample: submissions/s=%.2f pan_ms=%.2f failed=%d lid=%d\n",
               sample_frames/(sample_now-sample_start),pan_attempts?1000*pan_seconds/pan_attempts:0,
               pan_attempts-sample_frames,lid.opened);
        sample_start=sample_now;pan_seconds=0;sample_frames=0;pan_attempts=0;
      }
      usleep(lid.opened==0?20000:5000);
    }
    clock_gettime(CLOCK_MONOTONIC,&now);
    printf("Framebuffer submissions: %d in %.2f seconds\n",frames,
           now.tv_sec-begin.tv_sec+(now.tv_nsec-begin.tv_nsec)/1e9);
  }
  if (child > 0) { kill(-child,SIGTERM); sleep(1); kill(-child,SIGKILL); }
  if (radio > 0) {
    kill(-radio,SIGTERM);
    // Allow both modem slots to restore before returning to KaiOS.
    for(int i=0;i<600;i++) {
      if(waitpid(radio,NULL,WNOHANG)==radio) { radio=-1;break; }
      usleep(100000);
    }
    if(radio>0) {kill(-radio,SIGKILL);waitpid(radio,NULL,0);}
  }
  clean_runtime();
  lid_restore(&lid);
  if (ioctl(fb,FBIOPUT_VSCREENINFO,&original)) perror("restore framebuffer mode");
  if (ioctl(fb,FBIOPAN_DISPLAY,&original)) perror("restore framebuffer pan");
  close(fb);
  unlink("/data/local/debugger-socket");
  printf("start b2g: %d\n",android_service("/system/bin/start"));
  int done=open(BASE "/display-session.done",O_CREAT | O_TRUNC | O_WRONLY,0644);
  if(done>=0){fchmod(done,0644);write(done,"restored\n",9);close(done);}
  return 0;
}
