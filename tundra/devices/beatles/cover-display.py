#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Small, independent Fira clock for the Nokia's RGB565 SPI cover panel."""
import ctypes as C
import bisect
import datetime
import fcntl
import json
import mmap
import re
from pathlib import Path
import signal
import struct
import time


def read_json(path):
    try:
        value=json.loads(Path(path).read_text())
        return value if isinstance(value,dict) else {}
    except (OSError,ValueError):return {}


SETTINGS=Path('/work/gaia-profile/vulpes-settings-v1.json')


class Animation:
    """Opt-in private test; decode happens on the PC, not in the phone loop."""
    FRAME_BYTES=240*240*2
    def __init__(self,path):
        self.file=Path(path).open('rb');self.data=None
        try:
            size=self.file.seek(0,2)
            if not 12<=size<=12+240*(4+self.FRAME_BYTES):raise ValueError('Animation size')
            self.data=mmap.mmap(self.file.fileno(),0,access=mmap.ACCESS_READ)
            magic,count=struct.unpack_from('<8sI',self.data)
            if magic!=b'VULPANM1' or not 1<=count<=240 or size!=12+count*(4+self.FRAME_BYTES):
                raise ValueError('Animation header')
            self.ends=[];self.offsets=[];total=0
            for index in range(count):
                offset=12+index*(4+self.FRAME_BYTES)
                duration,=struct.unpack_from('<I',self.data,offset)
                if not 50<=duration<=1000:raise ValueError('Animation timing')
                total+=duration;self.ends.append(total);self.offsets.append(offset+4)
        except Exception:
            self.close();raise

    def frame(self,elapsed,stride):
        phase=int(elapsed*1000)%self.ends[-1]
        index=bisect.bisect_right(self.ends,phase);offset=self.offsets[index]
        raw=self.data[offset:offset+self.FRAME_BYTES]
        if stride!=480:
            raw=b''.join(raw[y*480:(y+1)*480]+bytes(stride-480) for y in range(240))
        return raw,(self.ends[index]-phase)/1000,index

    def close(self):
        if self.data is not None:self.data.close()
        self.file.close()


def preferences(values):
    title=values.get('vulpes.cover.title','VULPES')
    title=''.join(c for c in title if c.isprintable()).strip()[:24] if isinstance(title,str) else ''
    def color(key):
        value=values.get(key,'#33a6ff')
        if not isinstance(value,str) or not re.fullmatch(r'#[0-9a-fA-F]{6}',value):value='#33a6ff'
        return tuple(int(value[i:i+2],16)/255 for i in (1,3,5))
    return title or 'VULPES',color('vulpes.cover.titleColor'),color('vulpes.cover.batteryColor')


def labels(state,now):
    if abs(now-state.get('recordedAt',0))>20:return ('—','—')
    battery=state.get('battery') or {}
    level=battery.get('level')
    percent=str(round(level*100))+' %' if isinstance(level,(int,float)) and 0<=level<=1 else '—'
    radios=state.get('radio') or []
    network=next((r.get('operator',{}).get('longName','') for r in radios if r.get('available')), '')
    return percent,network[:24] or '—'


def present(panel, variable):
    # The display driver may reject a pan during a panel power transition.
    # Record the failure and retry later; keep Gaia and the keypad running.
    try:
        fcntl.ioctl(panel,0x4606,variable,True)
        return {'ok':True}
    except OSError as error:
        return {'ok':False,'errno':error.errno}


class Drawing:
    def __init__(self,width,height,stride,font_path='/opt/vulpes/gaia/shared/elements/vulpes-fonts/FiraSans-Regular.otf'):
        self.c=C.CDLL('libcairo.so.2');self.ft=C.CDLL('libfreetype.so.6')
        p=C.c_void_p; i=C.c_int; d=C.c_double
        signatures={
            'cairo_image_surface_create_for_data':(p,[p,i,i,i,i]),
            'cairo_create':(p,[p]), 'cairo_destroy':(None,[p]),
            'cairo_surface_destroy':(None,[p]), 'cairo_surface_flush':(None,[p]),
            'cairo_surface_write_to_png':(i,[p,C.c_char_p]),
            'cairo_set_source_rgb':(None,[p,d,d,d]), 'cairo_paint':(None,[p]),
            'cairo_rectangle':(None,[p,d,d,d,d]), 'cairo_fill':(None,[p]),
            'cairo_move_to':(None,[p,d,d]), 'cairo_set_font_size':(None,[p,d]),
            'cairo_show_text':(None,[p,C.c_char_p]), 'cairo_text_extents':(None,[p,C.c_char_p,p]),
            'cairo_ft_font_face_create_for_ft_face':(p,[p,i]),
            'cairo_set_font_face':(None,[p,p]),'cairo_font_face_destroy':(None,[p]),
            'cairo_status':(i,[p]),
        }
        for name,(result,args) in signatures.items():
            fn=getattr(self.c,name);fn.restype=result;fn.argtypes=args
        self.ft.FT_Init_FreeType.argtypes=[C.POINTER(p)]
        self.ft.FT_New_Face.argtypes=[p,C.c_char_p,C.c_long,C.POINTER(p)]
        self.ft.FT_Done_Face.argtypes=[p];self.ft.FT_Done_FreeType.argtypes=[p]
        self.library=p();self.face=p()
        if self.ft.FT_Init_FreeType(C.byref(self.library)):raise RuntimeError('FreeType initialization')
        font=str(font_path).encode()
        if self.ft.FT_New_Face(self.library,font,0,C.byref(self.face)):raise RuntimeError('Gaia Fira font unavailable')
        self.buffer=C.create_string_buffer(stride*height)
        self.surface=self.c.cairo_image_surface_create_for_data(self.buffer,4,width,height,stride)
        self.context=self.c.cairo_create(self.surface)
        self.font=self.c.cairo_ft_font_face_create_for_ft_face(self.face,0)
        self.c.cairo_set_font_face(self.context,self.font)
        if self.c.cairo_status(self.context):raise RuntimeError('Cairo RGB565 context unavailable')

    def text(self,text,size,y,color=(.92,.96,1)):
        c=self.c;ctx=self.context;encoded=text.encode()
        c.cairo_set_font_size(ctx,size)
        extents=(C.c_double*6)();c.cairo_text_extents(ctx,encoded,extents)
        # Fit custom titles without cropping wide letters or accented text.
        if extents[2]>216:
            c.cairo_set_font_size(ctx,size*216/extents[2])
            c.cairo_text_extents(ctx,encoded,extents)
        c.cairo_set_source_rgb(ctx,*color)
        c.cairo_move_to(ctx,120-extents[2]/2-extents[0],y)
        c.cairo_show_text(ctx,encoded)

    def render(self,state):
        c=self.c;ctx=self.context;now=datetime.datetime.now()
        c.cairo_set_source_rgb(ctx,.015,.025,.045);c.cairo_paint(ctx)
        title,title_color,battery_color=preferences(read_json(SETTINGS))
        self.text(title,14,30,title_color)
        self.text(now.strftime('%H:%M'),56,110)
        self.text(now.strftime('%d / %m / %Y'),16,143,(.6,.7,.8))
        battery,network=labels(state,time.time())
        self.text(network,15,185)
        self.text(battery,17,218,battery_color)
        c.cairo_surface_flush(self.surface)
        if c.cairo_status(ctx):raise RuntimeError('Cover rendering failed')
        return self.buffer.raw

    def close(self):
        self.c.cairo_destroy(self.context);self.c.cairo_surface_destroy(self.surface)
        self.c.cairo_font_face_destroy(self.font);self.ft.FT_Done_Face(self.face)
        self.ft.FT_Done_FreeType(self.library)


def main():
    if C.sizeof(C.c_void_p)!=4:raise RuntimeError('Nokia ARM32 framebuffer layout required')
    running=True
    def stop(*_):
        nonlocal running
        running=False
    signal.signal(signal.SIGTERM,stop);signal.signal(signal.SIGINT,stop)
    with open('/dev/fb1','r+b',buffering=0) as panel:
        variable=bytearray(160);fixed=bytearray(68)
        fcntl.ioctl(panel,0x4600,variable,True);fcntl.ioctl(panel,0x4602,fixed,True)
        v=struct.unpack('=40I',variable);stride=struct.unpack_from('=I',fixed,44)[0]
        length=struct.unpack_from('=I',fixed,20)[0]
        if (v[0:2]!=(240,240) or v[6]!=16 or v[8:10]!=(11,5) or
            v[11:13]!=(5,6) or v[14:16]!=(0,5) or v[4]!=0):
            raise RuntimeError('Unsupported external panel format: '+repr(v[:17]))
        offset=v[5]*stride;size=240*stride
        if stride<480 or offset+size>length:raise RuntimeError('Framebuffer bounds invalid')
        with mmap.mmap(panel.fileno(),length) as pixels:
            original=pixels[offset:offset+size];drawing=Drawing(240,240,stride)
            animation=None
            try:animation=Animation('/work/cover-animation.rgb565')
            except (OSError,ValueError) as error:
                if not isinstance(error,FileNotFoundError):print('Cover animation unavailable:',type(error).__name__,flush=True)
            try:
                pixels[offset:offset+size]=drawing.render(read_json('/run/tundra-hardware/status.json'))
                drawing.c.cairo_surface_write_to_png(drawing.surface,b'/work/cover-preview.png')
                Path('/work/cover-ready').write_text('ready\n')
                print('Cover ready: 240x240 RGB565, Gaia Fira Sans',flush=True)
                last=0;was_on=False;last_error=None;animation_start=None;submitted=0;failed=0;pan_seconds=0
                while running:
                    on=read_json('/work/lid-state.json').get('externalOn') is True
                    now=time.monotonic()
                    if on and not was_on and animation:
                        animation_start=now;submitted=0;failed=0;pan_seconds=0
                    if on and animation_start is not None:
                        elapsed=now-animation_start
                        if elapsed<8:
                            frame,delay,_=animation.frame(elapsed,stride)
                            pixels[offset:offset+size]=frame
                            before=time.monotonic();result=present(panel,variable)
                            pan_seconds+=time.monotonic()-before
                            if result['ok']:submitted+=1
                            else:failed+=1
                            was_on=on;last=0
                            time.sleep(max(.005,delay-(time.monotonic()-now)))
                            continue
                        Path('/work/cover-animation-report.json').write_text(json.dumps({
                            'seconds':elapsed,'submissions':submitted,'failed':failed,
                            'submissionsPerSecond':submitted/elapsed,
                            'meanPanMs':1000*pan_seconds/max(1,submitted+failed)}))
                        animation_start=None;last=0
                    if not on:animation_start=None
                    if on and (not was_on or time.monotonic()-last>=5):
                        pixels[offset:offset+size]=drawing.render(read_json('/run/tundra-hardware/status.json'))
                        result=present(panel,variable)
                        Path('/work/cover-refresh.json').write_text(json.dumps({**result,'recordedAt':time.time()}))
                        if not result['ok'] and result['errno']!=last_error:
                            print('Cover refresh deferred, errno:',result['errno'],flush=True)
                        if result['ok'] and last_error is not None:print('Cover refresh recovered',flush=True)
                        last_error=result.get('errno')
                        last=time.monotonic()
                    was_on=on;time.sleep(.2)
            finally:
                Path('/work/cover-ready').unlink(missing_ok=True)
                pixels[offset:offset+size]=original;drawing.close()
                if animation:animation.close()

if __name__=='__main__':main()
