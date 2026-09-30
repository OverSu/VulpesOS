// Only the bundled keyboard can edit the field reported by a content actor.
export class Input {
  constructor(runtime) { this.runtime=runtime; this.focus=null; this.sequence=0; }
  changed(actor, state) {
    const app=this.runtime.identity(actor);
    if (!app || app.id==='keyboard') return;
    if (!state) { if(this.focus?.actor===actor) this.hide(); return; }
    this.focus={actor,state:{...state,id:++this.sequence}};
    this.runtime.broadcast('input-focus',this.focus.state,'system');
    this.runtime.broadcast('input-focus',this.focus.state,'keyboard');
  }
  hide() {
    this.focus=null;
    this.runtime.broadcast('input-focus',null,'system');
    this.runtime.broadcast('input-focus',null,'keyboard');
  }
  cleanup(actor) { if(this.focus?.actor===actor) this.hide(); }
  async request(actor, p) {
    const app=this.runtime.identity(actor);
    if (!app || !['keyboard','system'].includes(app.id)) throw Error('PERMISSION_DENIED');
    if (p.operation==='hide') { this.hide();return null; }
    if(app.id!=='keyboard') throw Error('PERMISSION_DENIED');
    if(p.operation==='state') return this.focus?.state || null;
    if(p.operation==='height') {
      if(!Number.isFinite(p.height) || p.height<0 || p.height>600) throw Error('INVALID_VALUE');
      this.runtime.broadcast('input-height',{height:p.height},'system');return null;
    }
    if(!this.focus || p.id!==this.focus.state.id) throw Error('INPUT_CONTEXT_EXPIRED');
    const context=this.focus;
    const result=await context.actor.sendQuery('Vulpes:Edit',p);
    // An application can close or focus another field while the edit is pending.
    if(this.focus!==context) throw Error('INPUT_CONTEXT_EXPIRED');
    Object.assign(context.state,result);
    return context.state;
  }
}
