import importlib.util,json,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('audio',Path(__file__).resolve().parents[1]/'runtime/call-audio.py')
audio=importlib.util.module_from_spec(spec);spec.loader.exec_module(audio)
class AudioTests(unittest.TestCase):
    def rig(self):
        commands=[]
        devices={'cards':[{'index':0,'owner_module':1,'name':'droid_card.primary','profiles':{'default':{},'voicecall':{}},'active_profile':'default'}],
                 'sinks':[{'owner_module':1,'name':'sink.primary_output','ports':[{'name':'output-earpiece'},{'name':'output-parking'},{'name':'output-speaker'}],'active_port':'output-speaker','mute':True}],
                 'sources':[{'name':'source.droid','mute':True}],
                 'sink-inputs':[{'index':9,'properties':{'media.role':'phone'}}]}
        def command(*args):
            commands.append(args)
            return ''
        route=audio.CallAudio(command)
        route.devices=lambda kind:devices[kind]
        return route,commands,devices
    def test_actual_pulse14_listing_and_routing(self):
        fixture=Path(__file__).parent/'fixtures/pulse14'
        commands=[]
        def command(*args):
            commands.append(args)
            if args[0]=='list':
                return (fixture/(args[1]+'.txt')).read_text() if args[1]!='sink-inputs' else ''
            return ''
        route=audio.CallAudio(command)
        self.assertEqual(len(route.devices('cards')),1)
        self.assertEqual(route.devices('cards')[0]['owner_module'],1)
        self.assertIn('output-earpiece',route.devices('sinks')[0]['ports'])
        route.enter();self.assertTrue(route.active)
        route.leave();self.assertIsNone(route.saved)
        self.assertIn(('set-sink-port','sink.primary_output','output-earpiece'),commands)

    def test_active_call_routes_earpiece_then_restores(self):
        route,c,_=self.rig()
        route.update([{'state':'active'}]);n=len(c)
        route.update([{'state':'active'}]);self.assertEqual(len(c),n)
        self.assertIn(('set-card-profile','droid_card.primary','voicecall'),c)
        self.assertIn(('set-sink-port','sink.primary_output','output-earpiece'),c)
        self.assertNotIn(('set-sink-port','sink.primary_output','output-speaker'),c)
        self.assertIn(('set-source-mute','source.droid','0'),c)
        route.update([])
        self.assertIsNone(route.saved)
        self.assertIn(('set-card-profile','droid_card.primary','default'),c)
        self.assertIn(('set-source-mute','source.droid','1'),c)
    def test_controls_route_speaker_mute_and_phone_stream(self):
        route,c,_=self.rig();route.enter()
        result=route.control({'operation':'set','speaker':True,'muted':True,'volume':0.8})
        self.assertTrue(result['speaker']);self.assertTrue(result['muted'])
        self.assertIn(('set-sink-port','sink.primary_output','output-speaker'),c)
        self.assertIn(('set-source-mute','source.droid','1'),c)
        self.assertIn(('set-sink-input-volume','9','80%'),c)
        route.leave();self.assertFalse(route.muted);self.assertFalse(route.speaker)
        with self.assertRaisesRegex(ValueError,'NOT_ACTIVE'):route.control({'operation':'set','muted':True})

    def test_ringing_alone_does_not_open_microphone(self):
        route,c,_=self.rig();route.update([{'state':'incoming'}]);self.assertEqual(c,[])
    def test_missing_earpiece_never_falls_back_to_speaker(self):
        route,c,d=self.rig();d['sinks'][0]['ports']=[{'name':'output-speaker'}]
        with self.assertRaisesRegex(RuntimeError,'EARPIECE'):route.update([{'state':'active'}])
        self.assertFalse(any(x[0].startswith('set-') for x in c))
if __name__=='__main__':unittest.main()
