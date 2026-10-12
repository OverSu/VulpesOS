#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Durable MMS queue, oFono bearer and WAP-push agent. No Wi-Fi fallback."""
import base64
import contextlib
import hashlib
import http.client
import ipaddress
import json
import os
from pathlib import Path
import re
import socket
import subprocess
import sys
import threading
import time
from urllib.parse import urlsplit
import uuid

ROOT = Path('/var/lib/tundra/mms')
SOCKET = Path('/run/tundra-mms/mms.sock')
CODEC = '/usr/libexec/tundra-mms-codec'
LIMIT = 600 * 1024
WIRE_LIMIT = 2 * LIMIT
LOCK = threading.RLock()
MODEM = '/ril_0'


def save(path, data):
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    temp = path.with_suffix('.tmp')
    with open(temp, 'w', opener=lambda p, f: os.open(p, f, 0o600)) as stream:
        json.dump(data, stream); stream.flush(); os.fsync(stream.fileno())
    temp.replace(path)


def records():
    path = ROOT/'queue.json'
    return json.loads(path.read_text()) if path.exists() else []


def codec(operation, **data):
    result = subprocess.run([CODEC], input=json.dumps({'operation': operation, **data}),
        text=True, capture_output=True, timeout=10, env={**os.environ, 'GOMEMLIMIT': '64MiB'})
    if result.returncode: raise ValueError('MMS_CODEC_ERROR')
    value = json.loads(result.stdout)
    if 'error' in value: raise ValueError(value['error'])
    return value


def validate_send(value):
    recipients = value.get('recipients')
    if not isinstance(recipients,list) or not 1 <= len(recipients) <= 10 or any(
        not isinstance(n,str) or not re.fullmatch(r'\+?[0-9]{3,20}',n) for n in recipients):
        raise ValueError('INVALID_NUMBER')
    parts = value.get('parts')
    if not isinstance(parts,list) or not 1 <= len(parts) <= 20: raise ValueError('INVALID_MMS')
    total = 0
    for part in parts:
        if not isinstance(part,dict): raise ValueError('INVALID_MMS')
        if not isinstance(part.get('id'),str) or not re.fullmatch(r'[\w .@+-]{1,100}',part['id']): raise ValueError('INVALID_MMS')
        if not isinstance(part.get('type'),str) or not re.fullmatch(r'[a-zA-Z0-9.+-]+/[a-zA-Z0-9.+-]+',part['type']): raise ValueError('INVALID_MMS')
        try: total += len(base64.b64decode(part['data'],validate=True))
        except (ValueError,TypeError,KeyError): raise ValueError('INVALID_MMS')
    if total > LIMIT: raise ValueError('MMS_TOO_LARGE')
    subject=value.get('subject','')
    if not isinstance(subject,str) or len(subject)>200: raise ValueError('INVALID_MMS')
    return {'recipients':recipients,'parts':parts,'subject':subject}


def request(value):
    if not isinstance(value,dict) or value.get('version')!=1: raise ValueError('INVALID_REQUEST')
    op=value.get('operation')
    with LOCK:
        rows=records()
        if op=='send':
            message=validate_send(value)
            # Encode before accepting the queue entry so malformed content isn't queued.
            encoded=codec('encode',**message)
            identity=str(uuid.uuid4())
            rows.append({'id':identity,'direction':'outgoing','state':'pending','encoded':encoded,'created':time.time()})
            save(ROOT/'queue.json',rows)
            return {'path':identity,'state':'pending'}
        if op=='state':
            row=next((r for r in rows if r['id']==value.get('path')),None)
            return {k:row[k] for k in ['state','error'] if k in row} if row else {'state':'unknown'}
        if op=='incoming':
            return [r['message'] for r in rows if r['direction']=='incoming' and r['state']=='received'][:1]
        if op=='ack':
            ids=value.get('ids')
            if not isinstance(ids,list) or len(ids)>100: raise ValueError('INVALID_REQUEST')
            for row in rows:
                if row['direction']=='incoming' and row['id'] in ids and row['state']=='received':
                    row['state']='stored';row.pop('message',None)
            save(ROOT/'queue.json',rows);return True
    raise ValueError('NOT_SUPPORTED')


@contextlib.contextmanager
def bearer():
    import dbus
    bus=dbus.SystemBus(private=True)
    # This short-lived connection is closed after each transfer. With GLib,
    # the bus default would terminate the whole daemon on that disconnect.
    bus.set_exit_on_disconnect(False)
    try:
        conn=dbus.Interface(bus.get_object('org.ofono',MODEM),'org.ofono.ConnectionManager')
        contexts=[(str(p),v) for p,v in conn.GetContexts() if str(v.get('Type'))=='mms']
        if not contexts: raise ValueError('MMS_APN_MISSING')
        path,props=contexts[0]
        # Only provision an incomplete default context, never replace user APNs.
        if not props.get('MessageCenter'):
            sim=dbus.Interface(bus.get_object('org.ofono',MODEM),'org.ofono.SimManager').GetProperties()
            imsi=str(sim.get('SubscriberIdentity',''))
            if imsi.startswith('20801') and str(props.get('AccessPointName')) in ('','mms'):
                cfg={'AccessPointName':'orange.acte','Username':'orange','Password':'orange',
                     'AuthenticationMethod':'pap','Protocol':'ip','MessageCenter':'http://mms.orange.fr',
                     'MessageProxy':'192.168.10.200:8080'}
                ctx=dbus.Interface(bus.get_object('org.ofono',path),'org.ofono.ConnectionContext')
                for key,val in cfg.items():ctx.SetProperty(key,dbus.String(val,variant_level=1))
                props=ctx.GetProperties()
            else: raise ValueError('MMS_APN_MISSING')
        ctx=dbus.Interface(bus.get_object('org.ofono',path),'org.ofono.ConnectionContext')
        activated=False;manager=None;previous=None;cleanup=[]
        try:
            try:
                manager=dbus.Interface(bus.get_object('org.ofono','/'),'org.nemomobile.ofono.ModemManager')
                previous=manager.GetMmsSim()
                sim=dbus.Interface(bus.get_object('org.ofono',MODEM),'org.ofono.SimManager').GetProperties()
                manager.SetMmsSim(sim['SubscriberIdentity'])
            except dbus.DBusException:manager=None
            if not props.get('Active'):
                try:ctx.SetProperty('Active',dbus.Boolean(True,variant_level=1),timeout=45)
                except dbus.DBusException:raise ValueError('MMS_DATA_UNAVAILABLE')
                activated=True
            props=ctx.GetProperties();settings=props.get('Settings',{})
            interface=str(settings.get('Interface',''));address=str(settings.get('Address',''))
            if not re.fullmatch(r'[\w.-]{1,15}',interface) or not address:raise ValueError('MMS_DATA_UNAVAILABLE')
            ip=ipaddress.ip_address(address)
            if ip.version!=4:raise ValueError('MMS_DATA_UNAVAILABLE')
            proxy=str(props.get('MessageProxy',''));url=str(props.get('MessageCenter',''))
            parsed=urlsplit(url)
            if parsed.scheme!='http' or not parsed.hostname or parsed.username:raise ValueError('MMS_APN_MISSING')
            proxyurl=urlsplit(proxy if '://' in proxy else '//'+proxy)
            host=proxyurl.hostname or parsed.hostname;port=proxyurl.port or (8080 if proxy else parsed.port or 80)
            # Operator MMS profiles normally expose an IPv4 proxy. Avoid DNS via Wi-Fi.
            try: destination=str(ipaddress.IPv4Address(host))
            except ValueError:raise ValueError('MMS_PROXY_REQUIRED')
            subprocess.run(['ip','link','set',interface,'up'],check=True,stdout=subprocess.DEVNULL)
            prefix=ipaddress.IPv4Network('0.0.0.0/'+str(settings.get('Netmask','255.255.255.255'))).prefixlen
            current=json.loads(subprocess.check_output(['ip','-j','addr','show','dev',interface]))
            if not any(a.get('local')==address for link in current for a in link.get('addr_info',[])):
                address_args=[address+'/'+str(prefix),'dev',interface]
                subprocess.run(['ip','addr','add',*address_args],check=True,stdout=subprocess.DEVNULL)
                cleanup.append(['ip','addr','del',*address_args])
            routes=json.loads(subprocess.check_output(['ip','-j','route','show',destination+'/32']))
            if routes and not any(r.get('dev')==interface for r in routes):raise ValueError('MMS_ROUTE_CONFLICT')
            if not routes:
                route_args=[destination+'/32','dev',interface,'src',address]
                subprocess.run(['ip','route','add',*route_args],check=True,stdout=subprocess.DEVNULL)
                cleanup.append(['ip','route','del',*route_args])
            yield {'interface':interface,'address':address,'host':destination,'port':port,'url':url,'proxy':bool(proxy)}
        finally:
            for command in reversed(cleanup):
                subprocess.run(command,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
            if activated:
                try:ctx.SetProperty('Active',dbus.Boolean(False,variant_level=1),timeout=20)
                except dbus.DBusException:pass
            if manager is not None and previous is not None:
                try:manager.SetMmsSim(previous)
                except dbus.DBusException:pass
    
    finally:
        bus.close()


def transfer(connection, url, body=None):
    parsed=urlsplit(url)
    if parsed.scheme!='http' or not parsed.hostname or parsed.username or parsed.fragment:raise ValueError('MMS_INVALID_URL')
    if not connection['proxy'] and parsed.hostname!=urlsplit(connection['url']).hostname:raise ValueError('MMS_INVALID_URL')
    client=http.client.HTTPConnection(connection['host'],connection['port'],timeout=35)
    sock=socket.socket(socket.AF_INET,socket.SOCK_STREAM);client.sock=sock
    target=url if connection['proxy'] else (parsed.path or '/')+('?' + parsed.query if parsed.query else '')
    try:
        sock.settimeout(35)
        sock.setsockopt(socket.SOL_SOCKET,socket.SO_BINDTODEVICE,connection['interface'].encode()+b'\0')
        sock.bind((connection['address'],0));sock.connect((connection['host'],connection['port']))
        client.request('POST' if body is not None else 'GET',target,body,
            {'Content-Type':'application/vnd.wap.mms-message','Accept':'application/vnd.wap.mms-message',
             'User-Agent':'VulpesOS/2.7 MMS/1.1','Host':parsed.netloc})
        response=client.getresponse();data=response.read(LIMIT+1)
        if response.status!=200:raise ValueError('MMS_HTTP_ERROR')
        if len(data)>LIMIT:raise ValueError('MMS_TOO_LARGE')
        return data
    finally:client.close()


def process(row):
    with bearer() as connection:
        if row['direction']=='outgoing':
            encoded=row['encoded'];data=transfer(connection,connection['url'],base64.b64decode(encoded['data']))
            response=codec('response',data=base64.b64encode(data).decode(),transaction=encoded['transaction'])
            if not response['accepted']:raise ValueError('MMS_REJECTED')
            return {'state':'sent','encoded':None,'acceptedByMMSC':True}
        notification=row['notification']
        if row.get('ackPending'):
            ack=codec('ack',transaction=notification['transaction'])
            transfer(connection,connection['url'],base64.b64decode(ack['data']))
            return {'ackPending':False}
        if notification['expires'] and notification['expires']<time.time():raise ValueError('MMS_EXPIRED')
        data=transfer(connection,notification['url']);message=codec('retrieve',data=base64.b64encode(data).decode())
        message.update({'receipt':row['id'],'type':'mms'})
        # Persist before acknowledging download to the operator.
        with LOCK:
            rows=records();target=next(r for r in rows if r['id']==row['id']);target.update({'message':message,'state':'received','ackPending':True});save(ROOT/'queue.json',rows)
        ack=codec('ack',transaction=notification['transaction'])
        transfer(connection,connection['url'],base64.b64decode(ack['data']))
        return {'ackPending':False}


def process_once():
    with LOCK:
        pending=next((r.copy() for r in records() if
            (r['state']=='pending' or r.get('ackPending')) and r.get('retryAt',0)<=time.time()),None)
        if not pending:return False
        if pending['direction']=='outgoing':
            rows=records();next(r for r in rows if r['id']==pending['id'])['state']='submitting';save(ROOT/'queue.json',rows)
    try:result=process(pending)
    except Exception as e:
        code=str(e) if re.fullmatch(r'MMS_[A-Z_]+',str(e)) else 'MMS_TRANSPORT_ERROR'
        result={'error':code}
        if pending['direction']=='outgoing':result['state']='failed'
        else:
            attempts=pending.get('attempts',0)+1
            result.update(attempts=attempts,retryAt=time.time()+min(3600,30*2**min(attempts,7)))
            if code=='MMS_EXPIRED':result.update(state='failed',ackPending=False)
    with LOCK:
        rows=records();row=next((r for r in rows if r['id']==pending['id']),None)
        if row:
            row.update(result)
            if 'error' not in result:row.pop('error',None);row.pop('retryAt',None)
            save(ROOT/'queue.json',rows)
    return True


def worker():
    while True:
        if not process_once():time.sleep(1)


def serve():
    SOCKET.parent.mkdir(parents=True,exist_ok=True);SOCKET.unlink(missing_ok=True)
    with socket.socket(socket.AF_UNIX) as server:
        server.bind(str(SOCKET));os.chmod(SOCKET,0o660)
        import pwd
        os.chown(SOCKET,0,pwd.getpwnam('droidian').pw_gid)
        server.listen(4)
        while True:
            conn,_=server.accept()
            with conn:
                conn.settimeout(15);data=b''
                try:
                    while not data.endswith(b'\n') and len(data)<=WIRE_LIMIT:
                        chunk=conn.recv(min(65536,WIRE_LIMIT+1-len(data)))
                        if not chunk:break
                        data+=chunk
                    if len(data)>WIRE_LIMIT:raise ValueError('MMS_TOO_LARGE')
                    result={'ok':True,'result':request(json.loads(data))}
                except Exception as e:
                    code=str(e) if re.fullmatch(r'[A-Z_]+',str(e)) else 'INVALID_REQUEST'
                    result={'ok':False,'error':code}
                try:conn.sendall(json.dumps(result).encode()+b'\n')
                except OSError:pass


def agent():
    import dbus,dbus.service
    from dbus.mainloop.glib import DBusGMainLoop
    from gi.repository import GLib
    DBusGMainLoop(set_as_default=True);bus=dbus.SystemBus();path='/org/vulpes/MmsPush'
    class Push(dbus.service.Object):
        @dbus.service.method('org.ofono.PushNotificationAgent',in_signature='aya{sv}',out_signature='',sender_keyword='sender')
        def ReceiveNotification(self,data,info,sender=None):
            if sender!=bus.get_name_owner('org.ofono'):raise dbus.DBusException('Denied')
            try:notification=codec('notification',data=base64.b64encode(bytes(data)).decode())
            except Exception:return
            identity=hashlib.sha256((notification['transaction']+'\n'+notification['url']).encode()).hexdigest()
            with LOCK:
                rows=records()
                if not any(r['id']==identity for r in rows):
                    rows.append({'id':identity,'direction':'incoming','state':'pending','notification':notification});save(ROOT/'queue.json',rows)
        @dbus.service.method('org.ofono.PushNotificationAgent',in_signature='',out_signature='',sender_keyword='sender')
        def Release(self,sender=None):
            if sender==bus.get_name_owner('org.ofono'):GLib.timeout_add_seconds(3,register)
    push=Push(bus,path)
    def register():
        try:dbus.Interface(bus.get_object('org.ofono',MODEM),'org.ofono.PushNotification').RegisterAgent(dbus.ObjectPath(path));return False
        except dbus.DBusException:return True
    if register():GLib.timeout_add_seconds(10,register)
    GLib.MainLoop().run()


def client():
    raw=sys.stdin.read(WIRE_LIMIT+1)
    if len(raw)>WIRE_LIMIT:raise ValueError('MMS_TOO_LARGE')
    with socket.socket(socket.AF_UNIX) as sock:
        sock.settimeout(20);sock.connect(str(SOCKET));sock.sendall(raw.encode()+b'\n');data=b''
        while not data.endswith(b'\n') and len(data)<=WIRE_LIMIT:
            chunk=sock.recv(65536)
            if not chunk:break
            data+=chunk
        if len(data)>WIRE_LIMIT:raise ValueError('MMS_TOO_LARGE')
        print(data.decode())

if __name__=='__main__':
    if '--client' in sys.argv:client()
    else:
        os.umask(0o077);ROOT.mkdir(parents=True,exist_ok=True)
        rows=records()
        for row in rows:
            if row['state']=='submitting':row.update({'state':'failed','error':'MMS_DELIVERY_UNKNOWN'})
        save(ROOT/'queue.json',rows)
        threading.Thread(target=worker,daemon=True).start()
        threading.Thread(target=serve,daemon=True).start()
        agent()
