// Gaia owns presentation; this store owns notification identity and lifetime.
export function notificationLaunch(app) {
  const path = app.manifest.messages?.find(message => typeof message.notification === 'string')?.notification ||
    app.manifest.launch_path || '/index.html';
  const url = new URL(path, app.origin);
  if (url.origin !== new URL(app.origin).origin) throw Error('INVALID_NOTIFICATION_TARGET');
  const entryPoint = Object.entries(app.manifest.entry_points || {}).find(([, entry]) =>
    entry.launch_path && new URL(entry.launch_path, app.origin).pathname === url.pathname)?.[0];
  return {manifestURL:app.manifestURL, origin:app.origin, url:url.href, entryPoint};
}
export class Notifications {
  constructor(rows = []) {
    this.rows = new Map(rows.map(row => [row.id, row]));
    this.sequence = Math.max(Date.now(), ...rows.map(row => Number(row.id) || 0));
  }
  list(owner) { return [...this.rows.values()].filter(row => !owner || row.owner === owner); }
  show(app, options) {
    const old = options.tag && this.list(app.id).find(row => row.tag === options.tag);
    const id = old?.id || String(++this.sequence);
    const icons = app.manifest.icons || {};
    const icon = options.icon || icons[Math.max(...Object.keys(icons).map(Number))] || '';
    const row = {id, owner:app.id, manifestURL:app.manifestURL,
      title:String(options.title || ''), text:String(options.body || ''),
      body:String(options.body || ''), tag:String(options.tag || ''),
      data:options.data ?? null, timestamp:Date.now(),
      icon:icon ? new URL(icon, app.origin).href : '',
      lang:options.lang || '', dir:options.dir || 'auto',
      mozbehavior:{noscreen:!!options.silent, nosound:!!options.silent,
        novibrate:!!options.silent}, type:'desktop-notification'};
    this.rows.set(id,row);
    return row;
  }
  remove(id, owner) {
    const row = this.rows.get(String(id));
    if (!row || (owner && row.owner !== owner)) throw Error('PERMISSION_DENIED');
    this.rows.delete(row.id);
    return row;
  }
}
