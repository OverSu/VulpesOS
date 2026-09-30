addEventListener(
  'DOMContentLoaded',
  () => {
    'use strict';
    const options = window.arguments[0];
    let stream,
      completed = false,
      closed = false;
    const status = document.getElementById('status'),
      capture = document.getElementById('capture'),
      video = document.getElementById('preview');
    const stop = () => stream?.getTracks().forEach((track) => track.stop());
    addEventListener('unload', () => {
      closed = true;
      stop();
      if (!completed) options.cancel();
    });
    document.getElementById('cancel').onclick = () => window.close();
    capture.onclick = async () => {
      capture.disabled = true;
      try {
        const canvas = document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
        if (!blob) throw Error('Capture failed');
        await options.finish(blob);
        completed = true;
        stop();
        window.close();
      } catch (e) {
        status.textContent = String(e);
        capture.disabled = false;
      }
    };
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (closed) {
          stop();
          return;
        }
        video.srcObject = stream;
        await video.play();
        capture.disabled = false;
        status.textContent = 'La webcam est active. / Webcam is active.';
      } catch (e) {
        stop();
        status.textContent = 'Webcam indisponible / Webcam unavailable: ' + e.name;
      }
    })();
  },
  { once: true },
);
