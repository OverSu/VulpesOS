// Gaia's transparent edge gesture zones are not modal overlays.
export function frameUnobscured(document, frame, rect) {
  if (document.hidden || rect.width <= 0 || rect.height <= 0) return false;
  const system = document.location.hostname === 'system.localhost';
  return [[.5, .5], [.05, .05], [.95, .05], [.05, .95], [.95, .95]].every(([x, y]) => {
    const hit = document.elementFromPoint(rect.left + rect.width * x, rect.top + rect.height * y);
    return hit === frame || (system && !!hit?.matches('#left-panel.gesture-panel, #right-panel.gesture-panel'));
  });
}
