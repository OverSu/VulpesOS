# SPDX-License-Identifier: MPL-2.0
import gzip
import json
from pathlib import Path
import struct
import subprocess
import sys
import tempfile
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'tools'))
from tundra import ROOT, checked_source, digest

class USBPackagingTests(unittest.TestCase):
    def test_refuses_host_execution(self):
        init=ROOT/'out/usb-diagnostic/x86_64/init'
        if not init.exists(): self.skipTest('Build USB diagnostic first')
        result=subprocess.run([str(init)],capture_output=True,text=True,timeout=5)
        self.assertEqual(result.returncode,2)
        self.assertIn('must be PID 1',result.stdout)

    def test_sargo_usb_independent_unpack(self):
        folder=ROOT/'out/usb-diagnostic'
        if not (folder/'build.json').exists():self.skipTest('Build USB diagnostic first')
        report=json.loads((folder/'build.json').read_text())
        image=folder/report['file']
        self.assertFalse(report['flashReady'])
        self.assertEqual(digest(image),report['imageSha256'])
        with tempfile.TemporaryDirectory() as tmp:
            result=subprocess.run([sys.executable,str(checked_source('aosp-mkbootimg')/'unpack_bootimg.py'),'--boot_img',str(image),'--out',tmp],check=True,capture_output=True,text=True)
            self.assertIn('tundra.usb=1',result.stdout)
            ramdisk=(Path(tmp)/'ramdisk').read_bytes()
            self.assertEqual(ramdisk,(folder/'aarch64/initramfs.cpio.gz').read_bytes())
            elf=subprocess.run(['cpio','-i','--to-stdout','init'],input=gzip.decompress(ramdisk),capture_output=True,check=True).stdout
            self.assertEqual(elf[:4],b'\x7fELF')
            self.assertEqual(struct.unpack_from('<H',elf,18)[0],183)
            self.assertEqual(elf,(folder/'aarch64/init').read_bytes())
