import * as THREE from "three";

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
