import * as THREE from "three";

// Dappled "gobo" light map — soft overlapping blobs, like sunlight filtered
// through leaves/blinds. Projected by a SpotLight onto the floor to give the
// scene a sense of place (the trick the ICG gallery uses via shadow-leaves).
let goboCache = null;
export function getGoboTexture() {
  if (goboCache) return goboCache;
  const s = 512;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, s, s);
  // Base wash so the lit area never goes fully black.
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fillRect(0, 0, s, s);
  // Scatter soft bright patches and darker gaps.
  const blob = (x, y, r, a, light) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const col = light ? "255,255,255" : "0,0,0";
    g.addColorStop(0, `rgba(${col},${a})`);
    g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  };
  let seed = 7;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 40; i++) blob(rnd() * s, rnd() * s, 40 + rnd() * 90, 0.35 + rnd() * 0.4, true);
  for (let i = 0; i < 26; i++) blob(rnd() * s, rnd() * s, 30 + rnd() * 70, 0.3 + rnd() * 0.4, false);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  goboCache = tex;
  return tex;
}

// Neutral studio "cove" backdrop — a soft radial gradient, brighter behind the
// product and falling off to the edges, so there's no hard wall/floor seam.
let backdropCache = null;
export function getBackdropTexture() {
  if (backdropCache) return backdropCache;
  const w = 1024;
  const h = 1024;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(w / 2, h * 0.42, 0, w / 2, h * 0.42, h * 0.75);
  g.addColorStop(0, "#ececed");
  g.addColorStop(0.55, "#dcdcde");
  g.addColorStop(1, "#c2c2c5");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  backdropCache = tex;
  return tex;
}

// Procedural birch-ish grain — keeps the bundle light and looks the part on a
// matte panel. Cached so every panel shares one GPU texture.
let woodCache = null;
export function getWoodTexture() {
  if (woodCache) return woodCache;
  const w = 512;
  const h = 512;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#e8dcc4";
  ctx.fillRect(0, 0, w, h);
  // Long grain streaks.
  for (let i = 0; i < 240; i++) {
    const y = Math.random() * h;
    const shade = 200 + Math.random() * 40;
    ctx.strokeStyle = `rgba(${shade - 40},${shade - 70},${shade - 120},${0.05 + Math.random() * 0.12})`;
    ctx.lineWidth = 0.5 + Math.random() * 1.6;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= w; x += 32) {
      ctx.lineTo(x, y + Math.sin(x / 60 + i) * 2 + (Math.random() - 0.5) * 2);
    }
    ctx.stroke();
  }
  // A few knots.
  for (let i = 0; i < 5; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = 4 + Math.random() * 8;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(120,90,55,0.5)");
    g.addColorStop(1, "rgba(120,90,55,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  woodCache = tex;
  return tex;
}

let radialCache = null;
export function getRadialAO() {
  if (radialCache) return radialCache;
  const size = 256;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(0,0,0,0.55)");
  g.addColorStop(0.6, "rgba(0,0,0,0.22)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  radialCache = new THREE.CanvasTexture(c);
  return radialCache;
}

let stripCache = null;
export function getStripAO() {
  if (stripCache) return stripCache;
  const w = 64;
  const h = 256;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "rgba(0,0,0,0.5)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  stripCache = new THREE.CanvasTexture(c);
  return stripCache;
}
