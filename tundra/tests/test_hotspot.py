# SPDX-License-Identifier: MPL-2.0
import importlib.util
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('wifi',Path(__file__).resolve().parents[1]/'runtime/wifi-control.py')
wifi=importlib.util.module_from_spec(spec);spec.loader.exec_module(wifi)

class HotspotTests(unittest.TestCase):
    def test_private_profile_roundtrip_and_validation(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(wifi,'active_wifi_uuid',return_value=None), patch.object(wifi,'nm',return_value=SimpleNamespace(returncode=0)) as nm:
            root=Path(directory)
            request={'operation':'hotspotSave','ssid':'Vulpes é','security':'wpa2-psk','password':r' space\s tail '}
            value=wifi.dispatch(request,root)
            self.assertEqual(value['password'],request['password']);self.assertEqual(value['ssid'],request['ssid'])
            path=root/'vulpes-hotspot.nmconnection'
            self.assertEqual(path.stat().st_mode&0o777,0o600)
            self.assertIn('method=shared',path.read_text());self.assertIn('proto=rsn',path.read_text())
            self.assertEqual(wifi.saved_profiles(root),[])
            for invalid in ({'ssid':'x\ninject'},{'password':'short'},{'security':'wep'},{'ssid':'é'*17},{'extra':True}):
                before=path.read_bytes();count=nm.call_count
                with self.assertRaises(wifi.WifiError):wifi.dispatch(request|invalid,root)
                self.assertEqual(path.read_bytes(),before);self.assertEqual(nm.call_count,count)
            with patch.object(wifi,'active_wifi_uuid',return_value=wifi.HOTSPOT_UUID):
                with self.assertRaisesRegex(wifi.WifiError,'HOTSPOT_IN_USE'):wifi.dispatch(request,root)

    def test_password_is_not_rewritten_as_profile_configuration(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(wifi,'active_wifi_uuid',return_value=None), patch.object(wifi,'nm',return_value=SimpleNamespace(returncode=0)):
            for password in ['autoconnect=true','mode=infrastructure','id=Vulpes Wi-Fi']:
                result=wifi.dispatch({'operation':'hotspotSave','ssid':'test','security':'wpa2-psk','password':password},Path(directory))
                self.assertEqual(result['password'],password)

    def test_save_failure_restores_previous(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(wifi,'active_wifi_uuid',return_value=None):
            root=Path(directory);path=root/'vulpes-hotspot.nmconnection'
            request={'operation':'hotspotSave','ssid':'test','security':'wpa2-psk','password':'testpassword'}
            with patch.object(wifi,'nm',return_value=SimpleNamespace(returncode=1)) as nm:
                with self.assertRaisesRegex(wifi.WifiError,'HOTSPOT_SAVE_FAILED'):wifi.dispatch(request,root)
                self.assertFalse(path.exists());self.assertIn(('connection','delete','uuid',wifi.HOTSPOT_UUID),[c.args for c in nm.call_args_list])
                path.write_text('previous')
                with self.assertRaisesRegex(wifi.WifiError,'HOTSPOT_SAVE_FAILED'):wifi.dispatch(request,root)
                self.assertEqual(path.read_text(),'previous')

    def test_power_readback_and_reconnect_after_failure_or_stop(self):
        previous='8a16e3b3-c49b-44ca-9041-c3bac464f748'
        for fail in (False,True):
            active=[previous];commands=[]
            def nm(*args,**kwargs):
                commands.append(args)
                if args[:2]==('connection','up'):
                    if fail and args[-1]==wifi.HOTSPOT_UUID:return SimpleNamespace(returncode=1)
                    active[0]=args[-1]
                if args[:2]==('connection','down'):active[0]=None
                return SimpleNamespace(returncode=0)
            with tempfile.TemporaryDirectory() as directory, patch.object(wifi,'active_wifi_uuid',side_effect=lambda:active[0]),patch.object(wifi,'nm',side_effect=nm):
                root=Path(directory)
                with patch.object(wifi,'HOTSPOT_RETURN',root/'return.json'):
                    wifi.dispatch({'operation':'hotspotSave','ssid':'test','security':'open','password':''},root)
                    if fail:
                        with self.assertRaisesRegex(wifi.WifiError,'HOTSPOT_START_FAILED'):wifi.dispatch({'operation':'hotspotPower','enabled':True},root)
                    else:
                        self.assertTrue(wifi.dispatch({'operation':'hotspotPower','enabled':True},root)['enabled'])
                        self.assertFalse(wifi.dispatch({'operation':'hotspotPower','enabled':False},root)['enabled'])
                    self.assertEqual(active[0],previous);self.assertFalse(wifi.HOTSPOT_RETURN.exists())
                    self.assertIn(('connection','up','uuid',previous),commands)

if __name__=='__main__':unittest.main()
