#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Nokia Wi-Fi adapter: vendor supplicant, private client socket, no credentials in argv."""
import hashlib
import ipaddress
import json
import os
from pathlib import Path
import re
import signal
import socket
import struct
import subprocess
import sys
import time
import uuid

SOCKET = '/work/wifi-control.sock'
STATE = Path('/run/tundra-wifi/state.json')
WPA = '/work/radio-sockets/wpa_wlan0'
ERRORS = {'WIFI_UNAVAILABLE', 'WIFI_DISABLED', 'WIFI_INVALID_REQUEST', 'WIFI_INVALID_PASSWORD',
          'WIFI_UNSUPPORTED_SECURITY', 'WIFI_CONNECTION_FAILED', 'WIFI_DHCP_FAILED', 'WIFI_SAVE_FAILED', 'NOT_SUPPORTED'}


def decode_ssid(text):
    raw = bytearray()
    for part in re.findall(r'\\x[0-9a-fA-F]{2}|\\.|[^\\]+|\\$', text):
        if re.fullmatch(r'\\x[0-9a-fA-F]{2}', part): raw.append(int(part[2:], 16))
        elif part.startswith('\\'): raw.extend({'\\n':b'\n','\\r':b'\r','\\t':b'\t','\\\\':b'\\','\\"':b'"'}.get(part,part.encode()))
        else: raw.extend(part.encode())
    return raw.decode('utf-8', errors='replace')


def security(flags):
    if 'EAP' in flags or 'WEP' in flags: return 'unsupported'
    if 'PSK' in flags: return 'wpa-psk'
    if 'SAE' in flags: return 'unsupported'
    return 'open'


def parse_scan(text):
    rows=[]
    for line in text.splitlines()[1:]:
        parts=line.split('\t',4)
        if len(parts)!=5 or not re.fullmatch(r'(?:[0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}',parts[0]): continue
        try: signal_level=max(0,min(100,2*(int(parts[2])+100)))
        except ValueError: continue
        ssid=decode_ssid(parts[4])
        if ssid: rows.append({'id':parts[0].lower(),'ssid':ssid,'signal':signal_level,'security':security(parts[3])})
    return sorted(rows,key=lambda row:-row['signal'])[:128]


def android(*args, check=True):
    result=subprocess.run(['/system/bin/'+args[0],*args[1:]],capture_output=True,text=True,timeout=5,
                          env={'PATH':'/system/bin','LD_LIBRARY_PATH':'/system/lib'})
    if check and result.returncode: raise RuntimeError('WIFI_UNAVAILABLE')
    return result.stdout.strip()


def command(value, required=True):
    with socket.socket(socket.AF_UNIX,socket.SOCK_DGRAM) as sock:
        # An abstract return address is reachable by the host supplicant outside our chroot.
        sock.bind('\0vulpes-wifi-'+uuid.uuid4().hex)
        sock.settimeout(3);sock.connect(WPA)
        sock.send(('IFNAME=wlan0 '+value).encode())
        result=sock.recv(65536).decode('utf-8',errors='replace').strip()
    if required and (result.startswith('FAIL') or result=='UNKNOWN COMMAND'):
        raise RuntimeError('WIFI_UNAVAILABLE')
    return result


class Wifi:
    def __init__(self):
        self.last_scan=[];self.original_enabled=None;self.route=None;self.last_lease=0
        self.initial_resolver=Path('/etc/resolv.conf').read_bytes() if Path('/etc/resolv.conf').exists() else None
        self.rule_owned=False;self.stopping=False
        self.lease_network=None

    def enabled(self):
        try: return bool(int(Path('/sys/class/net/wlan0/flags').read_text(),16)&1)
        except OSError: return False

    def state(self):
        enabled=self.enabled()
        result={'available':True,'enabled':enabled,'state':'disconnected','network':None,'connectionInformation':{}}
        if not enabled: result['state']='disabled';return result
        status=dict(line.split('=',1) for line in command('STATUS').splitlines() if '=' in line)
        result['macAddress']=status.get('address','')
        if status.get('wpa_state')=='COMPLETED':
            result['state']='connected'
            result['network']={'ssid':decode_ssid(status.get('ssid','')),'savedId':status.get('id'),
                               'security':security(status.get('key_mgmt','')),'signal':50}
            try: result['connectionInformation']['ipAddress']=str(ipaddress.IPv4Address(status.get('ip_address','')))
            except ValueError: pass
            poll=command('SIGNAL_POLL',False)
            for line in poll.splitlines():
                try:
                    name,value=line.split('=',1);value=int(value)
                    if name=='RSSI': result['network']['signal']=max(0,min(100,2*(value+100)))
                    if name=='LINKSPEED': result['connectionInformation']['linkSpeed']=value
                except ValueError: pass
        return result

    def known(self):
        rows=[]
        for line in command('LIST_NETWORKS').splitlines()[1:]:
            parts=line.split('\t',3)
            if len(parts)!=4 or not parts[0].isdigit(): continue
            flags=command('GET_NETWORK '+parts[0]+' key_mgmt',False)
            rows.append({'id':parts[0],'ssid':decode_ssid(parts[1]),'security':security(flags)})
        return rows

    def scan(self):
        state=self.state()
        if not state['enabled']:return {**state,'networks':[]}
        # Subscribe before requesting a scan so fast completions are not lost.
        with socket.socket(socket.AF_UNIX,socket.SOCK_DGRAM) as events:
            events.bind('\0vulpes-wifi-scan-'+uuid.uuid4().hex);events.settimeout(3);events.connect(WPA)
            events.send(b'IFNAME=wlan0 ATTACH');events.recv(4096)
            command('SCAN',False)
            deadline=time.monotonic()+4
            while time.monotonic()<deadline:
                try:
                    if b'CTRL-EVENT-SCAN-RESULTS' in events.recv(8192):break
                except socket.timeout:break
        rows=parse_scan(command('SCAN_RESULTS'));known=self.known();state=self.state()
        for row in rows:
            saved=next((n for n in known if n['ssid']==row['ssid'] and n['security']==row['security']),None)
            row.update(known=bool(saved),savedId=saved['id'] if saved else None,
                       connected=bool(state['network'] and state['network']['ssid']==row['ssid']))
        self.last_scan=rows
        return {**state,'networks':rows}

    def set_enabled(self, enabled):
        if type(enabled) is not bool:raise ValueError('WIFI_INVALID_REQUEST')
        if self.original_enabled is None:self.original_enabled=self.enabled()
        self.route=None;self.lease_network=None;self.last_lease=0
        if enabled:
            android('ip','link','set','wlan0','up')
            if not Path(WPA).exists():
                android('setprop','ctl.start','wpa_supplicant')
                for _ in range(30):
                    if Path(WPA).exists():break
                    time.sleep(.1)
            command('RECONNECT')
        else:
            command('DISCONNECT',False)
            android('ip','link','set','wlan0','down')
        return self.state()

    def connect(self,value):
        if not self.enabled():raise RuntimeError('WIFI_DISABLED')
        if value['operation']=='connectHidden':
            ssid=value.get('ssid');mode=value.get('security')
        else:
            target=next((n for n in self.last_scan if n['id']==value.get('id')),None)
            if target is None:raise ValueError('WIFI_INVALID_REQUEST')
            ssid,mode=target['ssid'],target['security']
        if not isinstance(ssid,str) or not 1<=len(ssid.encode())<=32:raise ValueError('WIFI_INVALID_REQUEST')
        if mode not in ('open','wpa-psk'):raise ValueError('WIFI_UNSUPPORTED_SECURITY')
        password=value.get('password','')
        if not isinstance(password,str):raise ValueError('WIFI_INVALID_PASSWORD')
        saved=next((n for n in self.known() if n['ssid']==ssid and n['security']==mode),None)
        created=False
        if saved and not password: ident=saved['id']
        else:
            if mode=='wpa-psk':
                if re.fullmatch('[a-fA-F0-9]{64}',password):psk=password.lower()
                elif 8<=len(password.encode())<=63:psk=hashlib.pbkdf2_hmac('sha1',password.encode(),ssid.encode(),4096,32).hex()
                else:raise ValueError('WIFI_INVALID_PASSWORD')
            ident=command('ADD_NETWORK')
            if not ident.isdigit():raise RuntimeError('WIFI_UNAVAILABLE')
            created=True
        try:
            if created:
                command('SET_NETWORK '+ident+' ssid '+ssid.encode().hex())
                command('SET_NETWORK '+ident+' key_mgmt '+('WPA-PSK' if mode=='wpa-psk' else 'NONE'))
                if mode=='wpa-psk':command('SET_NETWORK '+ident+' psk '+psk)
                if value['operation']=='connectHidden':command('SET_NETWORK '+ident+' scan_ssid 1')
            command('SELECT_NETWORK '+ident)
            deadline=time.monotonic()+20
            while time.monotonic()<deadline:
                if self.stopping:raise RuntimeError('WIFI_UNAVAILABLE')
                state=self.state()
                if state['state']=='connected' and state['network']['ssid']==ssid:
                    self.lease_network=None;self.last_lease=0
                    self.lease(state)
                    while time.monotonic()<deadline and not self.stopping:
                        if android('getprop','dhcp.wlan0.result')=='ok':break
                        time.sleep(.25)
                    else:raise RuntimeError('WIFI_DHCP_FAILED')
                    self.last_lease=0;self.lease(state)
                    if created and command('SAVE_CONFIG',False)!='OK':raise RuntimeError('WIFI_SAVE_FAILED')
                    return self.state()
                time.sleep(.25)
            raise RuntimeError('WIFI_CONNECTION_FAILED')
        except Exception:
            if created:command('REMOVE_NETWORK '+ident,False)
            command('ENABLE_NETWORK all',False);command('RECONNECT',False)
            raise

    def lease(self,state):
        if time.monotonic()-self.last_lease<3:return
        self.last_lease=time.monotonic()
        if state['state']!='connected':
            self.lease_network=None;self.route=None
            return
        network_id=(state['network']['ssid'],state['network'].get('savedId'))
        if network_id!=self.lease_network:
            self.lease_network=network_id;self.route=None
            # init.qcom.rc supplies -ABKLG but no interface. ctl.restart drops
            # the dynamic argument; ctl.start must explicitly append wlan0.
            android('setprop','ctl.stop','dhcpcd_wlan0')
            for _ in range(20):
                if android('getprop','init.svc.dhcpcd_wlan0')=='stopped':break
                time.sleep(.1)
            android('setprop','dhcp.wlan0.result','')
            android('setprop','ctl.start','dhcpcd_wlan0:wlan0')
            return
        if android('getprop','dhcp.wlan0.result')!='ok':return
        servers=[]
        for name in ('dns1','dns2'):
            try: servers.append(str(ipaddress.ip_address(android('getprop','dhcp.wlan0.'+name))))
            except ValueError: pass
        if servers:
            content=''.join('nameserver '+ip+'\n' for ip in dict.fromkeys(servers))+'options timeout:2 attempts:2\n'
            path=Path('/etc/resolv.conf')
            if not path.exists() or path.read_text()!=content:
                temporary=path.with_suffix('.tmp');temporary.write_text(content);temporary.chmod(0o644);temporary.replace(path)
        # glibc does not use Android netd's per-socket routing marks. Install a
        # dedicated table only for unmarked browser uid 2000; retain vendor tables.
        try:
            addr=ipaddress.IPv4Address(android('getprop','dhcp.wlan0.ipaddress'))
            gateway=ipaddress.IPv4Address(android('getprop','dhcp.wlan0.gateway'))
            mask=android('getprop','dhcp.wlan0.mask')
            network=ipaddress.IPv4Network(str(addr)+'/'+mask,strict=False)
            if gateway not in network:return
        except ValueError:return
        route=(str(network),str(gateway))
        if route==self.route and android('ip','route','show','table','21052'):return
        if not self.rule_owned:
            if android('ip','route','show','table','21052') or '21900:' in android('ip','rule'):return
            android('ip','rule','add','priority','21900','fwmark','0x0/0xffff','uidrange','2000-2000','lookup','21052')
            self.rule_owned=True
        android('ip','route','flush','table','21052')
        android('ip','route','add',route[0],'dev','wlan0','table','21052')
        android('ip','route','add','default','via',route[1],'dev','wlan0','table','21052')
        self.route=route

    def publish(self):
        try:
            state=self.state();self.lease(state)
        except (OSError,RuntimeError,subprocess.SubprocessError):
            state={'available':False,'enabled':False,'state':'unavailable','network':None}
        STATE.parent.mkdir(parents=True,exist_ok=True)
        temporary=STATE.with_suffix('.tmp');temporary.write_text(json.dumps(state));temporary.chmod(0o644);temporary.replace(STATE)

    def request(self,value):
        if not isinstance(value,dict):raise ValueError('WIFI_INVALID_REQUEST')
        op=value.get('operation')
        if op=='status':return self.state()
        if op=='scan':return self.scan()
        if op=='known':return {'networks':self.known()}
        if op=='setEnabled':return self.set_enabled(value.get('enabled'))
        if op in ('connect','connectHidden'):return self.connect(value)
        if op=='disconnect':command('DISCONNECT');return self.state()
        if op=='forget':
            ident=value.get('id')
            if not isinstance(ident,str) or not ident.isdigit() or len(ident)>6:raise ValueError('WIFI_INVALID_REQUEST')
            command('REMOVE_NETWORK '+ident)
            if command('SAVE_CONFIG',False)!='OK':raise RuntimeError('WIFI_SAVE_FAILED')
            return True
        raise ValueError('NOT_SUPPORTED')

    def restore(self):
        if self.original_enabled is not None:
            try:self.set_enabled(self.original_enabled)
            except Exception:pass
        if self.rule_owned:
            android('ip','rule','del','priority','21900','fwmark','0x0/0xffff','uidrange','2000-2000','lookup','21052',check=False)
            android('ip','route','flush','table','21052',check=False)
        resolver=Path('/etc/resolv.conf')
        if self.initial_resolver is None:resolver.unlink(missing_ok=True)
        else:resolver.write_bytes(self.initial_resolver)


def receive(conn, limit=8192):
    data=b''
    while b'\n' not in data:
        part=conn.recv(4096)
        if not part:break
        data+=part
        if len(data)>limit:raise ValueError('WIFI_INVALID_REQUEST')
    return json.loads(data)


def main():
    if sys.argv[1:]==['--client']:
        raw=sys.stdin.buffer.read(8193)
        if len(raw)>8192:raise ValueError('WIFI_INVALID_REQUEST')
        value=json.loads(raw)
        with socket.socket(socket.AF_UNIX,socket.SOCK_STREAM) as conn:
            conn.settimeout(40);conn.connect(SOCKET);conn.sendall(json.dumps(value).encode()+b'\n')
            print(json.dumps(receive(conn,65536)))
        return
    if sys.argv[1:] or os.getuid()!=0:raise SystemExit('Root broker or --client required')
    os.umask(0o022);wifi=Wifi();running=True
    def stop(*_):
        nonlocal running
        running=False;wifi.stopping=True
    signal.signal(signal.SIGTERM,stop)
    Path(SOCKET).unlink(missing_ok=True)
    with socket.socket(socket.AF_UNIX,socket.SOCK_STREAM) as server:
        server.bind(SOCKET);os.chown(SOCKET,0,2000);os.chmod(SOCKET,0o660);server.listen(8);server.settimeout(1)
        print('Nokia Wi-Fi broker ready',flush=True)
        try:
            while running:
                wifi.publish()
                try:conn,_=server.accept()
                except socket.timeout:continue
                with conn:
                    conn.settimeout(2)
                    _,uid,_=struct.unpack('3i',conn.getsockopt(socket.SOL_SOCKET,socket.SO_PEERCRED,12))
                    if uid not in (0,2000):continue
                    try:reply={'result':wifi.request(receive(conn))}
                    except (ValueError,RuntimeError,OSError,subprocess.SubprocessError) as error:
                        reply={'error':str(error) if str(error) in ERRORS else 'WIFI_UNAVAILABLE'}
                    try:conn.sendall(json.dumps(reply).encode()+b'\n')
                    except OSError:pass
        finally:
            wifi.restore();Path(SOCKET).unlink(missing_ok=True)


if __name__=='__main__':main()
