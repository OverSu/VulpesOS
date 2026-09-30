// Profile-owned desktop media. Never expose arbitrary host paths to Gaia.
Cu.importGlobalProperties(['File']);
const TYPES = { pictures: ['image/'], music: ['audio/'], videos: ['video/'] };
const MIME = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
  opus: 'audio/ogg',
  wav: 'audio/wav',
  flac: 'audio/flac',
  m4a: 'audio/mp4',
  mp4: 'video/mp4',
  webm: 'video/webm',
  ogv: 'video/ogg',
  '3gp': 'video/3gpp',
};
export class Media {
  constructor(notify) {
    this.notify = notify;
    this.root = PathUtils.join(PathUtils.profileDir, 'vulpes-media');
    this.queue = Promise.resolve();
  }
  path(type, name = '') {
    if (typeof name !== 'string') throw new Error('InvalidModificationError');
    name = name.replace(/^\/sdcard\//, '');
    const parts = name ? name.split('/') : [];
    if (
      parts.some((p) => !p || p === '.' || p === '..' || /[\\\x00-\x1f]/.test(p)) ||
      name.startsWith('/') ||
      name.length > 512
    )
      throw new Error('SecurityError');
    const root = PathUtils.join(this.root, type),
      path = PathUtils.join(root, ...parts);
    // Reject symlinks, including parent directories, on every access.
    let current = this.root;
    for (const part of ['', type, ...parts]) {
      if (part) current = PathUtils.join(current, part);
      const f = Cc['@mozilla.org/file/local;1'].createInstance(Ci.nsIFile);
      f.initWithPath(current);
      if (f.exists() && f.isSymlink()) throw new Error('SecurityError');
    }
    return { root, path, name };
  }
  async entries(type, directory = '') {
    const base = this.path(type, directory);
    if (!(await IOUtils.exists(base.path))) return [];
    const files = [];
    const walk = async (path) => {
      for (const child of await IOUtils.getChildren(path)) {
        const name = child.slice(base.root.length + 1);
        this.path(type, name);
        const info = await IOUtils.stat(child);
        if (info.type === 'directory') await walk(child);
        else if (info.type === 'regular')
          files.push({
            name: '/sdcard/' + name,
            path: child,
            size: info.size,
            lastModified: info.lastModified,
            type: MIME[name.split('.').pop().toLowerCase()] || 'application/octet-stream',
          });
      }
    };
    await walk(base.path);
    return files.sort((a, b) => a.name.localeCompare(b.name));
  }
  async request(app, params) {
    const { type, operation } = params;
    const access = app.manifest.permissions?.['device-storage:' + type]?.access || '';
    if (!TYPES[type] || !access.includes(['add', 'delete'].includes(operation) ? 'write' : 'read'))
      throw new Error('PERMISSION_DENIED');
    if (['add', 'delete'].includes(operation)) {
      const result = this.queue.then(() => this.run(type, params));
      this.queue = result.catch(() => {});
      return result;
    }
    return this.run(type, params);
  }
  async run(type, { operation, name = '', blob, since }) {
    const base = this.path(type, name);
    await IOUtils.makeDirectory(base.root, { ignoreExisting: true });
    if (operation === 'available') return 'available';
    if (operation === 'freeSpace') {
      const f = Cc['@mozilla.org/file/local;1'].createInstance(Ci.nsIFile);
      f.initWithPath(base.root);
      return f.diskSpaceAvailable;
    }
    if (operation === 'usedSpace')
      return (await this.entries(type)).reduce((sum, f) => sum + f.size, 0);
    if (operation === 'enumerate')
      return (await this.entries(type, name))
        .filter((f) => !since || f.lastModified >= since)
        .map(({ path, ...file }) => file);
    if (operation === 'get') {
      if (!name || !(await IOUtils.exists(base.path))) throw new Error('NotFoundError');
      const stat = await IOUtils.stat(base.path);
      if (stat.type !== 'regular') throw new Error('NotFoundError');
      return {
        blob: await File.createFromFileName(base.path),
        name: '/sdcard/' + base.name,
        lastModified: stat.lastModified,
        type: MIME[base.name.split('.').pop().toLowerCase()] || 'application/octet-stream',
      };
    }
    if (operation === 'add') {
      if (!name || !blob || typeof blob.arrayBuffer !== 'function' || blob.size > 512 * 1024 * 1024)
        throw new Error('InvalidModificationError');
      const mime = blob.type || MIME[base.name.split('.').pop().toLowerCase()] || '';
      if (!TYPES[type].some((prefix) => mime.startsWith(prefix)))
        throw new Error('TypeMismatchError');
      if (await IOUtils.exists(base.path)) throw new Error('NoModificationAllowedError');
      await IOUtils.makeDirectory(PathUtils.parent(base.path), { ignoreExisting: true });
      await IOUtils.write(base.path, new Uint8Array(await blob.arrayBuffer()), {
        noOverwrite: true,
      });
      this.notify({ type, path: '/sdcard/' + base.name, reason: 'created' });
      this.notify({ type, path: '/sdcard/' + base.name, reason: 'modified' });
      return '/sdcard/' + base.name;
    }
    if (operation === 'delete') {
      if (!name) throw new Error('SecurityError');
      if (await IOUtils.exists(base.path)) {
        if ((await IOUtils.stat(base.path)).type !== 'regular') throw new Error('SecurityError');
        await IOUtils.remove(base.path);
        this.notify({ type, path: '/sdcard/' + base.name, reason: 'deleted' });
      }
      return '/sdcard/' + base.name;
    }
    throw new Error('METHOD_NOT_SUPPORTED');
  }
}
