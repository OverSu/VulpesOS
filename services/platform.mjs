// Shared authorization for platform adapters. Identity comes from the host, never the request.
export function authorizePlatform(app, operation, params = {}) {
  const permissions = app.manifest.permissions || {};
  const writeMedia = (type) =>
    ['pictures', 'music', 'videos'].includes(type) &&
    permissions['device-storage:' + type]?.access?.includes('write');
  const allowed = {
    capabilities: true,
    notificationEvent: app.id === 'system',
    systemReady: app.id === 'system',
    power: app.id === 'system',
    callScreenClosed: app.id === 'callscreen',
    settings: ['settings', 'system', 'costcontrol'].includes(app.id),
    snapshot: ['settings', 'system', 'costcontrol'].includes(app.id),
    wifi: ['settings', 'system'].includes(app.id),
    notification: !!permissions['desktop-notification'],
    capture: app.id === 'camera' && writeMedia('pictures'),
    cameraPreview: app.id === 'camera' && writeMedia('pictures'),
    pick: writeMedia(params.type),
    contact: !!permissions.contacts?.access?.includes('write'),
    dial: app.id === 'communications',
    calls: ['system', 'communications', 'callscreen'].includes(app.id),
    callHistory: app.id === 'communications',
    ackCallHistory: app.id === 'communications',
    hangup: ['system', 'communications', 'callscreen'].includes(app.id),
    answer: ['system', 'communications', 'callscreen'].includes(app.id),
    sms: app.id === 'sms',
    callAudio: ['system','callscreen'].includes(app.id),
    alarms: app.id === 'clock',
  };
  if (!Object.hasOwn(allowed, operation)) throw Error('METHOD_NOT_SUPPORTED');
  if (!allowed[operation]) throw Error('PERMISSION_DENIED');
  if (operation === 'cameraPreview' &&
      (!['start', 'frame', 'stop', 'focus', 'zoom', 'picture'].includes(params.action) ||
       (params.action === 'start' && !['back', 'front'].includes(params.camera))))
    throw Error('INVALID_VALUE');
  if (operation === 'cameraPreview') {
    if (params.action === 'zoom' && (!Number.isFinite(params.zoom) || params.zoom<1 || params.zoom>100))
      throw Error('INVALID_VALUE');
    if (params.action === 'focus' && params.area != null) {
      const a=params.area;
      if (!['left','right','top','bottom'].every(k=>Number.isInteger(a[k]) && Math.abs(a[k])<=1000) ||
          a.left>=a.right || a.top>=a.bottom) throw Error('INVALID_VALUE');
    }
    if (params.action === 'picture' && params.size != null &&
        !['width','height'].every(k=>Number.isInteger(params.size[k]) && params.size[k]>0 && params.size[k]<=20000))
      throw Error('INVALID_VALUE');
  }
  if (operation === 'ackCallHistory' && (!Array.isArray(params.ids) || params.ids.length > 500 || params.ids.some(id => typeof id !== 'string' || !/^\d{1,20}$/.test(id)))) throw Error('INVALID_VALUE');
  if (operation === 'wifi'  && JSON.stringify(params).length > 4096)
    throw Error('QuotaExceededError');
  if (operation === 'notification' && JSON.stringify(params).length > 65536)
    throw Error('QuotaExceededError');
}
