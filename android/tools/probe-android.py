#!/usr/bin/env python3
"""Evaluate a diagnostic in one Gaia app through the ADB-only debugger."""
import json,sys,time
from rdp import RDP

def evaluate(host, script, connection=None):
    hostname, _, path = host.partition('/')
    r=connection or RDP()
    try:
        for process in r.call('root','listProcesses')['processes']:
            if process['isParent']: continue
            target=r.call(process['actor'],'getTarget')['process']
            if 'webIsolated' not in target.get('remoteType',''): continue
            text='''(() => { const w=[...Services.ww.getWindowEnumerator()].find(w=>w.location.hostname===%s && (!%s || w.location.pathname.startsWith(%s))); if(!w)return null; return w.wrappedJSObject.eval(%s); })()''' % (json.dumps(hostname+'.localhost'),json.dumps(path),json.dumps('/'+path),json.dumps(script))
            response=r.call(target['consoleActor'],'evaluateJSAsync',text=text)
            if 'resultID' not in response: continue
            while True:
                value=r.recv()
                if value.get('type')=='evaluationResult' and value.get('resultID')==response['resultID']:
                    if value.get('hasException'): raise RuntimeError(value.get('exceptionMessage',str(value)))
                    if value.get('result') is not None and value.get('result') != {'type':'null'}: return value.get('result')
                    break
        raise RuntimeError('App not open: '+host)
    finally:
        if connection is None:r.s.close()

def _run(host,expression,timeout,connection):
    start=time.monotonic()+timeout
    while True:
        try:
            evaluate(host,'window.__androidProbe=null; Promise.resolve().then(async()=>('+expression+')).then(value=>window.__androidProbe=JSON.stringify({value}),error=>window.__androidProbe=JSON.stringify({error:String(error),stack:error.stack})); "started"',connection)
            break
        except RuntimeError as e:
            if time.monotonic()>=start:raise
            if not str(e).startswith('App not open:'):raise
            time.sleep(.3)
    until=time.monotonic()+timeout
    while time.monotonic()<until:
        result=evaluate(host,'window.__androidProbe || "pending"',connection)
        if isinstance(result,str) and result != 'pending':return json.loads(result)
        time.sleep(.3)
    raise TimeoutError(host)

def run(host,expression,timeout=30):
    connection=RDP()
    try:
        return _run(host,expression,timeout,connection)
    finally:
        connection.s.close()

if __name__=='__main__':
    print(json.dumps(run(sys.argv[1],sys.argv[2]),ensure_ascii=False,indent=2))
