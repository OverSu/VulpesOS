// Only Platform's authorized camera application may own this worker.
import {Subprocess} from 'resource://gre/modules/Subprocess.sys.mjs';
import {setTimeout, clearTimeout} from 'resource://gre/modules/Timer.sys.mjs';

export class NativeCamera {
  constructor() { this.session = null; this.queue = Promise.resolve(); this.closing = Promise.resolve(); this.nextSession = 0; }

  request(actor, params) {
    const work = this.queue.then(() => this.perform(actor, params));
    this.queue = work.catch(() => {});
    return work;
  }

  async packet(session, metadata = false) {
    let timer;
    try {
      return await Promise.race([
        (async () => {
          const pipe=session.process.stdout;
          const sequence=metadata ? null : await pipe.readUint32();
          const length=await pipe.readUint32();
          if(metadata) {
            if(length>65536) throw Error('CAMERA_INVALID_FORMAT');
            return pipe.readJSON(length);
          }
          if(length!==0 && length!==640*480*3/2) throw Error('CAMERA_INVALID_FRAME');
          return {sequence,data:length ? await pipe.read(length) : null};
        })(),
        new Promise((_, reject) => { timer=setTimeout(()=>reject(Error('CAMERA_TIMEOUT')),15000); }),
      ]);
    } finally { clearTimeout(timer); }
  }

  async perform(actor, params) {
    if (params.action === 'stop') {
      if (this.session?.actor === actor && this.session.id === params.session) await this.close();
      return null;
    }
    if (params.action === 'start') {
      if (this.session && this.session.actor !== actor) throw Error('CAMERA_BUSY');
      await this.close();
      const process = await Subprocess.call({command:'/usr/bin/python3',
        arguments:['-u', '/etc/tundra/camera-preview.py', '--camera', params.camera === 'front' ? '1' : '0'],
        stderr:'ignore'});
      this.session = {actor, process, id: ++this.nextSession};
      try {
        const metadata = await this.packet(this.session, true);
        if (!metadata.ready || metadata.format !== 'nv21' || metadata.width !== 640 || metadata.height !== 480)
          throw Error('CAMERA_INVALID_FORMAT');
        return {...metadata, session: this.session.id};
      } catch (error) { this.close(); throw error; }
    }
    if (!this.session || this.session.actor !== actor || this.session.id !== params.session)
      throw Error('CAMERA_NOT_OPEN');
    if (!['frame','focus','zoom','picture'].includes(params.action)) throw Error('CAMERA_INVALID_COMMAND');
    let controlRejected = false;
    try {
      if (params.action === 'frame') {
        await this.session.process.stdin.write('frame\n');
        return await this.packet(this.session);
      }
      const command = JSON.stringify(params);
      if (command.length>2048) throw Error('CAMERA_INVALID_COMMAND');
      await this.session.process.stdin.write(command+'\n');
      const reply = await this.packet(this.session, true);
      if (!reply.ok) {
        controlRejected = true;
        throw Error(reply.error || 'CAMERA_CONTROL_FAILED');
      }
      if (params.action === 'picture') {
        if (!Number.isInteger(reply.jpegLength) || reply.jpegLength<4 || reply.jpegLength>32*1024*1024)
          throw Error('CAMERA_INVALID_JPEG');
        return {data:await this.session.process.stdout.read(reply.jpegLength)};
      }
      return reply.result;
    } catch (error) {
      // A complete error reply leaves the protocol synchronized. A focus
      // timeout must not discard a camera whose preview is still running.
      if (!controlRejected) this.close();
      throw error;
    }
  }

  close() {
    const session = this.session;
    this.session = null;
    if (!session) return this.closing;
    session.process.stdin.close().catch(() => {});
    const timer = setTimeout(() => session.process.kill(), 1500);
    this.closing = session.process.wait().finally(() => clearTimeout(timer));
    return this.closing;
  }

  cleanup(actor) {
    if (this.session?.actor === actor) this.close();
  }
}
