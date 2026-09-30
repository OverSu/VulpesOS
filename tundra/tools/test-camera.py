#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Count HAL preview frames through gst-droid; never save pictures."""
import ctypes as C
import ctypes.util
import json
import time


def main():
    gst = C.CDLL(ctypes.util.find_library('gstreamer-1.0'))
    obj = C.CDLL(ctypes.util.find_library('gobject-2.0'))
    glib = C.CDLL(ctypes.util.find_library('glib-2.0'))
    def api(lib, name, returns, args):
        fun = getattr(lib, name); fun.restype = returns; fun.argtypes = args; return fun
    ptr = C.c_void_p
    api(gst, 'gst_init', None, [ptr,ptr])(None,None)
    parse = api(gst,'gst_parse_launch',ptr,[C.c_char_p,ptr])
    get = api(gst,'gst_bin_get_by_name',ptr,[ptr,C.c_char_p])
    state = api(gst,'gst_element_set_state',C.c_int,[ptr,C.c_int])
    unref = api(gst,'gst_object_unref',None,[ptr])
    bus_get = api(gst,'gst_element_get_bus',ptr,[ptr])
    pop = api(gst,'gst_bus_timed_pop_filtered',ptr,[ptr,C.c_uint64,C.c_uint])
    frames = []
    callback_type = C.CFUNCTYPE(None,ptr,ptr,ptr,ptr)
    @callback_type
    def handoff(sink, buffer, pad, data):
        frames.append(time.monotonic())
    connect = api(obj,'g_signal_connect_data',C.c_ulong,[ptr,C.c_char_p,callback_type,ptr,ptr,C.c_int])
    pipeline = parse(b'droidcamsrc name=camera ! fakesink name=sink signal-handoffs=true sync=false',None)
    if not pipeline: raise RuntimeError('Camera pipeline unavailable')
    sink = get(pipeline,b'sink'); bus = bus_get(pipeline)
    if not sink: raise RuntimeError('Camera sink unavailable')
    connect(sink,b'handoff',handoff,None,None,0)
    report = {'recordedAtUnix':time.time(),'recordingRetained':False,'backend':'gst-droid','error':None}
    started = time.monotonic()
    try:
        report['stateChangeResult'] = state(pipeline,4)
        deadline = started+12
        while time.monotonic()<deadline and len(frames)<20:
            message = pop(bus,100000000,2) # GST_MESSAGE_ERROR
            if message:
                error = ptr(); debug = C.c_char_p()
                api(gst,'gst_message_parse_error',None,[ptr,ptr,ptr])(message,C.byref(error),C.byref(debug))
                class GError(C.Structure): _fields_ = [('domain',C.c_uint),('code',C.c_int),('message',C.c_char_p)]
                if error:
                    e=C.cast(error,C.POINTER(GError)).contents
                    report['error']={'code':e.code,'message':e.message.decode(errors='replace')}
                    api(glib,'g_error_free',None,[ptr])(error)
                api(glib,'g_free',None,[ptr])(C.cast(debug,ptr))
                api(gst,'gst_message_unref',None,[ptr])(message)
                break
        report['previewFrames'] = len(frames)
        report['seconds'] = round(time.monotonic()-started,2)
        report['passed'] = len(frames)>=20 and not report['error']
    finally:
        state(pipeline,1)
        unref(sink); unref(bus); unref(pipeline)
    print(json.dumps(report,indent=2),flush=True)


if __name__ == '__main__': main()
