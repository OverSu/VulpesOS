// The Gaia camera UI consumes mozCameras. Only live MediaStream capabilities are exposed here.
(() => {
  if (location.hostname !== 'camera.localhost') return;
  const videoMime = typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus') ? 'video/webm;codecs=vp8,opus' : null;
  window.VulpesVideoExtension = videoMime ? 'webm' : null;
  let cameras = ['back'],
    devices = new Map(),
    current = null,
    generation = 0;
  let cameraError = null;
  let opening = Promise.resolve(), closing = Promise.resolve();
  const releases = new WeakMap();
  const nativeViews = new WeakMap();
  function releaseStream(stream, preview) {
    if (releases.has(stream)) return releases.get(stream);
    if (current === stream) current = null;
    const release = Promise.resolve().then(async () => {
      await stream.vulpesFinishRecording?.();
      emit(stream, 'previewstatechange', {newState:'stopped'});
      // Stop the capture producer before detaching its consumers. Gecko can
      // otherwise block in srcObject=null while a GPU-backed frame is in use.
      stream.getTracks().forEach(track => track.stop());
      for (const video of document.querySelectorAll('video')) {
        if (nativeViews.get(video) === stream) {
          nativeViews.delete(video);
          stream.vulpesPreviewCanvas.remove();
          video.style.display = '';
        }
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
      return nativeViews.get(this) || nativeSource.get.call(this);
    },
    set(stream) {
      const old = nativeViews.get(this);
      if (old) {
        old.vulpesPreviewCanvas.remove();
        nativeViews.delete(this);
        this.style.display = '';
      }
      if (stream?.vulpesPreviewCanvas) {
        // The HAL already delivers NV21 frames. Render them directly in Gaia's
        // viewfinder instead of capturing the WebGL canvas into a second GPU
        // video pipeline, which stalls on repeated switches on Sargo.
        nativeViews.set(this, stream);
        const canvas = stream.vulpesPreviewCanvas;
        canvas.className = this.className;
        canvas.dataset.vulpesNativePreview = '';
        canvas.style.cssText = 'display:block;width:100%;height:100%;pointer-events:none';
        this.style.display = 'none';
        this.parentNode.append(canvas);
      } else nativeSource.set.call(this, stream);
    },
  });
  const playVideo = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function() {
    return nativeViews.has(this) ? Promise.resolve() : playVideo.call(this);
  };
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
  // Keep one graphics context per app. Losing/recreating it at every lens switch
  // can exhaust the mobile driver while captured video frames are still in use.
  let nativeCanvas = null;
  async function nativeStream(name) {
    let session;
    const call = (params) => VulpesCompat.call('platform.cameraPreview', {...params, session});
    const meta = await call({action:'start', camera:name === 'front' ? 'front' : 'back'});
    session = meta.session;
    const canvas = nativeCanvas || (nativeCanvas = document.createElement('canvas'));
    const sideways = meta.orientation % 180 !== 0;
    const width = sideways ? meta.height : meta.width;
    const height = sideways ? meta.width : meta.height;
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    // Convert NV21 in a shader instead of blocking Gaia's UI with one JS loop
    // per pixel. The two textures contain Y and interleaved V/U respectively.
    const gl = canvas.getContext('webgl', {alpha:false, antialias:false, preserveDrawingBuffer:true});
    if (!gl) {
      await call({action:'stop'});
      throw new DOMException('Camera preview requires WebGL', 'NotSupportedError');
    }
    const timing = {frames:0, startedAt:performance.now(), conversionMs:0, transferMs:0, sensorFrames:0};
    let stopped = false, timer, stream, wakeLock, sequence = -1, closing, program, buffer;
    const textures = [], shaders = [];
    const stop = () => {
      if (closing) return closing;
      stopped = true; clearTimeout(timer);
      wakeLock?.unlock(); wakeLock = null;
      closing = call({action:'stop'}).finally(() => {
        if (stream) stream.vulpesClosed = true;
        textures.forEach(texture => gl.deleteTexture(texture));
        shaders.forEach(value => gl.deleteShader(value));
        if (buffer) gl.deleteBuffer(buffer);
        if (program) gl.deleteProgram(program);
        // The next lens reuses this context after its old stream has stopped.
        gl.clearColor(0,0,0,1); gl.clear(gl.COLOR_BUFFER_BIT);
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
      gl.viewport(0,0,canvas.width,canvas.height);
      const pixels = meta.width * meta.height;
      gl.activeTexture(gl.TEXTURE0);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.LUMINANCE,meta.width,meta.height,0,gl.LUMINANCE,gl.UNSIGNED_BYTE,null);
      gl.activeTexture(gl.TEXTURE1);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.LUMINANCE_ALPHA,meta.width/2,meta.height/2,0,gl.LUMINANCE_ALPHA,gl.UNSIGNED_BYTE,null);
      const draw = async () => {
        const requested = performance.now();
        const frame = await call({action:'frame'});
        timing.transferMs += performance.now()-requested;
        if (stopped || !frame.data || frame.sequence === sequence) return false;
        const data = new Uint8Array(frame.data), w = meta.width, h = meta.height;
        if (data.length !== w * h * 3 / 2) throw Error('Invalid native camera frame');
        sequence = frame.sequence; timing.sensorFrames = sequence;
        const start=performance.now();
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,textures[0]);
        gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,w,h,gl.LUMINANCE,gl.UNSIGNED_BYTE,data.subarray(0,pixels));
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D,textures[1]);
        gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,w/2,h/2,gl.LUMINANCE_ALPHA,gl.UNSIGNED_BYTE,data.subarray(pixels));
        gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
        timing.frames++;timing.conversionMs+=performance.now()-start;
        return true;
      };
      const deadline = Date.now() + 6000;
      while (!(await draw())) {
        if (Date.now() > deadline) throw new DOMException('No camera frames', 'NotReadableError');
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      stream = new MediaStream();
      stream.vulpesPreviewCanvas = canvas;
      stream.vulpesClosed = false;
      // A canvas has no video element's implicit screen wake lock.
      wakeLock = navigator.requestWakeLock?.('screen');
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
          if (!stopped) { recordError(error); await stop().catch(recordError); }
          return;
        }
        if (!stopped) timer = setTimeout(next, Math.max(0, 1000/30-(performance.now()-started)));
      };
      timer = setTimeout(next, 1000/30);
      return stream;
    } catch (error) { await stop().catch(() => {}); throw error; }
  }
  async function captureVideo(constraints, ticket, platform) {
    // track.stop() returns before some Android camera drivers finish closing.
    // Retry the same sensor, never replace a refused/missing camera silently.
    for (let attempt = 0; ; attempt++) {
      if (document.hidden || ticket !== generation)
        throw new DOMException('Camera request superseded or hidden', 'AbortError');
      try { return await navigator.mediaDevices.getUserMedia(constraints); }
      catch (error) {
        if (platform !== 'android' || error.name !== 'NotReadableError' || attempt >= 2) throw error;
        await new Promise(resolve => setTimeout(resolve, 200 * (attempt + 1)));
      }
    }
  }
  function getCamera(name, config = {}) {
    const ticket = ++generation;
    const request = opening.then(() => openCamera(name, config, ticket));
    opening = request.catch(() => {});
    return request;
  }
  async function openCamera(name, config, ticket) {
    if (config.mode && !['picture', ...(videoMime ? ['video'] : [])].includes(config.mode))
      throw new DOMException('Unsupported capture mode', 'NotSupportedError');
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
      stream = platform.platform === 'tundra' ? await nativeStream(name) : await captureVideo({
        audio: false,
        video: {
          ...(selected
            ? { deviceId: { exact: selected } }
            : { facingMode: { ideal: name === 'front' ? 'user' : 'environment' } }),
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      }, ticket, platform.platform);
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
      const native = stream.vulpesCameraMetadata;
      let size;
      if (native) {
        // Preview dimensions and still photos come directly from the HAL.
        // The native canvas needs no hidden capture video.
        const sideways = native.orientation % 180 !== 0;
        size = {width:sideways ? native.height : native.width,
                height:sideways ? native.width : native.height};
      } else {
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
        const settings = stream.getVideoTracks()[0].getSettings();
        size = {width:preview.videoWidth || settings.width,
                height:preview.videoHeight || settings.height};
      }
      if (document.hidden || ticket !== generation)
        throw new DOMException('Camera hidden', 'AbortError');

      const pictureSizes = native?.pictureSizes || [size];
      let pictureSize = pictureSizes.reduce((a,b)=>a.width*a.height>b.width*b.height?a:b);
      let flashMode = 'off', flashUpdate = Promise.resolve();
      let focusArea = null, zoom = 1, mode = config.mode || 'picture', recording, startingRecording = false;
      const profile = {containerFormat:'webm',video:{width:size.width,height:size.height,codec:'vp8',bitrate:1500000,framerate:30},audio:{codec:'opus',samplerate:48000,channels:1,bitrate:64000}};
      const configuration = () => ({
        mode,
        previewSize: size,
        pictureSize,
        recorderProfile: videoMime ? 'webm' : null,
      });
      Object.assign(stream, {
        capabilities: {
          pictureSizes,
          previewSizes: [size],
          thumbnailSizes: [],
          recorderProfiles: videoMime ? {webm:profile} : {},
          flashModes: native?.flashModes?.length ? native.flashModes : ['off'],
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
          if (value.mode && !['picture',...(videoMime ? ['video'] : [])].includes(value.mode))
            throw new DOMException('Video unavailable', 'NotSupportedError');
          if(value.mode)mode=value.mode;
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
          await flashUpdate;
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
        async startRecording(options, storage, filepath) {
          if(!videoMime)throw new DOMException('Video unavailable','NotSupportedError');
          if(recording || startingRecording)throw new DOMException('Recording in progress','InvalidStateError');
          startingRecording=true;
          let audio, captured;
          try {
            audio=await navigator.mediaDevices.getUserMedia({audio:true,video:false});
            if(current!==stream || document.hidden)throw new DOMException('Camera closed','AbortError');
            // Only recording captures the native canvas. The preview keeps its
            // direct WebGL surface and the capture track is stopped before a switch.
            captured=native ? stream.vulpesPreviewCanvas.captureStream(30) : new MediaStream(stream.getVideoTracks().map(t=>t.clone()));
            for(const track of audio.getAudioTracks())captured.addTrack(track);
            const recorder=new MediaRecorder(captured,{mimeType:videoMime,videoBitsPerSecond:1500000,audioBitsPerSecond:64000});
            const chunks=[];let bytes=0,failed=false,finish;
            const done=new Promise(resolve=>{finish=resolve;});
            const cap=Math.min(options.maxFileSizeBytes || Infinity,32*1024*1024);
            recorder.ondataavailable=event=>{
              if(event.data.size) {chunks.push(event.data);bytes+=event.data.size;}
              if(bytes>=cap && recorder.state==='recording') {
                emit(stream,'recorderstatechange',{newState:'FileSizeLimitReached'});
                recorder.stop();
              }
            };
            recorder.onerror=()=>{failed=true;emit(stream,'recorderstatechange',{newState:'MediaRecorderFailed'});};
            recorder.onstop=async()=>{
              try {
                if(failed || !bytes)throw Error('Empty or failed recording');
                const blob=new Blob(chunks,{type:'video/webm'});
                await storage.addNamed(blob,filepath);
                const canvas=document.createElement('canvas');
                const source=native ? stream.vulpesPreviewCanvas : preview;
                canvas.width=native ? source.width : preview.videoWidth;
                canvas.height=native ? source.height : preview.videoHeight;
                canvas.getContext('2d').drawImage(source,0,0,canvas.width,canvas.height);
                const poster=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.9));
                if(!poster)throw Error('Video poster failed');
                emit(stream,'poster',{data:poster});
              } catch(error) {
                recordError(error);emit(stream,'recorderstatechange',{newState:'MediaRecorderFailed'});
              } finally {
                captured.getTracks().forEach(t=>t.stop());
                chunks.length=0;recording=null;finish();
                emit(stream,'recorderstatechange',{newState:'Stopped'});
              }
            };
            recording={recorder,done};
            recorder.start(500);
            emit(stream,'recorderstatechange',{newState:'Started'});
          } catch(error) {
            captured?.getTracks().forEach(t=>t.stop());audio?.getTracks().forEach(t=>t.stop());
            recording=null;throw error;
          } finally {startingRecording=false;}
        },
        stopRecording() {
          if(recording?.recorder.state==='recording')recording.recorder.stop();
        },
        async vulpesFinishRecording() {
          if(!recording)return;
          const done=recording.done;stream.stopRecording();await done;
        },
      });
      if (native) Object.defineProperty(stream,'flashMode',{
        configurable:true, get:()=>flashMode,
        set(value) {
          if (!stream.capabilities.flashModes.includes(value) || value===flashMode) return;
          const previous=flashMode;
          flashMode=value;
          flashUpdate=flashUpdate.catch(()=>{}).then(()=>stream.vulpesCameraControl({action:'flash',mode:value}));
          flashUpdate.catch(error=>{if(flashMode===value)flashMode=previous;recordError(error);});
        }
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
          detail: { cameras: [...cameras], flash: stream.capabilities.flashModes.length > 1, video: !!videoMime },
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
        !current || current.capabilities?.flashModes?.length < 2,
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
      ['.mode-switch', !videoMime, 'Vidéo pas encore disponible', 'Video is not available yet', null],
    ];
    const fr = (document.documentElement.lang || navigator.language).startsWith('fr');
    for (const [selector, disabled, french, english, icon] of controls) {
      const e = document.querySelector(selector);
      if (!e) continue;
      e.classList.toggle('vulpes-camera-unavailable', disabled);
      e.setAttribute('aria-disabled', String(disabled));
      if (!disabled) {
        e.removeAttribute('title');
        if(selector==='.js-camera')e.setAttribute('aria-label', fr ? 'Changer de caméra' : 'Switch camera');
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
