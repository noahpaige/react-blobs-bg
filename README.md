# @noahpaige/react-blobs-bg

High-performance, prop-driven animated blob background component with hardware-adaptive quality settings and canvas rendering.

## Features

- 🎨 **Prop-driven animation** - Fully controlled via props (no internal animation loops)
- ⚡ **Hardware-adaptive** - Automatically adjusts quality based on device performance
- 🎯 **Performance optimized** - Dirty region tracking, Path2D/gradient caching, frame rate limiting
- 🔧 **Type-safe** - Comprehensive TypeScript types and validation
- 📦 **Zero dependencies** - Only React as a peer dependency
- 🎭 **Flexible** - Per-blob or shared positioning, rotation, and color control

## Live Demo

Check out a live example on CodePen: [https://codepen.io/noahpaige/pen/EaKodox](https://codepen.io/noahpaige/pen/EaKodox)

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
import { AnimatedBackground } from "@noahpaige/react-blobs-bg";

function App() {
  return (
    <AnimatedBackground
      colorPair={[
        { h: 200, s: 70, l: 50 },
        { h: 300, s: 70, l: 50 },
      ]}
      numBlobs={12}
    />
  );
}
```

### With External Animation (GSAP)

```tsx
import { AnimatedBackground } from "@noahpaige/react-blobs-bg";
import { useEffect, useState } from "react";
import gsap from "gsap";

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
    <AnimatedBackground
      colorPair={[
        { h: 200, s: 70, l: 50 },
        { h: 300, s: 70, l: 50 },
      ]}
      blobRotations={rotation}
      blobY={yPosition}
    />
  );
}
```

### With Framer Motion

```tsx
import { AnimatedBackground } from "@noahpaige/react-blobs-bg";
import { useMotionValue, useTransform } from "framer-motion";

function App() {
  const scrollY = useMotionValue(0);
  const rotation = useTransform(scrollY, [0, 1000], [0, 360]);
  const yPosition = useTransform(scrollY, [0, 1000], [0.5, 1]);

  return (
    <AnimatedBackground
      colorPair={[
        { h: 200, s: 70, l: 50 },
        { h: 300, s: 70, l: 50 },
      ]}
      blobRotations={rotation.get()}
      blobY={yPosition.get()}
    />
  );
}
```

### Per-Blob Control

```tsx
import { AnimatedBackground } from "@noahpaige/react-blobs-bg";

function App() {
  return (
    <AnimatedBackground
      colorPair={[
        { h: 200, s: 70, l: 50 },
        { h: 300, s: 70, l: 50 },
      ]}
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
import { AnimatedBackground } from "@noahpaige/react-blobs-bg";

function App() {
  return (
    <AnimatedBackground
      colorPair={[
        { h: 200, s: 70, l: 50 },
        { h: 300, s: 70, l: 50 },
      ]}
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

### AnimatedBackground Props

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
  AnimatedBackground,
  AnimatedBackgroundProps,
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
