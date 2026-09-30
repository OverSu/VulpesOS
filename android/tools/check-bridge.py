"""Exercise alarms and Android permission boundaries in the packaged bridge."""

import functools
import json
import os
import threading
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from playwright.sync_api import sync_playwright

# This harness mocks extension storage/native messaging, not the Gaia service code.
root = Path(__file__).resolve().parents[2]


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def do_GET(self):
        if self.path == "/test.html":
            body = b'<!doctype html><html><head><script type="module" src="/background.js"></script></head><body>Bridge test</body></html>'
            self.send_response(200)
            self.send_header("Content-Type", "text/html")
            self.end_headers()
            self.wfile.write(body)
        else:
            super().do_GET()


server = ThreadingHTTPServer(
    ("127.0.0.1", 0),
    functools.partial(Handler, directory=str(root / "android/app/src/main/assets/bridge")),
)
threading.Thread(target=server.serve_forever, daemon=True).start()
try:
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=os.environ.get("PLAYWRIGHT_CHROMIUM_EXECUTABLE"))
        page = b.new_page()
        messages = []
        errors = []
        page.on("console", lambda msg: messages.append(msg.text))
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.add_init_script(
            """
    const values={};window.nativeCalls=[];window.events=[];
    window.browser={storage:{local:{get:async key=>({[key]:structuredClone(values[key])}),set:async data=>Object.assign(values,structuredClone(data))}},runtime:{
      connectNative:()=>({onMessage:{addListener(fn){window.nativeEvent=fn;}},onDisconnect:{addListener(){}},postMessage(){}}),
      sendNativeMessage:async(app,message)=>{nativeCalls.push(message);return message.type==='android.snapshot'?{}:null;},onConnect:{addListener(fn){window.connectPort=fn;}}
    }};
    window.makePort=url=>{
      let receive,seq=0;const waiting=new Map();
      connectPort({name:'gaia',sender:{url},onMessage:{addListener(fn){receive=fn;}},onDisconnect:{addListener(){}},postMessage(msg){if(msg.event)events.push({url,...msg.event});if(waiting.has(msg.id)){waiting.get(msg.id)(msg.reply);waiting.delete(msg.id);}}});
      return (method,params)=>new Promise(resolve=>{const id=++seq;waiting.set(id,resolve);receive({id,request:{version:1,id,method,params}});});
    };
  """
        )
        page.goto(f"http://127.0.0.1:{server.server_port}/test.html")
        page.wait_for_function('typeof connectPort === "function"')
        results = page.evaluate(
            """async()=>{
    const clock=makePort('http://clock.localhost:18765/onring.html');
    const before=await clock('alarms.request',{operation:'getAll'});
    if(before.error)throw Error(JSON.stringify(before));
    const add=await clock('alarms.request',{operation:'add',date:Date.now()+60000,respectTimezone:'honorTimezone',local:[2026,8,23,9,0,0,0],data:{label:'test'}});
    if(add.error)throw Error(JSON.stringify(add));
    const list=await clock('alarms.request',{operation:'getAll'});
    await clock('alarms.request',{operation:'remove',id:add.result});
    const empty=await clock('alarms.request',{operation:'getAll'});
    const gallery=makePort('http://gallery.localhost:18765/index.html');
    const denied=await gallery('android.settings',{panel:'wifi'});
    const cameraDenied=await gallery('android.capture',{});
    const settingsDenied=await gallery('settings.set',{values:{'screen.brightness':.4}});
    const settings=makePort('http://settings.localhost:18765/index.html');
    nativeCalls.length=0;
    const malformed=await settings('settings.set',{values:{'screen.brightness':.5,'':true}});
    const noSideEffect=malformed.error?.code==='INVALID_KEY' && nativeCalls.length===0;
    const notificationDenied=await gallery('android.notification',{operation:'show',owner:'settings',title:'Spoof'});
    const smsDenied=await clock('android.sms',{number:'123',body:'test'});
    const foreign=makePort('https://example.com/');
    const foreignDenied=await foreign('android.snapshot',{});
    const system=makePort('http://system.localhost:18765/index.html');
    events.length=0;
    await nativeEvent({type:'notification-click',data:{owner:'settings',id:1}});
    const queued=!events.some(e=>e.type==='launch');
    const forbiddenReady=await gallery('android.systemReady',{});
    await system('android.systemReady',{});
    const replayed=events.some(e=>e.type==='launch' && e.data.manifestURL==='http://settings.localhost:18765/manifest.webapp');
    return {coldNotificationWaitsForGaia:queued && replayed,systemReadinessPermission:forbiddenReady.error?.code==='PERMISSION_DENIED',invalidSettingNoNativeSideEffect:noSideEffect,notificationPermissions:notificationDenied.error?.code==='PERMISSION_DENIED',smsPermissions:smsDenied.error?.code==='PERMISSION_DENIED',started:true,stored:list.result.length===1,removed:empty.result.length===0,
      hardwarePermissions:denied.error?.code==='PERMISSION_DENIED' && cameraDenied.error?.code==='PERMISSION_DENIED',
      settingsPermissions:settingsDenied.error?.code==='PERMISSION_DENIED',
      externalOriginDenied:foreignDenied.error?.code==='PERMISSION_DENIED'};
  }"""
        )
        assert all(results.values()), results
        assert not errors, errors
        (root / "logs/repository-preparation").mkdir(parents=True, exist_ok=True)
        (root / "logs/repository-preparation/android-bridge-test.json").write_text(
            json.dumps(
                {
                    "results": results,
                    "scope": "Packaged extension in a browser; native messaging and extension storage mocked. Not an Android device test.",
                },
                indent=2,
            )
        )
        print(results)
        b.close()
finally:
    server.shutdown()
    server.server_close()
