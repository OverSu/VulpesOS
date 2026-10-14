import {Contacts} from './Contacts.mjs';
import {Messages} from './Messages.mjs';

export function authorizePersonal(app, kind, operation) {
  if (app.installed || !['settings', 'communications', 'sms', 'system'].includes(app.id))
    throw Error('PERMISSION_DENIED');
  if (operation === 'status' && app.id === 'settings') return;
  if (!['contacts', 'sms', 'calls'].includes(kind)) throw Error('INVALID_DATA_KIND');
  if (['permission', 'disconnect'].includes(operation)) {
    if (app.id !== 'settings') throw Error('PERMISSION_DENIED');
    return;
  }
  if (kind === 'contacts' && !app.manifest.permissions?.contacts?.access?.includes('read')) throw Error('PERMISSION_DENIED');
  if (kind === 'sms' && app.id !== 'sms') throw Error('PERMISSION_DENIED');
  if (kind === 'calls' && app.id !== 'communications') throw Error('PERMISSION_DENIED');
}

export function contactFromAndroid(row) {
  return {id:'android:'+row._id, name:[row.display_name || ''], givenName:row.givenName || [],
    familyName:row.familyName || [], tel:row.tel || [], email:row.email || [],
    category:row.starred ? ['favorite'] : [], updated:new Date(row.contact_last_updated_timestamp || 0).toISOString()};
}
export function smsFromAndroid(row) {
  // Negative IDs keep Android provider rows separate from existing Vulpes messages.
  if (![row._id, row.thread_id].every(n => Number.isSafeInteger(n) && n > 0)) throw Error('INVALID_ANDROID_ID');
  const incoming = row.type === 1;
  return {id:-row._id, threadId:-row.thread_id, type:'sms',
    sender:incoming ? row.address : null, receiver:incoming ? null : row.address,
    body:row.body || '', timestamp:row.date, read:!!row.read,
    delivery:incoming ? 'received' : row.type === 2 ? 'sent' : row.type === 5 ? 'error' : 'sending',
    deliveryStatus:row.status === 0 ? 'success' : row.status >= 64 ? 'error' : 'not-applicable'};
}

export class AndroidPersonalData {
  constructor(native, contacts, messages, storage) {
    Object.assign(this, {native, contacts, messages, storage});
  }
  async rows(kind) {
    const status = await this.native({operation:'status'});
    if (!status[kind]) return [];
    const rows = [];
    let after = 0;
    do {
      const page = await this.native({operation:'page', kind, after});
      rows.push(...page.rows);
      if (rows.length > 100000) throw Error('ANDROID_DATA_TOO_LARGE');
      if (page.next === null) break;
      if (!Number.isSafeInteger(page.next) || page.next <= after) throw Error('INVALID_CURSOR');
      after = page.next;
    } while (true);
    return rows;
  }
  async contactRequest(app, params) {
    const write = ['save', 'remove', 'clear'].includes(params.operation);
    const access = app.manifest.permissions?.contacts?.access || '';
    if (!access.includes(write ? 'write' : 'read')) throw Error('PERMISSION_DENIED');
    // Third-party apps keep the local address book and never inherit Android's grant.
    if (app.installed || !['communications','sms','system'].includes(app.id)) return this.contacts.request(app, params);
    if (write) {
      if (String(params.contact?.id || params.id || '').startsWith('android:') ||
          params.operation === 'clear' && (await this.native({operation:'status'})).contacts)
        throw Error('ANDROID_DATA_READ_ONLY');
      return this.contacts.request(app, params);
    }
    const remote = (await this.rows('contacts')).map(contactFromAndroid);
    const local = await this.contacts.request(app, {operation:'all'});
    const view = new Contacts(null, ()=>{});
    let revision = this.contacts.data.revision;
    for (const c of remote) for (const character of JSON.stringify(c)) revision = (revision * 31 + character.charCodeAt(0)) >>> 0;
    view.data = {revision, contacts:[...local, ...remote]};
    return view.request(app, params);
  }
  async messageRequest(app, params) {
    if (!app.manifest.permissions?.sms) throw Error('PERMISSION_DENIED');
    if (app.installed || app.id !== 'sms') return this.messages.request(app, params);
    const {operation, args=[]} = params;
    if (['delete','markMessageRead'].includes(operation) && [args[0]].flat().some(id => id < 0))
      throw Error('ANDROID_DATA_READ_ONLY');
    if (!['getMessages','getThreads','getMessage'].includes(operation)) return this.messages.request(app, params);
    const remote = (await this.rows('sms')).filter(row => row.type !== 3).map(smsFromAndroid);
    const local = await this.messages.request(app, {operation:'getMessages'});
    const view = new Messages({run:async(_store, op)=>{
      if (op !== 'get') throw Error('ANDROID_DATA_READ_ONLY');
      return {value:[...local, ...remote]};
    }});
    return view.request(app, params);
  }
}
