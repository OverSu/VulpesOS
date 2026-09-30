// Android's extension storage/RPC is JSON. Preserve binary Gaia settings across
// both boundaries and reconstruct Blobs in the application's own JS realm.
(() => {
  const marker = '__vulpesBlobV1';
  async function encode(value) {
    if (value instanceof Blob) {
      if (value.size > 16 * 1024 * 1024) throw new Error('SETTING_BLOB_TOO_LARGE');
      const bytes = new Uint8Array(await value.arrayBuffer());
      const chunks = [];
      for (let i = 0; i < bytes.length; i += 16384) {
        chunks.push(String.fromCharCode(...bytes.subarray(i, i + 16384)));
      }
      return { [marker]: true, type: value.type, base64: btoa(chunks.join('')) };
    }
    if (Array.isArray(value)) return Promise.all(value.map(encode));
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        await Promise.all(
          Object.entries(value).map(async ([key, item]) => [key, await encode(item)]),
        ),
      );
    }
    return value;
  }
  function decode(value) {
    if (!value || typeof value !== 'object') return value;
    if (
      value[marker] === true &&
      typeof value.type === 'string' &&
      typeof value.base64 === 'string' &&
      Object.keys(value).length === 3
    ) {
      const bytes = Uint8Array.from(atob(value.base64), (c) => c.charCodeAt(0));
      return new Blob([bytes], { type: value.type });
    }
    if (Array.isArray(value)) return value.map(decode);
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, decode(item)]));
  }
  window.VulpesAndroidSettingsCodec = Object.freeze({ encode, decode });
})();
