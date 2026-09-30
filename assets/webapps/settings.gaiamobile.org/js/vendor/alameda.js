
var requirejs,require,define;(function(global,undef){var prim,topReq,dataMain,src,subPath,bootstrapConfig=requirejs||require,hasOwn=Object.prototype.hasOwnProperty,contexts={},queue=[],currDirRegExp=/^\.\//,urlRegExp=/^\/|\:|\?|\.js$/,commentRegExp=/(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/mg,cjsRequireRegExp=/[^.]\s*require\s*\(\s*["']([^'"\s]+)["']\s*\)/g,jsSuffixRegExp=/\.js$/;if(typeof requirejs==='function'){return;}
function hasProp(obj,prop){return hasOwn.call(obj,prop);}
function getOwn(obj,prop){return obj&&hasProp(obj,prop)&&obj[prop];}
function eachProp(obj,func){var prop;for(prop in obj){if(hasProp(obj,prop)){if(func(obj[prop],prop)){break;}}}}
function mixin(target,source,force,deepStringMixin){if(source){eachProp(source,function(value,prop){if(force||!hasProp(target,prop)){if(deepStringMixin&&typeof value==='object'&&value&&!Array.isArray(value)&&typeof value!=='function'&&!(value instanceof RegExp)){if(!target[prop]){target[prop]={};}
mixin(target[prop],value,force,deepStringMixin);}else{target[prop]=value;}}});}
return target;}
function getGlobal(value){if(!value){return value;}
var g=global;value.split('.').forEach(function(part){g=g[part];});return g;}
(function(){'use strict';var waitingId,nextTick,waiting=[];function callWaiting(){waitingId=0;var w=waiting;waiting=[];while(w.length){w.shift()();}}
function asyncTick(fn){waiting.push(fn);if(!waitingId){waitingId=setTimeout(callWaiting,0);}}
function syncTick(fn){fn();}
function isFunObj(x){var type=typeof x;return type==='object'||type==='function';}
nextTick=typeof setImmediate==='function'?setImmediate.bind():(typeof process!=='undefined'&&process.nextTick?process.nextTick:(typeof setTimeout!=='undefined'?asyncTick:syncTick));function notify(ary,value){prim.nextTick(function(){ary.forEach(function(item){item(value);});});}
function callback(p,ok,yes){if(p.hasOwnProperty('v')){prim.nextTick(function(){yes(p.v);});}else{ok.push(yes);}}
function errback(p,fail,no){if(p.hasOwnProperty('e')){prim.nextTick(function(){no(p.e);});}else{fail.push(no);}}
prim=function prim(fn){var promise,f,p={},ok=[],fail=[];function makeFulfill(){var f,f2,called=false;function fulfill(v,prop,listeners){if(called){return;}
called=true;if(promise===v){called=false;f.reject(new TypeError('value is same promise'));return;}
try{var then=v&&v.then;if(isFunObj(v)&&typeof then==='function'){f2=makeFulfill();then.call(v,f2.resolve,f2.reject);}else{p[prop]=v;notify(listeners,v);}}catch(e){called=false;f.reject(e);}}
f={resolve:function(v){fulfill(v,'v',ok);},reject:function(e){fulfill(e,'e',fail);}};return f;}
f=makeFulfill();promise={then:function(yes,no){var next=prim(function(nextResolve,nextReject){function finish(fn,nextFn,v){try{if(fn&&typeof fn==='function'){v=fn(v);nextResolve(v);}else{nextFn(v);}}catch(e){nextReject(e);}}
callback(p,ok,finish.bind(undefined,yes,nextResolve));errback(p,fail,finish.bind(undefined,no,nextReject));});return next;},catch:function(no){return promise.then(null,no);}};try{fn(f.resolve,f.reject);}catch(e){f.reject(e);}
return promise;};prim.resolve=function(value){return prim(function(yes){yes(value);});};prim.reject=function(err){return prim(function(yes,no){no(err);});};prim.cast=function(x){if(isFunObj(x)&&'then'in x){return x;}else{return prim(function(yes,no){if(x instanceof Error){no(x);}else{yes(x);}});}};prim.all=function(ary){return prim(function(yes,no){var count=0,length=ary.length,result=[];function resolved(i,v){result[i]=v;count+=1;if(count===length){yes(result);}}
ary.forEach(function(item,i){prim.cast(item).then(function(v){resolved(i,v);},function(err){no(err);});});});};prim.nextTick=nextTick;}());function newContext(contextName){var req,main,makeMap,callDep,handlers,checkingLater,load,context,defined={},waiting={},config={waitSeconds:7,baseUrl:'./',paths:{},bundles:{},pkgs:{},shim:{},config:{}},mapCache={},requireDeferreds=[],deferreds={},calledDefine={},calledPlugin={},loadCount=0,startTime=(new Date()).getTime(),errCount=0,trackedErrors={},urlFetched={},bundlesMap={};function trimDots(ary){var i,part,length=ary.length;for(i=0;i<length;i++){part=ary[i];if(part==='.'){ary.splice(i,1);i-=1;}else if(part==='..'){if(i===1&&(ary[2]==='..'||ary[0]==='..')){break;}else if(i>0){ary.splice(i-1,2);i-=2;}}}}
function normalize(name,baseName,applyMap){var pkgMain,mapValue,nameParts,i,j,nameSegment,lastIndex,foundMap,foundI,foundStarMap,starI,baseParts=baseName&&baseName.split('/'),normalizedBaseParts=baseParts,map=config.map,starMap=map&&map['*'];if(name&&name.charAt(0)==='.'){if(baseName){normalizedBaseParts=baseParts.slice(0,baseParts.length-1);name=name.split('/');lastIndex=name.length-1;if(config.nodeIdCompat&&jsSuffixRegExp.test(name[lastIndex])){name[lastIndex]=name[lastIndex].replace(jsSuffixRegExp,'');}
name=normalizedBaseParts.concat(name);trimDots(name);name=name.join('/');}else if(name.indexOf('./')===0){name=name.substring(2);}}
if(applyMap&&map&&(baseParts||starMap)){nameParts=name.split('/');outerLoop:for(i=nameParts.length;i>0;i-=1){nameSegment=nameParts.slice(0,i).join('/');if(baseParts){for(j=baseParts.length;j>0;j-=1){mapValue=getOwn(map,baseParts.slice(0,j).join('/'));if(mapValue){mapValue=getOwn(mapValue,nameSegment);if(mapValue){foundMap=mapValue;foundI=i;break outerLoop;}}}}
if(!foundStarMap&&starMap&&getOwn(starMap,nameSegment)){foundStarMap=getOwn(starMap,nameSegment);starI=i;}}
if(!foundMap&&foundStarMap){foundMap=foundStarMap;foundI=starI;}
if(foundMap){nameParts.splice(0,foundI,foundMap);name=nameParts.join('/');}}
pkgMain=getOwn(config.pkgs,name);return pkgMain?pkgMain:name;}
function makeShimExports(value){function fn(){var ret;if(value.init){ret=value.init.apply(global,arguments);}
return ret||(value.exports&&getGlobal(value.exports));}
return fn;}
function takeQueue(anonId){var i,id,args,shim;for(i=0;i<queue.length;i+=1){if(typeof queue[i][0]!=='string'){if(anonId){queue[i].unshift(anonId);anonId=undef;}else{break;}}
args=queue.shift();id=args[0];i-=1;if(!hasProp(defined,id)&&!hasProp(waiting,id)){if(hasProp(deferreds,id)){main.apply(undef,args);}else{waiting[id]=args;}}}
if(anonId){shim=getOwn(config.shim,anonId)||{};main(anonId,shim.deps||[],shim.exportsFn);}}
function makeRequire(relName,topLevel){var req=function(deps,callback,errback,alt){var name,cfg;if(topLevel){takeQueue();}
if(typeof deps==="string"){if(handlers[deps]){return handlers[deps](relName);}
name=makeMap(deps,relName,true).id;if(!hasProp(defined,name)){throw new Error('Not loaded: '+name);}
return defined[name];}else if(deps&&!Array.isArray(deps)){cfg=deps;deps=undef;if(Array.isArray(callback)){deps=callback;callback=errback;errback=alt;}
if(topLevel){return req.config(cfg)(deps,callback,errback);}}
callback=callback||function(){};prim.nextTick(function(){takeQueue();main(undef,deps||[],callback,errback,relName);});return req;};req.isBrowser=typeof document!=='undefined'&&typeof navigator!=='undefined';req.nameToUrl=function(moduleName,ext,skipExt){var paths,syms,i,parentModule,url,parentPath,bundleId,pkgMain=getOwn(config.pkgs,moduleName);if(pkgMain){moduleName=pkgMain;}
bundleId=getOwn(bundlesMap,moduleName);if(bundleId){return req.nameToUrl(bundleId,ext,skipExt);}
if(urlRegExp.test(moduleName)){url=moduleName+(ext||'');}else{paths=config.paths;syms=moduleName.split('/');for(i=syms.length;i>0;i-=1){parentModule=syms.slice(0,i).join('/');parentPath=getOwn(paths,parentModule);if(parentPath){if(Array.isArray(parentPath)){parentPath=parentPath[0];}
syms.splice(0,i,parentPath);break;}}
url=syms.join('/');url+=(ext||(/^data\:|\?/.test(url)||skipExt?'':'.js'));url=(url.charAt(0)==='/'||url.match(/^[\w\+\.\-]+:/)?'':config.baseUrl)+url;}
return config.urlArgs?url+
((url.indexOf('?')===-1?'?':'&')+
config.urlArgs):url;};req.toUrl=function(moduleNamePlusExt){var ext,index=moduleNamePlusExt.lastIndexOf('.'),segment=moduleNamePlusExt.split('/')[0],isRelative=segment==='.'||segment==='..';if(index!==-1&&(!isRelative||index>1)){ext=moduleNamePlusExt.substring(index,moduleNamePlusExt.length);moduleNamePlusExt=moduleNamePlusExt.substring(0,index);}
return req.nameToUrl(normalize(moduleNamePlusExt,relName),ext,true);};req.defined=function(id){return hasProp(defined,makeMap(id,relName,true).id);};req.specified=function(id){id=makeMap(id,relName,true).id;return hasProp(defined,id)||hasProp(deferreds,id);};return req;}
function resolve(name,d,value){if(name){defined[name]=value;if(requirejs.onResourceLoad){requirejs.onResourceLoad(context,d.map,d.deps);}}
d.finished=true;d.resolve(value);}
function reject(d,err){d.finished=true;d.rejected=true;d.reject(err);}
function makeNormalize(relName){return function(name){return normalize(name,relName,true);};}
function defineModule(d){var name=d.map.id,ret=d.factory.apply(defined[name],d.values);if(name){if(ret===undef){if(d.cjsModule){ret=d.cjsModule.exports;}else if(d.usingExports){ret=defined[name];}}}else{requireDeferreds.splice(requireDeferreds.indexOf(d),1);}
resolve(name,d,ret);}
function depFinished(val,i){if(!this.rejected&&!this.depDefined[i]){this.depDefined[i]=true;this.depCount+=1;this.values[i]=val;if(!this.depending&&this.depCount===this.depMax){defineModule(this);}}}
function makeDefer(name){var d={};d.promise=prim(function(resolve,reject){d.resolve=resolve;d.reject=reject;});d.map=name?makeMap(name,null,true):{};d.depCount=0;d.depMax=0;d.values=[];d.depDefined=[];d.depFinished=depFinished;if(d.map.pr){d.deps=[makeMap(d.map.pr)];}
return d;}
function getDefer(name){var d;if(name){d=hasProp(deferreds,name)&&deferreds[name];if(!d){d=deferreds[name]=makeDefer(name);}}else{d=makeDefer();requireDeferreds.push(d);}
return d;}
function makeErrback(d,name){return function(err){if(!d.rejected){if(!err.dynaId){err.dynaId='id'+(errCount+=1);err.requireModules=[name];}
reject(d,err);}};}
function waitForDep(depMap,relName,d,i){d.depMax+=1;callDep(depMap,relName).then(function(val){d.depFinished(val,i);},makeErrback(d,depMap.id)).catch(makeErrback(d,d.map.id));}
function makeLoad(id){var fromTextCalled;function load(value){if(!fromTextCalled){resolve(id,getDefer(id),value);}}
load.error=function(err){getDefer(id).reject(err);};load.fromText=function(text,textAlt){var d=getDefer(id),map=makeMap(makeMap(id).n),plainId=map.id;fromTextCalled=true;d.factory=function(p,val){return val;};if(textAlt){text=textAlt;}
if(hasProp(config.config,id)){config.config[plainId]=config.config[id];}
try{req.exec(text);}catch(e){reject(d,new Error('fromText eval for '+plainId+' failed: '+e));}
takeQueue(plainId);d.deps=[map];waitForDep(map,null,d,d.deps.length);};return load;}
load=typeof importScripts==='function'?function(map){var url=map.url;if(urlFetched[url]){return;}
urlFetched[url]=true;getDefer(map.id);importScripts(url);takeQueue(map.id);}:function(map){var script,id=map.id,url=map.url;if(urlFetched[url]){return;}
urlFetched[url]=true;script=document.createElement('script');script.setAttribute('data-requiremodule',id);script.type=config.scriptType||'text/javascript';script.charset='utf-8';script.async=true;loadCount+=1;script.addEventListener('load',function(){loadCount-=1;takeQueue(id);},false);script.addEventListener('error',function(){loadCount-=1;var err,pathConfig=getOwn(config.paths,id),d=getOwn(deferreds,id);if(pathConfig&&Array.isArray(pathConfig)&&pathConfig.length>1){script.parentNode.removeChild(script);pathConfig.shift();d.map=makeMap(id);load(d.map);}else{err=new Error('Load failed: '+id+': '+script.src);err.requireModules=[id];getDefer(id).reject(err);}},false);script.src=url;document.head.appendChild(script);};function callPlugin(plugin,map,relName){plugin.load(map.n,makeRequire(relName),makeLoad(map.id),{});}
callDep=function(map,relName){var args,bundleId,name=map.id,shim=config.shim[name];if(hasProp(waiting,name)){args=waiting[name];delete waiting[name];main.apply(undef,args);}else if(!hasProp(deferreds,name)){if(map.pr){if((bundleId=getOwn(bundlesMap,name))){map.url=req.nameToUrl(bundleId);load(map);}else{return callDep(makeMap(map.pr)).then(function(plugin){var newMap=makeMap(name,relName,true),newId=newMap.id,shim=getOwn(config.shim,newId);if(!hasProp(calledPlugin,newId)){calledPlugin[newId]=true;if(shim&&shim.deps){req(shim.deps,function(){callPlugin(plugin,newMap,relName);});}else{callPlugin(plugin,newMap,relName);}}
return getDefer(newId).promise;});}}else if(shim&&shim.deps){req(shim.deps,function(){load(map);});}else{load(map);}}
return getDefer(name).promise;};function splitPrefix(name){var prefix,index=name?name.indexOf('!'):-1;if(index>-1){prefix=name.substring(0,index);name=name.substring(index+1,name.length);}
return[prefix,name];}
makeMap=function(name,relName,applyMap){if(typeof name!=='string'){return name;}
var plugin,url,parts,prefix,result,cacheKey=name+' & '+(relName||'')+' & '+!!applyMap;parts=splitPrefix(name);prefix=parts[0];name=parts[1];if(!prefix&&hasProp(mapCache,cacheKey)){return mapCache[cacheKey];}
if(prefix){prefix=normalize(prefix,relName,applyMap);plugin=hasProp(defined,prefix)&&defined[prefix];}
if(prefix){if(plugin&&plugin.normalize){name=plugin.normalize(name,makeNormalize(relName));}else{name=normalize(name,relName,applyMap);}}else{name=normalize(name,relName,applyMap);parts=splitPrefix(name);prefix=parts[0];name=parts[1];url=req.nameToUrl(name);}
result={id:prefix?prefix+'!'+name:name,n:name,pr:prefix,url:url};if(!prefix){mapCache[cacheKey]=result;}
return result;};handlers={require:function(name){return makeRequire(name);},exports:function(name){var e=defined[name];if(typeof e!=='undefined'){return e;}else{return(defined[name]={});}},module:function(name){return{id:name,uri:'',exports:handlers.exports(name),config:function(){return getOwn(config.config,name)||{};}};}};function breakCycle(d,traced,processed){var id=d.map.id;traced[id]=true;if(!d.finished&&d.deps){d.deps.forEach(function(depMap){var depId=depMap.id,dep=!hasProp(handlers,depId)&&getDefer(depId);if(dep&&!dep.finished&&!processed[depId]){if(hasProp(traced,depId)){d.deps.forEach(function(depMap,i){if(depMap.id===depId){d.depFinished(defined[depId],i);}});}else{breakCycle(dep,traced,processed);}}});}
processed[id]=true;}
function check(d){var err,notFinished=[],waitInterval=config.waitSeconds*1000,expired=waitInterval&&(startTime+waitInterval)<(new Date()).getTime();if(loadCount===0){if(d){if(!d.finished){breakCycle(d,{},{});}}else if(requireDeferreds.length){requireDeferreds.forEach(function(d){breakCycle(d,{},{});});}}
if(expired){eachProp(deferreds,function(d){if(!d.finished){notFinished.push(d.map.id);}});err=new Error('Timeout for modules: '+notFinished);err.requireModules=notFinished;req.onError(err);}else if(loadCount||requireDeferreds.length){if(!checkingLater){checkingLater=true;prim.nextTick(function(){checkingLater=false;check();});}}}
function delayedError(e){prim.nextTick(function(){if(!e.dynaId||!trackedErrors[e.dynaId]){trackedErrors[e.dynaId]=true;req.onError(e);}});}
main=function(name,deps,factory,errback,relName){if(name&&hasProp(calledDefine,name)){return;}
calledDefine[name]=true;var d=getDefer(name);if(deps&&!Array.isArray(deps)){factory=deps;deps=[];}
d.promise.catch(errback||delayedError);relName=relName||name;if(typeof factory==='function'){if(!deps.length&&factory.length){factory.toString().replace(commentRegExp,'').replace(cjsRequireRegExp,function(match,dep){deps.push(dep);});deps=(factory.length===1?['require']:['require','exports','module']).concat(deps);}
d.factory=factory;d.deps=deps;d.depending=true;deps.forEach(function(depName,i){var depMap;deps[i]=depMap=makeMap(depName,relName,true);depName=depMap.id;if(depName==="require"){d.values[i]=handlers.require(name);}else if(depName==="exports"){d.values[i]=handlers.exports(name);d.usingExports=true;}else if(depName==="module"){d.values[i]=d.cjsModule=handlers.module(name);}else if(depName===undefined){d.values[i]=undefined;}else{waitForDep(depMap,relName,d,i);}});d.depending=false;if(d.depCount===d.depMax){defineModule(d);}}else if(name){resolve(name,d,factory);}
startTime=(new Date()).getTime();if(!name){check(d);}};req=makeRequire(null,true);req.config=function(cfg){if(cfg.context&&cfg.context!==contextName){return newContext(cfg.context).config(cfg);}
mapCache={};if(cfg.baseUrl){if(cfg.baseUrl.charAt(cfg.baseUrl.length-1)!=='/'){cfg.baseUrl+='/';}}
var primId,shim=config.shim,objs={paths:true,bundles:true,config:true,map:true};eachProp(cfg,function(value,prop){if(objs[prop]){if(!config[prop]){config[prop]={};}
mixin(config[prop],value,true,true);}else{config[prop]=value;}});if(cfg.bundles){eachProp(cfg.bundles,function(value,prop){value.forEach(function(v){if(v!==prop){bundlesMap[v]=prop;}});});}
if(cfg.shim){eachProp(cfg.shim,function(value,id){if(Array.isArray(value)){value={deps:value};}
if((value.exports||value.init)&&!value.exportsFn){value.exportsFn=makeShimExports(value);}
shim[id]=value;});config.shim=shim;}
if(cfg.packages){cfg.packages.forEach(function(pkgObj){var location,name;pkgObj=typeof pkgObj==='string'?{name:pkgObj}:pkgObj;name=pkgObj.name;location=pkgObj.location;if(location){config.paths[name]=pkgObj.location;}
config.pkgs[name]=pkgObj.name+'/'+(pkgObj.main||'main').replace(currDirRegExp,'').replace(jsSuffixRegExp,'');});}
primId=config.definePrim;if(primId){waiting[primId]=[primId,[],function(){return prim;}];}
if(cfg.deps||cfg.callback){req(cfg.deps,cfg.callback);}
return req;};req.onError=function(err){throw err;};context={id:contextName,defined:defined,waiting:waiting,config:config,deferreds:deferreds};contexts[contextName]=context;return req;}
requirejs=topReq=newContext('_');if(typeof require!=='function'){require=topReq;}
topReq.exec=function(text){return eval(text);};topReq.contexts=contexts;define=function(){queue.push([].slice.call(arguments,0));};define.amd={jQuery:true};if(bootstrapConfig){topReq.config(bootstrapConfig);}
if(topReq.isBrowser&&!contexts._.config.skipDataMain){dataMain=document.querySelectorAll('script[data-main]')[0];dataMain=dataMain&&dataMain.getAttribute('data-main');if(dataMain){dataMain=dataMain.replace(jsSuffixRegExp,'');if(!bootstrapConfig||!bootstrapConfig.baseUrl){src=dataMain.split('/');dataMain=src.pop();subPath=src.length?src.join('/')+'/':'./';topReq.config({baseUrl:subPath});}
topReq([dataMain]);}}}(this));