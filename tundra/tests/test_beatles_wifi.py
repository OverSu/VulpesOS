# SPDX-License-Identifier: MPL-2.0
import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('beatles_wifi',Path(__file__).parents[1]/'devices/beatles/wifi_control.py')
wifi=importlib.util.module_from_spec(spec);spec.loader.exec_module(wifi)

class WifiTests(unittest.TestCase):
    def fixture(self):
        obj=wifi.Wifi.__new__(wifi.Wifi)
        obj.last_scan=[{'id':'aa:bb:cc:dd:ee:ff','ssid':'Test "é"','security':'wpa-psk'}]
        obj.enabled=lambda:True
        obj.known=lambda:[]
        obj.stopping=False
        obj.lease=lambda state:None
        return obj

    def test_scan_decodes_ssids_and_does_not_offer_enterprise_as_psk(self):
        data='bssid / frequency / signal level / flags / ssid\n'
        data+='aa:bb:cc:dd:ee:ff\t2412\t-45\t[WPA2-PSK-CCMP][ESS]\tCaf\\xc3\\xa9\\\\Test\n'
        data+='00:11:22:33:44:55\t5200\t-80\t[WPA2-EAP-CCMP]\tOffice\n'
        rows=wifi.parse_scan(data)
        self.assertEqual(rows[0]['ssid'],'Café\\Test')
        self.assertEqual(rows[0]['signal'],100)
        self.assertEqual(rows[1]['security'],'unsupported')
        self.assertEqual(wifi.parse_scan('header\nnot-a-bssid\t2412\t-20\t[ESS]\tfake'),[])

    def test_invalid_password_cannot_create_or_mutate_network(self):
        with patch.object(wifi,'command') as command:
            with self.assertRaisesRegex(ValueError,'WIFI_INVALID_PASSWORD'):
                self.fixture().connect({'operation':'connect','id':'aa:bb:cc:dd:ee:ff','password':'short'})
            command.assert_not_called()

    def test_forget_rejects_command_injection(self):
        with patch.object(wifi,'command') as command:
            with self.assertRaisesRegex(ValueError,'WIFI_INVALID_REQUEST'):
                self.fixture().request({'operation':'forget','id':'0\nREMOVE_NETWORK all'})
            command.assert_not_called()

    def test_connect_encodes_ssid_and_passphrase_before_supplicant(self):
        obj=self.fixture();obj.state=lambda:{'state':'connected','network':{'ssid':'Test "é"'}}
        calls=[]
        def command(text,required=True):
            calls.append(text)
            return '7' if text=='ADD_NETWORK' else 'OK'
        with patch.object(wifi,'command',command),patch.object(wifi,'android',return_value='ok'):
            obj.connect({'operation':'connect','id':'aa:bb:cc:dd:ee:ff','password':'test-only-password'})
        self.assertIn('SET_NETWORK 7 ssid '+'Test "é"'.encode().hex(),calls)
        psk=next(c for c in calls if c.startswith('SET_NETWORK 7 psk ')).split()[-1]
        self.assertEqual(len(psk),64)
        self.assertNotIn('test-only-password',' '.join(calls))
        self.assertIn('SAVE_CONFIG',calls)

    def test_saved_network_reuses_credentials_without_reading_password(self):
        obj=self.fixture();obj.known=lambda:[{'id':'3','ssid':'Test "é"','security':'wpa-psk'}]
        obj.state=lambda:{'state':'connected','network':{'ssid':'Test "é"'}}
        with patch.object(wifi,'command',return_value='OK') as command,patch.object(wifi,'android',return_value='ok'):
            obj.connect({'operation':'connect','id':'aa:bb:cc:dd:ee:ff'})
        self.assertEqual([call.args[0] for call in command.call_args_list],['SELECT_NETWORK 3'])

    def test_save_failure_rolls_back_new_profile(self):
        obj=self.fixture();obj.state=lambda:{'state':'connected','network':{'ssid':'Test "é"'}}
        calls=[]
        def command(text,required=True):
            calls.append(text)
            return '7' if text=='ADD_NETWORK' else 'FAIL' if text=='SAVE_CONFIG' else 'OK'
        with patch.object(wifi,'command',command),patch.object(wifi,'android',return_value='ok'):
            with self.assertRaisesRegex(RuntimeError,'WIFI_SAVE_FAILED'):
                obj.connect({'operation':'connect','id':'aa:bb:cc:dd:ee:ff','password':'test-only-password'})
        self.assertIn('REMOVE_NETWORK 7',calls)
        self.assertIn('ENABLE_NETWORK all',calls)

class LeaseTests(unittest.TestCase):
    def test_dhcp_service_gets_dynamic_interface_argument(self):
        obj=wifi.Wifi.__new__(wifi.Wifi)
        obj.last_lease=0;obj.lease_network=None;obj.route=None
        state={'state':'connected','network':{'ssid':'Test','savedId':'0'}}
        with patch.object(wifi,'android',return_value='stopped') as android,patch.object(wifi.time,'monotonic',return_value=100):
            obj.lease(state)
        commands=[call.args for call in android.call_args_list]
        self.assertIn(('setprop','ctl.start','dhcpcd_wlan0:wlan0'),commands)
        self.assertNotIn(('setprop','ctl.restart','dhcpcd_wlan0'),commands)

    def test_routes_are_restored_when_link_down_removed_cached_routes(self):
        obj=wifi.Wifi.__new__(wifi.Wifi)
        obj.last_lease=0;obj.lease_network=('Test','0');obj.rule_owned=True
        obj.route=('192.0.2.0/24','192.0.2.1')
        properties={'dhcp.wlan0.result':'ok','dhcp.wlan0.ipaddress':'192.0.2.3',
                    'dhcp.wlan0.gateway':'192.0.2.1','dhcp.wlan0.mask':'255.255.255.0'}
        def native(*args,**kwargs):
            return properties.get(args[1],'') if args[0]=='getprop' else ''
        with patch.object(wifi,'android',side_effect=native) as android,patch.object(wifi.time,'monotonic',return_value=100):
            obj.lease({'state':'connected','network':{'ssid':'Test','savedId':'0'}})
        commands=[call.args for call in android.call_args_list]
        self.assertIn(('ip','route','add','default','via','192.0.2.1','dev','wlan0','table','21052'),commands)
        self.assertEqual([c for c in commands if c[:3]==('ip','route','flush')],
                         [('ip','route','flush','table','21052')])

if __name__=='__main__':unittest.main()
