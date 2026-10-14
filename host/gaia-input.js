// Keep Gaia's keyboard and layouts; replace its retired Gecko input-method API.
(() => {
  function start() {
  // Android emits focus only when enabled. Install the keyboard API before Gaia's
  // startup scripts, without waiting for the asynchronous preference handshake.
  if ((!window.VulpesNativeInput && window.VulpesPlatform !== 'android') || window.__vulpesInputInstalled) return;
  window.__vulpesInputInstalled=true;
  const app=location.hostname.split('.')[0], {call}=VulpesCompat;
  if (app==='keyboard') {
    let viewport, pendingState;
    // The keyboard iframe is short even when the phone is in portrait mode.
    // Gaia's scale must follow the containing screen, not that iframe's aspect ratio.
    addEventListener('message', event => {
      if (event.source !== parent || event.origin !== 'http://system.localhost:8765' ||
          event.data?.type !== 'vulpes-keyboard-viewport') return;
      const {width,height} = event.data;
      if (!Number.isFinite(width) || !Number.isFinite(height) || width<=0 || height<=0) return;
      if (viewport?.width===width && viewport?.height===height) return;
      viewport={width,height};
      dispatchEvent(new Event('resize'));
      if(pendingState!==undefined) {setState(pendingState);pendingState=undefined;}
    });
    const ready = () => {
      ViewManager.prototype.screenInPortraitMode = function() {
        return viewport ? viewport.width<=viewport.height :
          this.cachedWindowWidth<=this.cachedWindowHeight;
      };
      parent.postMessage({type:'vulpes-keyboard-ready'},'http://system.localhost:8765');
    };
    if(document.readyState==='loading')addEventListener('DOMContentLoaded',ready,{once:true});else ready();
    const ime=Object.assign(new EventTarget(),{inputcontext:null,mgmt:{
      supportsSwitching:()=>false,
      hide:()=>call('input.request',{operation:'hide'}),
      next:()=>{},showAll:()=>{}
    }});
    const setState=state=>{
      if(!viewport) {pendingState=state;return;}
      if (!state) ime.inputcontext=null;
      else {
        const ctx=Object.assign(new EventTarget(),state);
        const edit=(operation,params={})=>call('input.request',{operation,id:ctx.id,...params}).then(next=>{
          Object.assign(ctx,next);
          ctx.dispatchEvent(new CustomEvent('selectionchange',{detail:{ownAction:true}}));
          ctx.dispatchEvent(new CustomEvent('surroundingtextchange',{detail:{ownAction:true}}));
          return next;
        });
        ctx.getText=(offset=0,length)=>Promise.resolve(ctx.text.slice(offset,length===undefined?undefined:offset+length));
        ctx.sendKey=(key,charCode)=>edit('key',{key, charCode:charCode||0});
        ctx.setSelectionRange=(start,length)=>edit('selection',{start,length});
        ctx.replaceSurroundingText=(text,offset,length)=>edit('replace',{text,offset,length});
        ctx.setComposition=()=>Promise.resolve();
        ctx.endComposition=text=>edit('replace',{text:text||'',offset:0,length:0});
        ime.inputcontext=ctx;
      }
      ime.dispatchEvent(new Event('inputcontextchange'));
    };
    Object.defineProperty(navigator,'mozInputMethod',{value:ime});
    let focusReceived=false;
    addEventListener('vulpes-service-event',({detail})=>{
      if(detail.type==='input-focus') {focusReceived=true;setState(detail.data);}
    });
    // A focus event can arrive while the initial state request is in flight.
    // Its older snapshot must not clear or reopen the newer input context.
    call('input.request',{operation:'state'}).then(state=>{
      if(!focusReceived)setState(state);
    }).catch(console.error);
    window.resizeTo=(_width,height)=>call('input.request',{operation:'height',height}).catch(console.error);
  }
  if(app==='system') {
    let frame, height=0;
    const sendViewport=()=>frame?.contentWindow.postMessage({
      type:'vulpes-keyboard-viewport',width:innerWidth,height:innerHeight
    },'http://keyboard.localhost:8765');
    addEventListener('resize',sendViewport);
    addEventListener('message',event=>{
      if(event.source===frame?.contentWindow && event.origin==='http://keyboard.localhost:8765' &&
          event.data?.type==='vulpes-keyboard-ready') sendViewport();
    });
    const resize=next=>{
      if(next===height) return;
      height=next;
      if(frame) {frame.style.height=height+'px';frame.hidden=!height;}
      dispatchEvent(new CustomEvent(height?'keyboardchange':'keyboardhide',{detail:{height,waitUntil:()=>{}}}));
    };
    const attach=setInterval(()=>{
      if(!window.Service) return;
      clearInterval(attach);
      Service.registerState('getHeight',{name:'InputWindowManager',getHeight:()=>height});
    },100);
    addEventListener('vulpes-service-event',({detail})=>{
      if(detail.type==='input-height') {if(frame && !frame.hidden) resize(detail.data.height);return;}
      if(detail.type!=='input-focus') return;
      if(!detail.data) {resize(0);return;}
      if(!frame) {
        frame=document.createElement('iframe');frame.id='vulpes-gaia-keyboard';
        frame.title='Keyboard';frame.style.cssText='position:fixed;bottom:0;left:0;width:100%;border:0;z-index:10000;background:#ddd';
        frame.addEventListener('load',sendViewport);
        frame.src='http://keyboard.localhost:8765/index.html#'+
          ((document.documentElement.lang || navigator.language).startsWith('fr')?'fr':'en');
        document.body.append(frame);
      }
      frame.hidden=false;
      resize(height || 260);
    });
    for(const type of ['home','lockscreen-appopened','appwillclose'])
      addEventListener(type,()=>call('input.request',{operation:'hide'}).catch(console.error));
  }
  }
  addEventListener('vulpes-input-configured',start);
  start();
})();
