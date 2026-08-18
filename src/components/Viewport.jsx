import { useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { RotateCcw } from "lucide-react";
import { buildUnit } from "../three/buildUnit.js";
import { buildCove } from "../three/cove.js";

// The wardrobe sits back from centre so there's studio floor in front of it.
const UNIT_Z = -75;

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
  const distanceRef = useRef(490);
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
    renderer.toneMappingExposure = 0.74;
    host.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Image-based lighting: a PMREM of three's RoomEnvironment gives the panels
    // soft, realistic reflections and ambient fill without any external assets.
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    // Deeper warm background so the open sides/top read moody, not blown out.
    scene.background = new THREE.Color(0xc0b9a6);

    // ---- Studio softbox rig (RectAreaLights) ----
    // Warm three-point-plus-overhead setup: big soft sources for gentle,
    // wrapping light. Area lights can't cast shadows, so a dim directional
    // aligned with the key handles the ground contact shadow.
    RectAreaLightUniformsLib.init();
    const aim = new THREE.Vector3(0, 110, UNIT_Z);
    const softbox = (color, intensity, w, h, pos, target) => {
      const l = new THREE.RectAreaLight(color, intensity, w, h);
      l.position.set(pos[0], pos[1], pos[2]);
      l.lookAt(target[0], target[1], target[2]);
      scene.add(l);
      return l;
    };
    // Key — large warm softbox, front-left, raised ~40°. Brightest.
    softbox(0xffc888, 3.3, 260, 340, [-200, 250, 220], [aim.x, aim.y, aim.z]);
    // Fill — bigger, softer, opposite side; kept low for moody shadow contrast.
    softbox(0xffd6a2, 0.8, 340, 380, [220, 180, 200], [aim.x, aim.y, aim.z]);
    // Rim / back — behind and above, grazes the top/back edges for separation.
    softbox(0xffc890, 2.4, 260, 220, [80, 300, -300], [aim.x, aim.y + 40, aim.z]);
    // Overhead — gentle top light so the tops don't go flat-black.
    softbox(0xffd6aa, 0.6, 320, 320, [-20, 380, -40], [aim.x, 0, aim.z]);

    // Shadow-only directional, aligned with the key (RectAreaLights can't shadow).
    const shadowLight = new THREE.DirectionalLight(0xffd7a8, 0.34);
    shadowLight.position.set(-160, 250, 200);
    shadowLight.target.position.set(0, 0, UNIT_Z);
    shadowLight.castShadow = true;
    shadowLight.shadow.mapSize.set(2048, 2048);
    shadowLight.shadow.radius = 16;
    shadowLight.shadow.blurSamples = 25;
    Object.assign(shadowLight.shadow.camera, { left: -200, right: 200, top: 260, bottom: -200, near: 10, far: 800 });
    shadowLight.shadow.bias = 0.0002;
    shadowLight.shadow.camera.updateProjectionMatrix();
    scene.add(shadowLight);
    scene.add(shadowLight.target);

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
      const e = -x; // elevation angle (default slightly above the product)
      const ce = Math.cos(e);
      camera.position.set(
        dist * Math.sin(y) * ce,
        Math.max(lookAtYRef.current + dist * Math.sin(e), 15),
        UNIT_Z + dist * Math.cos(y) * ce
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
    distanceRef.current = 490;
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
