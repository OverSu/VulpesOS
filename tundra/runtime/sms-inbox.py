#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Keep oFono incoming messages until Gecko durably acknowledges them."""
import fcntl
import json
import os
from pathlib import Path
import time
import uuid

ROOT = Path('/var/lib/tundra/sms')


def transaction(change, root=ROOT, filename="inbox.json"):
    if filename not in ("inbox.json", "outgoing.json"): raise ValueError("INVALID_SMS_STORE")
    root.mkdir(parents=True, mode=0o700, exist_ok=True)
    with (root/'lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        path = root/filename
        rows = json.loads(path.read_text()) if path.exists() else []
        result = change(rows)
        temporary = path.with_suffix('.tmp')
        with open(temporary, 'w', opener=lambda p, f: os.open(p, f, 0o600)) as stream:
            os.fchmod(stream.fileno(),0o600)
            json.dump(rows,stream)
            stream.flush(); os.fsync(stream.fileno())
        temporary.replace(path)
        return result


def pending():
    return transaction(lambda rows: rows[:100])


def acknowledge(ids):
    if not isinstance(ids,list) or len(ids)>100 or any(not isinstance(i,str) or len(i)>40 for i in ids):
        raise ValueError('INVALID_SMS_IDS')
    def remove(rows):
        rows[:] = [row for row in rows if row['receipt'] not in ids]
    transaction(remove)
    return True


def outgoing_state(path):
    rows = transaction(lambda rows: list(rows), filename='outgoing.json')
    return next((row['state'] for row in reversed(rows) if row['path'] == path), None)


def record_outgoing(path, state):
    if state not in ('sent','failed'): return
    def update(rows):
        rows[:] = [row for row in rows if row['path'] != path][-999:]
        rows.append({'path':path,'state':state,'timestamp':round(time.time()*1000)})
    transaction(update, filename='outgoing.json')


def main():
    import dbus
    from dbus.mainloop.glib import DBusGMainLoop
    from gi.repository import GLib
    os.umask(0o077)
    DBusGMainLoop(set_as_default=True)
    bus = dbus.SystemBus()
    def incoming(body, properties):
        row = {'receipt':str(uuid.uuid4()),'sender':str(properties.get('Sender','')),
               'body':str(body),'timestamp':round(time.time()*1000)}
        transaction(lambda rows:rows.append(row))
    bus.add_signal_receiver(incoming,signal_name='IncomingMessage',
        dbus_interface='org.ofono.MessageManager',bus_name='org.ofono',path='/ril_0')
    def outgoing(name, value, path=None):
        if name == 'State' and path and str(path).startswith('/ril_0/message'):
            record_outgoing(str(path), str(value))
    bus.add_signal_receiver(outgoing, signal_name='PropertyChanged',
        dbus_interface='org.ofono.Message', bus_name='org.ofono', path_keyword='path')
    GLib.MainLoop().run()


if __name__ == '__main__':
    main()
