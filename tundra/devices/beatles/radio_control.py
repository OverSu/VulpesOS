#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Nokia RIL control broker. Socket clients are Gecko's uid, never web content.

Parcel layouts follow Gecko 52 dom/system/gonk/ril_worker.js. The vendor
socket stays in Android's network namespace; Gecko only sees this broker.
"""
import copy
import hashlib
import json
import os
from pathlib import Path
import select
import signal
import socket
import struct
import subprocess
import sys
import time
import uuid
from call_audio import CallAudio
from stream_volume import StreamVolume
from hardware_control import HardwareControl
from radio_status import Radio, battery, REQUESTS
from sms_pdu import submit, deliver, number

# Fixed allowlist excludes every SIM PIN/PUK, identity and provisioning request.
CONTROL_REQUESTS={9,10,12,23,25,37,40}
SOCKET='/work/phone-control.sock'
STORE=Path('/work/phone-private/inbox.json')


def integer(*values):return struct.pack('<'+'i'*len(values),*values)
def string(value):
    if value is None:return integer(-1)
    raw=value.encode('utf-16-le');body=integer(len(raw)//2)+raw+b'\0\0'
    return body+b'\0'*((-len(body))%4)


def current_calls(parcel):
    count=parcel.integer() if parcel.offset<len(parcel.data) else 0
    if not 0<=count<=16:raise ValueError('INVALID_CALL_LIST')
    rows=[]
    for _ in range(count):
        state,index,toa,multi,incoming,als,voice,privacy=[parcel.integer() for _ in range(8)]
        num=parcel.string() or '';presentation=parcel.integer()
        parcel.string();parcel.integer();uus=parcel.integer()
        if uus:raise ValueError('UNSUPPORTED_CALL_UUS')
        if state not in range(6) or not 1<=index<=255:raise ValueError('INVALID_CALL_LIST')
        if voice:
            if presentation!=0:num=''
            elif toa==145 and num and not num.startswith('+'):num='+'+num
            rows.append({'index':index,'state':('active','held','dialing','alerting','incoming','waiting')[state],
                         'number':num[:80],'direction':'incoming' if incoming else 'outgoing'})
    return rows


class Inbox:
    def __init__(self,path=STORE):
        self.path=path
        self.value=json.loads(path.read_text()) if path.exists() else {'inbox':[],'parts':{},'seen':{}}
    def save(self):
        self.path.parent.mkdir(mode=0o700,parents=True,exist_ok=True)
        self.path.parent.chmod(0o700)
        temporary=self.path.with_suffix('.tmp')
        with open(temporary,'w',opener=lambda p,f:os.open(p,f,0o600)) as stream:
            os.fchmod(stream.fileno(),0o600);json.dump(self.value,stream)
            stream.flush();os.fsync(stream.fileno())
        temporary.replace(self.path)
        fd=os.open(self.path.parent,os.O_DIRECTORY)
        try:os.fsync(fd)
        finally:os.close(fd)
    def receive(self,pdu):
        previous=copy.deepcopy(self.value)
        try:self._receive(pdu)
        except Exception:
            self.value=previous;raise
    def _receive(self,pdu):
        row=deliver(pdu);key=hashlib.sha256(pdu.upper().encode()).hexdigest();now=time.time()
        if key in self.value['seen']:return
        if len(self.value['inbox'])>=500:raise ValueError('SMS_STORE_FULL')
        self.value['seen']={k:v for k,v in self.value['seen'].items() if now-v<7*86400}
        self.value['parts']={k:v for k,v in self.value['parts'].items() if now-v['created']<86400}
        concat=row.pop('concat')
        if concat:
            ref,total,part=concat
            group=hashlib.sha256((row['sender']+':'+str(ref)+':'+str(total)).encode()).hexdigest()
            if group not in self.value['parts'] and len(self.value['parts'])>=100:raise ValueError('SMS_STORE_FULL')
            record=self.value['parts'].setdefault(group,{'created':now,'pieces':{}})
            record['pieces'][str(part)]=row['body']
            if len(record['pieces'])==total:
                row['body']=''.join(record['pieces'][str(i)] for i in range(1,total+1))
                row['receipt']=str(uuid.uuid4());self.value['inbox'].append(row)
                del self.value['parts'][group]
        else:
            row['receipt']=str(uuid.uuid4());self.value['inbox'].append(row)
        self.value['seen'][key]=now;self.save()
    def acknowledge(self,ids):
        if not isinstance(ids,list) or len(ids)>100 or any(not isinstance(i,str) or len(i)!=36 for i in ids):raise ValueError('INVALID_REQUEST')
        previous=copy.deepcopy(self.value)
        try:
            self.value['inbox']=[r for r in self.value['inbox'] if r['receipt'] not in ids];self.save()
        except Exception:
            self.value=previous;raise
        return True


class ControlRadio(Radio):
    def __init__(self,path,slot,inbox):
        super().__init__(path,slot);self.inbox=inbox;self.result=None;self.waiting=None
    def send(self,request,payload=b''):
        if request not in CONTROL_REQUESTS:raise ValueError('RADIO_INVALID_REQUEST')
        if not self.sock:raise RuntimeError('RADIO_NOT_READY')
        self.serial+=1;body=integer(request,self.serial)+payload
        self.sock.sendall(struct.pack('>I',len(body))+body)
        self.pending[self.serial]=(request,time.monotonic())
        return self.serial
    def response(self,request,error,parcel,serial=None):
        if request in REQUESTS:return super().response(request,error,parcel)
        if request==37:return
        if (request,serial)!=self.waiting:return
        if error:self.result=(False,'RADIO_REQUEST_FAILED');return
        if request==9:
            try:result=current_calls(parcel)
            except (ValueError,UnicodeError) as error:
                print('Call list decode:',str(error),'offset',parcel.offset,'length',len(parcel.data),flush=True)
                self.result=(False,'RADIO_INVALID_CALL_LIST');return
        elif request==25:
            parcel.integer();parcel.string();parcel.integer()
            result={'state':'sent'}
        else:result=True
        self.result=(True,result)
    def unsolicited(self,event,parcel):
        if event==1003 and self.slot==0:
            try:
                self.inbox.receive(parcel.string());success,cause=1,0
            except (OSError,ValueError,UnicodeError):
                # Do not acknowledge success until the message is durably stored.
                print('Incoming SMS not stored',flush=True);success,cause=0,255
            self.send(37,integer(2,success,cause))
        else:super().unsolicited(event,parcel)


class Broker:
    def __init__(self,radios,inbox,audio=None,volume=None,hardware=None):
        self.radios=radios;self.inbox=inbox;self.session=uuid.uuid4().hex;self.published=0;self.audio=audio;self.volume=volume;self.hardware=hardware;self.original_power={}
    def step(self,timeout=.1):
        for radio in self.radios:
            try:radio.poll()
            except (OSError,ValueError):radio.close()
        sockets={r.sock:r for r in self.radios if r.sock}
        ready,_,_=select.select(list(sockets),[],[],timeout)
        for sock in ready:
            try:sockets[sock].receive()
            except (OSError,ValueError,UnicodeError) as error:
                print('RIL receive:',type(error).__name__,str(error),flush=True);sockets[sock].close()
        if time.monotonic()-self.published>=1:
            dest=Path('/run/tundra-hardware/status.json');dest.parent.mkdir(exist_ok=True,parents=True)
            try:wifi=json.loads(Path('/run/tundra-wifi/state.json').read_text())
            except (OSError,ValueError):wifi={'available':False,'state':'unavailable'}
            value={'schema':1,'recordedAt':time.time(),'battery':battery(),
                   'wifi':wifi,'radio':[r.state for r in self.radios]}
            temp=dest.with_suffix('.tmp');temp.write_text(json.dumps(value));temp.chmod(0o644);temp.replace(dest)
            self.published=time.monotonic()
    def exchange(self,request,payload=b'',timeout=12,slot=0):
        radio=self.radios[slot]
        # A UI timeout does not cancel the request in the vendor daemon. Do not
        # enqueue more copies while waiting for its reply or transport recovery.
        if any(kind==request for kind,_ in radio.pending.values()):
            raise RuntimeError('RADIO_BUSY')
        if request==9:timeout=min(timeout,3)
        radio.result=None;radio.waiting=None
        try:
            radio.waiting=(request,radio.send(request,payload));until=time.monotonic()+timeout
            while radio.result is None and time.monotonic()<until:
                self.step()
                if not radio.sock:raise RuntimeError('RADIO_NOT_READY')
            if radio.result is None:raise RuntimeError('RADIO_TIMEOUT')
            success,value=radio.result
            if not success:raise RuntimeError(value)
            return value
        finally:radio.waiting=None
    def radio_power(self,slot,enabled,remember=True):
        if type(slot) is not int or slot not in range(len(self.radios)) or type(enabled) is not bool:
            raise ValueError('INVALID_REQUEST')
        radio=self.radios[slot]
        before=radio.state.get('radioState')
        if before not in ('enabled','disabled'):raise RuntimeError('RADIO_NOT_READY')
        target='enabled' if enabled else 'disabled'
        if before==target:return {'slot':slot,'radioState':target}
        # Do not interrupt an ongoing or incoming call when changing radio power.
        if not enabled and self.radios[0].state.get('radioState')=='enabled' and self.calls():
            raise RuntimeError('RADIO_BUSY')
        if remember:self.original_power.setdefault(slot,before=='enabled')
        self.exchange(23,integer(1,int(enabled)),slot=slot)
        deadline=time.monotonic()+8
        while radio.state.get('radioState')!=target and time.monotonic()<deadline:
            self.step()
            if not radio.sock:raise RuntimeError('RADIO_NOT_READY')
        if radio.state.get('radioState')!=target:raise RuntimeError('RADIO_READBACK_FAILED')
        radio.last_poll=0
        return {'slot':slot,'radioState':target}

    def restore_power(self):
        for slot,enabled in self.original_power.items():
            try:self.radio_power(slot,enabled,remember=False)
            except (OSError,RuntimeError,ValueError) as error:
                print('Radio power restore failed:',slot,str(error),flush=True)

    def calls(self):
        rows=[{**row,'path':'/beatles/'+self.session+'/call/'+str(row['index'])} for row in self.exchange(9)]
        if self.audio:self.audio.update(rows)
        return rows
    def request(self,value):
        if not isinstance(value,dict) or value.get('version')!=1:raise ValueError('INVALID_REQUEST')
        op=value.get('operation')
        if op=='status':return {'ready':self.radios[0].state.get('available',False),'voiceAudio':bool(self.audio and self.audio.available)}
        if op=='radioPower':return self.radio_power(value.get('slot'),value.get('enabled'))
        if op=='hardware':
            if not self.hardware:raise RuntimeError('NOT_SUPPORTED')
            return self.hardware.request(value.get('settings'))
        if op=='volumeState':
            if not self.volume:raise RuntimeError('CALL_AUDIO_UNAVAILABLE')
            return self.volume.state()
        if op=='volume':
            if not self.volume:raise RuntimeError('CALL_AUDIO_UNAVAILABLE')
            return self.volume.request(value)
        if op=='callAudio':
            if not self.audio:raise RuntimeError('CALL_AUDIO_UNAVAILABLE')
            return self.audio.request(value.get('settings',{}))
        if op=='incomingMessages':return self.inbox.value['inbox'][:10]
        if op=='ackMessages':return self.inbox.acknowledge(value.get('ids'))
        if op=='calls':return self.calls()
        if op in ('dial','sms'):
            destination=number(value.get('number'))
            if not self.radios[0].state.get('voice',{}).get('connected'):raise RuntimeError('RADIO_NOT_REGISTERED')
            if op=='sms':return self.exchange(25,integer(2)+string(None)+string(submit(destination,value.get('body'))))
            before={row['path'] for row in self.calls()}
            if before:raise RuntimeError('RADIO_BUSY')
            self.exchange(10,string(destination)+integer(0,0,0))
            for _ in range(30):
                for row in self.calls():
                    if row['path'] not in before and row['direction']=='outgoing':return {'path':row['path'],'startedAt':time.time()}
                self.step(.1)
            raise RuntimeError('RADIO_TIMEOUT')
        if op in ('hangup','answer'):
            path=value.get('path');call=next((r for r in self.calls() if r['path']==path),None)
            if not call:raise ValueError('INVALID_CALL')
            if op=='answer':
                if call['state'] not in ('incoming','waiting'):raise ValueError('INVALID_CALL')
                self.exchange(40)
            else:self.exchange(12,integer(1,call['index']))
            return {'path':path}
        raise ValueError('NOT_SUPPORTED')


def read_request(conn):
    data=b''
    while b'\n' not in data:
        chunk=conn.recv(4096)
        if not chunk:break
        data+=chunk
        if len(data)>8192:raise ValueError('INVALID_REQUEST')
    return json.loads(data)


def serve():
    os.umask(0o022);inbox=Inbox()
    radios=[ControlRadio(os.environ.get('VULPES_RIL_SOCKET_DIR','/dev/socket')+'/'+name,i,inbox) for i,name in enumerate(('rild','rild2'))]
    audio=CallAudio();volume=StreamVolume();hardware=HardwareControl();broker=Broker(radios,inbox,audio,volume,hardware);running=True
    def stop(*_):
        nonlocal running
        running=False
    signal.signal(signal.SIGTERM,stop)
    wifi_log=open('/work/wifi-control.log','w')
    wifi_process=subprocess.Popen([sys.executable,'/work/wifi_control.py'],stdout=wifi_log,stderr=wifi_log)
    path=Path(SOCKET);path.unlink(missing_ok=True)
    with socket.socket(socket.AF_UNIX,socket.SOCK_STREAM) as server:
        server.bind(SOCKET);os.chown(SOCKET,0,2000);os.chmod(SOCKET,0o660);server.listen(8);server.setblocking(False)
        print('Nokia phone broker ready; slot 0; Android 6 audio adapter',flush=True)
        try:
            while running:
                broker.step()
                try:hardware.tick()
                except OSError:
                    hardware.pattern=[]
                    print('Nokia vibration control unavailable',flush=True)
                if not select.select([server],[],[],0)[0]:continue
                conn,_=server.accept()
                with conn:
                    conn.settimeout(2)
                    pid,uid,gid=struct.unpack('3i',conn.getsockopt(socket.SOL_SOCKET,socket.SO_PEERCRED,12))
                    if uid not in (0,2000):continue
                    try:response={'ok':True,'result':broker.request(read_request(conn))}
                    except (ValueError,RuntimeError,OSError,subprocess.SubprocessError) as error:
                        allowed={'INVALID_REQUEST','INVALID_NUMBER','INVALID_SMS','SMS_TOO_LONG','INVALID_CALL','RADIO_NOT_REGISTERED','RADIO_NOT_READY','RADIO_BUSY','RADIO_REQUEST_FAILED','RADIO_READBACK_FAILED','RADIO_INVALID_CALL_LIST','RADIO_TIMEOUT','NOT_SUPPORTED','CALL_AUDIO_UNAVAILABLE','HARDWARE_READBACK_FAILED'}
                        message=str(error);response={'ok':False,'error':message if message in allowed else 'RADIO_REQUEST_FAILED'}
                    try:conn.sendall(json.dumps(response).encode()+b'\n')
                    except OSError:pass
        finally:
            path.unlink(missing_ok=True)
            broker.restore_power()
            wifi_process.terminate()
            try:wifi_process.wait(timeout=5)
            except subprocess.TimeoutExpired:wifi_process.kill();wifi_process.wait()
            wifi_log.close()
            hardware.restore()
            volume.restore()
            audio.restore()
            for radio in radios:radio.close()


def client():
    raw=sys.stdin.buffer.read(8193)
    if len(raw)>8192:raise ValueError('INVALID_REQUEST')
    value=json.loads(raw)
    with socket.socket(socket.AF_UNIX,socket.SOCK_STREAM) as conn:
        conn.settimeout(25);conn.connect(SOCKET)
        conn.sendall(json.dumps(value).encode()+b'\n')
        response=b''
        while b'\n' not in response:
            chunk=conn.recv(8192)
            if not chunk:raise RuntimeError('RADIO_INVALID_REPLY')
            response+=chunk
            if len(response)>65536:raise RuntimeError('RADIO_INVALID_REPLY')
        sys.stdout.write(response.decode())

if __name__=='__main__':
    if sys.argv[1:]==['--client-envelope']:client()
    elif not sys.argv[1:]:serve()
    else:raise SystemExit('Unsupported arguments')
