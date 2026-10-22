# SPDX-License-Identifier: MPL-2.0
"""Read-only Android RIL status for beatles; no PIN, identity, SMS or call requests."""
import json
import os
from pathlib import Path
import select
import socket
import struct
import time

REQUESTS = (1, 19, 20, 21, 22)  # SIM status, signal, voice/data registration, operator.
TECHNOLOGIES = {1:'gprs',2:'edge',3:'umts',4:'is95a',5:'is95b',6:'1xrtt',
                7:'evdo0',8:'evdoa',9:'hsdpa',10:'hsupa',11:'hspa',12:'evdob',
                13:'ehrpd',14:'lte',15:'hspa+',16:'gsm'}

class Parcel:
    def __init__(self, data):
        self.data, self.offset = data, 0
    def integer(self):
        if self.offset + 4 > len(self.data): raise ValueError('TRUNCATED_PARCEL')
        value, = struct.unpack_from('<i', self.data, self.offset)
        self.offset += 4
        return value
    def string(self):
        length = self.integer()
        if length == -1: return None
        if not 0 <= length <= 4096: raise ValueError('INVALID_STRING_LENGTH')
        end = self.offset + length * 2
        if end + 2 > len(self.data): raise ValueError('TRUNCATED_STRING')
        if self.data[end:end+2] != b'\0\0': raise ValueError('INVALID_TERMINATOR')
        value = self.data[self.offset:end].decode('utf-16-le')
        self.offset = (end + 2 + 3) & ~3
        if self.offset > len(self.data): raise ValueError('TRUNCATED_PADDING')
        return value
    def strings(self):
        count = self.integer()
        if not 0 <= count <= 32: raise ValueError('INVALID_ARRAY_LENGTH')
        return [self.string() for _ in range(count)]


def registration(values):
    state = int(values[0]) if values and values[0] else -1
    tech = int(values[3]) if len(values)>3 and values[3] else 0
    return {'state':{0:'notSearching',1:'registered',2:'searching',3:'denied',
                     4:'unknown',5:'registered',10:'notSearching',12:'searching',
                     13:'denied',14:'unknown'}.get(state,'unknown'),
            'connected':state in (1,5), 'roaming':state == 5,
            'emergencyCallsOnly':state in (10,12,13,14), 'type':TECHNOLOGIES.get(tech)}


def decode(request, parcel):
    if request == 1:
        card = parcel.integer(); parcel.integer()
        gsm = parcel.integer(); parcel.integer(); parcel.integer()
        count = parcel.integer()
        if not 0 <= count <= 8: raise ValueError('INVALID_SIM_APPLICATION_COUNT')
        app_state = None
        for index in range(count):
            parcel.integer(); state=parcel.integer(); parcel.integer()
            parcel.string(); parcel.string()  # AID/label are deliberately discarded.
            parcel.integer(); parcel.integer(); parcel.integer()
            if index == gsm: app_state=state
        return {'sim':{'present':card == 1, 'cardState':
            'absent' if card == 0 else {2:'pinRequired',3:'pukRequired',4:'networkLocked',5:'ready'}.get(app_state,'unknown')}}
    if request in (20,21):
        state=registration(parcel.strings())
        # Packet-network registration does not prove that a data bearer is open.
        if request == 21: state['connected']=False
        return {('voice' if request == 20 else 'data'):state}
    if request == 22:
        values = parcel.strings()
        return {'operator':{'longName':(values[0] or '')[:100] if values else '',
                            'shortName':(values[1] or '')[:100] if len(values)>1 else ''}}
    if request == 19:
        # GSM ASU can be unknown on LTE. RIL v6+ stores positive LTE RSRP
        # at index 8; normalize its valid 44..140 dBm magnitude for Gaia.
        values=[]
        while parcel.offset + 4 <= len(parcel.data): values.append(parcel.integer())
        if not values: raise ValueError('TRUNCATED_SIGNAL')
        asu=values[0]
        rsrp=values[8] if len(values)>8 else None
        if rsrp is not None and 44<=rsrp<=140:
            return {'signal':round((140-rsrp)*100/96)}
        return {'signal':round(asu*100/31) if 0<=asu<=31 else None}
    raise ValueError('READ_ONLY_REQUEST_REQUIRED')


class Radio:
    def __init__(self, path, slot):
        self.path,self.slot=path,slot
        self.sock=None;self.buffer=b'';self.pending={};self.serial=0
        self.last_poll=0;self.retry_at=0;self.retry_delay=5
        self.state={'slot':slot,'available':False,'radioState':'unknown'}
    def close(self):
        if self.sock:self.sock.close()
        self.sock=None;self.buffer=b'';self.pending={}
        self.state={'slot':self.slot,'available':False,'radioState':'unknown'}
        self.retry_at=time.monotonic()+self.retry_delay
        self.retry_delay=min(60,self.retry_delay*2)
    def connect(self):
        connection=socket.socket(socket.AF_UNIX,socket.SOCK_STREAM)
        try:
            connection.settimeout(1);connection.connect(self.path)
            connection.setblocking(False);self.sock=connection;self.last_poll=0
            print('RIL slot',self.slot,'connected',flush=True)
        except OSError as error:
            print('RIL slot',self.slot,'connect errno',error.errno,flush=True)
            connection.close();self.close()
    def poll(self):
        now=time.monotonic()
        if not self.sock:
            if now>=self.retry_at:self.connect()
            return
        # CS fallback and network handover can outlast an individual UI request.
        # Keep the transport open for late replies instead of repeatedly filling
        # the vendor socket's accept queue with abandoned reconnects.
        if any(now-created>45 for _,created in self.pending.values()):
            print('RIL slot',self.slot,'request timeout; kinds',sorted({kind for kind,_ in self.pending.values()}),flush=True)
            self.close();return
        if now-self.last_poll<5:return
        self.last_poll=now
        for request in REQUESTS:
            if any(kind==request for kind,_ in self.pending.values()):continue
            self.serial+=1
            body=struct.pack('<ii',request,self.serial)
            self.sock.sendall(struct.pack('>I',len(body))+body)
            self.pending[self.serial]=(request,now)
    def receive(self):
        data=self.sock.recv(65536)
        if not data:raise OSError('RIL_DISCONNECTED')
        self.buffer+=data
        while len(self.buffer)>=4:
            length,=struct.unpack_from('>I',self.buffer)
            if not 4<=length<=65536:raise ValueError('INVALID_FRAME_LENGTH')
            if len(self.buffer)<length+4:return
            parcel=Parcel(self.buffer[4:4+length]);self.buffer=self.buffer[4+length:]
            kind=parcel.integer()
            if kind == 0:
                serial,error=parcel.integer(),parcel.integer()
                pending=self.pending.pop(serial,None)
                if pending is None:continue
                request,_=pending
                self.retry_delay=5
                self.response(request,error,parcel,serial)
            elif kind == 1:
                self.unsolicited(parcel.integer(),parcel)

    def response(self,request,error,parcel,serial=None):
        self.state['available']=True
        if error:
            self.state.setdefault('errors',{})[str(request)]=error
            self.state.pop({1:'sim',19:'signal',20:'voice',21:'data',22:'operator'}[request],None)
            return
        self.state.setdefault('errors',{}).pop(str(request),None)
        self.state.update(decode(request,parcel))

    def unsolicited(self,event,parcel):
        if event == 1000:
            self.state['radioState']={0:'disabled',1:'unavailable',10:'enabled'}.get(parcel.integer(),'unknown')
        elif event == 1034:
            count=parcel.integer()
            if count==1:self.state['rilVersion']=parcel.integer()
        elif event in (1002,1009,1019):self.last_poll=0
        # The read-only adapter never consumes or acknowledges incoming SMS.


def battery(root=Path('/sys/class/power_supply/battery')):
    try:
        level=int((root/'capacity').read_text().strip())
        status=(root/'status').read_text().strip()
        if not 0<=level<=100 or status not in ('Charging','Full','Discharging','Not charging'):return None
        return {'level':level/100,'charging':status in ('Charging','Full')}
    except (OSError,ValueError):return None


def main():
    os.umask(0o022)
    destination=Path('/run/tundra-hardware/status.json')
    destination.parent.mkdir(parents=True,exist_ok=True)
    destination.parent.chmod(0o755)
    radios=[Radio(os.environ.get('VULPES_RIL_SOCKET_DIR','/dev/socket')+'/'+name,index) for index,name in enumerate(('rild','rild2'))]
    published=0
    while True:
        for radio in radios:
            try:radio.poll()
            except (OSError,ValueError) as error:
                print('RIL slot',radio.slot,'poll',type(error).__name__,getattr(error,'errno',None),flush=True);radio.close()
        active={r.sock:r for r in radios if r.sock}
        readable,_,_=select.select(list(active),[],[],.25)
        for sock in readable:
            try:active[sock].receive()
            except (OSError,ValueError,UnicodeError) as error:
                print('RIL slot',active[sock].slot,'receive',type(error).__name__,getattr(error,'errno',None),flush=True);active[sock].close()
        if time.monotonic()-published<1:continue
        published=time.monotonic()
        value={'schema':1,'recordedAt':time.time(),'battery':battery(),
               'wifi':{'available':False,'state':'unavailable'},'radio':[r.state for r in radios]}
        temporary=destination.with_suffix('.tmp')
        temporary.write_text(json.dumps(value)+'\n');temporary.chmod(0o644);temporary.replace(destination)

if __name__=='__main__':main()
