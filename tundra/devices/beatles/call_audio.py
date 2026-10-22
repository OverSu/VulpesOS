# SPDX-License-Identifier: MPL-2.0
"""Android 6 audio services used by the Nokia firmware, outside Gecko.

Transaction IDs and argument types: AOSP android-6.0.1_r1,
frameworks/av/media/libmedia/{IAudioPolicyService,IAudioFlinger}.cpp.
This adapter is specific to that ABI. No arbitrary Binder transaction is exposed.
"""
import re
import subprocess
import time


class CallAudio:
    def __init__(self):
        self.mode=0;self.muted=False;self.speaker=False;self.available=False
        self.original=None;self.retry_at=0
    def transact(self,service,method,*values):
        command=['/system/bin/service','call','media.audio_'+service,str(method)]
        for value in values:command.extend(('i32',str(value)))
        result=subprocess.run(command,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,
            text=True,timeout=2,env={'PATH':'/system/bin','LD_LIBRARY_PATH':'/system/lib'})
        match=re.fullmatch(r"Result: Parcel\(([0-9a-fA-F]{8})\s+'[^']*'\)\s*",result.stdout)
        if result.returncode or not match:raise RuntimeError('CALL_AUDIO_UNAVAILABLE')
        return int(match[1],16)
    def initialize(self):
        if self.available:return
        if time.monotonic()<self.retry_at:raise RuntimeError('CALL_AUDIO_UNAVAILABLE')
        try:
            muted=self.transact('flinger',18);route=self.transact('policy',6,0)
            if muted not in (0,1) or route not in range(16):raise RuntimeError('CALL_AUDIO_UNAVAILABLE')
            if self.original is None:self.original=(muted,route)
            self.muted=bool(muted);self.speaker=route==1;self.available=True
        except (OSError,RuntimeError,subprocess.SubprocessError):
            self.retry_at=time.monotonic()+5;raise RuntimeError('CALL_AUDIO_UNAVAILABLE') from None
    def set_mode(self,mode):
        self.initialize()
        if self.mode==mode:return
        if self.transact('policy',3,mode):raise RuntimeError('CALL_AUDIO_UNAVAILABLE')
        self.mode=mode
    def update(self,calls):
        mode=2 if any(c['state'] in ('active','held','dialing','alerting') for c in calls) else 1 if calls else 0
        try:self.set_mode(mode)
        except (OSError,RuntimeError,subprocess.SubprocessError):
            self.available=False;self.retry_at=time.monotonic()+5
    def request(self,value):
        operation=value.get('operation')
        if operation not in ('status','set'):raise ValueError('INVALID_REQUEST')
        for key in ('muted','speaker'):
            if key in value and type(value[key]) is not bool:raise ValueError('INVALID_REQUEST')
        self.initialize()
        if operation=='set':
            if 'speaker' in value and value['speaker']!=self.speaker:
                if self.transact('policy',5,0,int(value['speaker'])):raise RuntimeError('CALL_AUDIO_UNAVAILABLE')
                actual=self.transact('policy',6,0)
                if actual!=int(value['speaker']):raise RuntimeError('CALL_AUDIO_UNAVAILABLE')
                self.speaker=value['speaker']
            if 'muted' in value and value['muted']!=self.muted:
                if self.transact('flinger',17,int(value['muted'])):raise RuntimeError('CALL_AUDIO_UNAVAILABLE')
                if self.transact('flinger',18)!=int(value['muted']):raise RuntimeError('CALL_AUDIO_UNAVAILABLE')
                self.muted=value['muted']
        return {'muted':self.muted,'speaker':self.speaker,'active':self.mode==2,'available':self.available}
    def restore(self):
        if self.original is None:return
        muted,route=self.original
        changes=[]
        if self.mode:changes.append(('policy',3,(0,)))
        if self.speaker!=(route==1):changes.append(('policy',5,(0,route)))
        if self.muted!=bool(muted):changes.append(('flinger',17,(muted,)))
        for service,method,values in changes:
            try:self.transact(service,method,*values)
            except (OSError,RuntimeError,subprocess.SubprocessError):pass
