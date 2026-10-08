"""Private ordinary-web-app store. No Gaia permissions are read from packages."""
import base64
import json
import os
from pathlib import Path
import re
import secrets
import threading

class InstalledApps:
    def __init__(self, directory, port):
        self.root = Path(directory)
        self.root.mkdir(parents=True, exist_ok=True)
        self.port = port
        self.lock = threading.RLock()
        self.token = secrets.token_hex(32)
        token = self.root / '.token'
        token.write_text(self.token)
        token.chmod(0o600)
        self.items = {}
        for path in self.root.glob('user-*.json'):
            item = json.loads(path.read_text())
            if self.valid_id(item.get('id')):
                self.items[item['id']] = item

    @staticmethod
    def valid_id(value):
        return isinstance(value, str) and re.fullmatch(r'user-[a-f0-9]{24}', value)

    def records(self):
        with self.lock:
            return [self.record(item) for item in self.items.values()]

    def record(self, item):
        origin = f'http://{item["id"]}.localhost:{self.port}'
        manifest = {**item['manifest'], 'permissions': {}, 'type': 'web'}
        return dict(id=item['id'], origin=origin, manifestURL=origin+'/manifest.webapp',
                    manifest=manifest, removable=True, installed=True)

    def save(self, item):
        if not self.valid_id(item.get('id')) or not isinstance(item.get('files'), dict):
            raise ValueError('INVALID_PACKAGE')
        # A second boundary check keeps the storage API independent of ZIP parsing.
        for name, content in item['files'].items():
            if not isinstance(name, str) or not isinstance(content, str):
                raise ValueError('INVALID_PACKAGE')
        with self.lock:
            target = self.root / (item['id']+'.json')
            stage = target.with_suffix('.tmp')
            with stage.open('w') as stream:
                json.dump(item, stream)
                stream.flush()
                os.fsync(stream.fileno())
            stage.replace(target)
            self.items[item['id']] = item

    def remove(self, app_id):
        if not self.valid_id(app_id):
            raise ValueError('NOT_REMOVABLE')
        with self.lock:
            (self.root/(app_id+'.json')).unlink(missing_ok=True)
            self.items.pop(app_id, None)

    def read(self, app_id, path):
        with self.lock:
            item = self.items.get(app_id)
            if not item:
                return None
            if path == 'manifest.webapp':
                return json.dumps(self.record(item)['manifest']).encode()
            content = item['files'].get(path)
            return base64.b64decode(content, validate=True) if content is not None else None
