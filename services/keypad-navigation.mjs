export function nextKeypadTarget(items, current, direction) {
  if (!items.length) return -1;
  if (current < 0 || current >= items.length) return 0;
  const vectors = {ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1]};
  const vector = vectors[direction];
  if (!vector) return -1;
  const origin = items[current];
  let best = -1, score = Infinity;
  for (let index = 0; index < items.length; index++) {
    if (index === current) continue;
    const dx = items[index].x - origin.x, dy = items[index].y - origin.y;
    const forward = dx * vector[0] + dy * vector[1];
    if (forward <= 1) continue;
    const sideways = Math.abs(dx * vector[1] - dy * vector[0]);
    const distance = forward + sideways * 3;
    if (distance < score) { best = index; score = distance; }
  }
  return best;
}
