# SPDX-License-Identifier: MPL-2.0
from pathlib import Path
import socket
import subprocess
import tempfile
import unittest

SOURCE=Path(__file__).parents[1]/'devices/beatles/boot/vulpes-boot.sh'

class GuardTests(unittest.TestCase):
    def run_guard(self,mode):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);base=root/'runtime';base.mkdir()
            screen=root/'fb';screen.touch();ril=socket.socket(socket.AF_UNIX)
            try:
                ril.bind(str(root/'ril'))
                start=root/'start';start.write_text('#!/bin/sh\necho "$1" >> '+str(root/'fallback')+'\n');start.chmod(0o755)
                supervisor=root/'display'
                action='exit 1' if mode=='launch-failed' else 'exit 0'
                if mode=='ready':action='printf \'{"readyMs":100}\' > '+str(base/'rootfs/work/gaia-audit.json')
                supervisor.write_text('#!/bin/sh\n'+action+'\n');supervisor.chmod(0o755)
                if mode!='missing':
                    (base/'rootfs/opt/firefox').mkdir(parents=True);(base/'rootfs/work').mkdir()
                    engine=base/'rootfs/opt/firefox/firefox';engine.touch();engine.chmod(0o755)
                    (base/'runtime-ready').touch()
                if mode=='disabled':(base/'disable-boot').touch()
                script=SOURCE.read_text().replace('/data/local/vulpes-beatles',str(base)).replace('/system/bin/start',str(start)).replace('/sbin/vulpes-display',str(supervisor)).replace('/system/bin/busybox grep','grep').replace('/dev/graphics/fb0',str(screen)).replace('/dev/socket/rilproxy',str(root/'ril')).replace('sleep 1',':')
                proc=subprocess.run(['sh','-c',script],capture_output=True,text=True,timeout=5)
                self.assertEqual(proc.returncode,0,proc.stderr)
                return (root/'fallback').exists(),(base/'stop-session').exists()
            finally:ril.close()
    def test_missing_runtime_falls_back(self):self.assertEqual(self.run_guard('missing'),(True,False))
    def test_opt_out_falls_back(self):self.assertEqual(self.run_guard('disabled'),(True,False))
    def test_failed_launch_falls_back(self):self.assertEqual(self.run_guard('launch-failed'),(True,False))
    def test_stalled_gaia_requests_stop_and_falls_back(self):self.assertEqual(self.run_guard('stalled'),(True,True))
    def test_ready_gaia_does_not_start_second_ui(self):self.assertEqual(self.run_guard('ready'),(False,False))

if __name__=='__main__':unittest.main()
