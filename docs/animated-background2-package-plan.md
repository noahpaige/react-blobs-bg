# Animated Background 2 NPM Package Creation Plan

## Overview

This document outlines the comprehensive plan to extract the `AnimatedBackground2` component from the portfolio project and create a standalone, publishable npm package. The Animated Background 2 is a high-performance, prop-driven animated blob background component with hardware-adaptive quality settings, dirty region tracking, and comprehensive performance optimizations.

## Package Analysis

### Current Component Features

- **Core Functionality**: Prop-driven animated blob backgrounds with canvas rendering
- **Performance Optimizations**:
  - Dirty region tracking for optimized rendering
  - Path2D and gradient caching for memory efficiency
  - Hardware-adaptive quality settings (blob count, frame rate, blur)
  - Frame rate limiting for consistent performance
- **Animation Control**: Fully controlled via props (no internal animation loops)
- **Flexibility**: Per-blob or shared positioning, rotation, and color control
- **Canvas Features**: Offscreen rendering, blur support detection, backdrop filter fallback
- **Type Safety**: Comprehensive TypeScript types and validation

### Dependencies Analysis

**Current Dependencies:**

- **React 19**: Core framework dependency (peer dependency)
- **HardwareCapabilityContext**: Project-specific context for performance tier detection
- **TypeScript**: Type definitions and interfaces

**Dependencies to Remove/Refactor:**

- `@/context/HardwareCapabilityContext` - Must be made optional or replaced with built-in detection

## Package Structure Plan

### 1. Package Naming & Scope

```
@noahpaige/react-blobs-bg
```

- **Scope**: `@noahpaige` (personal scope)
- **Name**: `react-blobs-bg` (descriptive and searchable)
- **Registry**: npm (public access)

### 2. Directory Structure

```
react-blobs-bg/
├── src/
│   ├── components/
│   │   └── AnimatedBackground/
│   │       ├── AnimatedBackground.tsx
│   │       ├── AnimatedBackground.types.ts
│   │       ├── AnimatedBackground.test.tsx
│   │       ├── AnimatedBackground.stories.tsx
│   │       └── index.ts
│   ├── utils/
│   │   ├── performance-detection.ts    # Hardware capability detection
│   │   ├── canvas-helpers.ts          # Canvas utility functions
│   │   ├── color-helpers.ts           # HSL color utilities
│   │   ├── caching.ts                 # Path2D, gradient, color caches
│   │   ├── dirty-regions.ts           # Dirty region tracking
│   │   └── index.ts
│   ├── types/
│   │   ├── colors.ts                  # HSLColor type
│   │   ├── performance.ts             # Performance tier types
│   │   └── index.ts
│   ├── constants/
│   │   ├── animation-config.ts        # Animation configuration constants
│   │   ├── blob-paths.ts              # SVG path data
│   │   └── index.ts
│   └── index.ts
├── dist/                    # Built output
├── examples/                # Usage examples
│   ├── basic/
│   ├── with-gsap/
│   ├── with-framer-motion/
│   └── static/
├── docs/                    # Documentation
├── tests/                   # Test files
├── .github/                 # GitHub workflows
├── .gitignore
├── .npmignore
├── package.json
├── tsconfig.json
├── rollup.config.js         # Build configuration
├── vitest.config.ts         # Test configuration
├── README.md
├── CHANGELOG.md
└── LICENSE
```

## Implementation Plan

### Phase 1: Package Foundation (Week 1)

#### 1.1 Package Initialization

```bash
# Create package directory
mkdir react-blobs-bg
cd react-blobs-bg
npm init -y

# Initialize Git repository
git init
git add .
git commit -m "Initial commit: React Animated Background package foundation"
```

#### 1.2 Core Dependencies Installation

```bash
# Production dependencies
# (None - React is peer dependency)

# Development dependencies
npm install --save-dev typescript @types/node @types/react @types/react-dom
npm install --save-dev @typescript-eslint/parser @typescript-eslint/eslint-plugin
npm install --save-dev prettier eslint
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom jsdom
npm install --save-dev rollup @rollup/plugin-typescript @rollup/plugin-commonjs
npm install --save-dev @rollup/plugin-node-resolve rollup-plugin-dts

# Storybook (install with consistent versions - use v8 for stability)
npm install --save-dev storybook@^8.6.14 @storybook/react@^8.6.14 @storybook/addon-essentials@^8.6.14

# Alternative: Use Storybook's init command for automatic setup
# npx storybook@latest init
```

#### 1.3 Configuration Files Creation

- `tsconfig.json` - TypeScript configuration
- `rollup.config.js` - Build bundling
- `vitest.config.ts` - Testing configuration
- `.eslintrc.js` - ESLint configuration
- `.prettierrc` - Prettier configuration

### Phase 2: Component Extraction & Refactoring (Week 2)

#### 2.1 Component Extraction Strategy

**Key Refactoring Tasks:**

1. **Remove HardwareCapabilityContext Dependency**
   - Extract hardware detection logic into standalone utility
   - Make performance tier detection optional (prop-based or built-in)
   - Provide default performance tier if not provided

2. **Extract Internal Classes and Utilities**
   - `Path2DPool` → `src/utils/caching.ts`
   - `GradientCache` → `src/utils/caching.ts`
   - `ColorCache` → `src/utils/caching.ts`
   - `calculateBlobBounds` → `src/utils/dirty-regions.ts`
   - `mergeDirtyRegions` → `src/utils/dirty-regions.ts`
   - `hslToString` → `src/utils/color-helpers.ts`
   - `getGradientColors` → `src/utils/color-helpers.ts`
   - `getPerBlobValue` → `src/utils/canvas-helpers.ts`
   - `generateBlobs` → `src/utils/canvas-helpers.ts`

3. **Extract Constants**
   - `ANIMATION_CONFIG` → `src/constants/animation-config.ts`
   - `DEFAULT_PROPS` → `src/constants/animation-config.ts`
   - `BLOB_PATHS` → `src/constants/blob-paths.ts`

4. **Extract Types**
   - `HSLColor` → `src/types/colors.ts`
   - `BlobState` → `src/types/index.ts`
   - `DirtyRegion` → `src/types/index.ts`
   - `InternalBlobData` → `src/types/index.ts`
   - `AnimatedBackground2Props` → `src/components/AnimatedBackground/AnimatedBackground.types.ts`

#### 2.2 Hardware Capability Detection Strategy

**Option A: Built-in Detection (Recommended)**

- Include simplified hardware detection in package
- No external dependencies
- Automatic performance tier detection
- Can be overridden via props

**Option B: Optional Prop**

- Accept `performanceTier` as optional prop
- Default to "medium" if not provided
- Users can provide their own detection logic

**Option C: Hybrid Approach**

- Built-in detection with optional override
- Best of both worlds

**Recommended**: Option C - Built-in detection with prop override

```typescript
// src/utils/performance-detection.ts
export type PerformanceTier = "low" | "medium" | "high";

export interface PerformanceSettings {
  performanceTier?: PerformanceTier;
  blobCount?: number;
  frameRate?: number;
  blurAmount?: number;
}

export const detectPerformanceTier = async (): Promise<PerformanceTier> => {
  // Simplified version of HardwareCapabilityContext logic
  // Extract GPU detection, RAM, cores detection
  // Return "low" | "medium" | "high"
};
```

#### 2.3 Component Props Refactoring

```typescript
// src/components/AnimatedBackground/AnimatedBackground.types.ts
export interface AnimatedBackgroundProps {
  /** Single color pair for blob gradients */
  colorPair: [HSLColor, HSLColor];

  // Rendering configuration
  numBlobs?: number;
  renderSize?: number;

  /** Normalized X position for blobs. Single number applies to all, array for per-blob positioning. 0 = left edge, 0.5 = center, 1 = right edge. Values outside 0-1 position blobs off-screen. Default: 0.5 */
  blobX?: number | number[];

  /** Normalized Y position for blobs. Single number applies to all, array for per-blob positioning. 0 = top, 0.5 = center, 1 = bottom. Default: 0.5 */
  blobY?: number | number[];

  /** Rotation angles in degrees. Single number applies to all, array for per-blob rotations. Default: random initial rotation */
  blobRotations?: number | number[];

  // Performance settings (optional - will use built-in detection if not provided)
  performanceTier?: PerformanceTier;
  qualitySettings?: {
    blobCount?: number;
    frameRate?: number;
    blurAmount?: number;
  };

  // Advanced configuration
  className?: string;
  style?: React.CSSProperties;
  onError?: (error: Error) => void;
}
```

#### 2.4 Type Definitions Extraction

```typescript
// src/types/colors.ts
export type HSLColor = {
  /** Hue value (0-360 degrees) */
  h: number;
  /** Saturation percentage (0-100) */
  s: number;
  /** Lightness percentage (0-100) */
  l: number;
};

// src/types/performance.ts
export type PerformanceTier = "low" | "medium" | "high";

// src/types/index.ts
export interface BlobState {
  position: { x: number; y: number };
  rotation: number;
  scale: number;
}

export interface DirtyRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface InternalBlobData {
  path: Path2D;
  rotation: number;
  scale: number;
}
```

### Phase 3: Build System & Distribution (Week 3)

#### 3.1 Rollup Configuration

```javascript
// rollup.config.js
import typescript from "@rollup/plugin-typescript";
import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import dts from "rollup-plugin-dts";

export default [
  {
    input: "src/index.ts",
    output: [
      {
        file: "dist/index.js",
        format: "cjs",
        sourcemap: true,
      },
      {
        file: "dist/index.esm.js",
        format: "esm",
        sourcemap: true,
      },
    ],
    plugins: [
      resolve(),
      commonjs(),
      typescript({
        tsconfig: "./tsconfig.json",
        declaration: true,
        declarationDir: "./dist/types",
      }),
    ],
    external: ["react", "react-dom"],
  },
  {
    input: "dist/types/index.d.ts",
    output: [{ file: "dist/index.d.ts", format: "esm" }],
    plugins: [dts()],
  },
];
```

#### 3.2 Package.json Configuration

```json
{
  "name": "@noahpaige/react-blobs-bg",
  "version": "1.0.0",
  "description": "High-performance, prop-driven animated blob background component with hardware-adaptive quality settings and canvas rendering",
  "main": "dist/index.js",
  "module": "dist/index.esm.js",
  "types": "dist/index.d.ts",
  "files": ["dist", "README.md", "CHANGELOG.md", "LICENSE"],
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.esm.js",
      "require": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "rollup -c",
    "dev": "rollup -c -w",
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:run": "vitest run",
    "test:ui": "vitest --ui",
    "lint": "eslint src --ext .ts,.tsx",
    "lint:fix": "eslint src --ext .ts,.tsx --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx}\"",
    "prepublishOnly": "npm run build && npm run test:run",
    "clean": "rimraf dist",
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build"
  },
  "peerDependencies": {
    "react": ">=18.0.0",
    "react-dom": ">=18.0.0"
  },
  "keywords": [
    "react",
    "animated-background",
    "canvas",
    "blob",
    "gradient",
    "performance",
    "hardware-adaptive",
    "typescript",
    "prop-driven"
  ],
  "author": "Noah Paige",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/noahpaige/react-blobs-bg.git"
  },
  "bugs": {
    "url": "https://github.com/noahpaige/react-blobs-bg/issues"
  },
  "homepage": "https://github.com/noahpaige/react-blobs-bg#readme"
}
```

### Phase 4: Testing & Quality Assurance (Week 4)

#### 4.1 Testing Strategy

```typescript
// src/components/AnimatedBackground/AnimatedBackground.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnimatedBackground } from './AnimatedBackground';

describe('AnimatedBackground', () => {
  const mockColorPair: [HSLColor, HSLColor] = [
    { h: 0, s: 50, l: 50 },
    { h: 180, s: 50, l: 50 }
  ];

  beforeEach(() => {
    // Mock canvas context
    HTMLCanvasElement.prototype.getContext = vi.fn(() => {
      return {
        clearRect: vi.fn(),
        fillRect: vi.fn(),
        drawImage: vi.fn(),
        createLinearGradient: vi.fn(() => ({
          addColorStop: vi.fn(),
        })),
        filter: '',
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        scale: vi.fn(),
        fill: vi.fn(),
      } as any;
    });
  });

  it('renders canvas element', () => {
    render(<AnimatedBackground colorPair={mockColorPair} />);
    const canvas = screen.getByRole('img', { hidden: true }) ||
                  document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('validates colorPair prop', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<AnimatedBackground colorPair={[] as any} />);
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('handles prop changes without restarting render loop', async () => {
    const { rerender } = render(
      <AnimatedBackground colorPair={mockColorPair} blobX={0.5} />
    );

    // Change props
    rerender(
      <AnimatedBackground colorPair={mockColorPair} blobX={0.75} />
    );

    // Component should handle prop change gracefully
    await waitFor(() => {
      expect(document.querySelector('canvas')).toBeInTheDocument();
    });
  });

  it('supports per-blob positioning arrays', () => {
    render(
      <AnimatedBackground
        colorPair={mockColorPair}
        numBlobs={3}
        blobX={[0.25, 0.5, 0.75]}
        blobY={[0.3, 0.5, 0.7]}
      />
    );
    expect(document.querySelector('canvas')).toBeInTheDocument();
  });
});
```

#### 4.2 Performance Testing

- Bundle size analysis (target: < 50KB gzipped)
- Runtime performance metrics
- Memory usage optimization
- Canvas rendering performance
- Dirty region efficiency

#### 4.3 Browser Compatibility Testing

- Chrome/Edge (Chromium)
- Firefox
- Safari
- Mobile browsers (iOS Safari, Chrome Mobile)

### Phase 5: Documentation & Examples (Week 5)

#### 5.1 README.md Structure

- Installation instructions
- Basic usage examples
- Advanced configuration
- API reference with prop tables
- Performance considerations
- Browser compatibility
- Contributing guidelines

#### 5.2 Usage Examples

**Basic Static Background:**

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

**With GSAP Animation:**

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

**With Framer Motion:**

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

**Per-Blob Control:**

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

#### 5.3 Storybook Integration

```typescript
// src/components/AnimatedBackground/AnimatedBackground.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { AnimatedBackground } from "./AnimatedBackground";

const meta: Meta<typeof AnimatedBackground> = {
  title: "Components/AnimatedBackground",
  component: AnimatedBackground,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  argTypes: {
    numBlobs: { control: { type: "range", min: 1, max: 20, step: 1 } },
    renderSize: { control: { type: "range", min: 16, max: 128, step: 8 } },
    blobX: { control: { type: "range", min: 0, max: 1, step: 0.1 } },
    blobY: { control: { type: "range", min: 0, max: 1, step: 0.1 } },
    performanceTier: {
      control: { type: "select" },
      options: ["low", "medium", "high"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    colorPair: [
      { h: 200, s: 70, l: 50 },
      { h: 300, s: 70, l: 50 },
    ],
    numBlobs: 12,
  },
};

export const Static: Story = {
  args: {
    ...Default.args,
    blobX: 0.5,
    blobY: 0.5,
    blobRotations: 0,
  },
};

export const LowPerformance: Story = {
  args: {
    ...Default.args,
    performanceTier: "low",
  },
};

export const HighPerformance: Story = {
  args: {
    ...Default.args,
    performanceTier: "high",
  },
};
```

### Phase 6: Publishing & Distribution (Week 6)

#### 6.1 Pre-publishing Checklist

- [ ] All tests pass
- [ ] Build completes without errors
- [ ] Bundle size is reasonable (< 50KB gzipped)
- [ ] Documentation is complete
- [ ] CHANGELOG.md is updated
- [ ] License is included
- [ ] README.md is comprehensive
- [ ] Examples work correctly
- [ ] TypeScript types are exported correctly
- [ ] No console errors in production build

#### 6.2 Publishing Commands

```bash
# Login to npm
npm login

# Check package contents
npm pack --dry-run

# Publish package
npm publish --access public

# Create GitHub release
git tag v1.0.0
git push origin v1.0.0
```

#### 6.3 Post-publishing Tasks

- Monitor package downloads and feedback
- Respond to issues and feature requests
- Plan future updates and improvements
- Engage with community
- Update portfolio with package showcase

## Technical Considerations

### 1. Framework Compatibility

- **React 18+**: Primary target
- **React 19**: Full compatibility
- **Next.js**: Compatible (no Next.js-specific dependencies)
- **Vite/CRA**: Standard React setup support
- **Remix**: Compatible

### 2. Bundle Size Optimization

- Tree shaking support (ES modules)
- No side effects at import time
- Named exports for better tree shaking
- Minimal dependencies (React only as peer)

### 3. Performance Features

- Hardware-adaptive quality settings
- Dirty region tracking for optimized rendering
- Path2D and gradient caching
- Frame rate limiting
- Offscreen canvas rendering

### 4. Browser Compatibility

- Modern browsers with Canvas 2D support
- WebGL detection for performance tier
- Fallback for browsers without canvas filter support
- Backdrop filter fallback for blur

## Risk Assessment & Mitigation

### 1. High Risk: HardwareCapabilityContext Dependency

**Risk**: Component depends on project-specific context
**Mitigation**: Extract detection logic into standalone utility with optional prop override

### 2. Medium Risk: Canvas Performance

**Risk**: Canvas rendering may be slow on low-end devices
**Mitigation**: Built-in hardware detection and adaptive quality settings

### 3. Medium Risk: Bundle Size

**Risk**: Canvas rendering code may increase bundle size
**Mitigation**: Optimize code, use tree shaking, minimize dependencies

### 4. Low Risk: TypeScript Configuration

**Risk**: TypeScript setup complexity
**Mitigation**: Follow established patterns from other packages

## Success Metrics

### 1. Technical Metrics

- Bundle size < 50KB gzipped
- Zero accessibility violations (canvas is decorative)
- 80%+ test coverage
- < 16ms frame time on high-end devices
- < 50ms frame time on low-end devices

### 2. User Experience Metrics

- Intuitive API design
- Comprehensive documentation
- Working examples with multiple animation libraries
- Responsive support across devices

### 3. Community Metrics

- GitHub stars and forks
- npm weekly downloads
- Positive user feedback
- Active issue resolution

## Timeline Summary

| Week | Phase         | Deliverables                                                |
| ---- | ------------- | ----------------------------------------------------------- |
| 1    | Foundation    | Package structure, dependencies, configuration              |
| 2    | Extraction    | Component refactoring, hardware detection, type definitions |
| 3    | Build System  | Rollup config, package.json, distribution setup             |
| 4    | Testing       | Unit tests, performance tests, browser compatibility        |
| 5    | Documentation | README, Storybook, examples, API docs                       |
| 6    | Publishing    | Package publication, GitHub release, community engagement   |

## Migration from Current Component

### Step-by-Step Migration Guide

1. **Extract Component**
   - Copy `animated-background2.tsx` to package
   - Remove `@/context/HardwareCapabilityContext` import
   - Replace with built-in performance detection

2. **Update Imports**
   - Replace `@/` aliases with relative imports
   - Extract all utilities to separate files
   - Update type imports

3. **Add Performance Detection**
   - Create `src/utils/performance-detection.ts`
   - Extract logic from `HardwareCapabilityContext`
   - Make it optional via props

4. **Test Extraction**
   - Verify component works standalone
   - Test with different animation libraries
   - Verify performance detection works

5. **Build & Publish**
   - Run build process
   - Test built package locally
   - Publish to npm

## Next Steps

1. **Immediate**: Create package directory and initialize Git repository
2. **Week 1**: Set up build system and development environment
3. **Week 2**: Extract and refactor AnimatedBackground2 component
4. **Week 3**: Configure build tools and package distribution
5. **Week 4**: Implement comprehensive testing suite
6. **Week 5**: Create documentation and examples
7. **Week 6**: Publish package and engage with community

## Resources & References

- [AnimatedBackground2 Component Source](../src/components/animated-background2.tsx)
- [HardwareCapabilityContext Source](../src/context/HardwareCapabilityContext.tsx)
- [Create Package Instructions](./create-package-instructions.md)
- [React Image Marquee Package Plan](./react-image-marquee-package-plan.md)
- [NPM Package Guidelines](https://docs.npmjs.com/)
- [React Component Best Practices](https://react.dev/learn)
- [Canvas API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
