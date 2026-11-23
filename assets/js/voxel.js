// =========================================================
// KILEKCRAFT — lekki silnik voxel (Three.js).
// Tekstury rysujemy sami (16×16, własne wzory), bez assetów Mojang.
// =========================================================
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';

// Renderowanie nie zajmuje wątku obsługującego dotyk, DOM i napis z bloków.
async function openScene(container, options) {
  let canvas = document.createElement('canvas');
  const scale = devicePixelRatio || 1;
  const coarse = matchMedia('(pointer: coarse)').matches;
  const ratio = coarse ? Math.min(scale, 1.5) : scale;
  const rendererOptions = { ...options, antialias: !coarse && scale < 2 };
  if (canvas.transferControlToOffscreen && typeof Worker !== 'undefined') {
    let worker;
    try {
      worker = new Worker(new URL('./voxel-worker.js', import.meta.url), { type: 'module' });
      const offscreen = canvas.transferControlToOffscreen();
      await new Promise((resolve, reject) => {
        worker.onerror = event => { event.preventDefault(); reject(event.message); };
        worker.onmessage = ({ data }) => data === 'ready' ? resolve() : reject(new Error('Brak WebGL 2 w workerze'));
        worker.postMessage({ type: 'init', canvas: offscreen, options: rendererOptions, ratio }, [offscreen]);
      });
      let drawing = false;
      worker.onerror = null;
      worker.onmessage = () => { drawing = false; };
      container.appendChild(canvas);
      return {
        canvas,
        load: ({ blocks, size }) => worker.postMessage({ type: 'build', build: { blocks, size } }),
        setLayer: layer => worker.postMessage({ type: 'layer', layer }),
        resize: (width, height) => worker.postMessage({ type: 'resize', width, height }),
        draw(frame) {
          if (drawing) return false;
          drawing = true;
          worker.postMessage({ type: 'frame', frame });
          return true;
        },
        dispose: () => worker.terminate(),
      };
    } catch {
      worker?.terminate();
      canvas = document.createElement('canvas');
    }
  }
  const { createScene } = await import('./voxel-scene.js');
  const scene = createScene(canvas, rendererOptions, ratio);
  if (!scene) return null;
  container.appendChild(canvas);
  return { ...scene, canvas, draw(frame) { scene.draw(frame); return true; } };
}

export async function createViewer(container, build, opts = {}) {
  const o = { autoRotate: false, ghost: true, layerPlane: true, motes: false, ...opts };
  const scene = await openScene(container, o);
  if (!scene) return null;
  const canvas = scene.canvas;
  const camera = new THREE.PerspectiveCamera(38, 1, .5, 1000);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = .08; controls.enablePan = false;
  controls.autoRotate = o.autoRotate; controls.autoRotateSpeed = .9;
  controls.minPolarAngle = .15; controls.maxPolarAngle = Math.PI * .62;
  if (o.noZoom) controls.enableZoom = false;

  let maxY, layer, rotation = 0;
  function load(b) {
    scene.load(b);
    const [sx, sy, sz] = b.size;
    maxY = sy - 1;
    // kamera
    const r = Math.hypot(sx, sy, sz) / 2;
    const target = new THREE.Vector3(0, sy * .45, 0);
    controls.target.copy(target);
    const half = (camera.fov * Math.PI / 180) / 2;
    const dist = Math.max(r / Math.sin(half), (sy * .62) / Math.tan(half)) * (o.zoom || 1.02);
    camera.position.set(target.x + dist * .72, target.y + dist * .38, target.z + dist * .58);
    camera.near = dist / 50; camera.far = dist * 6; camera.updateProjectionMatrix();
    controls.maxDistance = dist * 2; controls.minDistance = r * .6;
    controls.update();
    setLayer(Infinity);
  }

  function setLayer(value) {
    layer = value;
    scene.setLayer(value);
    dirty = true;
  }
  let dirty = true, running = true, visible = true, raf = 0, anim = null;
  controls.addEventListener('change', () => (dirty = true));
  function resize() {
    const w = container.clientWidth, h = container.clientHeight || w;
    scene.resize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); dirty = true;
  }
  const ro = new ResizeObserver(resize); ro.observe(container);
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) loop(); }); io.observe(container);

  function loop(t) {
    cancelAnimationFrame(raf);
    if (!visible || !running || document.hidden) return;
    raf = requestAnimationFrame(loop);
    if (anim) anim(performance.now());
    if (o.motes) { rotation += .0012; dirty = true; }
    const moved = controls.update();
    if (dirty || moved || controls.autoRotate) {
      dirty = !scene.draw({ position: camera.position.toArray(), quaternion: camera.quaternion.toArray(),
                            near: camera.near, far: camera.far, rotation, time: performance.now() });
    }
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) loop(); });

  // animacja „budowania” — warstwa po warstwie
  function animateBuild(ms = 2600, done) {
    const t0 = performance.now();
    anim = (now) => {
      const p = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - p, 2.2);
      setLayer(p >= 1 ? Infinity : Math.floor(e * (maxY + 1)) - 1);
      if (p >= 1) { anim = null; done && done(); }
    };
    loop();
  }

  load(build); resize(); loop();
  return {
    setLayer, animateBuild, loop,
    setBuild: (b) => { load(b); },
    get maxY() { return maxY; },
    get layer() { return layer; },
    controls,
    dispose() { running = false; ro.disconnect(); io.disconnect(); controls.dispose(); scene.dispose(); canvas.remove(); },
  };
}
