import { useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RotateCcw } from "lucide-react";
import { buildUnit } from "../three/buildUnit.js";
import { getGoboTexture } from "../three/textures.js";
import { buildCove } from "../three/cove.js";

// The wardrobe sits back from centre so there's studio floor in front of it.
const UNIT_Z = -55;

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
  const distanceRef = useRef(540);
  const lookAtYRef = useRef(100);

  // One-time scene setup.
  useEffect(() => {
    const host = hostRef.current;
    const scene = new THREE.Scene();

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

    // Image-based lighting: a PMREM of three's RoomEnvironment gives the panels
    // soft, realistic reflections and ambient fill without any external assets.
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    // Warm cream background matching the cyclorama's upper tone (#E2DED0).
    scene.background = new THREE.Color(0xe2ded0);

    // A soft key for the main shadow, kept gentle since the IBL carries the fill.
    const key = new THREE.DirectionalLight(0xffffff, 0.85);
    key.position.set(120, 200, 160);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.radius = 14;
    key.shadow.blurSamples = 24;
    Object.assign(key.shadow.camera, { left: -160, right: 160, top: 220, bottom: -160, near: 10, far: 700 });
    key.shadow.bias = 0.0002;
    key.shadow.camera.updateProjectionMatrix();
    scene.add(key);

    // Dappled gobo spot — projects the leaf-light pattern onto the floor for a
    // sense of place, the way the reference gallery does.
    const gobo = new THREE.SpotLight(0xffffff, 3.2, 1100, Math.PI / 4.2, 0.5, 0.5);
    gobo.position.set(-160, 240, 200);
    gobo.target.position.set(30, 0, 70);
    gobo.map = getGoboTexture();
    gobo.castShadow = false;
    scene.add(gobo);
    scene.add(gobo.target);

    // Seamless cyclorama — floor curves up into the back wall, no seam.
    scene.add(buildCove());

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
        UNIT_Z + dist * Math.cos(y) * Math.cos(x)
      );
      camera.lookAt(0, lookAtYRef.current, UNIT_Z);
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
    group.position.z = UNIT_Z;
    scene.add(group);
    unitRef.current = group;
    lookAtYRef.current = design.params.height / 2;
    doorsRef.current = doorHinges.map((d) => ({ ...d, isOpen: false }));
  }, [design]);

  const resetView = useCallback(() => {
    rotationRef.current = { x: -0.18, y: 0.6 };
    distanceRef.current = 540;
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
