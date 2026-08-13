import { useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import { RotateCcw } from "lucide-react";
import { buildUnit } from "../three/buildUnit.js";

const WALL_Z = -70;

// Self-contained WebGL viewport. Owns the renderer, lights, camera orbit and
// door raycasting; rebuilds only the unit group when `design` changes.
export default function Viewport({ design }) {
  const hostRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const unitRef = useRef(null);
  const doorsRef = useRef([]);
  const rotationRef = useRef({ x: -0.18, y: 0.6 });
  const dragRef = useRef({ dragging: false, lastX: 0, lastY: 0 });
  const distanceRef = useRef(460);
  const lookAtYRef = useRef(100);

  // One-time scene setup.
  useEffect(() => {
    const host = hostRef.current;
    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(38, 1, 1, 2000);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.VSMShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    host.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const hemi = new THREE.HemisphereLight(0xf2f2f2, 0x3a3a3a, 0.55);
    scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffffff, 1.15);
    key.position.set(120, 200, 160);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.radius = 12;
    key.shadow.blurSamples = 20;
    Object.assign(key.shadow.camera, { left: -160, right: 160, top: 220, bottom: -160, near: 10, far: 700 });
    key.shadow.bias = 0.0002;
    key.shadow.camera.updateProjectionMatrix();
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.25);
    fill.position.set(-150, 80, -100);
    scene.add(fill);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(800, 800),
      new THREE.MeshStandardMaterial({ color: 0x8f8f8f, roughness: 0.95 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const wall = new THREE.Mesh(
      new THREE.PlaneGeometry(800, 420),
      new THREE.MeshStandardMaterial({ color: 0xcfcfcf, roughness: 0.98 })
    );
    wall.position.set(0, 210, WALL_Z);
    wall.receiveShadow = true;
    scene.add(wall);

    sceneRef.current = scene;

    const resize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h || 1;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const el = renderer.domElement;
    el.style.touchAction = "none";

    const onDown = (e) => {
      dragRef.current = { dragging: true, lastX: e.clientX, lastY: e.clientY, startX: e.clientX, startY: e.clientY };
    };
    const onMove = (e) => {
      if (!dragRef.current.dragging) return;
      const dx = e.clientX - dragRef.current.lastX;
      const dy = e.clientY - dragRef.current.lastY;
      dragRef.current.lastX = e.clientX;
      dragRef.current.lastY = e.clientY;
      rotationRef.current.y = Math.max(-1.15, Math.min(1.15, rotationRef.current.y + dx * 0.008));
      rotationRef.current.x = Math.max(-0.9, Math.min(0.3, rotationRef.current.x + dy * 0.006));
    };
    const onUp = (e) => {
      const moved = Math.hypot(e.clientX - dragRef.current.startX, e.clientY - dragRef.current.startY);
      dragRef.current.dragging = false;
      if (moved < 4) {
        const rect = el.getBoundingClientRect();
        ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(ndc, camera);
        const hits = raycaster.intersectObjects(doorsRef.current.map((d) => d.mesh), false);
        if (hits.length) {
          const d = doorsRef.current.find((x) => x.mesh === hits[0].object);
          if (d) d.isOpen = !d.isOpen;
        }
      }
    };
    const onWheel = (e) => {
      e.preventDefault();
      distanceRef.current = Math.max(150, Math.min(560, distanceRef.current + e.deltaY * 0.25));
    };

    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    el.addEventListener("wheel", onWheel, { passive: false });

    let raf;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const { x, y } = rotationRef.current;
      const dist = distanceRef.current;
      camera.position.set(
        dist * Math.sin(y) * Math.cos(x),
        Math.max(dist * Math.sin(x) + 60, 12),
        dist * Math.cos(y) * Math.cos(x)
      );
      camera.lookAt(0, lookAtYRef.current, 0);
      doorsRef.current.forEach((d) => {
        const target = d.isOpen ? d.openAngle : 0;
        d.pivot.rotation.y += (target - d.pivot.rotation.y) * 0.12;
      });
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      el.removeEventListener("wheel", onWheel);
      renderer.dispose();
      host.removeChild(renderer.domElement);
    };
  }, []);

  // Rebuild the unit whenever the design changes.
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (unitRef.current) {
      scene.remove(unitRef.current);
      unitRef.current.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
      });
    }
    const { group, doorHinges } = buildUnit(design);
    group.position.y = design.params.height / 2;
    group.position.z = WALL_Z + design.params.depth / 2;
    scene.add(group);
    unitRef.current = group;
    lookAtYRef.current = design.params.height / 2;
    doorsRef.current = doorHinges.map((d) => ({ ...d, isOpen: false }));
  }, [design]);

  const resetView = useCallback(() => {
    rotationRef.current = { x: -0.18, y: 0.6 };
    distanceRef.current = 460;
  }, []);

  return (
    <div className="viewport">
      <div ref={hostRef} className="viewport-canvas" />
      <button className="reset-btn" onClick={resetView}>
        <RotateCcw size={13} /> Reset view
      </button>
      <div className="viewport-hint">
        Drag to rotate · Scroll to zoom{design.params.showDoors ? " · Click a door to open" : ""}
      </div>
    </div>
  );
}
