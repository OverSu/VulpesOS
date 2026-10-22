# SPDX-License-Identifier: MPL-2.0
"""Stream volume for the Nokia Android 6 audio policy service.

AOSP android-6.0.1_r1 IAudioPolicyService: setStreamVolumeIndex=16,
getStreamVolumeIndex=17 (index, status), getDevicesForStream=24.
The firmware reports 0..5 for voice, 0..15 for the other streams below.
Only the currently routed outputs are changed; trial shutdown restores them.
"""
import math
import re
import subprocess

STREAMS={'telephony':(0,5),'notification':(5,15),'content':(3,15),'alarm':(4,15),'bt_sco':(6,15)}


class StreamVolume:
    def __init__(self):
        self.original={}

    def transact(self,method,*values):
        command=['/system/bin/service','call','media.audio_policy',str(method)]
        for value in values:command.extend(('i32',str(value)))
        result=subprocess.run(command,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,
            text=True,timeout=2,env={'PATH':'/system/bin','LD_LIBRARY_PATH':'/system/lib'})
        if result.returncode:raise RuntimeError('CALL_AUDIO_UNAVAILABLE')
        # service prints either one line or address-prefixed Parcel rows.
        text=result.stdout
        if not text.startswith('Result: Parcel('):raise RuntimeError('CALL_AUDIO_UNAVAILABLE')
        text=re.sub(r"'[^']*'",'',text)
        text=re.sub(r'0x[0-9a-fA-F]+:', '',text)
        return [int(word,16) for word in re.findall(r'\b[0-9a-fA-F]{8}\b',text)]

    def get(self,stream,device,maximum):
        reply=self.transact(17,stream,device)
        if len(reply)!=2 or reply[1]!=0 or not 0<=reply[0]<=maximum:
            raise RuntimeError('CALL_AUDIO_UNAVAILABLE')
        return reply[0]

    def state(self):
        result={}
        for name,(stream,maximum) in STREAMS.items():
            reply=self.transact(24,stream)
            if len(reply)!=1 or reply[0]&0x80000000:raise RuntimeError('CALL_AUDIO_UNAVAILABLE')
            mask=reply[0] or 0x40000000
            device=mask&-mask
            result[name]=self.get(stream,device,maximum)/maximum
        return result

    def request(self,value):
        if not isinstance(value,dict) or value.get('stream') not in STREAMS:
            raise ValueError('INVALID_REQUEST')
        level=value.get('level')
        if type(level) not in (int,float) or not math.isfinite(level) or not 0<=level<=1:
            raise ValueError('INVALID_REQUEST')
        stream,maximum=STREAMS[value['stream']]
        reply=self.transact(24,stream)
        if len(reply)!=1 or reply[0]&0x80000000:raise RuntimeError('CALL_AUDIO_UNAVAILABLE')
        mask=reply[0] or 0x40000000
        devices=[1<<bit for bit in range(31) if mask&(1<<bit)]
        index=int(level*maximum+.5)
        for device in devices:
            old=self.get(stream,device,maximum)
            self.original.setdefault((stream,device),old)
            if self.transact(16,stream,index,device)!=[0] or self.get(stream,device,maximum)!=index:
                raise RuntimeError('CALL_AUDIO_UNAVAILABLE')
        return {'stream':value['stream'],'index':index,'maximum':maximum,'devices':devices}

    def restore(self):
        for (stream,device),index in self.original.items():
            try:self.transact(16,stream,index,device)
            except (OSError,RuntimeError,subprocess.SubprocessError):pass
