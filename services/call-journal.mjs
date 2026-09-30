// A successful modem snapshot closes missing calls. Transport errors never do.
export class CallJournal {
  constructor(state = {}) {
    this.pending = state.pending || [];
    this.completed = state.completed || [];
    this.nextDate = state.nextDate || 0;
  }
  start(call, now = Date.now(), direction) {
    let item = this.pending.find(c => c.path === call.path);
    if (!item) {
      this.nextDate = Math.max(now, this.nextDate + 1);
      item = {id:String(this.nextDate), path:call.path, date:this.nextDate,
        number:call.number || '', direction:direction || (['incoming','waiting'].includes(call.state) ? 'incoming':'outgoing'), connectedAt:null};
      this.pending.push(item);
    }
    if (call.number) item.number = call.number;
    if (['active','held'].includes(call.state) && item.connectedAt === null) item.connectedAt = now;
    return item;
  }
  update(calls, now = Date.now()) {
    const live = calls.filter(c => c.state !== 'disconnected');
    for (const call of live) this.start(call, now);
    const paths = new Set(live.map(c => c.path));
    for (const item of this.pending.filter(c => !paths.has(c.path))) {
      this.completed.push({...item, duration:item.connectedAt === null ? 0 : Math.max(0,now-item.connectedAt)});
    }
    this.pending = this.pending.filter(c => paths.has(c.path));
    this.completed = this.completed.slice(-500);
  }
  acknowledge(ids) { this.completed = this.completed.filter(c => !ids.includes(c.id)); }
  snapshot() { return {pending:this.pending, completed:this.completed, nextDate:this.nextDate}; }
}
