import * as THREE from "three";

// A seamless studio cyclorama ("cove"): one continuous surface that runs along
// the floor, curves up through a fillet, and continues as the back wall — so
// there is no floor/wall seam at all. Swept from a 2D profile across the width.
export function buildCove() {
  const R = 80; // fillet radius where floor meets wall
  const H = 520; // wall height
  const F = 820; // floor depth toward the camera
  const ZC = -170; // where the floor starts curving up (further back = more room)
  const W = 1900; // width (wide enough that edges stay out of frame)

  // Profile points in the (z, y) plane, front floor → curve → up the wall.
  const prof = [];
  prof.push({ z: F, y: 0 });
  prof.push({ z: ZC, y: 0 });
  const seg = 20;
  for (let i = 1; i <= seg; i++) {
    const a = -Math.PI / 2 - (Math.PI / 2) * (i / seg); // -90° → -180°
    prof.push({ z: ZC + R * Math.cos(a), y: R + R * Math.sin(a) });
  }
  prof.push({ z: ZC - R, y: H });

  // Warm cream studio (#E2DED0), gently graded floor → wall.
  const colBot = new THREE.Color(0xd7d3c5);
  const colTop = new THREE.Color(0xe6e2d6);
  const xs = [-W / 2, W / 2];

  const positions = [];
  const colors = [];
  const indices = [];
  for (let p = 0; p < prof.length; p++) {
    const { z, y } = prof[p];
    const t = Math.min(1, y / (H * 0.6)); // soft vertical gradient
    const col = colBot.clone().lerp(colTop, t);
    for (let xi = 0; xi < 2; xi++) {
      positions.push(xs[xi], y, z);
      colors.push(col.r, col.g, col.b);
    }
  }
  for (let p = 0; p < prof.length - 1; p++) {
    const v00 = p * 2;
    const v01 = p * 2 + 1;
    const v10 = (p + 1) * 2;
    const v11 = (p + 1) * 2 + 1;
    // Wound so normals face up (floor) / toward the camera (wall).
    indices.push(v00, v11, v10, v00, v01, v11);
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  g.setIndex(indices);
  g.computeVertexNormals();

  const m = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.94,
    metalness: 0,
    envMapIntensity: 0.35,
  });
  const mesh = new THREE.Mesh(g, m);
  mesh.receiveShadow = true;
  return mesh;
}
