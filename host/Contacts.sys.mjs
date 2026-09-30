// Local address book for the desktop profile; no invented sample contacts.
export class Contacts {
  constructor(storage, notify) {
    this.storage = storage;
    this.notify = notify;
    this.queue = Promise.resolve();
  }
  async init() {
    this.data = (await this.storage.run('vulpes-private-contacts', 'get', ['state'])).value || {
      revision: 0,
      contacts: [],
    };
  }
  async request(app, { operation, contact, options = {}, id }) {
    const access = app.manifest.permissions?.contacts?.access || '';
    const write = ['save', 'remove', 'clear'].includes(operation);
    if (!(write ? access.includes('write') : access.includes('read')))
      throw new Error('PERMISSION_DENIED');
    if (write) {
      const commit = this.queue.then(async () => {
        const next = { revision: this.data.revision, contacts: [...this.data.contacts] };
        let reason;
        if (operation === 'save') {
          if (
            !contact ||
            typeof contact !== 'object' ||
            JSON.stringify(contact).length > 1024 * 1024
          )
            throw new Error('INVALID_CONTACT');
          const index = next.contacts.findIndex((c) => c.id === contact.id);
          const now = new Date().toISOString();
          contact = {
            ...contact,
            id: index < 0 ? Services.uuid.generateUUID().toString() : contact.id,
            published: index < 0 ? now : next.contacts[index].published,
            updated: now,
          };
          id = contact.id;
          reason = index < 0 ? 'create' : 'update';
          if (index < 0) next.contacts.push(contact);
          else next.contacts[index] = contact;
        } else if (operation === 'remove') {
          next.contacts = next.contacts.filter((c) => c.id !== id);
          reason = 'remove';
        } else {
          next.contacts = [];
          reason = 'remove';
        }
        next.revision++;
        await this.storage.run('vulpes-private-contacts', 'put', [next, 'state']);
        this.data = next;
        this.notify({ contactID: id, reason });
        return contact || null;
      });
      this.queue = commit.catch(() => {});
      return commit;
    }
    if (operation === 'count') return this.data.contacts.length;
    if (operation === 'revision') return this.data.revision;
    if (!['find', 'all'].includes(operation)) throw new Error('METHOD_NOT_SUPPORTED');
    let result = [...this.data.contacts];
    if (options.filterValue !== undefined) {
      const value = String(options.filterValue).toLocaleLowerCase();
      result = result.filter((c) =>
        (options.filterBy || ['name']).some((key) => {
          const values = Array.isArray(c[key]) ? c[key] : [c[key]];
          return values.some((item) => {
            const text = String(item?.value ?? item ?? '').toLocaleLowerCase();
            if (options.filterOp === 'equals') return text === value;
            if (options.filterOp === 'startsWith') return text.startsWith(value);
            if (options.filterOp === 'match' || options.filterOp === 'fuzzyMatch')
              return (
                value.replace(/\D/g, '').length > 0 &&
                text.replace(/\D/g, '').endsWith(value.replace(/\D/g, ''))
              );
            return text.includes(value);
          });
        }),
      );
    }
    if (options.sortBy)
      result.sort(
        (a, b) =>
          String(a[options.sortBy] || '').localeCompare(String(b[options.sortBy] || '')) *
          (options.sortOrder === 'descending' ? -1 : 1),
      );
    if (options.filterLimit > 0) result = result.slice(0, Math.min(options.filterLimit, 10000));
    return result;
  }
}
