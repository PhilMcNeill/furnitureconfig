import * as THREE from "three";
import { THICKNESS, BACK_THICKNESS } from "../lib/design.js";
import { getWoodTexture, getRadialAO, getStripAO } from "./textures.js";

// Build the wardrobe carcass as a THREE.Group from a computed design.
// Placement mirrors the layout arrays in design.js so the 3D view and the
// cut list are guaranteed to describe the same object.
export function buildUnit(design) {
  const { params, finish, innerWidth, innerHeight, colWidth, columnCenters, dividerCenters, actualShelves, railCount } = design;
  const { width, height, depth, showDoors } = params;
  const isWood = finish.kind === "veneer";

  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: isWood ? 0xffffff : new THREE.Color(finish.hex),
    map: isWood ? getWoodTexture() : null,
    roughness: isWood ? 0.82 : 0.62,
    metalness: 0.04,
    envMapIntensity: 0.5,
  });
  const edgeMaterial = new THREE.MeshStandardMaterial({
    color: isWood ? new THREE.Color(0xffffff).offsetHSL(0, 0, -0.08) : new THREE.Color(finish.hex).offsetHSL(0, 0, -0.06),
    map: isWood ? getWoodTexture() : null,
    roughness: 0.85,
    envMapIntensity: 0.6,
  });
  const metalMaterial = new THREE.MeshStandardMaterial({ color: 0xc2c5cb, roughness: 0.28, metalness: 0.95, envMapIntensity: 1.0 });

  const addBox = (w, h, d, x, y, z, mat = material) => {
    const geo = new THREE.BoxGeometry(Math.max(w, 0.1), Math.max(h, 0.1), Math.max(d, 0.1));
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };

  // Sides
  addBox(THICKNESS, height, depth, -width / 2 + THICKNESS / 2, 0, 0);
  addBox(THICKNESS, height, depth, width / 2 - THICKNESS / 2, 0, 0);
  // Top / bottom
  addBox(innerWidth, THICKNESS, depth, 0, height / 2 - THICKNESS / 2, 0);
  addBox(innerWidth, THICKNESS, depth, 0, -height / 2 + THICKNESS / 2, 0);
  // Back
  addBox(innerWidth, innerHeight, BACK_THICKNESS, 0, 0, -depth / 2 + BACK_THICKNESS / 2, edgeMaterial);

  // Dividers
  dividerCenters.forEach((x) => addBox(THICKNESS, innerHeight, depth, x, 0, 0));

  // Shelves + faked contact AO where each shelf meets the back.
  if (actualShelves > 0) {
    const gap = innerHeight / (actualShelves + 1);
    for (let i = 1; i <= actualShelves; i++) {
      const y = -innerHeight / 2 + gap * i;
      columnCenters.forEach((x) => {
        addBox(colWidth, THICKNESS, depth, x, y, 0);
        const ao = new THREE.Mesh(
          new THREE.PlaneGeometry(colWidth * 0.94, depth * 0.55),
          new THREE.MeshBasicMaterial({ map: getStripAO(), transparent: true, depthWrite: false, opacity: 0.45 })
        );
        ao.rotation.x = -Math.PI / 2;
        ao.position.set(x, y + THICKNESS / 2 + 0.03, -depth * 0.22);
        group.add(ao);
      });
    }
  }

  // Hanging rail per column (top third of the bay).
  if (railCount > 0) {
    const railY = height / 2 - THICKNESS - 8;
    columnCenters.forEach((x) => {
      const rail = new THREE.Mesh(
        new THREE.CylinderGeometry(1.1, 1.1, colWidth * 0.92, 16),
        metalMaterial
      );
      rail.rotation.z = Math.PI / 2;
      rail.position.set(x, railY, depth * 0.05);
      rail.castShadow = true;
      group.add(rail);
    });
  }

  // Ground + wall contact shadows.
  const floorAO = new THREE.Mesh(
    new THREE.PlaneGeometry(width * 1.3, depth * 1.7),
    new THREE.MeshBasicMaterial({ map: getRadialAO(), transparent: true, depthWrite: false, opacity: 0.6 })
  );
  floorAO.rotation.x = -Math.PI / 2;
  floorAO.position.set(0, -height / 2 + 0.08, 0);
  group.add(floorAO);

  // Doors — two leaves per column hinged at the outer edges.
  const doorHinges = [];
  if (showDoors) {
    const doorGap = 0.3;
    const centerGap = doorGap * 2;
    const leafWidth = (colWidth - centerGap - doorGap * 2) / 2;
    const doorHeight = height - doorGap * 2;
    const doorZ = depth / 2 + THICKNESS / 2 + 0.1;
    const OPEN = (100 * Math.PI) / 180;

    columnCenters.forEach((cx) => {
      const mk = (hingeX, meshX, openAngle) => {
        const pivot = new THREE.Group();
        pivot.position.set(hingeX, 0, doorZ);
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(leafWidth, doorHeight, THICKNESS), material);
        mesh.position.set(meshX, 0, 0);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        pivot.add(mesh);
        // Handle
        const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 6, 12), metalMaterial);
        handle.rotation.x = Math.PI / 2;
        handle.position.set(meshX + (openAngle < 0 ? leafWidth / 2 - 1.5 : -leafWidth / 2 + 1.5), 0, THICKNESS / 2 + 0.6);
        pivot.add(handle);
        group.add(pivot);
        doorHinges.push({ pivot, mesh, openAngle });
      };
      mk(cx - colWidth / 2 + doorGap, leafWidth / 2, -OPEN);
      mk(cx + colWidth / 2 - doorGap, -leafWidth / 2, OPEN);
    });
  }

  return { group, doorHinges };
}
