# SPDX-License-Identifier: MPL-2.0
import importlib.util
from pathlib import Path
import stat
import sys
import unittest
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
from ramdisk_reference import read_newc, resolve
from tundra import cpio
spec=importlib.util.spec_from_file_location('hal_policy',ROOT/'runtime/hal_policy.py')
policy=importlib.util.module_from_spec(spec);spec.loader.exec_module(policy)


class BootTests(unittest.TestCase):
    def test_cpio_roundtrip_and_absolute_library_symlink(self):
        data=cpio([('bin',stat.S_IFDIR|0o755,b'',0,0),('bin/tool',stat.S_IFREG|0o755,b'ELF',0,0),('bin/link',stat.S_IFLNK|0o777,b'/bin/tool',0,0)])
        entries=read_newc(data)
        self.assertEqual(resolve(entries,'bin/link'),b'ELF')

    def test_hardlinked_busybox_payload_is_not_lost(self):
        import gzip
        data=bytearray(gzip.decompress(cpio([
            ('bin/busybox',stat.S_IFREG|0o755,b'',0,0),
            ('bin/last-applet',stat.S_IFREG|0o755,b'ELF payload',0,0)])))
        offset=0
        for _ in range(2):
            fields=[int(data[offset+6+i*8:offset+14+i*8],16) for i in range(13)]
            data[offset+6:offset+14]=b'00000007'
            data[offset+38:offset+46]=b'00000002'
            start=(offset+110+fields[11]+3)&~3
            offset=(start+fields[6]+3)&~3
        self.assertEqual(resolve(read_newc(bytes(data)),'bin/busybox'),b'ELF payload')

    def test_cpio_rejects_invalid_header(self):
        with self.assertRaises(ValueError):read_newc(b'x'*111)

    def test_hal_keeps_display_but_removes_app_telemetry_and_flash_services(self):
        text='''# upstream copyright
service vendor.hwcomposer-2-2 /vendor/bin/hw/composer
    class hal animation
    onrestart restart surfaceflinger
service vendor.pixelstats_vendor /vendor/bin/pixelstats
    class hal
service flash_recovery /system/bin/install-recovery.sh
    class main
on boot
    start flash_recovery
    start vendor.pixelstats_vendor
    start vendor.hwcomposer-2-2
    mount_all /vendor/etc/fstab.sargo
    exec -- /system/bin/sh /vendor/bin/mutate.sh
    write /dev/block/by-name/boot_a unsafe
    write /sys/class/android_usb/android0/enable 1
    write /dev/cpuset/cpus 0-7
'''
        output,report=policy.filter_rc(text)
        self.assertIn('start vendor.hwcomposer-2-2',output)
        self.assertIn('# upstream copyright',output)
        self.assertIn('write /dev/cpuset/cpus',output)
        for forbidden in ('pixelstats','flash_recovery','mount_all','exec --','/dev/block','android_usb','restart surfaceflinger'):
            self.assertNotIn(forbidden,output)
        self.assertEqual(report['services'],['vendor.hwcomposer-2-2'])

    def test_android_multiline_commands_preserve_their_section(self):
        source = 'service zygote /system/bin/app_process \\\n    --zygote\non boot\n    write /dev/event-log-tags "# owned by logd\n"\n'
        output, report = policy.filter_rc(source)
        self.assertNotIn('app_process', output)
        self.assertIn('write /dev/event-log-tags "# owned by logd\n"', output)

    def test_ueventd_permissions_are_not_parsed_as_init_commands(self):
        for name in ('ueventd.rc','ueventd.sargo.rc','ueventd.qcom.rc'):
            self.assertFalse(policy.is_init_script(Path('/android/vendor')/name))
        self.assertTrue(policy.is_init_script(Path('/android/init.sargo.rc')))

    def test_trial_service_failure_does_not_request_device_reboot(self):
        output,_=policy.filter_rc('service servicemanager /system/bin/servicemanager\n    critical\n    class core\n')
        self.assertNotIn('critical',output)
        self.assertIn('class core',output)

    def test_display_keeps_its_platform_properties_and_configstore(self):
        output,report=policy.filter_rc('on post-fs-data\n    load_system_props\nservice vendor.configstore-hal /vendor/bin/hw/android.hardware.configstore@1.1-service\n    class hal animation\n    user system\n')
        self.assertIn('load_system_props',output)
        self.assertIn('vendor.configstore-hal',report['services'])

    def test_native_config_uses_a_valid_shell_and_denies_block_devices(self):
        import tempfile
        spec = importlib.util.spec_from_file_location('native_prepare', ROOT/'runtime/prepare-native.py')
        native = importlib.util.module_from_spec(spec); spec.loader.exec_module(native)
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root/'opt/vulpes/trial').mkdir(parents=True)
            (root/'opt/vulpes/trial/session.py').touch()
            native.prepare(root)
            shells = (root/'etc/shells').read_text().splitlines()
            for line in (root/'etc/passwd').read_text().splitlines():
                if line.startswith(('root:', 'droidian:')):
                    self.assertIn(line.split(':')[-1], shells)
            config = (root/'etc/tundra/lxc.conf').read_text()
            self.assertIn('lxc.cgroup.devices.deny = b *:* rwm', config)
            self.assertIn('lxc.cgroup2.devices.deny = b *:* rwm', config)
            self.assertNotIn('host', config)
            self.assertIn('lxc.cgroup2.memory.max = 536870912', config)
            service=(root/'etc/systemd/system/tundra-display.service').read_text()
            self.assertIn('ExecStartPre=+chvt 7', service)
            self.assertNotIn('ExecStartPost=', service)
            # systemd-user's PAM stack includes these on the reference root.
            for name in ('common-account', 'common-session-noninteractive'):
                self.assertIn('pam_unix.so', (root/'etc/pam.d'/name).read_text())
            self.assertIn('pam_deny.so', (root/'etc/pam.d/other').read_text())

    def test_hal_denies_indirect_service_start_and_mount_of_block_device(self):
        for line in ('setprop ctl.start zygote','setprop ctl.restart vendor.pixelstats_vendor',
                     'mount ext4 /dev/mmcblk0p72 /data','mount tmpfs /dev/block/x /data'):
            self.assertFalse(policy.command_allowed(line.split()),line)

    def test_interactive_boot_checks_are_opt_in(self):
        import tempfile
        spec = importlib.util.spec_from_file_location('native_prepare', ROOT/'runtime/prepare-native.py')
        native = importlib.util.module_from_spec(spec); spec.loader.exec_module(native)
        for diagnostics in (False, True):
            with tempfile.TemporaryDirectory() as temporary:
                root = Path(temporary)
                (root/'opt/vulpes/trial').mkdir(parents=True)
                (root/'opt/vulpes/trial/session.py').touch()
                native.prepare(root, diagnostics=diagnostics)
                service = (root/'etc/systemd/system/tundra-display.service').read_text()
                self.assertEqual('--diagnostics' in service, diagnostics)


if __name__=='__main__':unittest.main()
