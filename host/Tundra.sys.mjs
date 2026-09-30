// Native state is published by Tundra, never supplied by an application.
export async function tundraSnapshot() {
  try {
    const value = await IOUtils.readJSON('/run/tundra-hardware/status.json');
    const age = Date.now() / 1000 - value.recordedAt;
    if (value.schema !== 1 || !Number.isFinite(age) || age < -5 || age > 20)
      throw Error('STALE_HARDWARE_STATE');
    const battery = value.battery;
    return {
      battery:
        battery &&
        Number.isFinite(battery.level) &&
        battery.level >= 0 &&
        battery.level <= 1 &&
        typeof battery.charging === 'boolean'
          ? battery
          : null,
      wifi: value.wifi,
      recordedAt: value.recordedAt,
      available: true,
    };
  } catch (_) {
    return { battery: null, wifi: { available: false, state: 'unavailable' }, available: false };
  }
}

export function tundraCapabilities(release) {
  const radio = Services.env?.get('VULPES_TUNDRA_RADIO') === '1';
  return {
    platform: 'tundra',
    platformName: 'Tundra',
    model: 'Google Pixel 3a',
    tundra: '0.1.0-dev',
    adapter: { version: '0.1.0-dev', device: 'sargo' },
    version: release.version,
    gaia: release.gaia,
    gecko: Services.appinfo.platformVersion,
    camera: true,
    media: true,
    contacts: true,
    notifications: true,
    dial: radio,
    callControl: radio,
    sms: radio,
    alarms: false,
    hardwareStatus: true,
    wifiControl: Services.env?.get('VULPES_TUNDRA_WIFI') === '1',
  };
}

export async function tundraRadio(operation, params = {}) {
  if (Services.env.get('VULPES_TUNDRA_RADIO') !== '1') throw Error('RADIO_UNAVAILABLE');
  if (!['status', 'calls', 'dial', 'hangup', 'answer', 'sms', 'incomingMessages', 'ackMessages', 'messageState'].includes(operation)) throw Error('RADIO_INVALID_REQUEST');
  const { Subprocess } = ChromeUtils.importESModule('resource://gre/modules/Subprocess.sys.mjs');
  const process = await Subprocess.call({
    command: '/usr/bin/python3',
    arguments: ['/etc/tundra/radio-control.py', '--client-envelope'],
    stderr: 'ignore',
  });
  await process.stdin.write(JSON.stringify({ version: 1, operation, ...params }));
  await process.stdin.close();
  let output = '';
  for (;;) {
    const chunk = await process.stdout.readString();
    if (!chunk) break;
    output += chunk;
    if (output.length > 65536) {
      process.kill();
      throw Error('RADIO_UNAVAILABLE');
    }
  }
  const { exitCode } = await process.wait();
  if (exitCode) throw Error('RADIO_UNAVAILABLE');
  let reply;
  try {
    reply = JSON.parse(output);
  } catch (_) {
    throw Error('RADIO_INVALID_REPLY');
  }
  if (reply?.ok === false) {
    const errors = ['RADIO_NOT_REGISTERED', 'RADIO_BUSY', 'RADIO_NOT_READY',
      'RADIO_REQUEST_FAILED', 'INVALID_NUMBER', 'INVALID_SMS', 'INVALID_CALL'];
    throw Error(errors.includes(reply.error) ? reply.error : 'RADIO_REQUEST_FAILED');
  }
  if (reply?.ok !== true) throw Error('RADIO_INVALID_REPLY');
  return reply.result;
}

let wifiScanPending = null;
let wifiScanCache = null;
const WIFI_SCAN_CACHE_MS = 5000;

export async function tundraWifi(params) {
  if (Services.env.get('VULPES_TUNDRA_WIFI') !== '1') throw Error('NOT_SUPPORTED');
  if (!['scan', 'connect', 'disconnect', 'status', 'setEnabled', 'known', 'forget'].includes(params.operation))
    throw Error('WIFI_INVALID_REQUEST');
  if (params.operation !== 'scan') {
    try { return await wifiCommand(params); }
    finally { wifiScanCache = null; }
  }
  // System and Settings share a broker: at most one Python scan client exists.
  if (wifiScanPending) return wifiScanPending;
  if (wifiScanCache && Date.now() < wifiScanCache.expires) {
    if (wifiScanCache.error) throw wifiScanCache.error;
    return wifiScanCache.result;
  }
  wifiScanPending = wifiCommand(params).then(result => {
    wifiScanCache = {result, expires:Date.now() + WIFI_SCAN_CACHE_MS};
    return result;
  }, error => {
    // A missing interface must not turn retries into another process storm.
    wifiScanCache = {error, expires:Date.now() + WIFI_SCAN_CACHE_MS};
    throw error;
  }).finally(() => { wifiScanPending = null; });
  return wifiScanPending;
}

async function wifiCommand(params) {
  const { Subprocess } = ChromeUtils.importESModule('resource://gre/modules/Subprocess.sys.mjs');
  const process = await Subprocess.call({
    command: '/usr/bin/python3',
    arguments: ['/etc/tundra/wifi-control.py', '--client'],
    stderr: 'ignore',
  });
  // Passwords are never command-line arguments, preferences or log messages.
  await process.stdin.write(JSON.stringify(params));
  await process.stdin.close();
  let output = '';
  for (;;) {
    const chunk = await process.stdout.readString();
    if (!chunk) break;
    output += chunk;
    if (output.length > 65536) {
      process.kill();
      throw Error('WIFI_UNAVAILABLE');
    }
  }
  const { exitCode } = await process.wait();
  if (exitCode) throw Error('WIFI_UNAVAILABLE');
  const reply = JSON.parse(output);
  if (reply.error) throw Error(reply.error);
  return reply.result;
}

export async function tundraHardware(params) {
  if (Services.env.get('VULPES_TUNDRA') !== '1') return;
  const { Subprocess } = ChromeUtils.importESModule('resource://gre/modules/Subprocess.sys.mjs');
  const process = await Subprocess.call({command:'/usr/bin/python3',
    arguments:['/etc/tundra/buttons.py', '--client'], stderr:'ignore'});
  await process.stdin.write(JSON.stringify(params));
  await process.stdin.close();
  const output = await process.stdout.readString();
  const {exitCode} = await process.wait();
  if (exitCode || !JSON.parse(output)?.ok) throw Error('HARDWARE_REQUEST_FAILED');
}

export async function tundraCallAudio(params) {
  const {Subprocess} = ChromeUtils.importESModule('resource://gre/modules/Subprocess.sys.mjs');
  const process = await Subprocess.call({command:'/usr/bin/python3',
    arguments:['/etc/tundra/call-audio.py','--client'],stderr:'ignore'});
  await process.stdin.write(JSON.stringify(params));
  await process.stdin.close();
  let text = '';
  for (;;) {
    const chunk = await process.stdout.readString();
    if (!chunk) break;
    text += chunk;
    if (text.length > 4096) {
      process.kill();
      throw Error('CALL_AUDIO_INVALID_REPLY');
    }
  }
  const {exitCode} = await process.wait();
  if (exitCode) throw Error('CALL_AUDIO_UNAVAILABLE');
  const reply = JSON.parse(text);
  if (reply.error) throw Error(reply.error);
  return reply.result;
}
