// No Gecko, XPCOM, DOM or filesystem imports in the service contract.
export const API_VERSION = 1;

export class ServiceError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

function key(value) {
  if (
    typeof value !== 'string' ||
    !value ||
    value.length > 128 ||
    ['__proto__', 'constructor', 'prototype'].includes(value)
  ) {
    throw new ServiceError('INVALID_KEY');
  }
  return value;
}

// v1 transports JSON only. Binary images will need a separate attachment contract.
function jsonValue(value, depth = 0) {
  if (depth > 20) throw new ServiceError('INVALID_VALUE');
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return;
  if (typeof value === 'number' && Number.isFinite(value)) return;
  if (Array.isArray(value)) {
    value.forEach((v) => jsonValue(v, depth + 1));
    return;
  }
  if (typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    for (const [k, v] of Object.entries(value)) {
      key(k);
      jsonValue(v, depth + 1);
    }
    return;
  }
  throw new ServiceError('INVALID_VALUE');
}

export class SettingsService {
  constructor(storage, { maxBytes = 1024 * 1024 } = {}) {
    this.storage = storage;
    this.maxBytes = maxBytes;
  }

  // Only a trusted host adapter may bind a session. Never take identity or
  // permissions from an application's RPC payload.
  bindSession(identity, permissions) {
    if (typeof identity !== 'string' || !identity) throw new ServiceError('INVALID_IDENTITY');
    const grants = new Set(permissions);
    return async (request) => {
      const id = request && request.id;
      try {
        if (!request || request.version !== API_VERSION)
          throw new ServiceError('API_VERSION_UNSUPPORTED');
        if (!Number.isSafeInteger(id) || id < 0) throw new ServiceError('INVALID_REQUEST');
        const { method, params } = request;
        if (method === 'settings.get') {
          if (!grants.has('settings.read')) throw new ServiceError('PERMISSION_DENIED');
          const name = key(params && params.key);
          const value = await this.storage.get(name);
          return {
            version: API_VERSION,
            id,
            result: { found: value !== undefined, value: value === undefined ? null : value },
          };
        }
        if (method === 'settings.set') {
          if (!grants.has('settings.write')) throw new ServiceError('PERMISSION_DENIED');
          const values = params && params.values;
          if (!values || Object.getPrototypeOf(values) !== Object.prototype)
            throw new ServiceError('INVALID_VALUE');
          const entries = Object.entries(values);
          if (!entries.length || entries.length > 128) throw new ServiceError('INVALID_VALUE');
          // Validate the entire request before opening a write transaction.
          for (const [k, v] of entries) {
            key(k);
            jsonValue(v);
          }
          if (JSON.stringify(values).length > this.maxBytes)
            throw new ServiceError('VALUE_TOO_LARGE');
          await this.storage.setMany(entries);
          return { version: API_VERSION, id, result: { committed: true } };
        }
        throw new ServiceError('METHOD_NOT_SUPPORTED');
      } catch (error) {
        return {
          version: API_VERSION,
          id,
          error: { code: error instanceof ServiceError ? error.code : 'STORAGE_ERROR' },
        };
      }
    };
  }
}
