import { FC, CSSProperties } from 'react';
import { BufferGeometry, Mesh, Quaternion } from 'three';

// --- Component ---

export interface Dice3DProps {
  /** Number of sides: 4, 6, 8, 10, 12, 20 (or any for unlabeled) */
  sides: number;
  /** Die color as hex number (0x3b82f6), CSS hex string ('#3b82f6'), or Tailwind class */
  color?: number | string;
  /** Roll results array (one per die rendered) */
  results?: number[];
  /** Whether dice are currently rolling */
  isRolling?: boolean;
  /** Animation style */
  animationMode?: 'full' | 'quick' | 'none';
  /** Increment to trigger a new roll render */
  rollTrigger?: number;
  /** D6 label style */
  d6Style?: 'numbers' | 'dots';
  /** Container height in px (auto-computed from rows if omitted) */
  height?: number;
  /** CSS class for the container */
  className?: string;
  /** Inline styles merged onto container */
  style?: CSSProperties;
  /** Text shown when no results */
  emptyText?: string;
}

declare const Dice3D: FC<Dice3DProps>;
export default Dice3D;
export { Dice3D };

// --- Engine types ---

export interface FaceData {
  centroid: import('three').Vector3;
  normal: import('three').Vector3;
  verts: import('three').Vector3[];
}

export declare const FACE_LABELED: Set<number>;
export declare const LABEL_SIZE: Record<number, number>;
export declare const SETTLE_SECS: number;
export declare const D6_NUMBERS: number[];

export declare function parseColor(color: number | string): number;
export declare function clearTextureCache(): void;
export declare function getNumTexture(num: number): import('three').CanvasTexture;
export declare function getDotTexture(num: number): import('three').CanvasTexture;
export declare function createD10Geometry(radius: number): BufferGeometry;
export declare function createGeometry(sides: number): BufferGeometry;
export declare function geomFaceCount(sides: number): number;
export declare function computeFaces(geometry: BufferGeometry, numFaces: number): FaceData[];
export declare function computeFaceNumbers(faces: FaceData[], sides: number): number[];
export declare function faceSettleQuat(face: FaceData, sides: number): Quaternion;
export declare function buildDieMesh(sides: number, color: number, d6Style?: string): Mesh;
export declare function settleQuat(mesh: Mesh, result: number, sides: number): Quaternion | null;
