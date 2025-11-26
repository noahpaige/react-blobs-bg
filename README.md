# @noahpaige/react-blobs-bg

High-performance, prop-driven animated blob background component with hardware-adaptive quality settings and canvas rendering.

Check out a live example on CodePen: [https://codepen.io/noahpaige/pen/EaKodox](https://codepen.io/noahpaige/pen/EaKodox)

## Features

- 🎯 Zero-dependency React component: Drop-in <BlobsBg /> React component with no runtime dependencies beyond React itself.
- 🌈 Beautiful gradient blob backgrounds: Renders organic blob shapes with smooth HSL-based gradients, controlled via a simple colorPair prop.
- 🎛️ Prop-driven animation model: The component itself is pure and stable; all motion comes from changing props (blobX, blobY, blobRotations) so animation can be driven by your own state, timelines, or scroll logic.
- 🎯 Per-blob control or one-line config: blobX, blobY, and blobRotations can be a single value (applied to all blobs) or arrays for fine‑grained, per-blob positioning and motion.
- 🚀 Adaptive performance based on hardware: Auto-detects hardware capabilities (GPU, RAM, CPU cores) and picks an appropriate performance tier (low / medium / high) so it feels smooth on low-end laptops and high-refresh displays alike.
- ⚙️ Tunable quality settings: Optional qualitySettings override lets you explicitly control blob count, frame rate, and blur strength when you need precise tradeoffs.
- 🖼️ Efficient offscreen rendering: Uses an offscreen canvas and draws a single blurred frame onto the main canvas, reducing work per frame and improving responsiveness.
- 🧮 Dirty-region rendering optimization: Tracks which parts of the offscreen canvas have actually changed between frames and only clears/redraws those areas, saving GPU/CPU time.
- 🧠 Smart caching (Path2D, gradients, colors): Pools Path2D objects and caches gradients and HSL strings to minimize allocations and expensive canvas operations.
- 📱 Responsive full-screen layout: Automatically resizes to the viewport, covering the entire background (100vw × 100vh) while staying non-interactive (pointerEvents: "none", negative z-index).
- 🛡️ Runtime validation and safety: Validates colorPair, array lengths, and performance-related props, logging clear errors/warnings and falling back to a safe static background if misconfigured.
- 📐 TypeScript-friendly API: Fully typed props (BlobsBgProps, HSLColor, performance types) with sensible defaults (DEFAULT_PROPS) for an easy, discoverable developer experience.
- 🔍 Performance diagnostics in development: Optionally logs performance tier, quality settings, FPS estimates, dirty-region efficiency, and render timings to the console during development.

## Installation

```bash
npm install @noahpaige/react-blobs-bg
```

or

```bash
yarn add @noahpaige/react-blobs-bg
```

or

```bash
pnpm add @noahpaige/react-blobs-bg
```

## Basic Usage

### Static Background

```tsx
import { BlobsBg, HSLColor } from "@noahpaige/react-blobs-bg";

const colorPair: [HSLColor, HSLColor] = [
  { h: 200, s: 70, l: 50 },
  { h: 300, s: 70, l: 50 },
];

function App() {
  return <BlobsBg colorPair={colorPair} numBlobs={12} />;
}
```

### With External Animation (GSAP)

```tsx
import { BlobsBg, HSLColor } from "@noahpaige/react-blobs-bg";
import { useEffect, useState } from "react";
import gsap from "gsap";

const colorPair: [HSLColor, HSLColor] = [
  { h: 200, s: 70, l: 50 },
  { h: 300, s: 70, l: 50 },
];

function App() {
  const [rotation, setRotation] = useState(0);
  const [yPosition, setYPosition] = useState(0.5);

  useEffect(() => {
    gsap.to(
      {},
      {
        rotation: 360,
        yPosition: 1,
        duration: 5,
        repeat: -1,
        ease: "none",
        onUpdate: function () {
          setRotation(this.targets()[0].rotation);
          setYPosition(this.targets()[0].yPosition);
        },
      }
    );
  }, []);

  return (
    <BlobsBg colorPair={colorPair} blobRotations={rotation} blobY={yPosition} />
  );
}
```

### With Framer Motion

```tsx
import { BlobsBg, HSLColor } from "@noahpaige/react-blobs-bg";
import { useMotionValue, useTransform } from "framer-motion";

const colorPair: [HSLColor, HSLColor] = [
  { h: 200, s: 70, l: 50 },
  { h: 300, s: 70, l: 50 },
];

function App() {
  const scrollY = useMotionValue(0);
  const rotation = useTransform(scrollY, [0, 1000], [0, 360]);
  const yPosition = useTransform(scrollY, [0, 1000], [0.5, 1]);

  return (
    <BlobsBg
      colorPair={colorPair}
      blobRotations={rotation.get()}
      blobY={yPosition.get()}
    />
  );
}
```

### Per-Blob Control

```tsx
import { BlobsBg, HSLColor } from "@noahpaige/react-blobs-bg";

const colorPair: [HSLColor, HSLColor] = [
  { h: 200, s: 70, l: 50 },
  { h: 300, s: 70, l: 50 },
];

function App() {
  return (
    <BlobsBg
      colorPair={colorPair}
      numBlobs={6}
      blobX={[0.2, 0.4, 0.6, 0.8, 0.3, 0.7]}
      blobY={[0.3, 0.5, 0.7, 0.4, 0.6, 0.8]}
      blobRotations={[0, 45, 90, 135, 180, 225]}
    />
  );
}
```

### Performance Override

```tsx
import { BlobsBg, HSLColor } from "@noahpaige/react-blobs-bg";

const colorPair: [HSLColor, HSLColor] = [
  { h: 200, s: 70, l: 50 },
  { h: 300, s: 70, l: 50 },
];

function App() {
  return (
    <BlobsBg
      colorPair={colorPair}
      performanceTier="high"
      qualitySettings={{
        blobCount: 20,
        frameRate: 60,
        blurAmount: 5,
      }}
    />
  );
}
```

## API Reference

### BlobsBg Props

| Prop              | Type                          | Default      | Description                                                  |
| ----------------- | ----------------------------- | ------------ | ------------------------------------------------------------ |
| `colorPair`       | `[HSLColor, HSLColor]`        | **Required** | Array of two HSL colors for blob gradients                   |
| `numBlobs`        | `number`                      | `12`         | Number of blobs to render                                    |
| `renderSize`      | `number`                      | `32`         | Render size for offscreen canvas                             |
| `blobX`           | `number \| number[]`          | `0.5`        | Normalized X position (0-1). Single value or per-blob array  |
| `blobY`           | `number \| number[]`          | `0.5`        | Normalized Y position (0-1). Single value or per-blob array  |
| `blobRotations`   | `number \| number[]`          | Random       | Rotation angles in degrees. Single value or per-blob array   |
| `performanceTier` | `"low" \| "medium" \| "high"` | Auto-detect  | Performance tier override                                    |
| `qualitySettings` | `object`                      | Auto         | Quality settings override (blobCount, frameRate, blurAmount) |
| `className`       | `string`                      | -            | CSS className for the container                              |
| `style`           | `React.CSSProperties`         | -            | Inline styles for the container                              |
| `onError`         | `(error: Error) => void`      | -            | Error callback                                               |

### HSLColor Type

```typescript
type HSLColor = {
  /** Hue value (0-360 degrees) */
  h: number;
  /** Saturation percentage (0-100) */
  s: number;
  /** Lightness percentage (0-100) */
  l: number;
};
```

### Exported Utilities

```typescript
// Detect performance tier
import { detectPerformanceTier } from "@noahpaige/react-blobs-bg";

const tier = await detectPerformanceTier(); // "low" | "medium" | "high"
```

## Performance

The component automatically detects device capabilities and adjusts:

- **Blob count**: 6 (low) / 9 (medium) / 12+ (high)
- **Frame rate**: 20fps (low) / 30fps (medium) / 60fps (high)
- **Blur amount**: 2px (low) / 3px (medium) / 4px (high)

### Performance Optimizations

- **Dirty region tracking** - Only redraws changed areas
- **Path2D pooling** - Reuses Path2D objects for memory efficiency
- **Gradient caching** - Caches gradients to avoid regeneration
- **Color string caching** - Caches HSL string conversions
- **Frame rate limiting** - Maintains consistent performance
- **Offscreen rendering** - Renders to offscreen canvas first

## Browser Compatibility

- Chrome/Edge (Chromium) ✅
- Firefox ✅
- Safari ✅
- Mobile browsers (iOS Safari, Chrome Mobile) ✅

## TypeScript

Full TypeScript support is included. All types are exported from the main package:

```typescript
import {
  BlobsBg,
  BlobsBgProps,
  HSLColor,
  PerformanceTier,
  detectPerformanceTier,
} from "@noahpaige/react-blobs-bg";
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Author

Noah Paige

## Repository

[https://github.com/noahpaige/react-blobs-bg](https://github.com/noahpaige/react-blobs-bg)
