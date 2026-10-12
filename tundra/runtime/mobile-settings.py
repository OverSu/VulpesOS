# SPDX-License-Identifier: MPL-2.0
"""Settings-only oFono queries. Never return IMSI, PIN retries or device serials."""
import subprocess
import json
import re
import time
from pathlib import Path

CLOCK_CONFIG = Path("/var/lib/tundra/clock/settings.json")

def clock_automatic():
    try:
        return json.loads(CLOCK_CONFIG.read_text())["automatic"] is True
    except FileNotFoundError:
        return True

def save_clock_automatic(enabled):
    CLOCK_CONFIG.parent.mkdir(parents=True, exist_ok=True)
    temporary = CLOCK_CONFIG.with_suffix(".tmp")
    temporary.write_text(json.dumps({"automatic": enabled}) + "\n")
    temporary.chmod(0o600)
    temporary.replace(CLOCK_CONFIG)

def network_time():
    result = subprocess.run(["/usr/bin/busctl", "--system", "--timeout=5", "--json=short", "call",
        "org.ofono", "/ril_0", "org.ofono.NetworkTime", "GetNetworkTime"], capture_output=True, text=True, timeout=7)
    if result.returncode:
        raise RuntimeError("NETWORK_TIME_UNAVAILABLE")
    values = {key: value.get("data") for key, value in json.loads(result.stdout)["data"][0].items()}
    utc, received = values.get("UTC"), values.get("Received")
    now = time.monotonic()
    if type(utc) is not int or type(received) is not int or not 0 <= received <= now:
        raise RuntimeError("NETWORK_TIME_UNAVAILABLE")
    seconds = utc + now - received
    if not 946684800 <= seconds <= 4102444800:
        raise RuntimeError("NETWORK_TIME_UNAVAILABLE")
    return seconds

def sync_network_clock():
    if not clock_automatic():
        return
    seconds = network_time()
    if abs(time.time() - seconds) > 2:
        # oFono timestamps use CLOCK_MONOTONIC, not wall time or boot time.
        time.clock_settime(time.CLOCK_REALTIME, seconds)



def properties(interface, timeout=5):
    result = subprocess.run(['/usr/bin/busctl', '--system', '--timeout='+str(timeout), '--json=short',
                             'call', 'org.ofono', '/ril_0', 'org.ofono.' + interface,
                             'GetProperties'], capture_output=True, text=True, timeout=timeout+2)
    if result.returncode:
        raise RuntimeError('RADIO_NOT_READY')
    return {key: value.get('data') for key, value in json.loads(result.stdout)['data'][0].items()}


def request(value):
    if value.get('action') in ('calls','setCallWaiting','setCallerId','forwarding','setForwarding'):
        return supplementary_request(value)
    if value.get('action') in ('radioMode', 'setRadioMode', 'apns', 'editApn'):
        return connection_request(value)
    if set(value) - {'version', 'operation', 'action', 'enabled'}:
        raise ValueError('INVALID_REQUEST')
    action = value.get('action')
    if action not in ('deliveryReports','dataEnabled','roaming') and 'enabled' in value:
        raise ValueError('INVALID_REQUEST')
    if action in ('network', 'dataEnabled', 'roaming'):
        if action != 'network':
            if type(value.get('enabled')) is not bool:
                raise ValueError('INVALID_REQUEST')
            name = 'Powered' if action == 'dataEnabled' else 'RoamingAllowed'
            set_property('ConnectionManager', name, 'b', value['enabled'])
        data = properties('ConnectionManager')
        if action != 'network' and data.get(name) is not value['enabled']:
            raise RuntimeError('RADIO_REQUEST_FAILED')
        network = properties('NetworkRegistration')
        return {'enabled':data.get('Powered'), 'roaming':data.get('RoamingAllowed'),
                'attached':data.get('Attached'), 'status':network.get('Status'),
                'operator':network.get('Name'), 'technology':network.get('Technology'), 'mode':network.get('Mode')}
    if action == 'sim':
        sim = properties('SimManager')
        modem = properties('Modem')
        # The slot key stays private to Gaia Settings; subscriber identity is not needed.
        return {'radioEnabled':modem.get('Powered') is True and modem.get('Online') is True,
                'present': sim.get('Present') is True, 'id': sim.get('CardIdentifier'),
                'operator': sim.get('ServiceProviderName', ''), 'pin': sim.get('PinRequired'),
                'fixedDialing': sim.get('FixedDialing'), 'pinEnabled':'pin' in sim.get('LockedPins', []), 'numbers': sim.get('SubscriberNumbers', [])}
    if action in ('smsc', 'messages'):
        props = properties('MessageManager')
        return {'address': props.get('ServiceCenterAddress'), 'deliveryReports': props.get('UseDeliveryReports')}
    if action == 'deliveryReports':
        if type(value.get('enabled')) is not bool:
            raise ValueError('INVALID_REQUEST')
        result = subprocess.run(['/usr/bin/busctl', '--system', '--timeout=5', 'call',
                                 'org.ofono', '/ril_0', 'org.ofono.MessageManager', 'SetProperty',
                                 'sv', 'UseDeliveryReports', 'b', str(value['enabled']).lower()],
                                capture_output=True, text=True, timeout=7)
        if result.returncode:
            raise RuntimeError('RADIO_REQUEST_FAILED')
        props = properties('MessageManager')
        if props.get('UseDeliveryReports') is not value['enabled']:
            raise RuntimeError('RADIO_REQUEST_FAILED')
        return {'deliveryReports': props['UseDeliveryReports']}
    raise ValueError('NOT_SUPPORTED')


def set_property(interface, name, signature, value, timeout=5):
    result = subprocess.run(['/usr/bin/busctl', '--system', '--timeout='+str(timeout), 'call',
                             'org.ofono', '/ril_0', 'org.ofono.' + interface,
                             'SetProperty', 'sv', name, signature, str(value).lower() if signature == 'b' else value],
                            capture_output=True, text=True, timeout=timeout+2)
    if result.returncode:
        raise RuntimeError('RADIO_REQUEST_FAILED')


def device_request(value):
    """Clock service only; callers cannot supply commands, paths or D-Bus members."""
    import math
    from pathlib import Path
    allowed = {'version', 'operation', 'action', 'timezone', 'milliseconds', 'enabled'}
    if set(value) - allowed:
        raise ValueError('INVALID_REQUEST')
    action = value.get('action')
    extras = {'setTimezone': {'timezone'}, 'setTime': {'milliseconds'}, 'clock': set(), 'setAutomatic': {'enabled'}}
    if action in extras and set(value) - {'version', 'operation', 'action'} - extras[action]:
        raise ValueError('INVALID_REQUEST')
    if action == 'setTimezone':
        zone = value.get('timezone')
        if not isinstance(zone, str) or zone.startswith('/') or '..' in zone.split('/') or len(zone) > 80:
            raise ValueError('INVALID_REQUEST')
        root = Path('/usr/share/zoneinfo').resolve()
        target = (root / zone).resolve()
        if not target.is_relative_to(root) or not target.is_file() or target.read_bytes()[:4] != b'TZif':
            raise ValueError('INVALID_REQUEST')
        args = ['set-timezone', zone]
    elif action == 'setAutomatic':
        if type(value.get('enabled')) is not bool:
            raise ValueError('INVALID_REQUEST')
        save_clock_automatic(value['enabled'])
        if value['enabled']:
            try:
                sync_network_clock()
            except RuntimeError:
                pass  # Keep the requested mode while waiting for the network.
        args = None
    elif action == 'setTime':
        ms = value.get('milliseconds')
        if type(ms) not in (int, float) or not math.isfinite(ms) or not 946684800000 <= ms <= 4102444800000:
            raise ValueError('INVALID_REQUEST')
        if clock_automatic():
            raise RuntimeError('AUTOMATIC_TIME_ENABLED')
        args = ['set-time', '@' + str(int(ms / 1000))]
    elif action == 'clock':
        args = None
    else:
        raise ValueError('NOT_SUPPORTED')
    if args:
        result = subprocess.run(['/usr/bin/timedatectl', *args], capture_output=True, text=True, timeout=10)
        if result.returncode:
            raise RuntimeError('CLOCK_REQUEST_FAILED')
    result = subprocess.run(['/usr/bin/timedatectl', 'show', '-p', 'Timezone', '-p', 'NTP', '-p', 'CanNTP'],
                            capture_output=True, text=True, timeout=5)
    if result.returncode:
        raise RuntimeError('CLOCK_UNAVAILABLE')
    state = dict(line.split('=', 1) for line in result.stdout.splitlines() if '=' in line)
    if action == 'setTimezone' and state.get('Timezone') != value['timezone']:
        raise RuntimeError('CLOCK_REQUEST_FAILED')
    return {'timezone':state.get('Timezone'), 'automatic':clock_automatic(), 'automaticAvailable':True}


# Only existing user-facing Internet/MMS contexts are editable. IMS is owned by
# the telephony stack and must never be rewritten by the Settings form.
APN_FIELDS = {'apn':'AccessPointName', 'user':'Username', 'password':'Password',
              'protocol':'Protocol', 'authtype':'AuthenticationMethod',
              'mmsc':'MessageCenter', 'mmsproxy':'MessageProxy'}


def contexts():
    result = subprocess.run(['/usr/bin/busctl','--system','--timeout=5','--json=short',
                             'call','org.ofono','/ril_0','org.ofono.ConnectionManager','GetContexts'],
                            capture_output=True,text=True,timeout=7)
    if result.returncode:
        raise RuntimeError('RADIO_NOT_READY')
    return {path: {key:item['data'] for key,item in props.items()}
            for path,props in json.loads(result.stdout)['data'][0]
            if re.fullmatch(r'/ril_0/context[0-9]+',path)
            and props.get('Type',{}).get('data') in ('internet','mms')}


def apn_view(path, props):
    fields={key:str(props.get(name,'')) for key,name in APN_FIELDS.items() if key!='password'}
    return {'id':path,'type':'default' if props['Type']=='internet' else 'mms',
            'active':props.get('Active') is True, 'hasPassword':bool(props.get('Password')),
            'fields':fields}


def set_context(path, name, value):
    result = subprocess.run(['/usr/bin/busctl','--system','--timeout=3','call','org.ofono',path,
                             'org.ofono.ConnectionContext','SetProperty','sv',name,'s',value],
                            capture_output=True,text=True,timeout=4)
    if result.returncode:
        raise RuntimeError('APN_WRITE_FAILED')


def connection_request(value):
    action=value.get('action')
    extras={'radioMode':set(),'setRadioMode':{'mode'},'apns':set(),'editApn':{'id','fields'}}
    if action not in extras or set(value)-{'version','operation','action'}-extras[action]:
        raise ValueError('INVALID_REQUEST')
    if action in ('radioMode','setRadioMode'):
        before=properties('RadioSettings')
        available=[mode for mode in before.get('AvailableTechnologies',[]) if mode in ('gsm','umts','lte')]
        if action=='setRadioMode':
            mode=value.get('mode')
            if mode not in ['any',*available]:
                raise ValueError('INVALID_REQUEST')
            if mode != before.get('TechnologyPreference'):
                set_property('RadioSettings','TechnologyPreference','s',mode)
                before=properties('RadioSettings')
                if before.get('TechnologyPreference')!=mode:
                    raise RuntimeError('RADIO_REQUEST_FAILED')
        return {'mode':before.get('TechnologyPreference'),'available':['any',*available]}
    if action=='apns':
        return [apn_view(path,props) for path,props in contexts().items()]
    path=value.get('id'); fields=value.get('fields')
    if not isinstance(path,str) or not re.fullmatch(r'/ril_0/context[0-9]+',path):
        raise ValueError('INVALID_REQUEST')
    if not isinstance(fields,dict) or not fields or set(fields)-set(APN_FIELDS):
        raise ValueError('INVALID_REQUEST')
    for key,field in fields.items():
        if not isinstance(field,str) or len(field.encode())>512 or any(ord(c)<32 for c in field):
            raise ValueError('INVALID_REQUEST')
        if key=='apn' and not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9.-]{0,99}',field):
            raise ValueError('INVALID_REQUEST')
        if key=='protocol' and field not in ('ip','ipv6','dual'):
            raise ValueError('INVALID_REQUEST')
        if key=='authtype' and field not in ('none','pap','chap','any'):
            raise ValueError('INVALID_REQUEST')
        if key=='mmsc' and field:
            from urllib.parse import urlsplit
            url=urlsplit(field)
            if url.scheme not in ('http','https') or not url.hostname or url.username or url.password:
                raise ValueError('INVALID_REQUEST')
        if key=='mmsproxy' and field and not re.fullmatch(r'[A-Za-z0-9.\[\]:-]{1,255}',field):
            raise ValueError('INVALID_REQUEST')
    before=contexts().get(path)
    if before is None:
        raise ValueError('APN_NOT_FOUND')
    if before['Type']!='mms' and any(k in fields for k in ('mmsc','mmsproxy')):
        raise ValueError('INVALID_REQUEST')
    changes={APN_FIELDS[key]:field for key,field in fields.items() if before.get(APN_FIELDS[key],'')!=field}
    if not changes:
        return apn_view(path,before)
    if before.get('Active'):
        raise RuntimeError('APN_IN_USE')
    changed=[]
    try:
        for name,field in changes.items():
            # Include the attempted property: a D-Bus timeout may arrive after
            # the modem has already applied it.
            changed.append(name)
            set_context(path,name,field)
        after=contexts().get(path)
        if after is None or any(after.get(name,'')!=field for name,field in changes.items()):
            raise RuntimeError('APN_WRITE_FAILED')
        return apn_view(path,after)
    except (RuntimeError,OSError,subprocess.TimeoutExpired):
        failed=False
        for name in reversed(changed):
            try:set_context(path,name,str(before.get(name,'')))
            except (RuntimeError,OSError,subprocess.TimeoutExpired):failed=True
        try:restored=contexts().get(path)
        except (RuntimeError,OSError,subprocess.TimeoutExpired):restored=None
        if failed or restored is None or any(restored.get(name,'')!=before.get(name,'') for name in changed):
            raise RuntimeError('APN_ROLLBACK_FAILED') from None
        raise RuntimeError('APN_WRITE_FAILED') from None


FORWARDING = {'unconditional':'VoiceUnconditional', 'busy':'VoiceBusy',
              'noReply':'VoiceNoReply', 'notReachable':'VoiceNotReachable'}


def supplementary_request(value):
    action=value.get('action')
    extras={'calls':set(), 'setCallWaiting':{'enabled'}, 'setCallerId':{'mode'},
            'forwarding':set(), 'setForwarding':{'reason','enabled','number'}}
    if action not in extras or set(value)-{'version','operation','action'}-extras[action]:
        raise ValueError('INVALID_REQUEST')
    if action in ('calls','setCallWaiting','setCallerId'):
        name=None
        if action=='setCallWaiting':
            if type(value.get('enabled')) is not bool:raise ValueError('INVALID_REQUEST')
            name='VoiceCallWaiting'; desired='enabled' if value['enabled'] else 'disabled'
        elif action=='setCallerId':
            desired=value.get('mode')
            if desired not in ('default','enabled','disabled'):raise ValueError('INVALID_REQUEST')
            name='HideCallerId'
        if name:set_property('CallSettings',name,'s',desired,timeout=20)
        # Network supplementary-service queries take several seconds on this RIL.
        props=properties('CallSettings',timeout=20)
        if name and props.get(name)!=desired:raise RuntimeError('RADIO_READBACK_FAILED')
        return {key:props.get(key) for key in ('HideCallerId','VoiceCallWaiting')}
    if action=='setForwarding':
        name=FORWARDING.get(value.get('reason'))
        number=value.get('number','');enabled=value.get('enabled')
        if name is None or type(enabled) is not bool or not isinstance(number,str):raise ValueError('INVALID_REQUEST')
        if enabled and not re.fullmatch(r'\+?[0-9]{1,20}',number):raise ValueError('INVALID_REQUEST')
        if not enabled and number:raise ValueError('INVALID_REQUEST')
        desired=number if enabled else ''
        before=properties('CallForwarding',timeout=20)
        if name not in before:raise RuntimeError('RADIO_NOT_READY')
        if before[name]!=desired:set_property('CallForwarding',name,'s',desired,timeout=20)
    props=properties('CallForwarding',timeout=20)
    if action=='setForwarding' and props.get(name)!=desired:raise RuntimeError('RADIO_READBACK_FAILED')
    return {key:props.get(member) for key,member in FORWARDING.items()}
