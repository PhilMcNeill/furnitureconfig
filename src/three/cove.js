import * as THREE from "three";

// A three-sided studio cove: a flat floor with back + left + right walls, each
// meeting the floor through a large curved bevel and each other through rounded
// vertical corners — a seamless corner cyclorama, open at the front and top.
//
// Built by sweeping a 2D profile (floor bevel → vertical wall) along a 3-sided
// rounded-rectangle path. A flat plane fills the interior floor.
export function buildCove() {
  const Xw = 340; // side walls at x = ±Xw
  const Zb = -300; // back wall z (studio pushed back)
  const Zf = 640; // open front, toward the camera
  const H = 620; // wall height
  const R = 150; // floor→wall bevel radius (large, soft)
  const Rc = 95; // rounded vertical corner radius
  const seg = 14; // segments per corner
  const fseg = 16; // segments along the bevel

  const colFloor = new THREE.Color(0xb4ae9b); // warm, deep for mood
  const colWall = new THREE.Color(0xcbc6b4);

  const group = new THREE.Group();

  // ---- Flat interior floor ----
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(2400, 2400),
    new THREE.MeshStandardMaterial({ color: colFloor, roughness: 0.93, metalness: 0, envMapIntensity: 0.28 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);

  // ---- Wall-base path (n=0 line), traced around 3 sides, open at the front ----
  const path = [];
  const push = (x, z, nx, nz) => path.push({ x, z, nx, nz });
  push(Xw, Zf, 1, 0); // front-right
  push(Xw, Zb + Rc, 1, 0); // up the right wall
  for (let i = 1; i <= seg; i++) {
    const a = (Math.PI / 2) * (i / seg); // back-right corner
    push(Xw - Rc + Rc * Math.cos(a), Zb + Rc - Rc * Math.sin(a), Math.cos(a), -Math.sin(a));
  }
  push(-(Xw - Rc), Zb, 0, -1); // across the back
  for (let i = 1; i <= seg; i++) {
    const a = (Math.PI / 2) * (i / seg); // back-left corner
    push(-(Xw - Rc) - Rc * Math.sin(a), Zb + Rc - Rc * Math.cos(a), -Math.sin(a), -Math.cos(a));
  }
  push(-Xw, Zf, -1, 0); // down the left wall to the front

  // ---- Profile: floor bevel (quarter circle) then straight wall ----
  const prof = [];
  for (let i = 0; i <= fseg; i++) {
    const phi = Math.PI - (Math.PI / 2) * (i / fseg); // 180° → 90°
    prof.push({ n: R * Math.cos(phi), y: R * Math.sin(phi) });
  }
  const wseg = 6;
  for (let i = 1; i <= wseg; i++) prof.push({ n: 0, y: R + (H - R) * (i / wseg) });

  // ---- Sweep the profile along the path ----
  const positions = [];
  const colors = [];
  const indices = [];
  const P = prof.length;
  for (let i = 0; i < path.length; i++) {
    const { x, z, nx, nz } = path[i];
    for (let j = 0; j < P; j++) {
      const { n, y } = prof[j];
      positions.push(x + n * nx, y, z + n * nz);
      const t = Math.min(1, y / (H * 0.5));
      const c = colFloor.clone().lerp(colWall, t);
      colors.push(c.r, c.g, c.b);
    }
  }
  for (let i = 0; i < path.length - 1; i++) {
    for (let j = 0; j < P - 1; j++) {
      const a = i * P + j;
      const b = i * P + j + 1;
      const c = (i + 1) * P + j;
      const d = (i + 1) * P + j + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  g.setIndex(indices);
  g.computeVertexNormals();

  const walls = new THREE.Mesh(
    g,
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.95,
      metalness: 0,
      envMapIntensity: 0.28,
      side: THREE.DoubleSide,
    })
  );
  walls.receiveShadow = true;
  group.add(walls);

  return group;
}
