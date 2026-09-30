// Actor-bound local inter-app channels. No caller-supplied identity or port owner.
const routes = {
  search: ['system', 'search'],
  'search-results': ['search', 'system'],
  'app-metrics': ['search', 'system'],
  mediacomms: ['music', 'system'],
};
export class Connections {
  constructor(identity, notify) {
    Object.assign(this, { identity, notify });
    this.ports = new Map();
    this.listeners = new Map();
  }
  subscribe(actor) {
    this.listeners.set(actor, this.identity(actor).id);
    for (const port of this.ports.values()) this.attach(port);
  }
  attach(port) {
    if (port.receiver || !this.ports.has(port.id)) return;
    const target = [...this.listeners.keys()].find(
      (actor) =>
        this.identity(actor)?.id === port.target &&
        new URL(actor.manager.documentURI.spec).pathname === port.path,
    );
    if (!target) return;
    port.receiver = target;
    this.notify(target, 'connection', { keyword: port.keyword, id: port.id, side: 'receiver' });
    for (const data of port.pending) this.notify(target, 'portmessage', { id: port.id, data });
    port.pending = [];
  }
  connect(actor, keyword, apps) {
    const route = routes[keyword],
      app = this.identity(actor);
    if (
      !route ||
      route[0] !== app.id ||
      !apps.find((a) => a.id === route[1])?.manifest.connections?.[keyword]
    )
      throw new Error('CONNECTION_DENIED');
    if ([...this.ports.values()].filter((p) => p.sender === actor).length >= 32)
      throw new Error('QUOTA_EXCEEDED');
    const receiver = apps.find((a) => a.id === route[1]);
    const path = new URL(
      receiver.manifest.connections[keyword].handler_path || '/index.html',
      receiver.origin + '/',
    ).pathname;
    const port = {
      id: Services.uuid.generateUUID().toString(),
      keyword,
      sender: actor,
      target: route[1],
      path,
      pending: [],
    };
    this.ports.set(port.id, port);
    this.attach(port);
    return [{ id: port.id, side: 'sender' }];
  }
  send(actor, { id, data }) {
    const port = this.ports.get(id);
    if (!port || (actor !== port.sender && actor !== port.receiver))
      throw new Error('CONNECTION_DENIED');
    if ((JSON.stringify(data)?.length || 0) > 1024 * 1024) throw new Error('VALUE_TOO_LARGE');
    const target = actor === port.sender ? port.receiver : port.sender;
    if (target) this.notify(target, 'portmessage', { id, data });
    else {
      if (port.pending.length >= 128) throw new Error('QUOTA_EXCEEDED');
      port.pending.push(data);
    }
    return null;
  }
  close(actor, id) {
    const port = this.ports.get(id);
    if (!port || (actor !== port.sender && actor !== port.receiver))
      throw new Error('CONNECTION_DENIED');
    this.ports.delete(id);
    for (const target of [port.sender, port.receiver])
      if (target && target !== actor) {
        try {
          this.notify(target, 'portclose', { id });
        } catch (_) {
          /* Peer already destroyed. */
        }
      }
  }
  cleanup(actor) {
    this.listeners.delete(actor);
    for (const port of this.ports.values())
      if (port.sender === actor || port.receiver === actor) this.close(actor, port.id);
  }
}
