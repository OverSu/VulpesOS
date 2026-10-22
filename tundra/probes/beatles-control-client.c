/* SPDX-License-Identifier: MPL-2.0 */
/* Unprivileged one-request relay. The root broker still validates every command. */
#define _POSIX_C_SOURCE 200809L
#include <errno.h>
#include <signal.h>
#include <stdio.h>
#include <string.h>
#include <sys/socket.h>
#include <sys/un.h>
#include <unistd.h>

#define REQUEST_LIMIT 8192
#define RESPONSE_LIMIT 65536

static int write_all(int fd, const char *data, size_t size) {
  while (size) {
    ssize_t count=write(fd,data,size);
    if (count<0 && errno==EINTR) continue;
    if (count<=0) return -1;
    data+=count;size-=(size_t)count;
  }
  return 0;
}

int main(int argc,char **argv) {
  const char *path;
  if (argc!=2) return 2;
  if (!strcmp(argv[1],"--radio")) path="/work/phone-control.sock";
  else if (!strcmp(argv[1],"--wifi")) path="/work/wifi-control.sock";
  else return 2;
  signal(SIGPIPE,SIG_IGN);
  /* Bound the whole exchange, including a truncated stdin or an unresponsive broker. */
  alarm(40);
  char request[REQUEST_LIMIT+1];size_t used=0;
  for (;;) {
    ssize_t count=read(STDIN_FILENO,request+used,sizeof(request)-used);
    if (count<0 && errno==EINTR) continue;
    if (count<0) return 1;
    if (!count) break;
    used+=(size_t)count;
    if (used>REQUEST_LIMIT) return 2;
  }
  if (!used || memchr(request,'\n',used) || memchr(request,'\r',used)) return 2;
  int fd=socket(AF_UNIX,SOCK_STREAM,0);
  if (fd<0) return 1;
  struct sockaddr_un address={.sun_family=AF_UNIX};
  memcpy(address.sun_path,path,strlen(path)+1);
  if (connect(fd,(struct sockaddr *)&address,sizeof(address)) ||
      write_all(fd,request,used) || write_all(fd,"\n",1)) {close(fd);return 1;}
  char response[RESPONSE_LIMIT+1];used=0;
  for (;;) {
    ssize_t count=read(fd,response+used,sizeof(response)-used);
    if (count<0 && errno==EINTR) continue;
    if (count<=0) {close(fd);return 1;}
    used+=(size_t)count;
    if (used>RESPONSE_LIMIT) {close(fd);return 1;}
    char *end=memchr(response,'\n',used);
    if (end) {
      int result=write_all(STDOUT_FILENO,response,(size_t)(end-response)+1);
      close(fd);return result?1:0;
    }
  }
}
