# react-dice-3d

3D dice renderer for React using Three.js. Renders D4, D6, D8, D10, D12, and D20 with canvas-textured face labels, settle animations, and optional D6 dot pips.

## Install

```bash
npm install react-dice-3d three
```

> **Peer dependencies:** `react >= 17`, `react-dom >= 17`, `three >= 0.150`

## Quick Start

```jsx
import { useState } from 'react';
import Dice3D from 'react-dice-3d';

function App() {
  const [results, setResults] = useState([]);
  const [isRolling, setIsRolling] = useState(false);
  const [trigger, setTrigger] = useState(0);

  const roll = () => {
    setIsRolling(true);
    const newResults = Array.from({ length: 2 }, () =>
      Math.floor(Math.random() * 6) + 1
    );
    setResults(newResults);
    setTrigger(t => t + 1);
    setTimeout(() => setIsRolling(false), 800);
  };

  return (
    <div>
      <Dice3D
        sides={6}
        color={0x3b82f6}
        results={results}
        isRolling={isRolling}
        rollTrigger={trigger}
      />
      <button onClick={roll}>Roll 2D6</button>
    </div>
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `sides` | `number` | (required) | Number of sides: 4, 6, 8, 10, 12, 20 |
| `color` | `number \| string` | `0x3b82f6` | Die color as hex number or CSS hex string |
| `results` | `number[]` | `[]` | Roll results (one per die rendered) |
| `isRolling` | `boolean` | `false` | Whether dice are currently rolling |
| `animationMode` | `'full' \| 'quick' \| 'none'` | `'full'` | Animation style |
| `rollTrigger` | `number` | `0` | Increment to trigger a new roll |
| `d6Style` | `'numbers' \| 'dots'` | `'numbers'` | D6 label style (numbers or dot pips) |
| `height` | `number` | auto | Container height in px |
| `className` | `string` | `undefined` | CSS class for the container |
| `style` | `object` | `undefined` | Inline styles merged onto container |
| `emptyText` | `string` | `'Press Roll...'` | Text when no results |

## Supported Dice

| Die | Geometry | Labels |
|-----|----------|--------|
| D4 | Tetrahedron | Face numbers |
| D6 | Cube | Numbers or dot pips |
| D8 | Octahedron | Face numbers |
| D10 | Pentagonal trapezohedron | Face numbers (odds top, evens bottom) |
| D12 | Dodecahedron | Face numbers |
| D20 | Icosahedron | Face numbers |
| Other | Icosahedron (unlabeled) | Overlay numbers |

Opposite faces always sum to N+1 (e.g. D6: 7, D20: 21).

## Engine API

For advanced usage (custom Three.js scenes), import engine utilities:

```js
import { buildDieMesh, settleQuat, createGeometry } from 'react-dice-3d';

// Build a die mesh for your own scene
const mesh = buildDieMesh(20, 0xef4444, 'numbers');
scene.add(mesh);

// Get settle quaternion for a result
const quat = settleQuat(mesh, 17, 20);
mesh.quaternion.copy(quat);
```

### Engine Exports

| Export | Description |
|--------|-------------|
| `buildDieMesh(sides, color, d6Style)` | Create a complete die mesh with edges and labels |
| `settleQuat(mesh, result, sides)` | Get quaternion to show a specific face |
| `createGeometry(sides)` | Create raw Three.js geometry |
| `createD10Geometry(radius)` | Pentagonal trapezohedron geometry |
| `computeFaces(geometry, numFaces)` | Extract face data (centroid, normal, vertices) |
| `computeFaceNumbers(faces, sides)` | Assign numbers with opposite-face pairing |
| `faceSettleQuat(face, sides)` | Settle quaternion for a single face |
| `parseColor(color)` | Convert hex string/number to Three.js color int |
| `clearTextureCache()` | Dispose cached canvas textures |
| `getNumTexture(num)` / `getDotTexture(num)` | Get cached canvas textures |

## How It Works

- Uses `OrthographicCamera` for zero perspective distortion
- Face labels are canvas textures on `PlaneGeometry` meshes positioned at face centroids
- Normal-direction clustering detects geometric faces on non-indexed polyhedra
- Vertex-snapping orients numbers to align with face polygon vertices (D4/D8/D12/D20)
- D10 uses custom pentagonal trapezohedron geometry with pole-based text orientation
- Settle animation uses quaternion slerp with cubic ease-out

## License

MIT
