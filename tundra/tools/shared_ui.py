# SPDX-License-Identifier: MPL-2.0
"""Shared Gaia payload used by full builds and private UI-only RAM updates."""
import io
import importlib.util
import lzma
from pathlib import Path
import stat
import tarfile
from tundra import ROOT, digest


def differential_payload(payload, system_root):
    """Keep only files not already identical in the immutable system image."""
    root = Path(system_root).resolve()
    output = io.BytesIO()
    omitted = 0
    with tarfile.open(fileobj=io.BytesIO(payload)) as source, tarfile.open(fileobj=output, mode='w') as target:
        for item in source:
            path = root / item.name
            if item.name.startswith('/') or '..' in Path(item.name).parts:
                raise ValueError('Unsafe shared UI path: ' + item.name)
            same = False
            data = source.extractfile(item).read() if item.isfile() else None
            if path.parent.resolve().is_relative_to(root):
                if item.isfile() and path.is_file() and not path.is_symlink():
                    same = path.read_bytes() == data and stat.S_IMODE(path.stat().st_mode) == item.mode
                elif item.issym() and path.is_symlink():
                    same = str(path.readlink()) == item.linkname
            if same:
                omitted += 1
            else:
                target.addfile(item, io.BytesIO(data) if data is not None else None)
    return compress_archive(output.getvalue()), omitted


def compress_archive(payload):
    """Keep the language dictionaries within Sargo's 64 MiB boot partition.

    The ramdisk uses BusyBox tar -xJf; the outer cpio remains gzip for the kernel.
    """
    return lzma.compress(payload, preset=9)


def selected_files():
    spec = importlib.util.spec_from_file_location('vulpes_project', ROOT.parent/'tools/project.py')
    project = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(project)
    sources = [ROOT.parent/'gaia/apps'/app/name
               for app, names in project.SOURCE_OVERRIDES.items() for name in names]
    return [*sources,*sorted((ROOT.parent/'host').rglob('*')),
                *sorted((ROOT.parent/'services').rglob('*.mjs')),
                *sorted((ROOT/'mms-codec').glob('*')),
                *sorted((ROOT.parent/'assets/webapps/marketplace.gaiamobile.org').rglob('*')),
                ROOT.parent/'tools/installed_apps.py',
                *sorted((ROOT.parent/'gaia/shared/elements/vulpes-fonts').rglob('*')),
                *sorted((ROOT.parent/'overrides').rglob('*')),
                ROOT.parent/'assets/webapps/communications.gaiamobile.org/contacts/js/views/form.js',
                ROOT.parent/'assets/webapps/communications.gaiamobile.org/contacts/js/contacts.js',
                ROOT.parent/'assets/webapps/communications.gaiamobile.org/contacts/js/activities.js',
                ROOT.parent/'assets/webapps/communications.gaiamobile.org/dialer/js/call_log.js',
                ROOT.parent/'assets/webapps/communications.gaiamobile.org/dialer/gaia_build_defer_index.js',
                ROOT.parent/'assets/webapps/search.gaiamobile.org/manifest.webapp',
                ROOT.parent/'assets/webapps/homescreen.gaiamobile.org/gaia_build_defer_index.js',
                ROOT.parent/'assets/webapps/settings.gaiamobile.org/js/panels/app_permissions_list/panel.js',
                ROOT.parent/'assets/webapps/settings.gaiamobile.org/js/panels/screen_lock_passcode/panel.js',
                ROOT.parent/'assets/webapps/verticalhome.gaiamobile.org/gaia_build_defer_index.js',
                ROOT.parent/'assets/webapps/wallpaper.gaiamobile.org/style/wallpaper.css',
                ROOT.parent/'assets/webapps/ringtones.gaiamobile.org/gaia_build_defer_pick.js',
                ROOT.parent/'assets/webapps/ringtones.gaiamobile.org/gaia_build_defer_manage.js',
                ROOT.parent/'assets/webapps/ringtones.gaiamobile.org/js/tone_player.js',
                ROOT.parent/'tools/project.py',
                ROOT.parent/'tools/serve-gaia.py',
                ROOT.parent/'release.json', ROOT.parent/'tests/ProbeChild.sys.mjs',
                ROOT/'droidian/probe.sys.mjs', ROOT/'droidian/session.py']


def build_payload():
    buffer = io.BytesIO()
    hashes = {}
    def owned(info):
        info.uid = info.gid = 0
        info.uname = info.gname = 'root'
        info.mtime = 0
        return info
    with tarfile.open(fileobj=buffer, mode='w') as archive:
        for path in selected_files():
            if not path.is_file():
                continue
            relative = str(path.relative_to(ROOT.parent))
            target = 'trial/' + path.name if path in (ROOT/'droidian/probe.sys.mjs', ROOT/'droidian/session.py') else relative
            if path.suffix.lower() == '.md':
                if path.stem.lower() not in ('license', 'copying', 'notice'):
                    continue
                target = target[:-3]
            archive.add(path, arcname='opt/vulpes/' + target, filter=owned)
            hashes[relative] = digest(path)
    return compress_archive(buffer.getvalue()), hashes
