import * as THREE from 'three';

// --- Constants ---

/** Dice with exact face count match get canvas-textured face labels */
export const FACE_LABELED = new Set([4, 6, 8, 10, 12, 20]);

/** Label plane size per die type (world-space units) */
export const LABEL_SIZE = { 4: 0.95, 6: 1.45, 8: 0.82, 10: 0.68, 12: 0.62, 20: 0.56 };

/** Settle animation duration in seconds */
export const SETTLE_SECS = 0.6;

/** D6 standard: opposite faces sum to 7. BoxGeometry face order: +x,-x,+y,-y,+z,-z */
export const D6_NUMBERS = [1, 6, 2, 5, 3, 4];

// --- Color helpers ---

/**
 * Parse a color value into a Three.js-compatible hex integer.
 * Accepts: hex number (0x3b82f6), CSS hex string ('#3b82f6'), or Tailwind class (bg-blue-500).
 */
const TAILWIND_MAP = {
  'bg-purple-500': 0xa855f7,
  'bg-blue-500': 0x3b82f6,
  'bg-green-500': 0x22c55e,
  'bg-yellow-500': 0xeab308,
  'bg-orange-500': 0xf97316,
  'bg-red-500': 0xef4444,
  'bg-pink-500': 0xec4899,
  'bg-gray-500': 0x6b7280,
};

export function parseColor(color) {
  if (typeof color === 'number') return color;
  if (typeof color === 'string') {
    if (color.startsWith('#')) return parseInt(color.slice(1), 16);
    if (TAILWIND_MAP[color]) return TAILWIND_MAP[color];
  }
  return 0x6b7280;
}

// --- Texture cache ---

const texCache = new Map();

/** Clear the texture cache (useful for memory cleanup) */
export function clearTextureCache() {
  texCache.forEach(tex => tex.dispose());
  texCache.clear();
}

/** Get or create a canvas texture with a number label */
export function getNumTexture(num) {
  if (texCache.has(num)) return texCache.get(num);
  const sz = 256;
  const c = document.createElement('canvas');
  c.width = sz;
  c.height = sz;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, sz, sz);
  const text = String(num);
  const fs = text.length > 1 ? sz * 0.62 : sz * 0.82;
  ctx.font = `bold ${fs}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Shadow for depth
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillText(text, sz / 2 + 2, sz / 2 + 2);
  // White number
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, sz / 2, sz / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  texCache.set(num, tex);
  return tex;
}

// D6 dot/pip patterns (traditional die face layouts)
const DOT_POSITIONS = {
  1: [[0.5, 0.5]],
  2: [[0.22, 0.78], [0.78, 0.22]],
  3: [[0.22, 0.78], [0.5, 0.5], [0.78, 0.22]],
  4: [[0.22, 0.22], [0.78, 0.22], [0.22, 0.78], [0.78, 0.78]],
  5: [[0.22, 0.22], [0.78, 0.22], [0.5, 0.5], [0.22, 0.78], [0.78, 0.78]],
  6: [[0.22, 0.18], [0.22, 0.5], [0.22, 0.82], [0.78, 0.18], [0.78, 0.5], [0.78, 0.82]],
};

/** Get or create a canvas texture with dot pips (D6 traditional style) */
export function getDotTexture(num) {
  const key = `dot-${num}`;
  if (texCache.has(key)) return texCache.get(key);
  const sz = 256;
  const c = document.createElement('canvas');
  c.width = sz;
  c.height = sz;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, sz, sz);
  const dots = DOT_POSITIONS[num] || DOT_POSITIONS[1];
  const r = num <= 2 ? sz * 0.13 : sz * 0.105;
  dots.forEach(([px, py]) => {
    // Shadow
    ctx.beginPath();
    ctx.arc(px * sz + 1, py * sz + 1, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fill();
    // White dot
    ctx.beginPath();
    ctx.arc(px * sz, py * sz, r, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  });
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  texCache.set(key, tex);
  return tex;
}

// --- Geometry helpers ---

/**
 * Pentagonal trapezohedron: the standard D10 shape.
 * 12 vertices (2 poles + 5 upper ring + 5 lower ring), 10 kite-shaped faces.
 * Each kite is split into 2 coplanar triangles for BufferGeometry.
 * Planarity condition: h/H = (1 - cos36) / (1 + cos36)
 */
export function createD10Geometry(radius) {
  const H = radius;
  const h = H * (1 - Math.cos(Math.PI / 5)) / (1 + Math.cos(Math.PI / 5));
  const r = radius * 0.85;

  const top = [0, H, 0];
  const bot = [0, -H, 0];
  const upper = [];
  const lower = [];

  for (let k = 0; k < 5; k++) {
    const aU = (k * 2 * Math.PI) / 5;
    const aL = aU + Math.PI / 5;
    upper.push([r * Math.cos(aU), h, r * Math.sin(aU)]);
    lower.push([r * Math.cos(aL), -h, r * Math.sin(aL)]);
  }

  const verts = [];
  function push3(v) { verts.push(v[0], v[1], v[2]); }

  for (let k = 0; k < 5; k++) {
    const nk = (k + 1) % 5;
    // Top kite: top, upper[k], lower[k], upper[nk]
    push3(top); push3(lower[k]); push3(upper[k]);
    push3(top); push3(upper[nk]); push3(lower[k]);
    // Bottom kite: bot, lower[k], upper[nk], lower[nk]
    push3(bot); push3(lower[k]); push3(upper[nk]);
    push3(bot); push3(upper[nk]); push3(lower[nk]);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.computeVertexNormals();
  return geo;
}

/** Create geometry for a given number of sides */
export function createGeometry(sides) {
  switch (sides) {
    case 4: return new THREE.TetrahedronGeometry(1.2, 0);
    case 6: return new THREE.BoxGeometry(1.7, 1.7, 1.7);
    case 8: return new THREE.OctahedronGeometry(1.2, 0);
    case 10: return createD10Geometry(1.2);
    case 12: return new THREE.DodecahedronGeometry(1.2, 0);
    case 20: return new THREE.IcosahedronGeometry(1.2, 0);
    default: return new THREE.IcosahedronGeometry(1.14, 0);
  }
}

/** How many geometric faces for each geometry type */
export function geomFaceCount(sides) {
  if (sides === 4) return 4;
  if (sides === 6) return 6;
  if (sides === 8) return 8;
  if (sides === 10) return 10;
  if (sides === 12) return 12;
  if (sides === 20) return 20;
  return 20;
}

/**
 * Compute centroid + outward normal + unique vertices per logical face.
 * For indexed geometry (D6 BoxGeometry) uses sequential grouping.
 * For non-indexed polyhedra, clusters triangles by normal direction since
 * Three.js does NOT group triangles sequentially by polygon face.
 */
export function computeFaces(geometry, numFaces) {
  const pos = geometry.getAttribute('position');
  const idx = geometry.index;

  // --- Indexed geometry (BoxGeometry / D6): sequential grouping ---
  if (idx) {
    const totalTris = idx.count / 3;
    const tpf = Math.round(totalTris / numFaces);
    const faces = [];
    for (let f = 0; f < numFaces; f++) {
      const centroid = new THREE.Vector3();
      const normal = new THREE.Vector3();
      const faceVerts = [];
      const seenIdx = new Set();
      let vertCount = 0;
      for (let t = f * tpf; t < (f + 1) * tpf; t++) {
        const base = t * 3;
        const ia = idx.getX(base), ib = idx.getX(base + 1), ic = idx.getX(base + 2);
        const a = new THREE.Vector3().fromBufferAttribute(pos, ia);
        const b = new THREE.Vector3().fromBufferAttribute(pos, ib);
        const c = new THREE.Vector3().fromBufferAttribute(pos, ic);
        centroid.add(a).add(b).add(c);
        vertCount += 3;
        if (t === f * tpf) {
          normal.crossVectors(
            new THREE.Vector3().subVectors(b, a),
            new THREE.Vector3().subVectors(c, a)
          ).normalize();
        }
        if (!seenIdx.has(ia)) { seenIdx.add(ia); faceVerts.push(a); }
        if (!seenIdx.has(ib)) { seenIdx.add(ib); faceVerts.push(b); }
        if (!seenIdx.has(ic)) { seenIdx.add(ic); faceVerts.push(c); }
      }
      centroid.divideScalar(vertCount);
      if (normal.dot(centroid) < 0) normal.negate();
      faces.push({ centroid: centroid.clone(), normal: normal.clone(), verts: faceVerts });
    }
    return faces;
  }

  // --- Non-indexed polyhedra: cluster triangles by normal direction ---
  const totalTris = pos.count / 3;
  const clusters = [];

  for (let t = 0; t < totalTris; t++) {
    const vi = t * 3;
    const a = new THREE.Vector3().fromBufferAttribute(pos, vi);
    const b = new THREE.Vector3().fromBufferAttribute(pos, vi + 1);
    const c = new THREE.Vector3().fromBufferAttribute(pos, vi + 2);
    const n = new THREE.Vector3().crossVectors(
      new THREE.Vector3().subVectors(b, a),
      new THREE.Vector3().subVectors(c, a)
    ).normalize();
    const mid = new THREE.Vector3().add(a).add(b).add(c).divideScalar(3);
    if (n.dot(mid) < 0) n.negate();

    let found = false;
    for (const cl of clusters) {
      if (cl.normal.dot(n) > 0.999) {
        cl.verts.push(a, b, c);
        found = true;
        break;
      }
    }
    if (!found) {
      clusters.push({ normal: n.clone(), verts: [a, b, c] });
    }
  }

  clusters.sort((a, b) => {
    const an = a.normal, bn = b.normal;
    if (Math.abs(an.x - bn.x) > 0.001) return an.x - bn.x;
    if (Math.abs(an.y - bn.y) > 0.001) return an.y - bn.y;
    return an.z - bn.z;
  });

  return clusters.map(cl => {
    const centroid = new THREE.Vector3();
    cl.verts.forEach(v => centroid.add(v));
    centroid.divideScalar(cl.verts.length);
    const unique = [];
    for (const v of cl.verts) {
      let isDup = false;
      for (const u of unique) {
        if (v.distanceTo(u) < 0.001) { isDup = true; break; }
      }
      if (!isDup) unique.push(v.clone());
    }
    return { centroid: centroid.clone(), normal: cl.normal.clone(), verts: unique };
  });
}

/**
 * Assign display numbers to faces so opposite faces sum to sides+1.
 * D6 uses hardcoded D6_NUMBERS. D4 has no opposite faces. D10 puts odds at top pole.
 */
export function computeFaceNumbers(faces, sides) {
  if (sides === 6) return D6_NUMBERS;
  if (sides === 4) return [1, 2, 3, 4];

  const n = faces.length;
  const numbers = new Array(n).fill(0);
  const target = sides + 1;

  // Find opposite pairs: normals with dot < -0.99
  const pairs = [];
  const used = new Set();
  for (let i = 0; i < n; i++) {
    if (used.has(i)) continue;
    for (let j = i + 1; j < n; j++) {
      if (used.has(j)) continue;
      if (faces[i].normal.dot(faces[j].normal) < -0.99) {
        pairs.push([i, j]);
        used.add(i);
        used.add(j);
        break;
      }
    }
    if (!used.has(i)) {
      pairs.push([i, -1]);
      used.add(i);
    }
  }

  if (sides === 10) {
    pairs.forEach(p => {
      if (p[1] >= 0 && faces[p[0]].centroid.y < faces[p[1]].centroid.y) {
        [p[0], p[1]] = [p[1], p[0]];
      }
    });
    pairs.sort((a, b) => {
      const aA = Math.atan2(faces[a[0]].centroid.z, faces[a[0]].centroid.x);
      const bA = Math.atan2(faces[b[0]].centroid.z, faces[b[0]].centroid.x);
      return aA - bA;
    });
    for (let k = 0; k < pairs.length; k++) {
      numbers[pairs[k][0]] = k * 2 + 1;
      if (pairs[k][1] >= 0) numbers[pairs[k][1]] = target - (k * 2 + 1);
    }
    return numbers;
  }

  for (let k = 0; k < pairs.length; k++) {
    numbers[pairs[k][0]] = k + 1;
    if (pairs[k][1] >= 0) numbers[pairs[k][1]] = target - (k + 1);
  }
  return numbers;
}

/**
 * Compute the settle quaternion for a face: rotates face normal to +Z, text upright.
 * Builds a full rotation matrix (not shortest-arc) so text aligns with face geometry.
 * D10: pole tip at bottom. D6: project +Y (edge-aligned). Others: snap to nearest vertex.
 */
export function faceSettleQuat(face, sides) {
  const n = face.normal.clone().normalize();

  let ref = new THREE.Vector3(0, 1, 0);
  if (Math.abs(n.dot(ref)) > 0.99) ref = new THREE.Vector3(0, 0, 1);
  const refUp = ref.clone().addScaledVector(n, -ref.dot(n)).normalize();

  let faceUp;
  if (sides === 10) {
    const H = 1.2;
    const pole = face.centroid.y > 0
      ? new THREE.Vector3(0, H, 0)
      : new THREE.Vector3(0, -H, 0);
    const toPole = new THREE.Vector3().subVectors(pole, face.centroid);
    toPole.addScaledVector(n, -toPole.dot(n)).normalize();
    faceUp = toPole.negate();
  } else if (sides !== 6 && face.verts && face.verts.length >= 3) {
    let bestDot = -Infinity;
    faceUp = refUp;
    for (const v of face.verts) {
      const dir = new THREE.Vector3().subVectors(v, face.centroid).normalize();
      const d = dir.dot(refUp);
      if (d > bestDot) {
        bestDot = d;
        faceUp = dir;
      }
    }
  } else {
    faceUp = refUp;
  }

  const xAxis = new THREE.Vector3().crossVectors(faceUp, n).normalize();
  const m = new THREE.Matrix4().makeBasis(xAxis, faceUp, n);
  return new THREE.Quaternion().setFromRotationMatrix(m).conjugate();
}

/**
 * Build a complete die mesh with edges, face labels, and settle metadata.
 * Returns a THREE.Mesh with userData: { faces, faceNumbers, numberToFace }
 */
export function buildDieMesh(sides, color, d6Style) {
  const geo = createGeometry(sides);
  const mat = new THREE.MeshPhongMaterial({
    color,
    shininess: 80,
    specular: 0x333333,
    flatShading: sides !== 6,
  });
  const mesh = new THREE.Mesh(geo, mat);

  // Edge wireframe
  const eg = new THREE.EdgesGeometry(geo);
  const em = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.2 });
  mesh.add(new THREE.LineSegments(eg, em));

  // Face labels (only for standard platonic solid dice)
  if (FACE_LABELED.has(sides)) {
    const nf = geomFaceCount(sides);
    const faces = computeFaces(geo, nf);
    mesh.userData.faces = faces;
    const ls = LABEL_SIZE[sides] || 0.3;
    const useDots = sides === 6 && d6Style === 'dots';

    const faceNumbers = computeFaceNumbers(faces, sides);
    mesh.userData.faceNumbers = faceNumbers;
    const numberToFace = {};
    faceNumbers.forEach((num, idx) => { numberToFace[num] = idx; });
    mesh.userData.numberToFace = numberToFace;

    for (let i = 0; i < sides; i++) {
      const face = faces[i];
      if (!face) continue;
      const num = faceNumbers[i];
      const tex = useDots ? getDotTexture(num) : getNumTexture(num);
      const pg = new THREE.PlaneGeometry(ls, ls);
      const pm = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const label = new THREE.Mesh(pg, pm);
      label.position.copy(face.centroid).addScaledVector(face.normal, 0.02);
      const sq = faceSettleQuat(face, sides);
      label.quaternion.copy(sq.conjugate());
      mesh.add(label);
    }
  }

  return mesh;
}

/**
 * Quaternion that rotates a face normal to point at camera (+Z), text upright.
 * Looks up the face index from mesh.userData.numberToFace.
 */
export function settleQuat(mesh, result, sides) {
  const faces = mesh.userData.faces;
  const ntf = mesh.userData.numberToFace;
  if (!faces || !ntf) return null;
  const fi = ntf[result];
  if (fi == null || fi < 0 || fi >= faces.length) return null;
  return faceSettleQuat(faces[fi], sides);
}
