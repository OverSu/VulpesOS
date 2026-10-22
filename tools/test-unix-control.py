#!/usr/bin/env python3
"""Exercise Gecko's bounded Unix-socket transport against a local test broker."""
import json,socket,tempfile,threading,time
from pathlib import Path
from marionette_client import Client

def check(response,limit=65536,timeout=1000,stall=False):
 with tempfile.TemporaryDirectory(prefix='vulpes-socket-') as tmp:
  path=str(Path(tmp)/'broker.sock');server=socket.socket(socket.AF_UNIX);server.bind(path);server.listen(1)
  received=[]
  def serve():
   with server,server.accept()[0] as conn:
    received.append(json.loads(conn.makefile('rb').readline()))
    if stall:time.sleep(.3);return
    for b in response:
     try:conn.sendall(bytes([b]))
     except BrokenPipeError:break
  thread=threading.Thread(target=serve);thread.start()
  with Client(2857) as client:
   result=client.call('WebDriver:ExecuteAsyncScript',{'script':"const done=arguments[arguments.length-1];const {exchange}=ChromeUtils.importESModule('resource://vulpes/host/UnixControl.sys.mjs');exchange("+json.dumps(path)+",{operation:'status',label:'été'},"+str(limit)+','+str(timeout)+").then(value=>done({value}),error=>done({error:String(error)}));",'args':[],'newSandbox':True,'sandbox':'system','scriptTimeout':5000})['value']
  thread.join();assert received==[{'operation':'status','label':'été'}],received
  return result
results={}
results['fragmented_utf8']=check('{"ok":true,"result":"été"}\n'.encode())
assert results['fragmented_utf8']=={'value':{'ok':True,'result':'été'}},results
results['bounded']=check(b'x'*100+b'\n',limit=32)
assert 'BROKER_REPLY_TOO_LARGE' in results['bounded']['error'],results
results['timeout']=check(b'',timeout=80,stall=True)
assert 'BROKER_TIMEOUT' in results['timeout']['error'],results
results['truncated']=check(b'{"ok":')
assert 'error' in results['truncated'],results
print(json.dumps(results,indent=2,ensure_ascii=False))
