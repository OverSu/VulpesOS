export function isGaiaActivity(source) {
  return source?.name === 'pick' || source?.name === 'share' ||
    (source?.name === 'moz_configure_window' && source.data?.target === 'device') ||
    (source?.name === 'configure' && source.data?.target === 'ringtone') ||
    (source?.name === 'dial' && source.data?.type === 'webtelephony/number') ||
    (source?.name === 'new' && source.data?.type === 'websms/sms') ||
    (['new','update','open'].includes(source?.name) && source.data?.type === 'webcontacts/contact');
}

function entryPointFor(app, path) {
  if (!path) return undefined;
  const pathname=new URL(path,app.origin).pathname;
  return Object.entries(app.manifest?.entry_points || {}).find(([,point])=>
    new URL(point.launch_path || '/',app.origin).pathname===pathname)?.[0];
}

// Route Gaia's built-in pickers; only the selected provider can finish a request.
export class Activities {
  constructor({identity, apps, launch, notify, uuid, choose}) {
    Object.assign(this, {identity, apps, launch, notify, uuid, choose});
    this.pending = new Map();
    this.listeners = new Map();
    this.choices = new Map();
  }
  route(source, caller, shareProvider) {
    const types = [].concat(source?.data?.type || []), name=source?.name;
    let id = name === 'share' && ['sms','email'].includes(shareProvider) ? shareProvider : undefined;
    if (name === 'pick') {
      if (types.some(t=>['ringtone','alerttone'].includes(t))) id='ringtones';
      else if (types.includes('wallpaper')) id='wallpaper';
      else if (types.some(t=>['webcontacts/contact','webcontacts/tel','webcontacts/email','webcontacts/select','text/vcard','text/x-vcard','text/directory'].includes(t))) id='communications';
      else if (types.some(t=>typeof t==='string' && t.startsWith('image/'))) id=!caller || caller.id==='settings'?'wallpaper':'gallery';
      else if (types.some(t=>typeof t==='string' && t.startsWith('audio/'))) id='music';
      else if (types.some(t=>typeof t==='string' && t.startsWith('video/'))) id='video';
    } else if (name === 'configure' && source.data?.target === 'ringtone') id='ringtones';
    else if (name === 'dial' && types.includes('webtelephony/number')) id='communications';
    else if (name === 'new' && types.includes('websms/sms')) id='sms';
    else if (['new','update','open'].includes(name) && types.includes('webcontacts/contact')) id='communications';
    const app = this.apps().find(a=>a.id===id);
    const candidates = [].concat(app?.manifest.activities?.[name] || []);
    const definition = candidates.find(d=>{
      const filter=d.filters?.type;
      const accepted=[].concat(filter?.value || filter || []);
      const matches = !accepted.length || types.some(t=>typeof t==='string' && accepted.some(a=>a===t || (typeof a==='string' && a.endsWith('/*') && t.startsWith(a.slice(0,-1)))));
      const count=source.data?.blobs?.length || source.data?.number || 0;
      return matches && (!d.filters?.number?.max || count<=d.filters.number.max);
    });
    if (!app || !definition?.href) throw Error('ACTIVITY_NOT_SUPPORTED');
    const url=new URL(definition.href,app.origin);
    if (url.origin!==new URL(app.origin).origin) throw Error('ACTIVITY_NOT_SUPPORTED');
    // SMS handles the activity after startup; its old manifest fragment is
    // not a Navigation view in the packaged Gaia build.
    if (id==='sms' && ['new','share'].includes(name)) url.hash='';
    const entryPoint=entryPointFor(app,url.href);
    return {app,definition,url,entryPoint};
  }
  provider(source) { return this.route(source).app; }
  start(caller, source) {
    const app = this.identity(caller);
    if(source?.name==='moz_configure_window' && source.data?.target==='device') {
      if(app?.id!=='keyboard')throw Error('PERMISSION_DENIED');
      const settings=this.apps().find(a=>a.id==='settings');
      if(!settings)throw Error('ACTIVITY_NOT_SUPPORTED');
      this.launch(settings,settings.manifest.launch_path || '/index.html',{});
      return Promise.resolve(null);
    }
    if (!app || !['settings','system','homescreen','verticalhome','ringtones','sms','communications','email','calendar','gallery','video','music','camera'].includes(app.id))
      throw Error('PERMISSION_DENIED');
    const types = [].concat(source?.data?.type || []);
    if (source?.name==='share' || (source?.name==='pick' && types.length>1 && this.choose)) {
      const routes=[];
      for (const candidate of (source.name==='share' ? ['sms','email'] : types)) {
        try {
          const route=source.name==='share' ? this.route(source,app,candidate) : this.route({...source,data:{...source.data,type:candidate}},app);
          if (!routes.some(r=>r.app.id===route.app.id)) routes.push(route);
        } catch (error) { if (error.message!=='ACTIVITY_NOT_SUPPORTED') throw error; }
      }
      if (routes.length>1 && this.choose) {
        if (this.choices.size) throw Error('ACTIVITY_BUSY');
        const id=this.uuid();
        return new Promise((resolve,reject)=>{
          this.choices.set(id,{caller,app,source,routes,resolve,reject});
          this.choose({id,name:source.name,activityType:types.join(','),
            choices:routes.map(r=>{
              const icons=r.app.manifest.icons || {};
              const icon=icons[128] || icons[60] || Object.values(icons)[0];
              return {manifest:r.app.manifestURL,icon:icon?new URL(icon,r.app.origin).href:undefined};
            })});
        });
      }
      if (routes.length===1) return this.open(caller,app,source,routes[0]);
      if(source.name==='share')throw Error('NO_PROVIDER');
    }
    return this.open(caller,app,source,this.route(source,app));
  }
  select(peer,{id,value}) {
    if (this.identity(peer)?.id!=='system') throw Error('PERMISSION_DENIED');
    const row=this.choices.get(id);
    if (!row) throw Error('ACTIVITY_CANCELLED');
    if (!/^(?:-1|\d+)$/.test(String(value))) throw Error('INVALID_ACTIVITY_CHOICE');
    const index=Number(value);
    if (index!==-1 && !row.routes[index]) throw Error('INVALID_ACTIVITY_CHOICE');
    this.choices.delete(id);
    if (index===-1) {row.reject(Error('ACTIVITY_CANCELLED'));return;}
    try {this.open(row.caller,row.app,row.source,row.routes[index]).then(row.resolve,row.reject);}
    catch(error) {row.reject(error);}
  }
  open(caller,app,source,{app:provider,definition,url,entryPoint}) {
    if ([...this.pending.values()].some(p=>p.provider.id===provider.id)) throw Error('ACTIVITY_BUSY');
    const id = this.uuid();
    return new Promise((resolve,reject) => {
      const row = {id,caller,app,provider,source,resolve,reject,url,entryPoint,
        returnURL:caller.manager?.documentURI?.spec,returns:definition.disposition!=='window'};
      this.pending.set(id,row);
      const listener=[...this.listeners.values()].find(peer=>
        peer.manager?.documentURI?.spec && this.identity(peer)?.id===provider.id && this.matches(peer,row));
      if (listener) {
        this.launch(provider,listener.manager.documentURI.spec,{entryPoint});
        this.deliver(row,listener);
      } else {
        url.searchParams.set('activity',id);
        this.launch(provider,url.href,{reload:true,entryPoint});
      }
    });
  }
  matches(peer,row) {
    const spec=peer.manager?.documentURI?.spec;
    if (!spec) return true;
    const current=new URL(spec);
    if (current.pathname!==row.url.pathname) return false;
    // Gallery selects its picker mode once at startup from #pick. Reusing a
    // normal gallery window would never enable selection/cropping controls.
    return row.provider.id!=='gallery' || current.hash===row.url.hash;
  }
  subscribe(peer) {
    const app = this.identity(peer);
    if (!app) throw Error('PERMISSION_DENIED');
    this.listeners.set(peer,peer);
    for (const row of this.pending.values())
      if (row.provider.id===app.id && this.matches(peer,row)) this.deliver(row,peer);
  }
  deliver(row,peer) {
    if (!peer || row.delivered === peer) return;
    row.delivered = peer;
    this.notify(peer,'activity',{id:row.id,source:row.source});
    if (!row.returns) {this.pending.delete(row.id);row.resolve(null);}
  }
  finish(peer, {id,result,error}) {
    const row = this.pending.get(id);
    if (!row || row.delivered !== peer) throw Error('PERMISSION_DENIED');
    this.pending.delete(id);
    this.launch(row.app,row.returnURL,{entryPoint:entryPointFor(row.app,row.returnURL)});
    if (error) row.reject(Error('ACTIVITY_CANCELLED'));
    else row.resolve(result);
  }
  cancel(peer) {
    if (this.identity(peer)?.id !== 'system') throw Error('PERMISSION_DENIED');
    for (const row of this.pending.values()) row.reject(Error('ACTIVITY_CANCELLED'));
    this.pending.clear();
    for (const row of this.choices.values()) row.reject(Error('ACTIVITY_CANCELLED'));
    this.choices.clear();
  }
  cleanup(peer) {
    for (const [id,row] of this.choices) if (row.caller===peer) {
      this.choices.delete(id);row.reject(Error('ACTIVITY_CANCELLED'));
    }
    for (const [app, listener] of this.listeners) if (listener === peer) this.listeners.delete(app);
    for (const [id,row] of this.pending) {
      if (row.caller === peer || row.delivered === peer) {
        this.pending.delete(id);row.reject(Error('ACTIVITY_CANCELLED'));
      }
    }
  }
}
