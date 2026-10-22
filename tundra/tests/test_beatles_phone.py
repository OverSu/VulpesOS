# SPDX-License-Identifier: MPL-2.0
import importlib.util
import json
from pathlib import Path
import socket
import struct
import sys
import tempfile
import unittest
from unittest.mock import patch

DEVICE=Path(__file__).parents[1]/'devices/beatles'
sys.path.insert(0,str(DEVICE))
import radio_control as control
import sms_pdu as sms
from radio_status import Parcel

HELLO='00040A91214365870900006201812100008005E8329BFD06'

class PduTests(unittest.TestCase):
    def test_standard_gsm_vector_and_unicode(self):
        self.assertEqual(sms.pack7(sms.septets('hello')).hex(),'e8329bfd06')
        self.assertEqual(sms.submit('+1234567890','hello'),'01000A912143658709000005E8329BFD06')
        row=sms.deliver(HELLO)
        self.assertEqual(row['sender'],'+1234567890');self.assertEqual(row['body'],'hello')
        self.assertEqual(row['timestamp'],1792317600000)
        self.assertEqual(sms.submit('123','漢').lower(),'0100038121f30008026f22')
    def test_extensions_and_length_limits(self):
        text='é € {} [] ^ ~ \\';values=sms.septets(text)
        self.assertEqual(sms.unpack7(sms.pack7(values),len(values)),text)
        sms.submit('123','A'*160)
        for text in ('A'*161,'€'*81,'漢'*71):
            with self.assertRaisesRegex(ValueError,'SMS_TOO_LONG'):sms.submit('123',text)
        for value in ('112;reboot','*#06#','',None,'+123\n'):
            with self.assertRaises(ValueError):sms.submit(value,'hello')
    def test_truncated_and_unsupported_pdus(self):
        for end in range(0,len(HELLO),2):
            with self.assertRaises((ValueError,UnicodeError)):sms.deliver(HELLO[:end])
        for pdu in ('00ff','xx','00040A9121436587097F006201812100008005E8329BFD06'):
            with self.assertRaises(ValueError):sms.deliver(pdu)
    def test_unicode_and_concatenation(self):
        prefix='00440A912143658709000862018121000080'
        row=sms.deliver(prefix+'080500030702010041')
        self.assertEqual(row['body'],'A');self.assertEqual(row['concat'],(7,2,1))
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'inbox.json';inbox=control.Inbox(path)
            inbox.receive(prefix+'080500030702020042');self.assertEqual(inbox.value['inbox'],[])
            inbox.receive(prefix+'080500030702010041')
            self.assertEqual(inbox.value['inbox'][0]['body'],'AB')
            self.assertEqual(control.Inbox(path).value['inbox'][0]['body'],'AB')
    def test_durable_inbox_dedup_and_failed_save(self):
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'inbox.json';inbox=control.Inbox(path)
            with patch.object(inbox,'save',side_effect=OSError('disk full')):
                with self.assertRaises(OSError):inbox.receive(HELLO)
            self.assertEqual(inbox.value['seen'],{})
            inbox.receive(HELLO);inbox.receive(HELLO)
            self.assertEqual(len(inbox.value['inbox']),1)
            self.assertEqual(path.stat().st_mode&0o777,0o600)
            receipt=inbox.value['inbox'][0]['receipt'];inbox.acknowledge([receipt])
            inbox.receive(HELLO);self.assertEqual(inbox.value['inbox'],[])

class ControlTests(unittest.TestCase):
    def test_unanswered_request_is_not_sent_again(self):
        radio=control.ControlRadio('/unused',0,None)
        radio.pending={10:(9,0)}
        broker=control.Broker([radio],None)
        with patch.object(radio,'send') as send:
            with self.assertRaisesRegex(RuntimeError,'RADIO_BUSY'):broker.exchange(9)
            send.assert_not_called()

    def test_call_list_timeout_is_short_and_request_stays_pending(self):
        radio=control.ControlRadio('/unused',0,None);radio.sock=unittest.mock.Mock()
        broker=control.Broker([radio],None)
        with patch.object(control.time,'monotonic',side_effect=[0,0,1,2,3]),patch.object(broker,'step'):
            with self.assertRaisesRegex(RuntimeError,'RADIO_TIMEOUT'):broker.exchange(9)
        self.assertIsNone(radio.waiting)
        self.assertEqual(len(radio.pending),1)

    def test_call_layout_and_caller_privacy(self):
        call=control.integer(1,4,2,145,0,1,0,1,0)+control.string('123456789')+control.integer(0)+control.string(None)+control.integer(0,0)
        self.assertEqual(control.current_calls(Parcel(call)),[{'index':2,'state':'incoming','number':'+123456789','direction':'incoming'}])
        hidden=control.integer(1,4,2,145,0,1,0,1,0)+control.string('123456789')+control.integer(1)+control.string(None)+control.integer(0,0)
        self.assertEqual(control.current_calls(Parcel(hidden))[0]['number'],'')
        self.assertEqual(control.current_calls(Parcel(b'')),[])
    def test_late_modem_reply_does_not_complete_another_request(self):
        radio=control.ControlRadio('/unused',0,None);radio.waiting=(9,20)
        radio.response(9,0,Parcel(control.integer(0)),19);self.assertIsNone(radio.result)
        radio.response(9,0,Parcel(control.integer(0)),20);self.assertEqual(radio.result,(True,[]))
    def test_malformed_call_list_does_not_drop_radio_transport(self):
        radio=control.ControlRadio('/unused',0,None);radio.waiting=(9,20)
        radio.sock=unittest.mock.Mock()
        radio.response(9,0,Parcel(control.integer(1)),20)
        self.assertEqual(radio.result,(False,'RADIO_INVALID_CALL_LIST'))
        radio.sock.close.assert_not_called()

    def test_unknown_operations_do_not_reach_the_modem(self):
        broker=control.Broker([],None)
        with patch.object(broker,'exchange') as exchange:
            for value in ({'version':1,'operation':'shell'},{'operation':'sms'},[],None):
                with self.assertRaises(ValueError):broker.request(value)
            exchange.assert_not_called()
    def test_calls_answer_hangup_and_sms_parcels(self):
        radio=control.ControlRadio('/unused',0,None);radio.state={'voice':{'connected':True}}
        broker=control.Broker([radio],None)
        row={'index':2,'state':'incoming','number':'123','direction':'incoming'}
        with patch.object(broker,'exchange',return_value=[row]) as exchange:
            calls=broker.request({'version':1,'operation':'calls'});path=calls[0]['path']
            broker.request({'version':1,'operation':'hangup','path':path})
            self.assertEqual(exchange.call_args.args,(12,control.integer(1,2)))
            broker.request({'version':1,'operation':'answer','path':path})
            self.assertEqual(exchange.call_args.args,(40,))
            with self.assertRaisesRegex(ValueError,'INVALID_CALL'):
                broker.request({'version':1,'operation':'hangup','path':'/stale/call/2'})
        with patch.object(broker,'exchange',return_value={'state':'sent'}) as exchange:
            self.assertEqual(broker.request({'version':1,'operation':'sms','number':'123','body':'hello'}),{'state':'sent'})
            self.assertEqual(exchange.call_args.args,(25,control.integer(2)+control.string(None)+control.string(sms.submit('123','hello'))))
    def test_second_call_is_rejected_before_dial(self):
        radio=control.ControlRadio('/unused',0,None);radio.state={'voice':{'connected':True}}
        broker=control.Broker([radio],None)
        with patch.object(broker,'calls',return_value=[{'path':'/live/call/1'}]),patch.object(broker,'exchange') as exchange:
            with self.assertRaisesRegex(RuntimeError,'RADIO_BUSY'):broker.request({'version':1,'operation':'dial','number':'123'})
            exchange.assert_not_called()

    def test_sms_ack_only_after_storage(self):
        inbox=unittest.mock.Mock();radio=control.ControlRadio('/unused',0,inbox)
        with patch.object(radio,'send') as send:
            radio.unsolicited(1003,Parcel(control.string(HELLO)))
            inbox.receive.assert_called_once_with(HELLO);send.assert_called_with(37,control.integer(2,1,0))
            inbox.receive.side_effect=OSError('full')
            radio.unsolicited(1003,Parcel(control.string(HELLO)))
            send.assert_called_with(37,control.integer(2,0,255))


class RadioPowerTests(unittest.TestCase):
    def broker(self):
        radios=[control.ControlRadio('/unused',i,None) for i in range(2)]
        for radio in radios:
            radio.state={'radioState':'enabled'};radio.sock=unittest.mock.Mock()
        return control.Broker(radios,None)
    def test_slot_payload_readback_and_restore(self):
        broker=self.broker()
        def exchange(request,payload,slot=0):
            self.assertEqual(request,23)
            count,enabled=struct.unpack('<ii',payload);self.assertEqual(count,1)
            broker.radios[slot].state['radioState']='enabled' if enabled else 'disabled'
        with patch.object(broker,'exchange',side_effect=exchange) as send,patch.object(broker,'calls',return_value=[]):
            self.assertEqual(broker.request({'version':1,'operation':'radioPower','slot':1,'enabled':False}),
                             {'slot':1,'radioState':'disabled'})
            self.assertEqual(broker.radios[0].state['radioState'],'enabled')
            send.assert_called_once_with(23,control.integer(1,0),slot=1)
            broker.restore_power()
            self.assertEqual(broker.radios[1].state['radioState'],'enabled')
    def test_idempotent_power_does_not_send(self):
        broker=self.broker()
        with patch.object(broker,'exchange') as send:
            broker.radio_power(0,True);send.assert_not_called()
    def test_calls_invalid_values_and_unknown_state_block_power(self):
        broker=self.broker()
        with patch.object(broker,'exchange') as send,patch.object(broker,'calls',return_value=[{'state':'active'}]):
            with self.assertRaisesRegex(RuntimeError,'RADIO_BUSY'):broker.radio_power(0,False)
            for slot,enabled in [(False,False),(2,False),(0,0),(0,'false')]:
                with self.assertRaisesRegex(ValueError,'INVALID_REQUEST'):broker.radio_power(slot,enabled)
            broker.radios[0].state['radioState']='unknown'
            with self.assertRaisesRegex(RuntimeError,'RADIO_NOT_READY'):broker.radio_power(0,False)
            send.assert_not_called()
    def test_acknowledgement_without_state_change_fails(self):
        broker=self.broker()
        with patch.object(broker,'exchange'),patch.object(broker,'calls',return_value=[]),patch.object(control.time,'monotonic',side_effect=[0,9]):
            with self.assertRaisesRegex(RuntimeError,'RADIO_READBACK_FAILED'):broker.radio_power(0,False)
            self.assertEqual(broker.original_power,{0:True})


class AudioTests(unittest.TestCase):
    def test_call_mode_routing_and_restore(self):
        from call_audio import CallAudio
        audio=CallAudio();state={'mode':0,'route':0,'muted':0};commands=[]
        def transaction(service,method,*values):
            commands.append((service,method,values))
            if (service,method)==('policy',6):return state['route']
            if (service,method)==('flinger',18):return state['muted']
            if (service,method)==('policy',3):state['mode']=values[0]
            elif (service,method)==('policy',5):state['route']=values[1]
            elif (service,method)==('flinger',17):state['muted']=values[0]
            else:raise AssertionError('Unexpected audio transaction')
            return 0
        with patch.object(audio,'transact',side_effect=transaction):
            audio.update([{'state':'incoming'}]);self.assertEqual(state['mode'],1)
            audio.update([{'state':'active'}]);self.assertEqual(state['mode'],2)
            self.assertTrue(audio.request({'operation':'set','muted':True,'speaker':True})['speaker'])
            audio.restore();self.assertEqual(state,{'mode':0,'route':0,'muted':0})
    def test_audio_failure_does_not_throw_from_call_tracking(self):
        from call_audio import CallAudio
        audio=CallAudio()
        with patch.object(audio,'transact',side_effect=OSError('service missing')):
            audio.update([{'state':'active'}]);self.assertFalse(audio.available)
            with self.assertRaisesRegex(RuntimeError,'CALL_AUDIO_UNAVAILABLE'):audio.request({'operation':'status'})

class RilRequestSafetyTests(unittest.TestCase):
    def test_call_list_uses_android_request_nine(self):
        broker=control.Broker([],None)
        with patch.object(broker,'exchange',return_value=[]) as exchange:
            self.assertEqual(broker.calls(),[])
            exchange.assert_called_once_with(9)
    def test_pin_puk_and_identity_requests_never_reach_socket(self):
        radio=control.ControlRadio('/unused',0,None)
        radio.sock=unittest.mock.Mock()
        for request in (2,3,4,5,6,7,8,11,28,38,39,43):
            with self.assertRaisesRegex(ValueError,'RADIO_INVALID_REQUEST'):radio.send(request)
        radio.sock.sendall.assert_not_called()
        self.assertEqual(control.CONTROL_REQUESTS,{9,10,12,23,25,37,40})

if __name__=='__main__':unittest.main()
