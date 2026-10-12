#!/usr/bin/env python3
"""Compare or publish an existing Forgejo release's notes from changelog.json."""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import secrets
import urllib.error
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('changelog_export', ROOT/'tools/export-changelog.py')
export = importlib.util.module_from_spec(spec)
spec.loader.exec_module(export)


def request(url, token=None, method='GET', payload=None, content_type=None):
    headers = {'Accept': 'application/json'}
    if token:
        headers['Authorization'] = 'token ' + token
    if isinstance(payload, dict):
        payload = json.dumps(payload).encode()
        content_type = 'application/json'
    if content_type:
        headers['Content-Type'] = content_type
    req = urllib.request.Request(url, data=payload, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=60) as response:
        raw = response.read()
    return raw


def api_url(release_url):
    url = urllib.parse.urlsplit(release_url)
    if url.scheme != 'https':
        raise ValueError('Forgejo requires HTTPS')
    repository, _, tag = url.path.partition('/releases/tag/')
    prefix, owner, repo = repository.rsplit('/', 2)
    if not tag or url.query or url.fragment:
        raise ValueError('Expected a Forgejo release URL')
    return f'https://{url.netloc}{prefix}/api/v1/repos/{owner}/{repo}'


def sync(source_path, tag, publish=False):
    source, _ = export.load_source(source_path)
    release = source['releases'][tag]
    documents = export.release_documents(source, tag)
    api = api_url(release['url'])
    token = os.environ.get('FORGEJO_TOKEN')
    if publish and not token:
        raise ValueError('Set FORGEJO_TOKEN to synchronize Forgejo; no remote changes made')
    data = json.loads(request(api+'/releases/tags/'+urllib.parse.quote(tag, safe=''), token))
    if data['tag_name'] != tag:
        raise ValueError('Remote release tag mismatch')
    endpoint = api+'/releases/'+str(data['id'])
    changes = []
    attachments = {}
    for name in ('CHANGELOG.fr.md', 'CHANGELOG.en.md'):
        matches = [a for a in data['assets'] if a['name'] == name]
        if len(matches) > 1:
            raise ValueError('Duplicate remote attachment: ' + name)
        old = matches[0] if matches else None
        expected = documents[name].encode()
        if old is None or request(old['browser_download_url']) != expected:
            changes.append(name)
            attachments[name] = (old, expected)
    if data['body'].replace('\r\n', '\n').rstrip() != documents['release-body.md'].rstrip():
        changes.append('release-body.md')
    if not publish:
        print('Forgejo: ' + (', '.join(changes) + ' need synchronization' if changes else 'up to date'))
        return not changes
    for name, (old, content) in attachments.items():
        # Upload before removing the old text attachment. APK/checksums are untouched.
        temporary = name + '.' + hashlib.sha256(content).hexdigest()[:12]
        boundary = secrets.token_hex(24)
        payload = (f'--{boundary}\r\nContent-Disposition: form-data; name="attachment"; '
                   f'filename="{temporary}"\r\nContent-Type: text/markdown\r\n\r\n').encode()
        payload += content + f'\r\n--{boundary}--\r\n'.encode()
        staged = [a for a in data['assets'] if a['name'] == temporary]
        if len(staged) > 1:
            raise ValueError('Duplicate staged attachment: ' + temporary)
        added = staged[0] if staged else json.loads(request(
            endpoint+'/assets?name='+urllib.parse.quote(temporary), token,
            'POST', payload, 'multipart/form-data; boundary='+boundary))
        if request(added['browser_download_url']) != content:
            raise ValueError('Uploaded text failed verification: ' + name)
        if old:
            request(endpoint+'/assets/'+str(old['id']), token, 'DELETE')
        request(endpoint+'/assets/'+str(added['id']), token, 'PATCH', {'name': name})
    if 'release-body.md' in changes:
        request(endpoint, token, 'PATCH', {'body': documents['release-body.md']})
    # Check actual remote contents, not just API status codes.
    return sync(source_path, tag, publish=False)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=ROOT/'changelog.json')
    parser.add_argument('--release', required=True, help='Existing Forgejo release tag')
    parser.add_argument('--publish', action='store_true', help='Update notes and FR/EN text attachments only')
    args = parser.parse_args()
    try:
        ok = sync(args.source, args.release, args.publish)
    except urllib.error.HTTPError as error:
        parser.exit(1, f'Forgejo HTTP {error.code}. If publishing, a partial update may have occurred; rerun the check.\n')
    except (ValueError, KeyError, OSError) as error:
        parser.exit(1, f'Changelog sync failed: {error}\n')
    parser.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
