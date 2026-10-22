# SPDX-License-Identifier: MPL-2.0
import importlib.util
from pathlib import Path
import socket
import struct
import tempfile
import unittest
from unittest.mock import patch, Mock

spec=importlib.util.spec_from_file_location('beatles_radio',Path(__file__).resolve().parents[1]/'devices/beatles/radio_status.py')
radio=importlib.util.module_from_spec(spec);spec.loader.exec_module(radio)
def integers(*values):return struct.pack('<'+'i'*len(values),*values)
def string(value):
    if value is None:return integers(-1)
    data=integers(len(value))+value.encode('utf-16-le')+b'\0\0'
    return data+b'\0'*((-len(data))%4)

class RadioTest(unittest.TestCase):
    def test_registration_does_not_publish_cell_location(self):
        payload=integers(4)+b''.join(map(string,['5','ffff','123456','14']))
        result=radio.decode(20,radio.Parcel(payload))['voice']
        self.assertEqual(result['type'],'lte');self.assertTrue(result['connected']);self.assertTrue(result['roaming'])
        self.assertNotIn('123456',str(result));self.assertNotIn('ffff',str(result))
    def test_lte_signal_and_registration_without_data_bearer(self):
        values=[99,0,0,0,0,0,0,99,95,0,0,0,0]
        self.assertEqual(radio.decode(19,radio.Parcel(integers(*values)))['signal'],47)
        values[8]=2147483647
        self.assertIsNone(radio.decode(19,radio.Parcel(integers(*values)))['signal'])
        payload=integers(4)+b''.join(map(string,['1','','','14']))
        state=radio.decode(21,radio.Parcel(payload))['data']
        self.assertEqual(state['state'],'registered');self.assertFalse(state['connected'])
    def test_sim_absent_and_locked(self):
        self.assertEqual(radio.decode(1,radio.Parcel(integers(0,0,-1,-1,-1,0))),{'sim':{'present':False,'cardState':'absent'}})
        payload=integers(1,0,0,-1,-1,1,2,2,0)+string('PRIVATE_AID')+string('SIM')+integers(0,1,0)
        result=radio.decode(1,radio.Parcel(payload))
        self.assertEqual(result,{'sim':{'present':True,'cardState':'pinRequired'}})
    def test_bounds_and_unknown_signal(self):
        self.assertIsNone(radio.decode(19,radio.Parcel(integers(99)))['signal'])
        for data in [b'',integers(999999),integers(2)+b'a\0']:
            with self.assertRaises(ValueError):radio.Parcel(data).string()
        with self.assertRaises(ValueError):radio.decode(25,radio.Parcel(b''))
    def test_partial_frame_and_disconnect_drop_state(self):
        client,server=socket.socketpair()
        r=radio.Radio('/unused',0);r.sock=client;r.pending={3:(1,0)}
        body=integers(0,3,0,0,0,-1,-1,-1,0);frame=struct.pack('>I',len(body))+body
        server.sendall(frame[:7]);r.receive();self.assertFalse(r.state['available'])
        server.sendall(frame[7:]);r.receive();self.assertFalse(r.state['sim']['present'])
        r.close();server.close();self.assertEqual(r.state,{'slot':0,'available':False,'radioState':'unknown'})
    def test_handover_grace_and_bounded_reconnect_backoff(self):
        r=radio.Radio('/unused',0);r.sock=Mock();r.serial=1;r.last_poll=100;r.pending={1:(9,90)}
        with patch.object(radio.time,'monotonic',return_value=110):
            r.poll();self.assertIsNotNone(r.sock)
        with patch.object(radio.time,'monotonic',return_value=140):
            r.poll();self.assertIsNone(r.sock);self.assertEqual(r.retry_at,145)
            r.close();self.assertEqual(r.retry_at,150)
            for _ in range(8):r.close()
            self.assertEqual(r.retry_at,200)

    def test_battery_unknown_is_not_empty(self):
        with tempfile.TemporaryDirectory() as root:
            p=Path(root);self.assertIsNone(radio.battery(p))
            (p/'capacity').write_text('73');(p/'status').write_text('Discharging')
            self.assertEqual(radio.battery(p),{'level':.73,'charging':False})

if __name__=='__main__':unittest.main()
