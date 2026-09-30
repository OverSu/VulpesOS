# SPDX-License-Identifier: MPL-2.0
"""Bounded Linux usbfs transport for the read-only Tundra diagnostic protocol."""
import ctypes
import fcntl
from pathlib import Path
import struct
import time

class Bulk(ctypes.Structure):
    _fields_=[('ep',ctypes.c_uint),('length',ctypes.c_uint),('timeout',ctypes.c_uint),('data',ctypes.c_void_p)]


def parse_endpoints(data, configuration):
    """Read the active vendor interface; FunctionFS may renumber endpoints."""
    candidates = []
    current = None
    active = False
    offset = 0
    while offset < len(data):
        if len(data)-offset < 2:
            raise ValueError('Truncated USB descriptor')
        size, kind = data[offset:offset+2]
        if size < 2 or offset+size > len(data):
            raise ValueError('Invalid USB descriptor length')
        item = data[offset:offset+size]
        if kind == 2:
            if size < 9:
                raise ValueError('Invalid configuration descriptor')
            active = item[5] == configuration
            current = None
        elif kind == 4:
            if size < 9:
                raise ValueError('Invalid interface descriptor')
            current = None
            if active and item[3] == 0 and item[5:8] == bytes([255,0,0]):
                current = {'interface':item[2], 'count':item[4], 'endpoints':[]}
                candidates.append(current)
        elif kind == 5 and current is not None:
            if size < 7:
                raise ValueError('Invalid endpoint descriptor')
            current['endpoints'].append((item[2], item[3]&3))
        offset += size
    if len(candidates) != 1:
        raise ValueError('Expected one active vendor diagnostic interface')
    candidate = candidates[0]
    endpoints = candidate['endpoints']
    incoming = [ep for ep,kind in endpoints if kind == 2 and ep&0x80 and ep&0x0f]
    outgoing = [ep for ep,kind in endpoints if kind == 2 and not ep&0x80 and ep&0x0f]
    if candidate['count'] != 2 or len(endpoints) != 2 or len(incoming) != 1 or len(outgoing) != 1:
        raise ValueError('Expected one bulk IN and one bulk OUT endpoint')
    return {'interface':candidate['interface'], 'in':incoming[0], 'out':outgoing[0]}


def device_layout(device, sysfs=Path('/sys/bus/usb/devices')):
    device = Path(device)
    for entry in sysfs.iterdir():
        try:
            path = Path('/dev/bus/usb')/f'{int((entry/"busnum").read_text()):03d}'/f'{int((entry/"devnum").read_text()):03d}'
        except (FileNotFoundError,NotADirectoryError):
            continue
        if path == device:
            identity = [(entry/k).read_text().strip() for k in ('idVendor','idProduct','serial')]
            if identity != ['1d6b','0104','TUNDRA-DIAG']:
                raise ValueError('Selected USB device is not the Tundra diagnostic')
            return parse_endpoints((entry/'descriptors').read_bytes(), int((entry/'bConfigurationValue').read_text()))
    raise RuntimeError('USB diagnostic disappeared; select its current device path')


def exchange(device, commands=('status','version','mounts')):
    commands = tuple(commands)
    for command in commands:
        if not command.isascii() or not command.isalpha() or len(command)>60:
            raise ValueError('Invalid diagnostic command')
    layout = device_layout(device)
    libc=ctypes.CDLL(None,use_errno=True)
    libc.ioctl.argtypes = [ctypes.c_int,ctypes.c_ulong,ctypes.c_void_p]
    libc.ioctl.restype = ctypes.c_int
    ioctl_bulk=0xc0005502 | (ctypes.sizeof(Bulk)<<16)
    results={}
    with Path(device).open('r+b',buffering=0) as stream:
        fcntl.ioctl(stream,0x8004550f,struct.pack('I',layout['interface'])) # USBDEVFS_CLAIMINTERFACE
        def bulk(ep,payload=None):
            buf=ctypes.create_string_buffer(payload,len(payload)) if payload else ctypes.create_string_buffer(4096)
            request=Bulk(ep,len(buf),3000,ctypes.addressof(buf))
            count=libc.ioctl(stream.fileno(),ioctl_bulk,ctypes.byref(request))
            if count<0:raise OSError(ctypes.get_errno(),f'USB transfer endpoint 0x{ep:02x}')
            if payload is not None and count != len(payload):
                raise RuntimeError('Incomplete USB command write')
            return buf.raw[:count]
        for command in commands:
            bulk(layout['out'],(command+'\n').encode())
            response=b''
            deadline=time.monotonic()+6
            while not response.endswith(b'\nEND\n'):
                if time.monotonic() >= deadline:
                    raise TimeoutError('Diagnostic response did not finish')
                chunk=bulk(layout['in'])
                if not chunk:
                    raise RuntimeError('Empty USB response')
                response+=chunk
                if len(response)>8192:raise RuntimeError('Invalid oversized response')
            results[command]=response.decode()
    return results
