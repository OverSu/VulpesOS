# SPDX-License-Identifier: MPL-2.0
"""Shared Gaia payload used by full builds and private UI-only RAM updates."""
import io
import tarfile
from tundra import ROOT, digest


def selected_files():
    return [*sorted((ROOT.parent/'host').rglob('*')),
                *sorted((ROOT.parent/'services').rglob('*.mjs')),
                *sorted((ROOT/'mms-codec').glob('*')),
                *sorted((ROOT.parent/'assets/webapps/marketplace.gaiamobile.org').rglob('*')),
                ROOT.parent/'tools/installed_apps.py',
                *sorted((ROOT.parent/'gaia/shared/elements/vulpes-fonts').rglob('*')),
                *sorted((ROOT.parent/'overrides').rglob('*')),
                ROOT.parent/'assets/webapps/communications.gaiamobile.org/contacts/js/views/form.js',
                ROOT.parent/'assets/webapps/communications.gaiamobile.org/contacts/js/contacts.js',
                ROOT.parent/'assets/webapps/communications.gaiamobile.org/contacts/js/activities.js',
                ROOT.parent/'assets/webapps/search.gaiamobile.org/manifest.webapp',
                ROOT.parent/'assets/webapps/homescreen.gaiamobile.org/gaia_build_defer_index.js',
                ROOT.parent/'assets/webapps/settings.gaiamobile.org/js/panels/app_permissions_list/panel.js',
                ROOT.parent/'assets/webapps/settings.gaiamobile.org/js/panels/screen_lock_passcode/panel.js',
                ROOT.parent/'assets/webapps/verticalhome.gaiamobile.org/gaia_build_defer_index.js',
                ROOT.parent/'assets/webapps/wallpaper.gaiamobile.org/style/wallpaper.css',
                ROOT.parent/'assets/webapps/ringtones.gaiamobile.org/gaia_build_defer_pick.js',
                ROOT.parent/'assets/webapps/ringtones.gaiamobile.org/gaia_build_defer_manage.js',
                ROOT.parent/'assets/webapps/ringtones.gaiamobile.org/js/tone_player.js',
                ROOT.parent/'gaia/apps/communications/dialer/js/telephony_helper.js',
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
            archive.add(path, arcname='opt/vulpes/' + target, filter=owned)
            hashes[relative] = digest(path)
    return buffer.getvalue(), hashes
