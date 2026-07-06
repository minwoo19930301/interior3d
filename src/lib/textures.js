import * as THREE from 'three';

const cache = new Map();

function configureTexture(texture, anisotropy = 4) {
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = anisotropy;
  texture.needsUpdate = true;
  return texture;
}

function withCache(key, factory) {
  if (cache.has(key)) {
    return cache.get(key);
  }

  const texture = factory();
  cache.set(key, texture);
  return texture;
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

export function getWoodTexture(tone = 'warm', repeatKey) {
  const base = withCache(`wood:${tone}`, () => buildWoodTexture(tone));

  if (!repeatKey) {
    return base;
  }

  return withCache(`wood:${tone}:${repeatKey}`, () => {
    const clone = base.clone();
    clone.needsUpdate = true;
    return clone;
  });
}

function buildWoodTexture(tone) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const base = tone === 'dark' ? '#6b4e38' : '#9a7350';
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  const plankWidth = 42;
  for (let x = 0; x < size; x += plankWidth) {
    for (let y = 0; y < size; y += 8) {
      const shade = randomBetween(-10, 10);
      ctx.strokeStyle = shadeColor(base, shade * 0.4);
      ctx.globalAlpha = randomBetween(0.08, 0.2);
      ctx.beginPath();
      const wave = Math.sin(y * 0.15 + x) * 2;
      ctx.moveTo(x + wave, y);
      ctx.lineTo(x + plankWidth + wave, y + randomBetween(-2, 2));
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
    ctx.fillStyle = shadeColor(base, -22);
    ctx.fillRect(x, 0, 1, size);

    if (Math.random() < 0.5) {
      const knotX = x + randomBetween(6, plankWidth - 6);
      const knotY = randomBetween(0, size);
      ctx.fillStyle = shadeColor(base, -18);
      ctx.beginPath();
      ctx.ellipse(knotX, knotY, randomBetween(2, 4), randomBetween(1.5, 3), randomBetween(0, Math.PI), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  return configureTexture(texture);
}

function shadeColor(hex, amount) {
  const color = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);
  hsl.l = Math.min(1, Math.max(0, hsl.l + amount / 100));
  color.setHSL(hsl.h, hsl.s, hsl.l);
  return `#${color.getHexString()}`;
}

export function getFabricTexture() {
  return withCache('fabric', () => {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#e6e6e6';
    ctx.fillRect(0, 0, size, size);

    const cell = 2;
    for (let y = 0; y < size; y += cell) {
      for (let x = 0; x < size; x += cell) {
        const jitter = randomBetween(-6, 6);
        const parity = (Math.floor(x / cell) + Math.floor(y / cell)) % 2 === 0;
        const base = parity ? 92 : 88;
        const lightness = base + jitter;
        ctx.fillStyle = `hsl(0, 0%, ${lightness}%)`;
        ctx.fillRect(x, y, cell, cell);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    return configureTexture(texture);
  });
}

export function getTileTexture() {
  return withCache('tile', () => {
    const size = 256;
    const grid = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    for (let y = 0; y < size; y += grid) {
      for (let x = 0; x < size; x += grid) {
        const jitter = randomBetween(-3, 3);
        ctx.fillStyle = `hsl(210, 8%, ${97 + jitter}%)`;
        ctx.fillRect(x, y, grid, grid);
      }
    }

    ctx.strokeStyle = '#cfd4da';
    ctx.lineWidth = 2;
    for (let x = 0; x <= size; x += grid) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size);
      ctx.stroke();
    }
    for (let y = 0; y <= size; y += grid) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    return configureTexture(texture);
  });
}

export function getBrushedMetalTexture() {
  return withCache('brushedMetal', () => {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#b7bcc2';
    ctx.fillRect(0, 0, size, size);

    for (let y = 0; y < size; y += 1) {
      const jitter = randomBetween(-5, 5);
      ctx.fillStyle = `hsl(210, 4%, ${72 + jitter}%)`;
      ctx.fillRect(0, y, size, 1);
    }

    const texture = new THREE.CanvasTexture(canvas);
    return configureTexture(texture);
  });
}

export function getScreenTexture() {
  return withCache('screen', () => {
    const width = 512;
    const height = 288;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#0a0e16';
    ctx.fillRect(0, 0, width, height);

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, 'rgba(40, 60, 130, 0.35)');
    gradient.addColorStop(0.5, 'rgba(90, 50, 140, 0.2)');
    gradient.addColorStop(1, 'rgba(10, 14, 22, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const horizon = ctx.createLinearGradient(0, height * 0.52, 0, height * 0.62);
    horizon.addColorStop(0, 'rgba(255, 255, 255, 0)');
    horizon.addColorStop(0.5, 'rgba(160, 180, 255, 0.12)');
    horizon.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = horizon;
    ctx.fillRect(0, height * 0.5, width, height * 0.14);

    const texture = new THREE.CanvasTexture(canvas);
    return configureTexture(texture);
  });
}

export function getGroundTexture() {
  return withCache('ground', () => {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2
    );
    gradient.addColorStop(0, '#262b36');
    gradient.addColorStop(1, '#1b202a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    return configureTexture(texture);
  });
}
