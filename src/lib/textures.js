import * as THREE from 'three';

const cache = new Map();

function configureTexture(texture, anisotropy = 8) {
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

function shadeColor(hex, amount) {
  const color = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);
  hsl.l = Math.min(1, Math.max(0, hsl.l + amount / 100));
  color.setHSL(hsl.h, hsl.s, hsl.l);
  return `#${color.getHexString()}`;
}

// ---------------------------------------------------------------------------
// Wood (oak / walnut) - warm plank grain with per-plank luminance + seams
// ---------------------------------------------------------------------------

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
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // 'warm' = oak, 'dark' = walnut chocolate
  const base = tone === 'dark' ? '#4a3324' : '#c9a87c';
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  const plankWidth = tone === 'dark' ? 96 : 84;

  for (let x = 0; x < size; x += plankWidth) {
    // per-plank overall luminance variation
    const plankShade = randomBetween(-6, 6);
    const plankBase = shadeColor(base, plankShade);
    ctx.fillStyle = plankBase;
    ctx.fillRect(x, 0, plankWidth, size);

    // multi-frequency grain: low-frequency long wavy lines + high-frequency fine fibers
    for (let y = 0; y < size; y += 3) {
      const lowFreq = Math.sin(y * 0.02 + x * 0.4) * 6;
      const midFreq = Math.sin(y * 0.09 + x) * 2.5;
      const highFreq = Math.sin(y * 0.6 + x * 2) * 0.8;
      const wave = lowFreq + midFreq + highFreq;
      const shade = randomBetween(-9, 9);
      ctx.strokeStyle = shadeColor(plankBase, shade * 0.6);
      ctx.globalAlpha = randomBetween(0.05, 0.16);
      ctx.lineWidth = randomBetween(0.6, 1.6);
      ctx.beginPath();
      ctx.moveTo(x + wave, y);
      ctx.lineTo(x + plankWidth + wave, y + randomBetween(-1, 1));
      ctx.stroke();
    }

    // plank seam (dark groove)
    ctx.globalAlpha = 1;
    ctx.fillStyle = shadeColor(base, -30);
    ctx.fillRect(x, 0, 2, size);
    ctx.fillStyle = shadeColor(base, 8);
    ctx.fillRect(x + 2, 0, 1, size);

    // occasional knots
    const knotCount = Math.random() < 0.6 ? 1 : 0;
    for (let k = 0; k < knotCount; k += 1) {
      const knotX = x + randomBetween(10, plankWidth - 10);
      const knotY = randomBetween(0, size);
      const rx = randomBetween(3, 7);
      const ry = randomBetween(2, 5);
      const rot = randomBetween(0, Math.PI);
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = shadeColor(base, -24);
      ctx.beginPath();
      ctx.ellipse(knotX, knotY, rx, ry, rot, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = shadeColor(base, -34);
      ctx.lineWidth = 1;
      for (let ring = 1; ring <= 3; ring += 1) {
        ctx.beginPath();
        ctx.ellipse(knotX, knotY, rx + ring * 2, ry + ring * 1.4, rot, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  ctx.globalAlpha = 1;
  // horizontal seams every ~size/4 to suggest plank ends, staggered
  const rowHeight = size / 4;
  for (let row = 0; row < 4; row += 1) {
    const y = row * rowHeight + randomBetween(-6, 6);
    ctx.strokeStyle = shadeColor(base, -20);
    ctx.globalAlpha = 0.25;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  return configureTexture(texture);
}

// Bump map companion for wood, cheap fine grain to add micro-relief
export function getWoodBumpTexture(tone = 'warm') {
  return withCache(`woodBump:${tone}`, () => {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, size, size);

    for (let y = 0; y < size; y += 1) {
      const v = 128 + Math.sin(y * 0.5) * 10 + randomBetween(-8, 8);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(0, y, size, 1);
    }

    const texture = new THREE.CanvasTexture(canvas);
    return configureTexture(texture);
  });
}

// ---------------------------------------------------------------------------
// Fabric: boucle (chunky looped) and linen (fine weave)
// ---------------------------------------------------------------------------

export function getFabricTexture(kind = 'linen') {
  return withCache(`fabric:${kind}`, () => (kind === 'boucle' ? buildBoucleTexture() : buildLinenTexture()));
}

function buildLinenTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#e6e0d3';
  ctx.fillRect(0, 0, size, size);

  const cell = 2;
  for (let y = 0; y < size; y += cell) {
    for (let x = 0; x < size; x += cell) {
      const jitter = randomBetween(-5, 5);
      const parity = (Math.floor(x / cell) + Math.floor(y / cell)) % 2 === 0;
      const base = parity ? 91 : 86;
      const lightness = base + jitter;
      ctx.fillStyle = `hsl(38, 12%, ${lightness}%)`;
      ctx.fillRect(x, y, cell, cell);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  return configureTexture(texture);
}

function buildBoucleTexture() {
  const size = 160;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#e8e2d5';
  ctx.fillRect(0, 0, size, size);

  // chunky looped noise: overlapping soft blobs at low freq
  for (let i = 0; i < 900; i += 1) {
    const x = randomBetween(0, size);
    const y = randomBetween(0, size);
    const r = randomBetween(1.4, 3.4);
    const shade = randomBetween(-16, 12);
    ctx.globalAlpha = randomBetween(0.2, 0.5);
    ctx.fillStyle = shadeColor('#e8e2d5', shade);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // fine high-frequency bump-ish speckle on top for texture bite
  ctx.globalAlpha = 1;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (Math.random() < 0.04) {
        const shade = randomBetween(-20, 20);
        ctx.fillStyle = shadeColor('#e8e2d5', shade);
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  return configureTexture(texture);
}

export function getBoucleBumpTexture() {
  return withCache('boucleBump', () => {
    const size = 160;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, size, size);

    for (let i = 0; i < 1400; i += 1) {
      const x = randomBetween(0, size);
      const y = randomBetween(0, size);
      const r = randomBetween(1.2, 3);
      const v = 128 + randomBetween(-70, 70);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    return configureTexture(texture);
  });
}

// ---------------------------------------------------------------------------
// Ceramic / marble (bath surfaces, near-white)
// ---------------------------------------------------------------------------

export function getTileTexture(kind = 'ceramic') {
  return withCache(`tile:${kind}`, () => (kind === 'marble' ? buildMarbleTexture() : buildCeramicTexture()));
}

function buildCeramicTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#f4f1ea';
  ctx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (Math.random() < 0.02) {
        const jitter = randomBetween(-2, 2);
        ctx.fillStyle = `hsl(40, 10%, ${95 + jitter}%)`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  return configureTexture(texture);
}

function buildMarbleTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#f5f3ef';
  ctx.fillRect(0, 0, size, size);

  // faint clouds
  for (let i = 0; i < 10; i += 1) {
    const x = randomBetween(0, size);
    const y = randomBetween(0, size);
    const r = randomBetween(60, 160);
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
    gradient.addColorStop(0, 'rgba(180,180,180,0.08)');
    gradient.addColorStop(1, 'rgba(180,180,180,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }

  // 5-8 bezier veins, gray, with soft glow
  const veinCount = Math.round(randomBetween(5, 8));
  for (let i = 0; i < veinCount; i += 1) {
    const startX = randomBetween(-40, size + 40);
    const startY = randomBetween(-40, size + 40);
    const cp1x = startX + randomBetween(-180, 180);
    const cp1y = startY + randomBetween(-180, 180);
    const cp2x = cp1x + randomBetween(-180, 180);
    const cp2y = cp1y + randomBetween(-180, 180);
    const endX = cp2x + randomBetween(-180, 180);
    const endY = cp2y + randomBetween(-180, 180);

    ctx.strokeStyle = `rgba(120,122,128,${randomBetween(0.25, 0.45)})`;
    ctx.lineWidth = randomBetween(1.5, 3.5);
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
    ctx.stroke();

    // soft glow alongside vein
    ctx.strokeStyle = `rgba(150,150,152,${randomBetween(0.08, 0.16)})`;
    ctx.lineWidth = randomBetween(4, 9);
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  return configureTexture(texture);
}

// ---------------------------------------------------------------------------
// Metals: brushed brass + matte black steel
// ---------------------------------------------------------------------------

export function getBrushedMetalTexture(kind = 'steel') {
  return withCache(`metal:${kind}`, () => buildBrushedMetalTexture(kind));
}

function buildBrushedMetalTexture(kind) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const base = kind === 'brass' ? '#b08d57' : '#232323';
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y += 1) {
    const jitter = randomBetween(-5, 5);
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = shadeColor(base, jitter);
    ctx.fillRect(0, y, size, 1);
  }
  ctx.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  return configureTexture(texture);
}

// ---------------------------------------------------------------------------
// Screen (TV) glow texture, unchanged concept
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Ground: oak plank floor with radial vignette + dot/line grid
// ---------------------------------------------------------------------------

export function getGroundTexture() {
  return withCache('ground', () => {
    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const base = '#c9a87c';
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);

    const plankWidth = 96;
    for (let x = 0; x < size; x += plankWidth) {
      const plankShade = randomBetween(-7, 7);
      const plankBase = shadeColor(base, plankShade);
      ctx.fillStyle = plankBase;
      ctx.fillRect(x, 0, plankWidth, size);

      for (let y = 0; y < size; y += 3) {
        const lowFreq = Math.sin(y * 0.015 + x * 0.3) * 8;
        const midFreq = Math.sin(y * 0.07 + x) * 3;
        const highFreq = Math.sin(y * 0.5 + x * 2) * 1;
        const wave = lowFreq + midFreq + highFreq;
        const shade = randomBetween(-8, 8);
        ctx.strokeStyle = shadeColor(plankBase, shade * 0.6);
        ctx.globalAlpha = randomBetween(0.04, 0.14);
        ctx.lineWidth = randomBetween(0.6, 1.6);
        ctx.beginPath();
        ctx.moveTo(x + wave, y);
        ctx.lineTo(x + plankWidth + wave, y + randomBetween(-1, 1));
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
      ctx.fillStyle = shadeColor(base, -28);
      ctx.fillRect(x, 0, 2, size);
    }

    // horizontal plank-end seams, staggered per column for realism
    const rowHeight = size / 8;
    for (let x = 0; x < size; x += plankWidth) {
      for (let row = 0; row < 8; row += 1) {
        const y = row * rowHeight + randomBetween(-10, 10);
        ctx.strokeStyle = shadeColor(base, -18);
        ctx.globalAlpha = 0.2;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + plankWidth, y);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;

    // soft radial vignette toward edges
    const vignette = ctx.createRadialGradient(
      size / 2,
      size / 2,
      size * 0.25,
      size / 2,
      size / 2,
      size * 0.72
    );
    vignette.addColorStop(0, 'rgba(154,127,92,0)');
    vignette.addColorStop(1, '#9a7f5c');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    return configureTexture(texture, 16);
  });
}

// Subtle 1m dot/line grid overlay texture, to be tiled over the floor plane.
export function getGridOverlayTexture() {
  return withCache('gridOverlay', () => {
    const size = 128; // one 1m cell per tile
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, size, size);
    ctx.strokeStyle = '#54422e';
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(size, 0);
    ctx.moveTo(0, 0);
    ctx.lineTo(0, size);
    ctx.stroke();

    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#54422e';
    ctx.beginPath();
    ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.needsUpdate = true;
    return texture;
  });
}

// ---------------------------------------------------------------------------
// Background: dusk gradient sky sphere texture (zenith -> mid -> warm horizon)
// ---------------------------------------------------------------------------

export function getSkyGradientTexture() {
  return withCache('skyGradient', () => {
    const width = 512;
    const height = 512;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#171c2b');
    gradient.addColorStop(0.55, '#2c3350');
    gradient.addColorStop(1, '#6e5a50');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  });
}
