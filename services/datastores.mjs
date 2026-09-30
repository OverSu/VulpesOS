// Shared stores are authorized against the host's installed manifest registry.
export class DataStoreService {
  constructor(apps, storage, notify) {
    Object.assign(this, { apps, storage, notify });
  }
  list(app, name) {
    return this.apps
      .filter(
        (owner) =>
          Object.hasOwn(owner.manifest['datastores-owned'] || {}, name) &&
          (owner === app || Object.hasOwn(app.manifest['datastores-access'] || {}, name)),
      )
      .map((owner) => ({
        name,
        owner: owner.manifestURL,
        readOnly:
          owner !== app &&
          (!!app.manifest['datastores-access'][name].readonly ||
            app.manifest['datastores-access'][name].access === 'readonly'),
      }));
  }
  async run(app, { name, owner, operation, args = [] }) {
    const allowed = this.list(app, name).find((store) => store.owner === owner);
    if (!allowed) throw new Error('DATASTORE_DENIED');
    const write = ['add', 'put', 'remove', 'clear'].includes(operation);
    if (write && allowed.readOnly) throw new Error('DATASTORE_READ_ONLY');
    if (!['get', 'snapshot', 'length', 'add', 'put', 'remove', 'clear'].includes(operation))
      throw new Error('METHOD_NOT_SUPPORTED');
    if (!Array.isArray(args) || args.length > 128) throw new Error('INVALID_ARGUMENT');
    const ids =
      operation === 'get'
        ? args
        : operation === 'remove'
          ? [args[0]]
          : ['add', 'put'].includes(operation) && args[1] !== undefined
            ? [args[1]]
            : [];
    for (const id of ids) {
      if (
        !(typeof id === 'string' && id.length > 0 && id.length <= 512) &&
        !(Number.isSafeInteger(id) && id >= 0)
      )
        throw new Error('INVALID_KEY');
    }
    const result = await this.storage.run(name + '\n' + owner, operation, args);
    if (write)
      this.notify({
        name,
        owner,
        revisionId: result.revisionId,
        operation: operation === 'put' ? 'update' : operation,
        id: operation === 'remove' ? args[0] : result.value,
      });
    return result.value;
  }
}
