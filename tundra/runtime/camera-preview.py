#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Bounded libhybris preview worker. Frames stay in memory; no microphone access.

The parent owns stdin. EOF or five seconds without a request closes the sensor.
A pbuffer and external texture are required even for the software NV21 callback.
"""
import argparse
import struct
import ctypes as C
import json
import os
import select
import sys
import time


def function(lib, name, args, result=None):
    value = getattr(lib, name)
    value.argtypes, value.restype = args, result
    return value


class Listener(C.Structure):
    _fields_ = [(name, C.c_void_p) for name in
                ('error', 'shutter', 'focus', 'zoom', 'raw', 'jpeg', 'texture', 'context', 'preview')]


class Camera:
    width, height = 640, 480

    def __init__(self, index):
        self.camera = None
        self.display = self.surface = self.context = None
        self.frame = None
        self.jpeg = None
        self.focus_done = False
        self.count = self.errors = 0
        self.texture_pending = False
        os.environ['HYBRIS_EGLPLATFORM'] = 'null'
        os.environ['__EGL_VENDOR_LIBRARY_FILENAMES'] = '/usr/share/glvnd/egl_vendor.d/10_libhybris.json'
        self.egl = C.CDLL('libEGL.so.1')
        self.gl = C.CDLL('libGLESv2.so.2')
        self.lib = C.CDLL('libcamera.so.1')
        P, I, U = C.c_void_p, C.c_int, C.c_uint
        self.display = function(self.egl, 'eglGetDisplay', [P], P)(None)
        if not function(self.egl, 'eglInitialize', [P, P, P], U)(self.display, None, None):
            raise RuntimeError('CAMERA_EGL_INIT_FAILED')
        attrs = (I * 13)(0x3033, 1, 0x3040, 4, 0x3024, 8, 0x3023, 8, 0x3022, 8, 0x3021, 8, 0x3038)
        config, count = P(), I()
        function(self.egl, 'eglChooseConfig', [P, P, P, I, P], U)(self.display, attrs, C.byref(config), 1, C.byref(count))
        if not count.value:
            raise RuntimeError('CAMERA_EGL_CONFIG_FAILED')
        function(self.egl, 'eglBindAPI', [U], U)(0x30A0)
        self.context = function(self.egl, 'eglCreateContext', [P, P, P, P], P)(self.display, config, None, (I * 3)(0x3098, 2, 0x3038))
        self.surface = function(self.egl, 'eglCreatePbufferSurface', [P, P, P], P)(self.display, config, (I * 5)(0x3057, 16, 0x3056, 16, 0x3038))
        if not function(self.egl, 'eglMakeCurrent', [P, P, P, P], U)(self.display, self.surface, self.surface, self.context):
            raise RuntimeError('CAMERA_EGL_CONTEXT_FAILED')
        texture = U()
        function(self.gl, 'glGenTextures', [I, P])(1, C.byref(texture))

        @C.CFUNCTYPE(None, P, U, P)
        def preview(data, size, _context):
            if size == self.width * self.height * 3 // 2:
                self.frame = C.string_at(data, size)
                self.count += 1

        @C.CFUNCTYPE(None, P)
        def error(_context):
            self.errors += 1

        @C.CFUNCTYPE(None, P)
        def available(_context):
            self.texture_pending = True

        @C.CFUNCTYPE(None, P)
        def focused(_context):
            self.focus_done = True

        @C.CFUNCTYPE(None, P, U, P)
        def jpeg(data, size, _context):
            if 0 < size <= 32 * 1024 * 1024:
                self.jpeg = C.string_at(data, size)

        self.callbacks = (preview, error, available, focused, jpeg)
        self.listener = Listener()
        for name, callback in [('preview', preview), ('error', error), ('texture', available), ('focus', focused), ('jpeg', jpeg)]:
            setattr(self.listener, name, C.cast(callback, P).value)
        self.camera = function(self.lib, 'android_camera_connect_by_id', [I, P], P)(index, C.byref(self.listener))
        if not self.camera:
            raise RuntimeError('CAMERA_CONNECT_FAILED')
        facing, orientation = I(), I()
        function(self.lib, 'android_camera_get_device_info', [I, P, P], I)(index, C.byref(facing), C.byref(orientation))
        self.orientation = orientation.value
        function(self.lib, 'android_camera_set_preview_size', [P, I, I])(self.camera, self.width, self.height)
        function(self.lib, 'android_camera_set_preview_format', [P, I])(self.camera, 1)  # YUV420SP / NV21
        function(self.lib, 'android_camera_set_preview_texture', [P, I])(self.camera, texture.value)
        function(self.lib, 'android_camera_set_preview_callback_mode', [P, I], I)(self.camera, 1)
        function(self.lib, 'android_camera_start_preview', [P])(self.camera)
        self.parameters = self.read_parameters()
        self.picture_sizes = [tuple(map(int, size.split('x'))) for size in self.parameters.get('picture-size-values', '').split(',') if 'x' in size]
        self.picture_size = max(self.picture_sizes, key=lambda size:size[0]*size[1])
        self.zoom_ratios = [int(n)/100 for n in self.parameters.get('zoom-ratios', '100').split(',')]

    def read_parameters(self):
        # libhybris exposes the flattened parameters through a stdout dump.
        # Capture it in RAM so it cannot corrupt the worker's binary protocol.
        libc = C.CDLL(None)
        fd = os.memfd_create('camera-parameters')
        saved = os.dup(1)
        try:
            libc.fflush(None)
            os.dup2(fd, 1)
            function(self.lib, 'android_camera_dump_parameters', [C.c_void_p])(self.camera)
            libc.fflush(None)
        finally:
            os.dup2(saved, 1)
            os.close(saved)
        try:
            os.lseek(fd, 0, 0)
            raw = os.read(fd, 65536).decode()
            return dict(item.split('=', 1) for item in raw.strip().split(';') if '=' in item)
        finally:
            os.close(fd)

    def metadata(self):
        return {'ready': True, 'width': self.width, 'height': self.height,
                'orientation': self.orientation, 'format': 'nv21',
                'pictureSizes': [{'width':w,'height':h} for w,h in self.picture_sizes],
                'focusModes': self.parameters.get('focus-mode-values', 'fixed').split(','),
                'maxFocusAreas': min(1,int(self.parameters.get('max-num-focus-areas', 0))),
                'zoomRatios': self.zoom_ratios}

    def control(self, command):
        P, I = C.c_void_p, C.c_int
        action = command.get('action')
        if action == 'zoom':
            ratio = command.get('zoom')
            if not isinstance(ratio, (int,float)) or not self.zoom_ratios[0] <= ratio <= self.zoom_ratios[-1]:
                raise ValueError('CAMERA_INVALID_ZOOM')
            index = min(range(len(self.zoom_ratios)), key=lambda i:abs(self.zoom_ratios[i]-ratio))
            function(self.lib,'android_camera_set_zoom',[P,I])(self.camera,index)
            actual = int(self.read_parameters().get('zoom',index))
            if not 0 <= actual < len(self.zoom_ratios): raise RuntimeError('CAMERA_INVALID_ZOOM_REPLY')
            return {'zoom':self.zoom_ratios[actual]}
        if action == 'focus':
            if 'auto' not in self.metadata()['focusModes']:
                raise ValueError('CAMERA_FOCUS_UNAVAILABLE')
            function(self.lib,'android_camera_stop_autofocus',[P])(self.camera)
            function(self.lib,'android_camera_set_auto_focus_mode',[P,I])(self.camera,2)
            area = command.get('area')
            if area is not None:
                values = [area.get(k) for k in ('top','left','bottom','right')]
                if any(not isinstance(n,int) or not -1000 <= n <= 1000 for n in values) or values[0]>=values[2] or values[1]>=values[3]:
                    raise ValueError('CAMERA_INVALID_FOCUS_AREA')
                if not self.metadata()['maxFocusAreas']:
                    raise ValueError('CAMERA_FOCUS_AREA_UNAVAILABLE')
                region = (I*5)(*values,1000)
                function(self.lib,'android_camera_set_focus_region',[P,P])(self.camera,region)
            else:
                function(self.lib,'android_camera_reset_focus_region',[P])(self.camera)
            self.focus_done = False
            function(self.lib,'android_camera_start_autofocus',[P])(self.camera)
            deadline = time.monotonic()+4
            while not self.focus_done and time.monotonic()<deadline:
                self.tick(); time.sleep(.01)
            if not self.focus_done:
                raise RuntimeError('CAMERA_FOCUS_TIMEOUT')
            return {'completed':True}
        if action == 'picture':
            size = command.get('size') or dict(zip(('width','height'),self.picture_size))
            pair = (size.get('width'),size.get('height'))
            if pair not in self.picture_sizes:
                raise ValueError('CAMERA_INVALID_PICTURE_SIZE')
            function(self.lib,'android_camera_set_picture_size',[P,I,I])(self.camera,*pair)
            function(self.lib,'android_camera_set_jpeg_quality',[P,I])(self.camera,95)
            function(self.lib,'android_camera_set_rotation',[P,I])(self.camera,self.orientation)
            self.jpeg = None
            try:
                function(self.lib,'android_camera_take_snapshot',[P])(self.camera)
                deadline = time.monotonic()+12
                while self.jpeg is None and time.monotonic()<deadline:
                    self.tick(); time.sleep(.01)
                if self.jpeg is None:
                    raise RuntimeError('CAMERA_CAPTURE_TIMEOUT')
                return self.jpeg
            finally:
                function(self.lib,'android_camera_start_preview',[P])(self.camera)
        raise ValueError('CAMERA_INVALID_COMMAND')

    def tick(self):
        if self.texture_pending:
            self.texture_pending = False
            function(self.lib, 'android_camera_update_preview_texture', [C.c_void_p])(self.camera)

    def close(self):
        P = C.c_void_p
        if self.camera:
            function(self.lib, 'android_camera_stop_preview', [P])(self.camera)
            function(self.lib, 'android_camera_disconnect', [P])(self.camera)
            self.camera = None
        if self.display:
            function(self.egl, 'eglMakeCurrent', [P, P, P, P], C.c_uint)(self.display, None, None, None)
            if self.surface:
                function(self.egl, 'eglDestroySurface', [P, P], C.c_uint)(self.display, self.surface)
            if self.context:
                function(self.egl, 'eglDestroyContext', [P, P], C.c_uint)(self.display, self.context)
            function(self.egl, 'eglTerminate', [P], C.c_uint)(self.display)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--camera', type=int, choices=(0, 1), default=0)
    parser.add_argument('--probe', action='store_true', help='Count frames for five seconds, retain no images')
    args = parser.parse_args()
    output = os.fdopen(os.dup(1), 'wb', buffering=0)
    os.dup2(2, 1)  # HAL callbacks can print; keep stdout protocol uncontaminated.
    camera = None
    try:
        camera = Camera(args.camera)
        started = last_request = time.monotonic()
        if not args.probe:
            metadata = json.dumps(camera.metadata()).encode()
            output.write(struct.pack('<I', len(metadata)) + metadata)
            output.flush()
        while time.monotonic() - last_request < 5:
            camera.tick()
            if args.probe:
                time.sleep(.01)
                continue
            if not select.select([sys.stdin], [], [], .01)[0]:
                continue
            command = sys.stdin.readline(4096)
            if not command or len(command)>=4096:
                break
            last_request = time.monotonic()
            if command == 'frame\n':
                data = camera.frame or b''
                output.write(struct.pack('<II', camera.count & 0xffffffff, len(data)))
                output.write(data)
            else:
                try:
                    result = camera.control(json.loads(command))
                    if isinstance(result,bytes):
                        data = json.dumps({'ok':True,'jpegLength':len(result)}).encode()
                    else:
                        data = json.dumps({'ok':True,'result':result}).encode()
                except (ValueError,RuntimeError,TypeError,AttributeError) as error:
                    result = None
                    data = json.dumps({'ok':False,'error':str(error)}).encode()
                output.write(struct.pack('<I',len(data))+data)
                if isinstance(result,bytes):
                    output.write(result)
            output.flush()
            last_request = time.monotonic()
        if args.probe:
            output.write((json.dumps({'camera': args.camera, 'frames': camera.count, 'errors': camera.errors,
                              'width': camera.width, 'height': camera.height, 'orientation': camera.orientation,
                              'seconds': round(time.monotonic() - started, 2), 'imagesRetained': False})+'\n').encode())
            if not camera.count or camera.errors:
                return 1
        return 0
    finally:
        if camera:
            camera.close()


if __name__ == '__main__':
    sys.exit(main())
