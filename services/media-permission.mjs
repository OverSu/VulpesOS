// Use Gaia's permission panel so fullscreen hosts do not open a hidden desktop dialog.
export function requestMediaPermission(win, request, clone = value => value) {
  return new Promise(resolve => {
    const finish = result => {
      win.removeEventListener('mozContentEvent', response);
      win.removeEventListener('pagehide', cancelled);
      resolve(result);
    };
    const response = event => {
      const detail = event.detail;
      if (detail?.id !== request.id || !['permission-allow', 'permission-deny'].includes(detail.type)) return;
      finish({allowed:detail.type === 'permission-allow', remember:detail.remember === true});
    };
    const cancelled = () => finish({allowed:false, remember:false});
    win.addEventListener('mozContentEvent', response);
    win.addEventListener('pagehide', cancelled, {once:true});
    win.dispatchEvent(new win.CustomEvent('mozChromeEvent', {detail:clone({
      type:'permission-prompt', id:request.id, origin:request.origin,
      manifestURL:request.manifestURL, isApp:true, isGranted:false, remember:false,
      permissions:{[request.kind === 'microphone' ? 'audio-capture' : 'video-capture']:[]},
    })}));
  });
}
