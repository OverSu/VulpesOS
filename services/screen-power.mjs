// Preserve power transitions; coalesce brightness steps while hardware is busy.
export class ScreenPower {
  constructor(state, apply) {
    this.state = state;
    this.apply = apply;
    this.pending = Promise.resolve();
    this.tail = null;
  }
  set(name, value) {
    if (name === 'screenBrightness' && this.tail?.name === name && !this.tail.started) {
      this.tail.value = value;
      return this.tail.promise;
    }
    const queued = {name, value, started:false};
    const operation = this.pending.then(async () => {
      queued.started = true;
      if (this.tail === queued) this.tail = null;
      const next = {...this.state, [name]:queued.value};
      await this.apply(next, name);
      Object.assign(this.state, next);
      return {...this.state};
    });
    queued.promise = operation;
    this.tail = queued;
    this.pending = operation.catch(() => {});
    return operation;
  }
}
