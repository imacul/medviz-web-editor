import * as THREE from 'three';

export function createTextSprite(text, options = {}) {
  const fontSize = options.fontSize ?? 42;
  const padding = options.padding ?? 20;
  const bg = options.background ?? 'rgba(20, 25, 40, 0.85)';
  const color = options.color ?? '#ffffff';
  const border = options.border ?? '#4da6ff';

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  ctx.font = `${fontSize}px system-ui`;
  const width = Math.ceil(ctx.measureText(text).width + padding * 2);
  const height = fontSize + padding * 2;
  canvas.width = width;
  canvas.height = height;

  ctx.font = `${fontSize}px system-ui`;
  ctx.fillStyle = bg;
  ctx.strokeStyle = border;
  ctx.lineWidth = 3;
  const radius = 12;
  roundRect(ctx, 1.5, 1.5, width - 3, height - 3, radius);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, padding, height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, depthWrite: false, depthTest: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set((width / 256) * 1.8, (height / 256) * 1.8, 1);
  return sprite;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
