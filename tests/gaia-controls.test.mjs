import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
function amd(path, globals, imports={}) {
  let module;
  vm.runInNewContext(readFileSync(path,'utf8'), {...globals,define:factory=>{module=factory(id=>imports[id]);}});
  return module;
}
test('brightness works with pointer/keyboard input and stores numbers',()=>{
  let timers=0;const writes=[],events={};
  const slider=amd('overrides/settings.gaiamobile.org/js/panels/display/slider_handler.js',{
    navigator:{mozSettings:{createLock:()=>({set:v=>writes.push(v)})}},
    setInterval:()=>++timers,clearInterval:id=>{if(id)timers--;},
  })();
  const input={value:'0.4',valueAsNumber:.4,addEventListener:(name,fn)=>events[name]=fn};
  slider.init(input,'screen.brightness');events.input();events.input();events.change();
  assert.equal(writes.length,1);assert.equal(writes[0]['screen.brightness'],.4);assert.equal(timers,0);
  input.valueAsNumber=.7;events.change();assert.equal(writes.at(-1)['screen.brightness'],.7);
  input.valueAsNumber=NaN;events.change();assert.equal(writes.length,2);
});
test('Wi-Fi failure exits spinner without restarting a failed scan forever',()=>{
  const req={},list={dataset:{},querySelectorAll:()=>[],insertBefore:n=>list.item=n};
  let retries=0;
  const factory=amd('overrides/settings.gaiamobile.org/js/panels/wifi/wifi_network_list.js',{
    console:{warn:()=>{}},document:{hidden:false,documentElement:{lang:'fr'},createElement:()=>({setAttribute(){}})},
    window:{performance:{measure(){}},setTimeout:()=>retries++},
  },{'modules/wifi_context':{addEventListener(){}},'shared/wifi_helper':{getWifiManager:()=>({enabled:true}),getAvailableAndKnownNetworks:()=>req}});
  const networks=factory({wifiAvailableNetworks:list});networks.scan();req.onerror();
  assert.equal(list.dataset.state,'ready');assert.match(list.item.textContent,/Réessayez/);
  assert.equal(retries,0);assert.equal(networks.scanning,false);
});
