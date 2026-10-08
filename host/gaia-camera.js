// The Gaia camera UI consumes mozCameras. Only live MediaStream capabilities are exposed here.
(() => {
  if (location.hostname !== 'camera.localhost') return;
  let cameras = ['back'],
    devices = new Map(),
    current = null,
    generation = 0;
  let cameraError = null;
  let opening = Promise.resolve(), closing = Promise.resolve();
  const releases = new WeakMap();
  function releaseStream(stream, preview) {
    if (releases.has(stream)) return releases.get(stream);
    if (current === stream) current = null;
    const release = Promise.resolve().then(async () => {
      for (const video of document.querySelectorAll('video')) {
        if (video.srcObject === stream) {
          video.pause(); video.srcObject = null;
          if ('vulpesCapture' in video.dataset) video.remove();
        }
      }
      preview?.remove();
      try { await stream.vulpesCameraClose?.(); }
      finally { stream.getTracks().forEach(track => track.stop()); }
    });
    releases.set(stream, release);
    closing = release.catch(recordError);
    return release;
  }
  function recordError(error) {
    cameraError = { name: error.name || 'Error', message: error.message || '' };
    console.warn('Vulpes Camera:', cameraError.name, cameraError.message);
  }
  function renderError() {
    const node = document.querySelector('.overlay[data-type="request-fail"] #overlay-text');
    if (!node || !cameraError) return;
    const fr = (document.documentElement.lang || navigator.language).startsWith('fr');
    const messages = {
      NotAllowedError: [
        'Accès à la caméra refusé. Autorisez Photo à utiliser la caméra dans les permissions du système ou du navigateur.',
        'Camera access denied. Allow Camera to use the device in system or browser permissions.',
      ],
      NotSupportedError: [
        'L’accès au capteur photo n’est pas encore disponible sur ce modèle.',
        'Access to the camera sensor is not yet available on this model.',
      ],
      NotFoundError: [
        'Aucune caméra détectée. Vérifiez son branchement.',
        'No camera detected. Check its connection.',
      ],
      NotReadableError: [
        'Impossible de démarrer la caméra. Elle peut être occupée, ou son accès matériel a échoué.',
        'Unable to start the camera. It may be busy, or hardware access has failed.',
      ],
      OverconstrainedError: [
        'Le format demandé n’est pas disponible sur cette caméra.',
        'The requested format is not available on this camera.',
      ],
      AbortError: [
        'L’ouverture de la caméra a été interrompue. Revenez dans Photo pour réessayer.',
        'Camera startup was interrupted. Return to Camera to try again.',
      ],
    };
    const text = (messages[cameraError.name] || [
      'Impossible d’ouvrir la caméra.',
      'Unable to open the camera.',
    ])[fr ? 0 : 1];
    node.removeAttribute('data-l10n-id');
    if (node.textContent !== text) node.textContent = text;
  }
  new MutationObserver(renderError).observe(document.documentElement, {
    subtree: true,
    childList: true,
  });
  addEventListener('localized', renderError);
  const nativeHidden = Object.getOwnPropertyDescriptor(Document.prototype, 'hidden').get;
  let frameVisible = true;
  Object.defineProperty(document, 'hidden', {
    get: () => !frameVisible || nativeHidden.call(document),
  });
  Object.defineProperty(document, 'visibilityState', {
    get: () => (document.hidden ? 'hidden' : 'visible'),
  });
  addEventListener('message', (event) => {
    if (
      event.source !== parent ||
      event.origin !== 'http://system.localhost:' + location.port ||
      event.data?.type !== 'vulpes-camera-visibility'
    )
      return;
    const visible = event.data.visible === true;
    if (visible === frameVisible) return;
    frameVisible = visible;
    document.dispatchEvent(new Event('visibilitychange', { bubbles: true }));
  });
  const nativeSource = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'srcObject');
  Object.defineProperty(HTMLMediaElement.prototype, 'mozSrcObject', {
    configurable: true,
    get() {
      return nativeSource.get.call(this);
    },
    set(stream) {
      nativeSource.set.call(this, stream);
    },
  });
  function emit(target, type, detail = {}) {
    const event = new Event(type);
    Object.assign(event, detail);
    target.dispatchEvent(event);
  }
  async function discover(stream, name) {
    if (stream.vulpesNative) {
      cameras = ['back', 'front'];
      return;
    }
    // Device enumeration may wait indefinitely for focus in embedded desktop contexts.
    // The already-open stream remains usable even when no device list is exposed.
    let timeout;
    const entries = await Promise.race([
      navigator.mediaDevices.enumerateDevices(),
      new Promise((resolve) => (timeout = setTimeout(() => resolve([]), 1500))),
    ]).finally(() => clearTimeout(timeout));
    const list = entries.filter((d) => d.kind === 'videoinput');
    const settings = stream.getVideoTracks()[0].getSettings();
    const active = list.find((d) => d.deviceId === settings.deviceId) || list[0];
    const back = list.find((d) => /back|rear|environment/i.test(d.label));
    const front = list.find((d) => /front|user|face/i.test(d.label));
    // Unlabelled webcams must not exchange identities every time we switch.
    const previousBack = list.find(d => d.deviceId === devices.get('back'));
    const previousFront = list.find(d => d.deviceId === devices.get('front'));
    const first = back || previousBack ||
      ((settings.facingMode === 'user' || name === 'front') && list.length > 1
        ? list.find(d => d !== active) : active);
    devices = new Map();
    if (first) devices.set('back', first.deviceId);
    const second = [front, previousFront].find(d => d && d !== first) || list.find(d => d !== first);
    if (second) devices.set('front', second.deviceId);
    cameras = devices.size ? [...devices.keys()] : ['back'];
  }
  async function nativeStream(name) {
    let session;
    const call = (params) => VulpesCompat.call('platform.cameraPreview', {...params, session});
    const meta = await call({action:'start', camera:name === 'front' ? 'front' : 'back'});
    session = meta.session;
    const canvas = document.createElement('canvas');
    const sideways = meta.orientation % 180 !== 0;
    canvas.width = sideways ? meta.height : meta.width;
    canvas.height = sideways ? meta.width : meta.height;
    // Convert NV21 in a shader instead of blocking Gaia's UI with one JS loop
    // per pixel. The two textures contain Y and interleaved V/U respectively.
    const gl = canvas.getContext('webgl', {alpha:false, antialias:false, preserveDrawingBuffer:true});
    if (!gl) {
      await call({action:'stop'});
      throw new DOMException('Camera preview requires WebGL', 'NotSupportedError');
    }
    const timing = {frames:0, startedAt:performance.now(), conversionMs:0};
    let stopped = false, timer, stream, sequence = -1, closing, program, buffer;
    const textures = [], shaders = [];
    const stop = () => {
      if (closing) return closing;
      stopped = true; clearTimeout(timer);
      closing = call({action:'stop'}).finally(() => {
        textures.forEach(texture => gl.deleteTexture(texture));
        shaders.forEach(value => gl.deleteShader(value));
        if (buffer) gl.deleteBuffer(buffer);
        if (program) gl.deleteProgram(program);
        gl.getExtension('WEBGL_lose_context')?.loseContext();
      });
      return closing;
    };
    try {
      function shader(type, source) {
        const value = gl.createShader(type);
        shaders.push(value);
        gl.shaderSource(value, source); gl.compileShader(value);
        if (!gl.getShaderParameter(value, gl.COMPILE_STATUS)) throw Error('Camera shader compilation failed');
        return value;
      }
      program = gl.createProgram();
      gl.attachShader(program, shader(gl.VERTEX_SHADER, `
        attribute vec2 position; varying vec2 coord;
        void main() { gl_Position=vec4(position,0.,1.); coord=vec2(position.x*.5+.5,.5-position.y*.5); }
      `));
      gl.attachShader(program, shader(gl.FRAGMENT_SHADER, `
        precision mediump float; varying vec2 coord;
        uniform sampler2D luma; uniform sampler2D chroma; uniform float rotation;
        void main() {
          vec2 p=coord;
          if(rotation==90.) p=vec2(coord.y,1.-coord.x);
          else if(rotation==270.) p=vec2(1.-coord.y,coord.x);
          else if(rotation==180.) p=1.-coord;
          float y=1.16438356*(texture2D(luma,p).r-16./255.);
          vec4 vu=texture2D(chroma,p);
          float v=vu.r-128./255.; float u=vu.a-128./255.;
          gl_FragColor=vec4(y+1.59602678*v,y-.39176229*u-.81296764*v,y+2.01723214*u,1.);
        }
      `));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error('Camera shader link failed');
      gl.useProgram(program);
      buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
      const position=gl.getAttribLocation(program,'position');
      gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
      gl.uniform1f(gl.getUniformLocation(program,'rotation'),meta.orientation);
      ['luma','chroma'].forEach((name,index) => {
        const texture=gl.createTexture();textures.push(texture);gl.activeTexture(gl.TEXTURE0+index);gl.bindTexture(gl.TEXTURE_2D,texture);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
        gl.uniform1i(gl.getUniformLocation(program,name),index);
      });
      const draw = async () => {
        const frame = await call({action:'frame'});
        if (stopped || !frame.data || frame.sequence === sequence) return false;
        const data = new Uint8Array(frame.data), w = meta.width, h = meta.height;
        if (data.length !== w * h * 3 / 2) throw Error('Invalid native camera frame');
        sequence = frame.sequence;
        const start=performance.now();
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,textures[0]);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.LUMINANCE,w,h,0,gl.LUMINANCE,gl.UNSIGNED_BYTE,data.subarray(0,w*h));
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D,textures[1]);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.LUMINANCE_ALPHA,w/2,h/2,0,gl.LUMINANCE_ALPHA,gl.UNSIGNED_BYTE,data.subarray(w*h));
        gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
        timing.frames++;timing.conversionMs+=performance.now()-start;
        return true;
      };
      const deadline = Date.now() + 6000;
      while (!(await draw())) {
        if (Date.now() > deadline) throw new DOMException('No camera frames', 'NotReadableError');
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      stream = canvas.captureStream(24);
      stream.vulpesTiming = timing;
      stream.vulpesNative = true;
      stream.vulpesCameraMetadata = meta;
      stream.vulpesCameraControl = call;
      stream.vulpesCameraClose = stop;
      for (const track of stream.getTracks()) {
        const originalStop = track.stop.bind(track);
        track.stop = () => { stop().catch(recordError); originalStop(); };
      }
      const next = async () => {
        if (stopped) return;
        const started = performance.now();
        try { await draw(); }
        catch (error) {
          if (!stopped) { recordError(error); stream.getTracks().forEach(track => track.stop()); }
          return;
        }
        if (!stopped) timer = setTimeout(next, Math.max(0, 1000/24-(performance.now()-started)));
      };
      timer = setTimeout(next, 1000/24);
      return stream;
    } catch (error) { await stop().catch(() => {}); throw error; }
  }
  function getCamera(name, config = {}) {
    const ticket = ++generation;
    const request = opening.then(() => openCamera(name, config, ticket));
    opening = request.catch(() => {});
    return request;
  }
  async function openCamera(name, config, ticket) {
    if (config.mode && config.mode !== 'picture')
      throw new DOMException('Video capture is not ported yet', 'NotSupportedError');
    if (current) await releaseStream(current);
    await closing;
    if (document.hidden || ticket !== generation)
      throw new DOMException('Camera request superseded or hidden', 'AbortError');
    const selected = devices.get(name);

    cameraError = null;
    let stream;
    try {
      const platform = await VulpesCompat.call('platform.capabilities', {});
      if (platform.platform === 'tundra' && !platform.camera)
        throw new DOMException('Native camera adapter unavailable', 'NotSupportedError');
      stream = platform.platform === 'tundra' ? await nativeStream(name) : await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          ...(selected
            ? { deviceId: { exact: selected } }
            : { facingMode: { ideal: name === 'front' ? 'user' : 'environment' } }),
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
    } catch (error) {
      recordError(error);
      throw error;
    }
    if (document.hidden || ticket !== generation) {
      await releaseStream(stream);
      const error = new DOMException('Camera hidden', 'AbortError');
      recordError(error);
      throw error;
    }

    current = stream;
    let preview;
    try {
      await discover(stream, name);
      if (document.hidden || ticket !== generation)
        throw new DOMException('Camera hidden', 'AbortError');

      const track = stream.getVideoTracks()[0];
      const settings = track.getSettings();
      const size = { width: settings.width, height: settings.height };
      preview = document.createElement('video');
      preview.muted = true;
      preview.playsInline = true;
      preview.srcObject = stream;
      preview.dataset.vulpesCapture = '';
      preview.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none';
      document.body.append(preview);
      let previewTimeout;
      await Promise.race([
        preview.play(),
        new Promise((_, reject) => {
          previewTimeout = setTimeout(
            () => reject(new DOMException('Camera preview timed out', 'NotReadableError')),
            10000,
          );
        }),
      ]).finally(() => clearTimeout(previewTimeout));
      if (document.hidden || ticket !== generation)
        throw new DOMException('Camera hidden', 'AbortError');

      const native = stream.vulpesCameraMetadata;
      const pictureSizes = native?.pictureSizes || [size];
      let pictureSize = pictureSizes.reduce((a,b)=>a.width*a.height>b.width*b.height?a:b);
      let focusArea = null, zoom = 1;
      const configuration = () => ({
        mode: 'picture',
        previewSize: size,
        pictureSize,
        recorderProfile: null,
      });
      Object.assign(stream, {
        capabilities: {
          pictureSizes,
          previewSizes: [size],
          thumbnailSizes: [],
          recorderProfiles: {},
          flashModes: ['off'],
          focusModes: native ? (native.focusModes.includes('auto') ? ['auto','infinity'] : ['fixed']) : ['fixed'],
          sceneModes: ['auto'],
          whiteBalanceModes: ['auto'],
          isoModes: ['auto'],
          zoomRatios: native?.zoomRatios || [1],
          maxFocusAreas: native?.maxFocusAreas || 0,
          maxMeteringAreas: 0,
          maxDetectedFaces: 0,
        },
        resumeContinuousFocus() {},
        sensorAngle: 0,
        focusMode: 'fixed',
        flashMode: 'off',
        zoom: 1,
        async setConfiguration(value) {
          if (value.pictureSize) stream.setPictureSize(value.pictureSize);
          if (value.mode && value.mode !== 'picture')
            throw new DOMException('Video unavailable', 'NotSupportedError');
          queueMicrotask(() => emit(stream, 'previewstatechange', { newState: 'started' }));
          return configuration();
        },
        setPictureSize(value) {
          const selected = pictureSizes.find(s=>s.width===value.width && s.height===value.height);
          if (!selected) throw new DOMException('Unsupported picture size','NotSupportedError');
          pictureSize = selected;
        },
        getPictureSize: () => pictureSize,
        setFocusAreas(areas) {
          focusArea = areas?.[0] || null;
        },
        setMeteringAreas() {},
        async autoFocus() {
          if (!native?.focusModes.includes('auto')) return;
          emit(stream,'focus',{newState:'focusing'});
          let area = null;
          if (focusArea) {
            const rotate = (x,y) => native.orientation===90 ? [y,-x] :
              native.orientation===270 ? [-y,x] : native.orientation===180 ? [-x,-y] : [x,y];
            const points = [rotate(focusArea.left,focusArea.top),rotate(focusArea.right,focusArea.bottom)];
            const clamp = n=>Math.max(-1000,Math.min(1000,Math.round(n)));
            area={left:clamp(Math.min(...points.map(p=>p[0]))),right:clamp(Math.max(...points.map(p=>p[0]))),
              top:clamp(Math.min(...points.map(p=>p[1]))),bottom:clamp(Math.max(...points.map(p=>p[1])))};
          }
          try {
            await stream.vulpesCameraControl({action:'focus',area});
            emit(stream,'focus',{newState:'focused'});
          } catch(error) {emit(stream,'focus',{newState:'failed'});throw error;}
        },
        setThumbnailSize() {},
        async takePicture() {
          if (native) {
            const result=await stream.vulpesCameraControl({action:'picture',size:pictureSize});
            emit(stream,'shutter');
            return new Blob([result.data],{type:'image/jpeg'});
          }
          if (track.readyState !== 'live' || !preview.videoWidth)
            throw new DOMException('Camera inactive', 'InvalidStateError');
          const canvas = document.createElement('canvas');
          canvas.width = preview.videoWidth;
          canvas.height = preview.videoHeight;
          canvas.getContext('2d').drawImage(preview, 0, 0);
          const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
          if (!blob) throw new Error('JPEG capture failed');
          emit(stream, 'shutter');
          return blob;
        },
        resumePreview() {
          emit(stream, 'previewstatechange', { newState: 'started' });
        },
        release() {
          return releaseStream(stream, preview);
        },
        async startRecording() {
          throw new DOMException('Video unavailable', 'NotSupportedError');
        },
        stopRecording() {},
      });
      if (native) Object.defineProperty(stream,'zoom',{
        configurable:true, get:()=>zoom,
        set(value) {
          if (!Number.isFinite(value)) return;
          const ratios=native.zoomRatios;
          const nearest=ratios.reduce((a,b)=>Math.abs(a-value)<Math.abs(b-value)?a:b);
          zoom=nearest;
          stream.vulpesCameraControl({action:'zoom',zoom:nearest}).then(result=>{zoom=result.zoom;})
            .catch(recordError);
        }
      });
      dispatchEvent(
        new CustomEvent('vulpes-camera-capabilities', {
          detail: { cameras: [...cameras], flash: false, video: false },
        }),
      );
      return { camera: stream, configuration: configuration() };
    } catch (error) {
      recordError(error);
      await releaseStream(stream, preview).catch(recordError);
      throw error;
    }
  }
  Object.defineProperty(navigator, 'mozCameras', {
    value: { getListOfCameras: () => [...cameras], getCamera },
  });
  const stop = () => {
    // A permission dialog can hide the document before any stream exists.
    // Keep that request valid; its completion still checks visibility.
    if (!current) return;
    ++generation;
    releaseStream(current).catch(recordError);
  };
  addEventListener('pagehide', stop);
  addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
  });
  // Preserve familiar positions. Unavailable controls remain visible, labelled and inert.
  function updateControls() {
    const app = window.app;
    if (!app || !document.querySelector('.hud')) return;
    app.camera.cameraList = [...cameras];
    app.settings.cameras.filterOptions(cameras);
    document.querySelector('.hud').setAttribute('camera-enabled', String(cameras.length > 1));
    const controls = [
      [
        '.js-flash',
        true,
        'Flash indisponible dans cette Preview',
        'Flash unavailable in this Preview',
        'flash-off',
      ],
      [
        '.js-camera',
        cameras.length < 2,
        'Une seule caméra disponible',
        'Only one camera available',
        'toggle-camera-rear',
      ],
      ['.mode-switch', true, 'Vidéo pas encore disponible', 'Video is not available yet', null],
    ];
    const fr = (document.documentElement.lang || navigator.language).startsWith('fr');
    for (const [selector, disabled, french, english, icon] of controls) {
      const e = document.querySelector(selector);
      if (!e) continue;
      e.classList.toggle('vulpes-camera-unavailable', disabled);
      e.setAttribute('aria-disabled', String(disabled));
      if (!disabled) {
        e.removeAttribute('title');
        e.setAttribute('aria-label', fr ? 'Changer de caméra' : 'Switch camera');
      }
      if (disabled) {
        e.removeAttribute('data-l10n-id');
        e.setAttribute('aria-label', fr ? french : english);
        e.title = fr ? french : english;
        for (const child of e.querySelectorAll('[role=button]')) {
          child.setAttribute('aria-disabled', 'true');
          child.removeAttribute('data-l10n-id');
          child.setAttribute('aria-label', e.title);
        }
        if (icon) e.dataset.icon = icon;
      }
    }
  }
  let bound = false;
  const binding = setInterval(() => {
    if (!window.app || !document.querySelector('.hud') || bound) return;
    bound = true;
    clearInterval(binding);
    app.on('settings:configured', updateControls);
    app.on('localized', updateControls);
    updateControls();
  }, 100);
  addEventListener('pagehide', () => clearInterval(binding));
  addEventListener('vulpes-camera-capabilities', updateControls);
  // A pinch belongs to the viewfinder, never to the surrounding Gaia document.
  addEventListener('touchmove', event => {
    if (event.touches.length > 1) event.preventDefault();
  }, {passive:false});
  addEventListener(
    'click',
    (event) => {
      if (event.target.closest?.('.vulpes-camera-unavailable')) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true,
  );
  for (const name of ['touchstart', 'touchmove', 'touchend', 'pointerdown'])
    addEventListener(
      name,
      (event) => {
        if (event.target.closest?.('.vulpes-camera-unavailable')) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      },
      { capture: true, passive: false },
    );
})();
