# Testing Guide

This guide shows you how to test the `@noahpaige/react-blobs-bg` package locally.

## Option 1: Using npm link (Recommended)

This allows you to test the package in another React project as if it were installed from npm.

### Step 1: Link the package

From the package directory:

```bash
npm run build
npm link
```

### Step 2: Link in your test project

From your test React project:

```bash
npm link @noahpaige/react-blobs-bg
```

### Step 3: Use in your test project

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

### Step 4: Rebuild and test

After making changes to the package:

```bash
npm run build
```

The changes will be reflected in your test project (you may need to restart your dev server).

## Option 2: Direct import from src/

You can directly import from the source files in a React app:

```tsx
// In your React app
import { AnimatedBackground } from "../react-blobs-bg/src/index";

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

## Option 3: Using the test component

Use the provided test component:

```tsx
import { TestComponent } from "./examples/test-component";

function App() {
  return <TestComponent />;
}
```

## Option 4: Test with Storybook

1. Initialize Storybook (if not already done):

```bash
npx storybook@latest init
```

2. Create a story file at `src/components/AnimatedBackground/AnimatedBackground.stories.tsx`

3. Run Storybook:

```bash
npm run storybook
```

## Quick Test Commands

```bash
# Build the package
npm run build

# Check the build output
ls dist/

# Run type checking
npx tsc --noEmit

# Lint the code
npm run lint

# Format the code
npm run format

# Run tests (when implemented)
npm run test
```

## Verifying the Build

Check that these files exist in `dist/`:

- `dist/index.js` - CommonJS bundle
- `dist/index.esm.js` - ES Module bundle
- `dist/index.d.ts` - TypeScript definitions
- `dist/index.js.map` - Source map
- `dist/index.esm.js.map` - Source map

## Testing Different Scenarios

### Static Background

```tsx
<AnimatedBackground
  colorPair={[
    { h: 200, s: 70, l: 50 },
    { h: 300, s: 70, l: 50 },
  ]}
  numBlobs={12}
  blobX={0.5}
  blobY={0.5}
  blobRotations={0}
/>
```

### Animated Background

```tsx
const [rotation, setRotation] = useState(0);

useEffect(() => {
  const interval = setInterval(() => {
    setRotation((r) => (r + 1) % 360);
  }, 16);
  return () => clearInterval(interval);
}, []);

<AnimatedBackground
  colorPair={[
    { h: 200, s: 70, l: 50 },
    { h: 300, s: 70, l: 50 },
  ]}
  blobRotations={rotation}
/>;
```

### Per-Blob Control

```tsx
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
```

### Performance Override

```tsx
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
```

## Troubleshooting

### Build errors

If you get build errors:

1. Make sure all dependencies are installed:

   ```bash
   npm install
   ```

2. Clean and rebuild:
   ```bash
   npm run clean
   npm run build
   ```

### Type errors

Check TypeScript compilation:

```bash
npx tsc --noEmit
```

### Import errors in test project

Make sure you've:

1. Built the package (`npm run build`)
2. Linked it properly (`npm link` in package, `npm link @noahpaige/react-blobs-bg` in test project)
3. Restarted your dev server

## Next Steps

After testing locally, you can:

1. Run tests (when implemented): `npm run test`
2. Build for production: `npm run build`
3. Check bundle size
4. Publish to npm: `npm publish --access public`
