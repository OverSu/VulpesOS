// Local alarms survive host restarts. They cannot wake a powered-off PC.
export class Alarms {
  constructor(identity, launch, storage, schedule) {
    this.storage = storage;
    this.schedule = schedule;
    this.identity = identity;
    this.launch = launch;
    this.listeners = new Map();
    this.queue = Promise.resolve();
    this.lastLaunch = new Map();
  }
  async init() {
    this.state = (await this.storage.load()) || { nextId: 1, records: [], pending: [] };
    this.timer = this.schedule(() => this.serial(() => this.tick()).catch(console.error), 1000);
  }
  serial(fn) {
    const p = this.queue.then(fn);
    this.queue = p.catch(() => {});
    return p;
  }
  save() {
    return this.storage.save(this.state);
  }
  cleanup(actor) {
    this.listeners.delete(actor);
  }
  due(record) {
    return record.respectTimezone === 'ignoreTimezone' ? +new Date(...record.local) : record.date;
  }
  request(actor, app, params) {
    if (!app.manifest.permissions?.alarms) throw new Error('PERMISSION_DENIED');
    return this.serial(async () => {
      const { operation, date, respectTimezone, data, id, local } = params;
      if (operation === 'getAll')
        return this.state.records
          .filter((r) => r.owner === app.id)
          .map((r) => ({
            id: r.id,
            date: this.due(r),
            respectTimezone: r.respectTimezone,
            data: r.data,
          }));
      if (operation === 'add') {
        if (
          !Number.isFinite(date) ||
          !['honorTimezone', 'ignoreTimezone'].includes(respectTimezone) ||
          !Array.isArray(local) ||
          local.length !== 7 ||
          !local.every(Number.isFinite)
        )
          throw new Error('InvalidStateError');
        if (this.state.records.filter((r) => r.owner === app.id).length >= 256)
          throw new Error('QuotaExceededError');
        if (JSON.stringify(data).length > 65536) throw new Error('QuotaExceededError');
        const record = {
          owner: app.id,
          id: this.state.nextId++,
          date,
          respectTimezone,
          data,
          local,
        };
        this.state.records.push(record);
        await this.save();
        return record.id;
      }
      if (operation === 'remove') {
        this.state.records = this.state.records.filter((r) => r.owner !== app.id || r.id !== id);
        await this.save();
        return null;
      }
      if (operation === 'subscribe') {
        const routes =
          app.manifest.messages
            ?.flatMap((m) => Object.entries(m))
            .filter(([name]) => name === 'alarm')
            .map(([, path]) => path) || [];
        if (
          !routes.some(
            (path) => actor.manager.documentURI.spec.split(/[?#]/)[0] === app.origin + path,
          )
        )
          throw new Error('PERMISSION_DENIED');
        this.listeners.set(actor, app.id);
        await this.tick();
        return null;
      }
      throw new Error('METHOD_NOT_SUPPORTED');
    });
  }
  async tick() {
    const ready = this.state.records.filter((r) => this.due(r) <= Date.now());
    if (ready.length) {
      this.state.records = this.state.records.filter((r) => !ready.includes(r));
      this.state.pending.push(...ready.map((r) => ({ ...r, date: this.due(r) })));
      await this.save();
    }
    let changed = false;
    for (const record of [...this.state.pending]) {
      const receiver = [...this.listeners].find(
        ([actor, owner]) => owner === record.owner && this.identity(actor)?.id === owner,
      );
      if (receiver) {
        try {
          receiver[0].sendAsyncMessage('Vulpes:Event', {
            type: 'alarm',
            data: { id: record.id, date: record.date, data: record.data },
          });
          this.state.pending.splice(this.state.pending.indexOf(record), 1);
          changed = true;
        } catch (_) {
          this.listeners.delete(receiver[0]);
        }
      } else if (Date.now() - (this.lastLaunch.get(record.owner) || 0) > 5000) {
        this.lastLaunch.set(record.owner, Date.now());
        this.launch(record.owner);
      }
    }
    if (changed) await this.save();
  }
}
