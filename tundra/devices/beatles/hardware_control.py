# SPDX-License-Identifier: MPL-2.0
"""Fixed Nokia controls mounted writable only in the trusted broker namespace."""
import math
from pathlib import Path
import time


class HardwareControl:
    def __init__(self,root=Path('/work/hardware-controls')):
        self.root=root;self.original=None;self.pattern=[];self.next_at=0;self.on=False

    def write(self,name,value):
        (self.root/name).write_text(str(value)+'\n')

    def request(self,value):
        if not isinstance(value,dict):raise ValueError('INVALID_REQUEST')
        op=value.get('operation')
        if op=='screen':
            level=value.get('level');enabled=value.get('enabled')
            if type(enabled) is not bool or type(level) not in (int,float) or not math.isfinite(level) or not 0<=level<=1:
                raise ValueError('INVALID_REQUEST')
            maximum=int((self.root/'backlight-max').read_text())
            if not 1<=maximum<=65535:raise RuntimeError('NOT_SUPPORTED')
            if self.original is None:self.original=int((self.root/'backlight').read_text())
            brightness=max(1,int(level*maximum+.5)) if enabled else 0
            self.write('backlight',brightness)
            actual=int((self.root/'backlight').read_text())
            if actual!=brightness:raise RuntimeError('HARDWARE_READBACK_FAILED')
            return {'brightness':actual,'maximum':maximum}
        if op=='vibrate':
            pattern=value.get('pattern')
            if not isinstance(pattern,list) or len(pattern)>32 or any(type(n) is not int or not 0<=n<=10000 for n in pattern) or sum(pattern)>10000:
                raise ValueError('INVALID_REQUEST')
            self.write('vibrator',0)
            self.pattern=list(pattern);self.on=False;self.next_at=0;self.tick()
            return True
        raise ValueError('NOT_SUPPORTED')

    def tick(self):
        now=time.monotonic()
        while self.pattern and now>=self.next_at:
            duration=self.pattern.pop(0);self.on=not self.on
            self.write('vibrator',duration if self.on else 0)
            self.next_at=now+duration/1000

    def restore(self):
        self.pattern=[]
        for name,value in [('vibrator',0),('backlight',self.original)]:
            if value is not None:
                try:self.write(name,value)
                except OSError:pass
