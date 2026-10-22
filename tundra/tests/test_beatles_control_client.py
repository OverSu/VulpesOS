# SPDX-License-Identifier: MPL-2.0
import concurrent.futures
from pathlib import Path
import socket
import subprocess
import tempfile
import unittest


class ControlRelayTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.directory=tempfile.TemporaryDirectory()
        cls.root=Path(cls.directory.name)
        code=(Path(__file__).parents[1]/'probes/beatles-control-client.c').read_text()
        for name in ('phone-control','wifi-control'):
            code=code.replace('/work/'+name+'.sock',str(cls.root/(name+'.sock')))
        source=cls.root/'client.c';source.write_text(code);cls.binary=cls.root/'client'
        subprocess.run(['cc','-Wall','-Wextra','-Werror',str(source),'-o',str(cls.binary)],check=True)

    @classmethod
    def tearDownClass(cls):cls.directory.cleanup()

    def exchange(self,mode,reply):
        path=self.root/(('phone' if mode=='--radio' else 'wifi')+'-control.sock')
        path.unlink(missing_ok=True)
        with socket.socket(socket.AF_UNIX,socket.SOCK_STREAM) as server:
            server.bind(str(path));server.listen(1);server.settimeout(3)
            def broker():
                with server.accept()[0] as conn:
                    conn.settimeout(3);data=b''
                    while b'\n' not in data:data+=conn.recv(4096)
                    for part in reply:conn.sendall(part)
                    return data
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
                future=pool.submit(broker)
                result=subprocess.run([str(self.binary),mode],input=b'{"operation":"status"}',capture_output=True,timeout=4)
                request=future.result()
        return result,request

    def test_radio_and_wifi_preserve_broker_envelopes(self):
        for mode in ('--radio','--wifi'):
            result,request=self.exchange(mode,[b'{"ok":true,',b'"result":[]}\n'])
            self.assertEqual(result.returncode,0)
            self.assertEqual(result.stdout,b'{"ok":true,"result":[]}\n')
            self.assertEqual(request,b'{"operation":"status"}\n')

    def test_disconnect_and_oversized_response_fail(self):
        for reply in ([b'{"incomplete":'],[b'x'*65537]):
            result,_=self.exchange('--wifi',reply)
            self.assertNotEqual(result.returncode,0)
            self.assertEqual(result.stdout,b'')

    def test_unknown_target_and_multiple_requests_are_rejected(self):
        for mode,data in [('--shell',b'{}'),('--radio',b'{}\n{}'),('--wifi',b'x'*8193)]:
            result=subprocess.run([str(self.binary),mode],input=data,capture_output=True,timeout=3)
            self.assertNotEqual(result.returncode,0)
            self.assertEqual(result.stdout,b'')

if __name__=='__main__':unittest.main()
