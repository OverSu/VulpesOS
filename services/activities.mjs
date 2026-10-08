export function isGaiaActivity(source) {
  return source?.name === 'pick' ||
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
  constructor({identity, apps, launch, notify, uuid}) {
    Object.assign(this, {identity, apps, launch, notify, uuid});
    this.pending = new Map();
    this.listeners = new Map();
  }
  route(source, caller) {
    const types = [].concat(source?.data?.type || []), name=source?.name;
    let id;
    if (name === 'pick') {
      if (types.some(t=>['ringtone','alerttone'].includes(t))) id='ringtones';
      else if (types.some(t=>['webcontacts/contact','webcontacts/tel','webcontacts/email','webcontacts/select'].includes(t))) id='communications';
      else if (types.some(t=>typeof t==='string' && t.startsWith('image/'))) id=caller?.id==='communications'?'gallery':'wallpaper';
    } else if (name === 'dial' && types.includes('webtelephony/number')) id='communications';
    else if (name === 'new' && types.includes('websms/sms')) id='sms';
    else if (['new','update','open'].includes(name) && types.includes('webcontacts/contact')) id='communications';
    const app = this.apps().find(a=>a.id===id);
    const candidates = [].concat(app?.manifest.activities?.[name] || []);
    const definition = candidates.find(d=>{
      const filter=d.filters?.type;
      const accepted=[].concat(filter?.value || filter || []);
      return !accepted.length || types.some(t=>accepted.includes(t));
    });
    if (!app || !definition?.href) throw Error('ACTIVITY_NOT_SUPPORTED');
    const url=new URL(definition.href,app.origin);
    if (url.origin!==new URL(app.origin).origin) throw Error('ACTIVITY_NOT_SUPPORTED');
    // SMS handles the activity after startup; its old manifest fragment is
    // not a Navigation view in the packaged Gaia build.
    if (id==='sms' && name==='new') url.hash='';
    const entryPoint=entryPointFor(app,url.href);
    return {app,definition,url,entryPoint};
  }
  provider(source) { return this.route(source).app; }
  start(caller, source) {
    const app = this.identity(caller);
    if (!app || !['settings','system','homescreen','verticalhome','ringtones','sms','communications','email','calendar'].includes(app.id))
      throw Error('PERMISSION_DENIED');
    const {app:provider,definition,url,entryPoint}=this.route(source,app);
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
  }
  cleanup(peer) {
    for (const [app, listener] of this.listeners) if (listener === peer) this.listeners.delete(app);
    for (const [id,row] of this.pending) {
      if (row.caller === peer || row.delivered === peer) {
        this.pending.delete(id);row.reject(Error('ACTIVITY_CANCELLED'));
      }
    }
  }
}
