// Fixed local brokers keep device permissions in Tundra. Gecko needs no child
// Python interpreter for each idle status poll.
import {setTimeout, clearTimeout} from 'resource://gre/modules/Timer.sys.mjs';
const routes = {
  radio:['/run/tundra-radio/radio.sock',65536,120000],
  wifi:['/run/tundra-wifi/control.sock',65536,120000],
  bluetooth:['/run/tundra-bluetooth/control.sock',65536,120000],
  hardware:['/run/tundra-buttons/control.sock',4096,5000],
  audio:['/run/tundra-call-audio/control.sock',4096,10000],
  mms:['/run/tundra-mms/mms.sock',1228800,120000],
};
export function unixControl(kind, params) {
  if (!Object.hasOwn(routes,kind)) throw Error('INVALID_BROKER');
  const [path,limit,timeout]=routes[kind];
  return exchange(path,params,limit,timeout);
}

export function exchange(path, params, limit=65536, timeout=20000) {
  const bytes=new TextEncoder().encode(JSON.stringify(params)+'\n');
  if (bytes.length>1228800) return Promise.reject(Error('REQUEST_TOO_LARGE'));
  return new Promise((resolve,reject)=>{
    let transport,input,output,reader,timer,finished=false,received='',offset=0;
    const finish=(error,value)=>{
      if(finished)return;finished=true;clearTimeout(timer);
      try{input?.close();}catch(_){}try{output?.close();}catch(_){}
      try{transport?.close(Cr.NS_BINDING_ABORTED);}catch(_){}
      if(error)reject(error);else resolve(value);
    };
    timer=setTimeout(()=>finish(Error('BROKER_TIMEOUT')),timeout);
    try {
      const file=Cc['@mozilla.org/file/local;1'].createInstance(Ci.nsIFile);file.initWithPath(path);
      transport=Cc['@mozilla.org/network/socket-transport-service;1']
        .getService(Ci.nsISocketTransportService).createUnixDomainTransport(file);
      input=transport.openInputStream(0,0,0).QueryInterface(Ci.nsIAsyncInputStream);
      output=transport.openOutputStream(0,0,0).QueryInterface(Ci.nsIAsyncOutputStream);
      reader=Cc['@mozilla.org/scriptableinputstream;1'].createInstance(Ci.nsIScriptableInputStream);
      reader.init(input);
      const read={onInputStreamReady(){
        if(finished)return;
        try{
          const count=input.available();
          if(!count)throw Error('BROKER_CLOSED');
          if(received.length+count>limit)throw Error('BROKER_REPLY_TOO_LARGE');
          received+=reader.readBytes(count);
          const end=received.indexOf('\n');
          if(end>=0){
            const data=Uint8Array.from(received.slice(0,end),c=>c.charCodeAt(0));
            finish(null,JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(data)));
          }else input.asyncWait(read,0,0,Services.tm.currentThread);
        }catch(error){finish(error);}
      }};
      const write={onOutputStreamReady(){
        if(finished)return;
        try{
          const chunk=String.fromCharCode(...bytes.subarray(offset,offset+8192));
          offset+=output.write(chunk,chunk.length);
          if(offset<bytes.length)output.asyncWait(write,0,0,Services.tm.currentThread);
        }catch(error){finish(error);}
      }};
      input.asyncWait(read,0,0,Services.tm.currentThread);
      output.asyncWait(write,0,0,Services.tm.currentThread);
    }catch(error){finish(error);}
  });
}
