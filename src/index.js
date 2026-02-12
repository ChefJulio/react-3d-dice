// Default export: React component
export { default } from './Dice3D.jsx';
export { default as Dice3D } from './Dice3D.jsx';

// Engine utilities for advanced usage (custom Three.js scenes, etc.)
export {
  parseColor,
  clearTextureCache,
  getNumTexture,
  getDotTexture,
  createD10Geometry,
  createGeometry,
  geomFaceCount,
  computeFaces,
  computeFaceNumbers,
  faceSettleQuat,
  buildDieMesh,
  settleQuat,
  FACE_LABELED,
  LABEL_SIZE,
  SETTLE_SECS,
  D6_NUMBERS,
} from './diceEngine.js';
