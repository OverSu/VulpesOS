#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Build a private, temporary Sargo SSH ramdisk from verified installed helpers."""
import argparse
import base64
import importlib.util
import json
import os
from pathlib import Path
import shlex
import stat
import struct
import subprocess
import tempfile
import time
from cryptography.hazmat.primitives.asymmetric import rsa, ec
from cryptography.hazmat.primitives import serialization
from ramdisk_reference import read_newc, select_helpers
from storage_layout import mount_table
from tundra import ROOT, cpio, checked_source, digest, save, linker


def load_boot():
    spec=importlib.util.spec_from_file_location('boot_test',ROOT/'tools/test-sargo-boot.py')
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    return module


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',type=Path,required=True)
    parser.add_argument('--layout',type=Path,required=True)
    parser.add_argument('--native',action='store_true',help='Switch to the staged native root with a ten-minute watchdog')
    parser.add_argument('--system-image',type=Path,help='system.json for a self-contained image staged at /tundra/images/<sha256>.ext4')
    parser.add_argument('--hold-hal',action='store_true',help='Boot basic.target first so HAL startup can be traced over USB')
    parser.add_argument('--runtime-config', action='store_true', help='Apply the current runtime recipe to the RAM overlay')
    parser.add_argument('--network', action='store_true', help='Enable experimental WLAN and isolated Qualcomm NV copies; requires --runtime-config')
    parser.add_argument('--hardware', action='store_true', help='Enable experimental modem/audio/camera HAL services; requires --network')
    parser.add_argument('--local-debugger',action='store_true',help='Private RAM diagnosis only: Marionette on loopback 2858; never flash this image')
    parser.add_argument('--diagnostics', action='store_true', help='Open apps and scroll Gaia during qualification; requires --runtime-config')
    parser.add_argument('--state', type=Path, help='Prepared Tundra data-image manifest; enables persistent writes in that file')
    parser.add_argument('--no-deadline', action='store_true', help='Keep the persistent development boot running; requires --state')
    args=parser.parse_args()
    if args.hold_hal and not args.native:parser.error('--hold-hal requires --native')
    if args.system_image and not args.native:parser.error('--system-image requires --native')
    if args.runtime_config and not args.native:parser.error('--runtime-config requires --native')
    if args.hardware and not args.network:parser.error('--hardware requires --network')
    if args.network and not args.runtime_config:parser.error('--network requires --runtime-config')
    if args.diagnostics and not args.runtime_config:parser.error('--diagnostics requires --runtime-config')
    if args.state and (not args.system_image or not args.runtime_config):
        parser.error('--state requires --system-image and --runtime-config')
    if args.no_deadline and not args.state:parser.error('--no-deadline requires --state')
    state = None
    if args.state:
        from persistent_state import validate_manifest
        state = validate_manifest(args.state)
    system = None
    if args.system_image:
        system = json.loads(args.system_image.read_text())
        image_path = args.system_image.resolve().parent/system['image']
        if (system.get('device') != 'sargo' or not system.get('filesystemCheckPassed')
                or digest(image_path) != system['imageSha256']):
            raise ValueError('System image provenance mismatch')
    if state and state['systemImageSha256'] != system['imageSha256']:
        raise ValueError('Data image belongs to another system image')
    os.umask(0o077)
    built_at=int(time.time())
    out=args.output.resolve();out.mkdir(parents=True,exist_ok=False)
    plan,_=load_boot().checked_plan()
    layout=json.loads(args.layout.read_text())
    storage_table = mount_table(layout)
    source=Path(plan['backupDirectory'])/'boot_a.img'
    packager=checked_source('aosp-mkbootimg')
    unpack=out/'original'
    result=subprocess.check_output(['python3',str(packager/'unpack_bootimg.py'),'--boot_img',str(source),'--out',str(unpack),'--format=mkbootimg'],text=True)
    options=shlex.split(result);fields=dict(zip(options[::2],options[1::2]))
    if fields['--header_version']!='0':raise ValueError('Expected header v0')
    with tempfile.TemporaryDirectory() as temp:
        helpers=select_helpers(read_newc((unpack/'ramdisk').read_bytes()),Path(temp),
                               extra=('sbin/blkid','sbin/e2fsck') if state else ())
    files={name:(0o755 if name.startswith(('bin/','sbin/')) or '/ld-' in name else 0o644,content) for name,content in helpers.items()}
    # ARM64 binaries in the Android ramdisk request the dynamic loader at
    # /lib/ld-linux-aarch64.so.1. Some source ramdisks expose the same loader
    # only below /lib/aarch64-linux-gnu; keep both paths in the trial image.
    loader='lib/aarch64-linux-gnu/ld-linux-aarch64.so.1'
    if loader in files:
        files.setdefault('lib/ld-linux-aarch64.so.1', files[loader])
    # Generate fresh trial credentials. Nothing from the installed ramdisk's
    # /etc/dropbear or /root is copied. Keep this entire output private.
    client=ec.generate_private_key(ec.SECP256R1())
    (out/'client-key').write_bytes(client.private_bytes(serialization.Encoding.PEM,serialization.PrivateFormat.OpenSSH,serialization.NoEncryption()))
    public=client.public_key().public_bytes(serialization.Encoding.OpenSSH,serialization.PublicFormat.OpenSSH)
    host=rsa.generate_private_key(public_exponent=65537,key_size=3072)
    numbers=host.private_numbers()
    def string(data):return struct.pack('>I',len(data))+data
    def integer(n):
        data=n.to_bytes((n.bit_length()+7)//8,'big')
        return string((b'\0' if data[0]&128 else b'')+data)
    # Dropbear src/rsa.c: type, e, n, d, p, q in SSH string/mpint format.
    private=string(b'ssh-rsa')+b''.join(integer(n) for n in (numbers.public_numbers.e,numbers.public_numbers.n,numbers.d,numbers.p,numbers.q))
    hostpublic=host.public_key().public_bytes(serialization.Encoding.OpenSSH,serialization.PublicFormat.OpenSSH).decode()
    (out/'known_hosts').write_text('[10.15.19.82]:2222 '+hostpublic+'\n[127.0.0.1]:2222 '+hostpublic+'\n')
    init=(ROOT/'boot/rescue-init.sh').read_bytes().replace(b'# No LVM activation',
        ('EXPECTED_STORAGE_HASH='+shlex.quote(layout['firstMiBSha256'])+'\n# No LVM activation').encode())
    init=init.replace(b"'0 104448000 linear /dev/mmcblk0p72 329728'",
                      shlex.quote(storage_table).encode())
    sources=[Path(__file__),ROOT/'boot/rescue-init.sh',ROOT/'tools/ramdisk_reference.py',
             ROOT/'tools/storage_layout.py']
    if state:
        # Keep the existing layout intact; only /tundra/data/<UUID>.ext4 is used
        # for Tundra state. Opening its containing filesystem RW is necessary.
        init=init.replace(b'--readonly --table', b'--table')
        init=init.replace(b'-o ro,noload /dev/mapper/tundra-installed-ro', b'-o rw /dev/mapper/tundra-installed-ro')
        init=init.replace(b'# Temporary RAM-only boot. Installed data is never mounted writable.', b'# Private persistent boot. Only the dedicated Tundra data file receives system writes.')
        init=init.replace(b'# No LVM activation, fsck, journal replay, resizing, or writes to a block device.', b'# Use the inventoried filesystem without resizing or formatting it.')
        sources.append(ROOT/'tools/persistent_state.py')
    shared_ui = {}
    if args.native:
        binary=out/'watchdog'
        subprocess.run(['clang','--target=aarch64-linux-gnu','--ld-path='+str(linker()),'-Os','-ffreestanding','-fno-builtin','-fno-stack-protector','-fno-pie','-fno-unwind-tables','-fno-asynchronous-unwind-tables','-Wall','-Wextra','-Werror','-nostdlib','-static','-Wl,--build-id=none','-Wl,-e,_start',str(ROOT/'boot/watchdog.c'),'-o',str(binary)],check=True)
        init=init.replace(b"(sleep 480; echo 'Tundra trial deadline reached'; reboot -f) &",b'/sbin/tundra-watchdog &')
        if args.no_deadline:
            init=init.replace(b'/sbin/tundra-watchdog &', b'# Persistent development boot: no timed reboot.')
        init=init.replace(b'while :; do sleep 5; done',b'exec /bin/sh /native-root.sh')
        import io,tarfile
        with tempfile.TemporaryDirectory() as temporary:
            configroot=Path(temporary)/'root'
            (configroot/'opt/vulpes/trial').mkdir(parents=True)
            (configroot/'opt/vulpes/trial/session.py').touch()
            spec=importlib.util.spec_from_file_location('native',ROOT/'runtime/prepare-native.py')
            native=importlib.util.module_from_spec(spec);spec.loader.exec_module(native);native.prepare(configroot, network=args.network, hardware=args.hardware, diagnostics=args.diagnostics)
            display=configroot/'etc/systemd/system/tundra-display.service'
            if display.exists():
                display.write_text(display.read_text().replace('[Service]',
                    '[Service]\nEnvironment=TUNDRA_LOCAL_DEBUGGER='+('1' if args.local_debugger else '0')))
            if state:
                dropin=configroot/'etc/systemd/system/tundra-display.service.d'
                dropin.mkdir(parents=True,exist_ok=True)
                (dropin/'persistent.conf').write_text('[Service]\nEnvironment=TUNDRA_PERSISTENT=1\n')
                users=configroot/'etc/systemd/system/systemd-sysusers.service.d'
                users.mkdir(parents=True,exist_ok=True)
                # Add newly required service accounts even when a previous
                # boot marked /etc up to date. Existing identities are retained.
                (users/'tundra.conf').write_text('[Unit]\nConditionNeedsUpdate=\nConditionCredential=\n')
            buffer=io.BytesIO()
            def owned(info):
                info.uid=info.gid=0
                info.uname=info.gname='root'
                info.mtime=0
                if info.isdir():info.mode=0o755
                elif info.isfile() and info.name.endswith('.conf'):info.mode=0o644
                return info
            with tarfile.open(fileobj=buffer,mode='w') as archive:
                # Most runtime policy lives under /etc, but a few reference
                # applications select device backends from /usr/lib/droidian.
                # Include every generated top-level directory so a native
                # trial can override those selectors in its disposable layer.
                for directory in ('etc', 'usr'):
                    config_dir = configroot/directory
                    if config_dir.exists():
                        archive.add(config_dir, arcname=directory, filter=owned)
            files['native-config.tar']=(0o600,buffer.getvalue())
        sources += list(sorted((ROOT/'runtime').glob('*.py')))
        files['sbin/tundra-watchdog']=(0o755,binary.read_bytes())
        native_init=(ROOT/'boot/native-root.sh').read_bytes().replace(b'# BUILD_TIME_FLOOR', ('BUILD_EPOCH='+str(built_at)).encode())
        if args.runtime_config:
            native_init=native_init.replace(b'# RUNTIME_CONFIG_OVERLAY', b'APPLY_NATIVE_CONFIG=1')
        if system:
            sha = system['imageSha256']
            native_init = native_init.replace(b'# A kernel fallback',
                ('SYSTEM_IMAGE=/installed/tundra/images/'+sha+'.ext4\nSYSTEM_IMAGE_SHA='+sha+'\n# A kernel fallback').encode())
            # Bundle UI changes with the boot trial rather than retransferring
            # the entire immutable system image for each CSS/JS adjustment.
            buffer = io.BytesIO()
            selected = [*sorted((ROOT.parent/'host').rglob('*')),
                        *sorted((ROOT.parent/'services').rglob('*.mjs')),
                        *sorted((ROOT.parent/'gaia/shared/elements/vulpes-fonts').rglob('*')),
                        *sorted((ROOT.parent/'overrides').rglob('*')),
                        ROOT.parent/'assets/webapps/search.gaiamobile.org/manifest.webapp',
                        ROOT.parent/'tools/serve-gaia.py',
                        ROOT.parent/'release.json', ROOT.parent/'tests/ProbeChild.sys.mjs',
                        ROOT/'droidian/probe.sys.mjs', ROOT/'droidian/session.py']
            with tarfile.open(fileobj=buffer, mode='w') as archive:
                for path in selected:
                    if not path.is_file(): continue
                    relative = str(path.relative_to(ROOT.parent))
                    target = 'trial/'+path.name if path in (ROOT/'droidian/probe.sys.mjs', ROOT/'droidian/session.py') else relative
                    archive.add(path, arcname='opt/vulpes/'+target, filter=owned)
                    shared_ui[relative] = digest(path)
            files['shared-ui.tar'] = (0o600, buffer.getvalue())
        if state:
            config = ('STATE_IMAGE=/installed/tundra/data/'+state['uuid']+'.ext4\n'
                      'STATE_UUID='+state['uuid']+'\nSTATE_BYTES='+str(state['bytes'])+'\n')
            native_init=native_init.replace(b'# A kernel fallback',config.encode()+b'# A kernel fallback')
        if args.hold_hal:native_init=native_init.replace(b'--unit=tundra.target',b'--unit=basic.target')
        files['native-root.sh']=(0o755,native_init)
        sources += [ROOT/'boot/watchdog.c',ROOT/'boot/init.c',ROOT/'boot/native-root.sh']
    files.update({'init':(0o755,init),'etc/tundra-hostkey':(0o600,private),
        'root/.ssh/authorized_keys':(0o600,public+b'\n'),
        'etc/passwd':(0o644,b'root:x:0:0:Tundra development:/root:/bin/sh\n'),
        'etc/shadow':(0o600,b'root::20000:0:99999:7:::\n'),
        'etc/group':(0o644,b'root:x:0:\n'),
        'etc/shells':(0o644,b'/bin/sh\n'),
        'etc/nsswitch.conf':(0o644,b'passwd: files\ngroup: files\nshadow: files\n')})
    directories={'dev','proc','sys','run','installed'}
    for name in files:
        directories.update(str(p) for p in Path(name).parents if str(p)!='.')
    entries=[(n,stat.S_IFDIR|(0o700 if n.startswith('root') else 0o755),b'',0,0) for n in sorted(directories)]
    entries += [(n,stat.S_IFREG|mode,data,0,0) for n,(mode,data) in sorted(files.items())]
    entries += [('bin/sh',stat.S_IFLNK|0o777,b'busybox',0,0),('dev/console',stat.S_IFCHR|0o600,b'',5,1)]
    ramdisk=out/'initramfs.cpio.gz';ramdisk.write_bytes(cpio(entries))
    kernel_hash=digest(unpack/'kernel')
    fields['--ramdisk']=str(ramdisk);fields['--cmdline']+=' rdinit=/init tundra.rescue=1 panic=10'
    image=out/('tundra-sargo-PRIVATE-PERSISTENT.img' if state else 'tundra-sargo-PRIVATE-RAM-TRIAL.img')
    command=['python3',str(packager/'mkbootimg.py')]
    for k,v in fields.items():command.extend([k,v])
    subprocess.run(command+['-o',str(image)],check=True)
    if image.stat().st_size>67108864:raise ValueError('Boot image too large')
    verify=out/'verify'
    subprocess.run(['python3',str(packager/'unpack_bootimg.py'),'--boot_img',str(image),'--out',str(verify)],check=True,stdout=subprocess.DEVNULL)
    if digest(verify/'kernel')!=digest(unpack/'kernel') or digest(verify/'ramdisk')!=digest(ramdisk):raise ValueError('Roundtrip failed')
    import shutil
    # The source ramdisk contains installed private keys: retain no extracted copy.
    shutil.rmtree(unpack);shutil.rmtree(verify)
    # Keep the inputs beside the immutable image. Later edits to the checkout
    # must not invalidate an otherwise intact, qualified recovery trial.
    snapshot=out/'sources'
    for path in sources + [ROOT.parent/name for name in shared_ui]:
        target=snapshot/path.relative_to(ROOT.parent)
        target.parent.mkdir(parents=True,exist_ok=True)
        shutil.copy2(path,target)
    save(out/'build.json',{'scope':'Private persistent Sargo development boot; unqualified' if state else ('Private temporary native-root trial; unqualified' if args.native else 'Private temporary SSH boot; installed root read-only; no graphical session'),
        'builtAtUnix':built_at,'runtimeConfigOverlay':args.runtime_config,'networkTrial':args.network,'hardwareTrial':args.hardware,'interactiveDiagnostics':args.diagnostics,'image':image.name,'imageSha256':digest(image),'sourceBootSha256':digest(source),
        'serialSha256':plan['serialSha256'],'kernelSha256':kernel_hash,
        'ramdiskSha256':digest(ramdisk),'roundtripPassed':True,'flashReady':False,'localDebugger':args.local_debugger,'watchdogSeconds':None if args.no_deadline else (600 if args.native else 480),'persistentState':state,'storageWrites':bool(state),'nativeRootRequested':args.native,'halHeldForDiagnostics':args.hold_hal,
        'layout':layout,'layoutSha256':digest(args.layout),'systemImage':system,'sharedUiHashes':shared_ui,'sourceSnapshot':True,'sources':{str(p.relative_to(ROOT)):digest(p) for p in sources},
        'helpers':{n:__import__('hashlib').sha256(b).hexdigest() for n,b in helpers.items()},
        'containsPrivateTrialHostKey':True,'installedKeysCopied':False})
    print(image)


if __name__=='__main__':main()
