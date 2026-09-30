#!/usr/bin/env python3
"""Assemble an isolated x86 graphical prototype from pinned Vulpes and local Linux tools.

This is a development image, not a redistributable distro or a Pixel ROM.
No root, package installation, personal profile or host filesystem mount is needed.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import stat
import subprocess
import sys
import time
import urllib.request
from tundra import cpio

ROOT = Path(__file__).resolve().parents[1]
PROJECT = ROOT.parent
OUT = ROOT / 'out/graphical-vm'
FS = OUT / 'root'
WESTON = ROOT / 'out/graphical'
seen = set()


def sha(path):
    with open(path, 'rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def logical(path):
    s = str(path)
    for prefix in ('/lib64/', '/lib/'):
        if s.startswith(prefix):
            return '/usr/lib/' + s[len(prefix):]
    return s


def copy(path, dest=None, deps=True):
    path = Path(path)
    dest = logical(dest or path)
    target = FS / dest.lstrip('/')
    if dest in seen:
        return
    if not path.is_file():
        raise FileNotFoundError(path)
    seen.add(dest)
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists():
        target.unlink()
    shutil.copy2(path, target, follow_symlinks=True)
    target.chmod(target.stat().st_mode & 0o777)
    if deps and path.open('rb').read(4) == b'\x7fELF':
        runtime = PROJECT / json.loads((PROJECT / 'engine-lock.json').read_text())['runtime']
        env = dict(os.environ, LD_LIBRARY_PATH=f'{WESTON}/usr/lib/weston:{WESTON}/usr/lib:{runtime}')
        result = subprocess.run(['ldd', str(path)], env=env, capture_output=True, text=True)
        if 'not found' in result.stdout:
            raise RuntimeError(f'Missing dependency for {path}: {result.stdout}')
        for library in re.findall(r'(?:=>\s+|^\s*)(/\S+)', result.stdout, re.M):
            destination = library
            if library.startswith(str(WESTON)):
                destination = library[len(str(WESTON)):]
            elif library.startswith(str(PROJECT / 'engines')):
                destination = '/opt/vulpes/' + str(Path(library).relative_to(PROJECT))
            copy(library, destination)


def tree(source, destination, exclude=()):
    source = Path(source)
    for base, dirs, files in os.walk(source, followlinks=True):
        dirs[:] = [d for d in dirs if d not in exclude]
        for name in files:
            p = Path(base) / name
            if name.endswith(('.pyc', '.pyo')) or name in exclude:
                continue
            if p.is_file():
                copy(p, str(Path(destination) / p.relative_to(source)))


def write(path, data, mode=0o644):
    p = FS / path.lstrip('/')
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(data)
    p.chmod(mode)


def initramfs(kernel):
    minimal = OUT / 'initroot'
    minimal.mkdir(exist_ok=True)
    paths = set()
    def include(path):
        p = Path(logical(path))
        if str(p) in paths:
            return
        paths.add(str(p))
        output = subprocess.run(['ldd', str(p)], capture_output=True, text=True).stdout
        for lib in re.findall(r'(?:=>\s+|^\s*)(/\S+)', output, re.M):
            include(lib)
    for binary in ('bash', 'mount', 'modprobe', 'switch_root', 'mkdir', 'sleep'):
        include('/usr/bin/' + binary)
    modules = set()
    for module in ('virtio_pci', 'virtio_blk', 'ext4', 'virtio_gpu', 'virtio_input', 'evdev', 'dummy_hcd', 'libcomposite', 'usb_f_fs', 'usbcore'):
        output = subprocess.check_output(['modprobe', '--show-depends', module], text=True)
        for line in output.splitlines():
            if line.startswith('insmod '):
                modules.add(logical(line.split()[1]))
    paths.update(modules)
    moddir = Path('/usr/lib/modules') / kernel
    paths.update(str(p) for p in moddir.glob('modules.*') if p.is_file())
    entries = []
    dirs = {'dev', 'proc', 'sys', 'newroot', 'run', 'usr', 'usr/bin', 'usr/lib'}
    for path in sorted(paths):
        p = Path(path)
        name = path.lstrip('/')
        dirs.update(str(d) for d in Path(name).parents if str(d) != '.')
        entries.append((name, stat.S_IFREG | (p.stat().st_mode & 0o777), p.read_bytes(), 0, 0))
        copy(p, deps=False)
    script = '''#!/usr/bin/bash
set -eux
mount -t proc proc /proc
mount -t sysfs sysfs /sys
mount -t devtmpfs devtmpfs /dev
mount -t tmpfs tmpfs /run
for m in virtio_pci virtio_blk ext4 virtio_gpu virtio_input evdev; do modprobe "$m"; done
for ((i=0;i<100;i++)); do [[ -b /dev/vda ]] && break; sleep .1; done
mount /dev/vda /newroot
mkdir -p /newroot/{dev,proc,sys}
mount --move /dev /newroot/dev
mount --move /proc /newroot/proc
mount --move /sys /newroot/sys
mount --move /run /newroot/run
exec switch_root /newroot /usr/bin/python3 -u /opt/tundra/init.py
'''
    entries = [(d, stat.S_IFDIR | 0o755, b'', 0, 0) for d in sorted(dirs, key=lambda s: (s.count('/'), s))] + entries
    entries += [('lib', stat.S_IFLNK | 0o777, b'usr/lib', 0, 0),
                ('lib64', stat.S_IFLNK | 0o777, b'usr/lib', 0, 0),
                ('bin', stat.S_IFLNK | 0o777, b'usr/bin', 0, 0),
                ('init', stat.S_IFREG | 0o755, script.encode(), 0, 0),
                ('dev/console', stat.S_IFCHR | 0o600, b'', 5, 1)]
    (OUT / 'initramfs.cpio.gz').write_bytes(cpio(entries))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--refresh', action='store_true', help='Refresh shared Vulpes/guest files in an existing staged root')
    args = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    FS.mkdir(exist_ok=True)
    if args.refresh and not (OUT/'build.json').exists():
        raise SystemExit('Run a full build before --refresh')
    if not (ROOT/'out/usb-diagnostic/x86_64/init').exists():
        subprocess.run([sys.executable,str(ROOT/'tools/build-usb.py')],check=True)
    if not args.refresh:
        lock = json.loads((ROOT / 'manifests/weston.lock.json').read_text())
        archive = ROOT / 'downloads/weston' / lock['url'].rsplit('/', 1)[1]
        if not archive.exists():
            archive.parent.mkdir(parents=True, exist_ok=True)
            with urllib.request.urlopen(lock['url'], timeout=60) as response, archive.with_suffix('.part').open('wb') as output:
                shutil.copyfileobj(response, output)
            archive.with_suffix('.part').replace(archive)
        if sha(archive) != lock['sha256']:
            raise RuntimeError('Weston checksum mismatch')
        WESTON.mkdir(parents=True, exist_ok=True)
        subprocess.run(['tar','--no-same-owner','-xf',str(archive),'-C',str(WESTON)],check=True)
        for link, dest in [('bin','usr/bin'), ('sbin','usr/bin'), ('lib','usr/lib'), ('lib64','usr/lib'), ('usr/lib64','lib')]:
            p = FS / link
            p.parent.mkdir(parents=True, exist_ok=True)
            if not p.exists() and not p.is_symlink():
                p.symlink_to(dest)
        tree(WESTON / 'usr', '/usr', ('vnc-backend.so','rdp-backend.so','pipewire-backend.so','xwayland.so','vulkan-renderer.so'))
        for name in ('bash','python3','mount','umount','modprobe','mkdir','sleep','ip','udevadm','dbus-daemon','dbus-run-session','seatd','setpriv','sync','fc-cache','bwrap','unshare'):
            copy('/usr/bin/' + name)
        copy('/usr/lib/systemd/systemd-udevd')
        copy('/usr/bin/sh')
        for program in ('at-spi-bus-launcher','at-spi2-registryd','xdg-desktop-portal','xdg-desktop-portal-gtk','xdg-permission-store','xdg-document-portal'):
            copy('/usr/lib/'+program)
        copy('/usr/lib/libkmod.so.2')
        copy('/usr/lib/udev/libinput-device-group')
        rules = FS / 'usr/lib/udev/rules.d'
        if rules.exists(): shutil.rmtree(rules)
        for name in ('60-input-id.rules','60-drm.rules','70-mouse.rules','71-seat.rules','73-seat-late.rules','80-libinput-device-groups.rules','90-libinput-fuzz-override.rules'):
            p = Path('/usr/lib/udev/rules.d') / name
            if p.exists(): copy(p)
        write('/usr/lib/udev/rules.d/50-tundra.rules', 'SUBSYSTEM=="input", GROUP="video", MODE="0660"\nSUBSYSTEM=="drm", GROUP="video", MODE="0660"\nSUBSYSTEM=="tty", KERNEL=="tty[0-9]*", GROUP="video", MODE="0660"\n')
        python = Path(sys.base_prefix) / 'lib' / f'python{sys.version_info.major}.{sys.version_info.minor}'
        tree(python, str(python), ('site-packages','__pycache__','test','tests','idlelib','tkinter','ensurepip'))
        for dirname in ('/usr/share/xdg-desktop-portal','/usr/share/mime','/usr/lib/glycin-loaders','/usr/share/glycin-loaders','/usr/lib/locale/C.utf8','/usr/share/libinput','/usr/share/X11/xkb','/usr/share/glvnd/egl_vendor.d','/usr/share/glib-2.0/schemas','/usr/lib/gdk-pixbuf-2.0','/usr/share/dbus-1','/etc/fonts'):
            tree(dirname, dirname)
        for name in ('libEGL.so.1','libEGL_mesa.so.0','libGL.so.1','libGLX.so.0','libGLX_mesa.so.0','libGLESv2.so.2','libgbm.so.1','libgtk-3.so.0','libgdk-3.so.0','libnss_dns.so.2','libnss_files.so.2'):
            p = Path('/usr/lib') / name
            if p.exists(): copy(p)
        for name in ('swrast_dri.so','virtio_gpu_dri.so'):
            copy('/usr/lib/dri/' + name)
        for gallium in Path('/usr/lib').glob('libgallium-*.so'):
            copy(gallium)
        for font in Path('/usr/share/fonts/TTF').glob('DejaVuSans*.ttf'):
            copy(font, deps=False)
        for font in (PROJECT / 'gaia/shared').rglob('*.ttf'):
            copy(font, '/usr/share/fonts/vulpes/' + font.name, deps=False)
        kernel = os.uname().release
        shutil.copy2('/boot/vmlinuz-linux', OUT / 'vmlinuz')
        initramfs(kernel)
        write('/etc/passwd', 'root:x:0:0:root:/root:/usr/bin/bash\nvulpes:x:1000:1000:Vulpes:/home/vulpes:/usr/bin/bash\n')
        write('/etc/group', 'root:x:0:\nvideo:x:44:vulpes\nrender:x:992:vulpes\nvulpes:x:1000:\n')
        write('/etc/nsswitch.conf', 'passwd: files\ngroup: files\nhosts: files dns\n')
        write('/etc/hosts', '127.0.0.1 localhost\n::1 localhost\n')
        write('/etc/os-release', 'NAME="Tundra development VM"\nID=tundra\nPRETTY_NAME="Tundra x86_64 prototype"\n')
        write('/etc/machine-id', 'a30d62a5b7954ddda12e13ab83aaff52\n')
        write('/etc/ld.so.conf', '/usr/lib\n/usr/lib/weston\n')
    # Refresh the generated payload as a unit so removed source files stay removed.
    for name in ('assets','host','services','adapters','overrides','gaia','tools','tests'):
        path=FS/'opt/vulpes'/name
        if path.exists(): shutil.rmtree(path)
    if (FS/'opt/tundra').exists(): shutil.rmtree(FS/'opt/tundra')
    # Only distributable product inputs; never the user's profiles, keys or history.
    for name in ('assets','host','services','adapters','overrides'):
        tree(PROJECT / name, '/opt/vulpes/' + name, ('__pycache__',))
    tree(PROJECT / 'gaia/shared', '/opt/vulpes/gaia/shared', ('test','tests'))
    tree(PROJECT / 'gaia/apps/system', '/opt/vulpes/gaia/apps/system', ('test','tests'))
    for name in ('engine-lock.json','release.json'):
        copy(PROJECT / name, '/opt/vulpes/' + name)
    for name in ('serve-gaia.py','project.py','run-host.py','marionette_client.py'):
        copy(PROJECT / 'tools' / name, '/opt/vulpes/tools/' + name)
    copy(PROJECT / 'tests/ProbeChild.sys.mjs', '/opt/vulpes/tests/ProbeChild.sys.mjs')
    engine = json.loads((PROJECT / 'engine-lock.json').read_text())
    if not args.refresh:
        tree(PROJECT / engine['runtime'], '/opt/vulpes/' + engine['runtime'], ('vulpes','updated','updates'))
    tree(ROOT / 'vm', '/opt/tundra', ('__pycache__',))
    copy(ROOT/'out/usb-diagnostic/x86_64/init','/opt/tundra/usb-init')
    copy(ROOT/'tools/usb_protocol.py','/opt/tundra/usb_protocol.py')
    for directory in ('dev','proc','sys','run','tmp','var/log','var/cache/fontconfig','home/vulpes','root'):
        (FS / directory).mkdir(parents=True, exist_ok=True)
    (FS / 'tmp').chmod(0o1777)
    subprocess.run(['/usr/bin/ldconfig','-r',str(FS)], check=True)
    print('Writing ext4 image…', flush=True)
    image = OUT / 'root.ext4'
    with image.open('wb') as f:
        f.truncate(4 * 1024**3)
    subprocess.run(['fakeroot', '--', sys.executable, str(ROOT/'tools/pack-rootfs.py'), str(FS), str(image)], check=True)
    files = {}
    for p in sorted(FS.rglob('*')):
        if p.is_file() and not p.is_symlink():
            files[str(p.relative_to(FS))] = sha(p)
    report = {'scope':'x86_64 Linux/Wayland development VM; no Android HAL or Pixel validation',
              'gecko':engine['version'], 'kernel':os.uname().release, 'created':time.time(),
              'rootImageSha256':sha(image),'network':'loopback only; no virtual NIC', 'renderer':'Weston Pixman',
              'files':files, 'initramfsSha256':sha(OUT/'initramfs.cpio.gz'), 'kernelSha256':sha(OUT/'vmlinuz')}
    (OUT / 'build.json').write_text(json.dumps(report, indent=2) + '\n')
    print(f'Ready: {image} ({len(files)} files recorded)', flush=True)

if __name__ == '__main__': main()
