import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import {
  FACE_LABELED,
  SETTLE_SECS,
  parseColor,
  buildDieMesh,
  settleQuat,
} from './diceEngine.js';

/**
 * Dice3D -- A React component that renders 3D dice using Three.js.
 *
 * Props:
 *   sides        (number)  - Number of sides (4, 6, 8, 10, 12, 20, or any)
 *   color        (number | string) - Hex color: 0x3b82f6, '#3b82f6', or Tailwind class
 *   results      (number[]) - Array of roll results, one per die
 *   isRolling    (boolean)  - Whether dice are currently rolling
 *   animationMode ('full' | 'quick' | 'none') - Animation style
 *   rollTrigger  (number)   - Increment to trigger a new roll render
 *   d6Style      ('numbers' | 'dots') - D6 label style
 *   height       (number)   - Container height in px (auto-computed if omitted)
 *   className    (string)   - Optional CSS class for the container
 *   style        (object)   - Optional inline styles merged onto container
 *   emptyText    (string)   - Text shown when no results (default: 'Press Roll to see 3D dice')
 */
const Dice3D = ({
  sides,
  color = 0x3b82f6,
  results = [],
  isRolling = false,
  animationMode = 'full',
  rollTrigger = 0,
  d6Style = 'numbers',
  height,
  className,
  style,
  emptyText = 'Press Roll to see 3D dice',
}) => {
  const mountRef = useRef(null);
  const S = useRef({
    scene: null, camera: null, renderer: null,
    meshes: [], gridPos: [], animId: null,
    phase: 'idle', settleStart: 0, settleData: [],
    frustumHalf: 2.5,
  });
  const rollingRef = useRef(isRolling);
  const modeRef = useRef(animationMode);
  const numberedRef = useRef(FACE_LABELED.has(sides));
  rollingRef.current = isRolling;
  modeRef.current = animationMode;
  numberedRef.current = FACE_LABELED.has(sides);

  const [overlayPos, setOverlayPos] = useState([]);
  const hexColor = parseColor(color);
  const isNumbered = FACE_LABELED.has(sides);

  // --- Effect 1: Init scene + persistent animation loop ---
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const s = S.current;

    const scene = new THREE.Scene();
    const w0 = el.clientWidth;
    const h0 = Math.max(el.clientHeight, 1);
    const aspect = w0 / h0;
    const fh = 2.5;
    const camera = new THREE.OrthographicCamera(
      -fh * aspect, fh * aspect, fh, -fh, 0.1, 100
    );
    camera.position.set(0, 0, 10);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const kl = new THREE.DirectionalLight(0xffffff, 1.0);
    kl.position.set(5, 8, 5);
    scene.add(kl);
    const fl = new THREE.DirectionalLight(0xffffff, 0.3);
    fl.position.set(-3, -2, 4);
    scene.add(fl);

    s.scene = scene;
    s.camera = camera;
    s.renderer = renderer;

    function updateOverlay() {
      if (s.gridPos.length === 0) return;
      camera.updateProjectionMatrix();
      setOverlayPos(s.gridPos.map(gp => {
        const v = new THREE.Vector3(gp.x, gp.y, 0).project(camera);
        return {
          left: ((v.x * 0.5 + 0.5) * 100).toFixed(2) + '%',
          top: ((-v.y * 0.5 + 0.5) * 100).toFixed(2) + '%',
        };
      }));
    }
    s.updateOverlay = updateOverlay;

    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w === 0 || h === 0) return;
      const a = w / h;
      const fh2 = s.frustumHalf;
      camera.left = -fh2 * a;
      camera.right = fh2 * a;
      camera.top = fh2;
      camera.bottom = -fh2;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      updateOverlay();
    });
    ro.observe(el);

    const loop = (time) => {
      s.animId = requestAnimationFrame(loop);
      const t = time / 1000;
      const meshes = s.meshes;
      const mode = modeRef.current;
      const numbered = numberedRef.current;

      if (s.phase === 'spinning' && mode !== 'none') {
        const spd = mode === 'full' ? 10 : 15;
        meshes.forEach((m, i) => {
          m.rotation.x += (spd + i * 2) * 0.016;
          m.rotation.y += (spd * 0.8 + i) * 0.016;
          m.rotation.z += spd * 0.3 * 0.016;
        });
      } else if (s.phase === 'settling') {
        const elapsed = (time - s.settleStart) / 1000;
        const p = Math.min(elapsed / SETTLE_SECS, 1);
        const e = 1 - Math.pow(1 - p, 3);
        meshes.forEach((m, i) => {
          const d = s.settleData[i];
          if (d) m.quaternion.slerpQuaternions(d.from, d.to, e);
        });
        if (p >= 1) s.phase = 'idle';
      } else if (s.phase === 'idle' && meshes.length > 0) {
        meshes.forEach((m, i) => {
          if (numbered && s.settleData[i]) {
            const w = new THREE.Quaternion().setFromEuler(new THREE.Euler(
              Math.sin(t * 0.8 + i) * 0.03,
              Math.sin(t * 0.6 + i * 0.5) * 0.05,
              0
            ));
            m.quaternion.copy(s.settleData[i].to).multiply(w);
          } else {
            m.rotation.x += 0.004;
            m.rotation.y += 0.006;
          }
          if (s.gridPos[i]) {
            m.position.y = s.gridPos[i].y + Math.sin(t * 1.2 + i * 0.7) * 0.06;
          }
        });
      }

      renderer.render(scene, camera);
    };
    s.animId = requestAnimationFrame(loop);

    return () => {
      ro.disconnect();
      if (s.animId) cancelAnimationFrame(s.animId);
      s.meshes.forEach(m => {
        scene.remove(m);
        m.traverse(ch => {
          if (ch.geometry) ch.geometry.dispose();
          if (ch.material) ch.material.dispose();
        });
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement);
      s.scene = null; s.camera = null; s.renderer = null;
      s.meshes = []; s.gridPos = []; s.animId = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Effect 2: Build meshes when dice config changes ---
  useEffect(() => {
    const s = S.current;
    if (!s.scene) return;

    s.meshes.forEach(m => {
      s.scene.remove(m);
      m.traverse(ch => {
        if (ch.geometry) ch.geometry.dispose();
        if (ch.material) ch.material.dispose();
      });
    });
    s.meshes = [];
    s.gridPos = [];
    s.settleData = [];
    s.phase = 'idle';

    const count = results.length;
    if (count === 0) { setOverlayPos([]); return; }

    const cols = Math.min(count, 5);
    const rows = Math.ceil(count / cols);
    const spacing = 2.8;

    for (let i = 0; i < count; i++) {
      const mesh = buildDieMesh(sides, hexColor, d6Style);
      const row = Math.floor(i / cols);
      const inRow = i - row * cols;
      const rowItems = row === rows - 1 ? count - row * cols : cols;
      const x = (-(rowItems - 1) / 2 + inRow) * spacing;
      const y = ((rows - 1) / 2 - row) * spacing;

      mesh.position.set(x, y, 0);
      mesh.rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      );
      s.scene.add(mesh);
      s.meshes.push(mesh);
      s.gridPos.push({ x, y });
    }

    const el = mountRef.current;
    const spanX = Math.min(count, 5) * spacing;
    const spanY = rows * spacing;
    const asp = el ? el.clientWidth / Math.max(el.clientHeight, 1) : 1;
    const margin = 1.5;
    const needY = spanY / 2 + margin;
    const needX = (spanX / 2 + margin) / asp;
    const fh = Math.max(needY, needX, 2.5);
    s.frustumHalf = fh;
    s.camera.left = -fh * asp;
    s.camera.right = fh * asp;
    s.camera.top = fh;
    s.camera.bottom = -fh;
    s.camera.updateProjectionMatrix();

    if (s.updateOverlay) s.updateOverlay();

    if (!rollingRef.current && isNumbered) {
      s.phase = 'settling';
      s.settleStart = performance.now();
      s.settleData = s.meshes.map((m, i) => ({
        from: m.quaternion.clone(),
        to: settleQuat(m, results[i], sides) || new THREE.Quaternion(),
      }));
    }
  }, [results.length, sides, hexColor, rollTrigger, isNumbered, d6Style]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Effect 3: Handle rolling state transitions ---
  useEffect(() => {
    const s = S.current;
    if (isRolling) {
      s.phase = 'spinning';
      s.settleData = [];
    } else if (s.phase === 'spinning' && results.length > 0) {
      s.phase = 'settling';
      s.settleStart = performance.now();
      s.settleData = s.meshes.map((m, i) => {
        const from = m.quaternion.clone();
        let to = null;
        if (isNumbered && m.userData.faces) {
          to = settleQuat(m, results[i], sides);
        }
        if (!to) {
          to = new THREE.Quaternion().setFromEuler(
            new THREE.Euler(Math.random() * 0.3, Math.random() * 0.3, 0)
          );
        }
        return { from, to };
      });
    }
  }, [isRolling, results, isNumbered, sides]);

  // --- Render ---
  const rowCount = Math.ceil(results.length / 5) || 1;
  const computedH = Math.max(200, rowCount * 130 + 50);
  const canvasH = height != null ? height : computedH;
  const showOverlay = !isNumbered && !isRolling && results.length > 0;
  const fs = results.length > 10 ? '0.875rem' : results.length > 5 ? '1.1rem' : '1.5rem';

  const containerStyle = {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: '0.75rem',
    height: typeof canvasH === 'number' ? canvasH + 'px' : canvasH,
    ...style,
  };

  return (
    <div className={className} style={containerStyle}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

      {/* Overlay numbers for non-face-labeled dice */}
      {showOverlay && overlayPos.length === results.length &&
        results.map((val, i) => (
          <div
            key={`${rollTrigger}-${i}`}
            style={{
              position: 'absolute',
              pointerEvents: 'none',
              left: overlayPos[i].left,
              top: overlayPos[i].top,
              transform: 'translate(-50%, -50%)',
              zIndex: 10,
              animation: 'rdice3d-numIn 0.3s ease-out',
            }}
          >
            <span
              style={{
                fontWeight: 'bold',
                color: 'white',
                fontVariantNumeric: 'tabular-nums',
                fontSize: fs,
                textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 0 4px rgba(0,0,0,0.6)',
              }}
            >
              {val}
            </span>
          </div>
        ))}

      {/* Empty state */}
      {results.length === 0 && !isRolling && emptyText && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <p style={{
            fontSize: '1.125rem',
            fontWeight: 600,
            color: '#9ca3af',
            margin: 0,
          }}>
            {emptyText}
          </p>
        </div>
      )}

      <style>{`
        @keyframes rdice3d-numIn {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
    </div>
  );
};

export default Dice3D;
