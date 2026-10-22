# SPDX-License-Identifier: MPL-2.0
"""Small client for the Gecko 48 debugger exposed by KaiOS over ADB."""
import json
import socket
import subprocess


class KaiOSDebugger:
    def __init__(self, serial):
        self.adb = ['adb', '-s', serial]
        self.port = None
        self.socket = None

    def __enter__(self):
        self.port = subprocess.check_output(self.adb + [
            'forward', 'tcp:0', 'localfilesystem:/data/local/debugger-socket'],
            text=True, timeout=15).strip()
        try:
            self.socket = socket.create_connection(('127.0.0.1', int(self.port)), timeout=20)
            self.greeting = self.receive()
            self.root = self.request('root', 'listTabs')
            return self
        except BaseException:
            self.__exit__(None, None, None)
            raise

    def __exit__(self, *unused):
        if self.socket:
            self.socket.close()
        if self.port:
            subprocess.run(self.adb + ['forward', '--remove', 'tcp:' + self.port],
                           check=True, timeout=15)

    def receive(self):
        prefix = bytearray()
        while True:
            byte = self.socket.recv(1)
            if not byte:
                raise EOFError('KaiOS debugger disconnected')
            if byte == b':':
                break
            prefix.extend(byte)
            if len(prefix) > 12:
                raise ValueError('Invalid debugger packet header')
        remaining = int(prefix)
        if remaining > 16 * 1024 * 1024:
            raise ValueError('Debugger packet exceeds diagnostic limit')
        data = bytearray()
        while remaining:
            part = self.socket.recv(remaining)
            if not part:
                raise EOFError('Incomplete debugger packet')
            data.extend(part)
            remaining -= len(part)
        return json.loads(data)

    def request(self, actor, kind, **fields):
        body = json.dumps(dict(to=actor, type=kind, **fields)).encode()
        self.socket.sendall(str(len(body)).encode() + b':' + body)
        while True:
            result = self.receive()
            if result.get('from') != actor or result.get('type') in (
                    'consoleAPICall', 'pageError', 'networkEvent', 'newGlobal'):
                continue
            if 'error' in result:
                raise RuntimeError(json.dumps(result))
            return result

    def evaluate(self, console, expression):
        result = self.request(console, 'evaluateJS', text=expression)
        if result.get('exceptionMessage'):
            raise RuntimeError(str(result['exceptionMessage']))
        value = result.get('result')
        if isinstance(value, dict) and value.get('type') == 'longString':
            actor = value['actor']
            try:
                value = self.request(actor, 'substring', start=0,
                                     end=value['length'])['substring']
            finally:
                self.request(actor, 'release')
        return value
