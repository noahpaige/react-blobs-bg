"use client";

import React, {
  useEffect,
  useRef,
  useCallback,
  useState,
  useMemo,
} from "react";
import { useHardwareCapability } from "@/context/HardwareCapabilityContext";

// Export HSLColor type for use in other components
export type HSLColor = {
  /** Hue value (0-360 degrees) */
  h: number;
  /** Saturation percentage (0-100) */
  s: number;
  /** Lightness percentage (0-100) */
  l: number;
};

// Configuration objects for better maintainability and performance tuning
const ANIMATION_CONFIG = {
  // Blob generation
  blobCount: {
    default: 12,
    low: 6,
    medium: 9,
    high: 12,
  },

  // Rendering quality
  renderSize: 32,
  frameRates: {
    low: 20,
    medium: 30,
    high: 60,
  },

  // Blur effects
  blurAmounts: {
    low: 2,
    medium: 3,
    high: 4,
  },

  // Timing
  resizeDebounceDelayMs: 100,

  scaleRange: {
    min: 0.2,
    max: 1.7,
  },

  // Dirty region tracking thresholds
  dirtyRegion: {
    padding: 10, // Extra padding for smooth transitions
    blobSizeMultiplier: 50, // Multiplier for approximate blob size calculation
    minBlobSize: 20, // Minimum blob size in pixels
    rotationThresholdDegrees: 5, // Rotation change threshold for dirty region detection
    positionThresholdPixels: 2, // Position change threshold for dirty region detection
  },

  // Rendering constants
  rendering: {
    yPositionDivisor: 8, // Divisor for Y position calculation
    gradientPositionDivisor: 8, // Divisor for gradient position calculation
  },
} as const;

const DEFAULT_PROPS = {
  numBlobs: ANIMATION_CONFIG.blobCount.default,
  renderSize: ANIMATION_CONFIG.renderSize,
  blobX: 0.5, // Normalized X position (0-1), can be outside for off-screen, 0.5 = center
  blobY: 0.5, // Normalized Y position (0-1), 0.5 = center
} as const;

interface AnimatedBackground2Props {
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
}

/**
 * Types for dirty region tracking optimization
 */

/**
 * Represents the state of a blob for change detection
 */
interface BlobState {
  /** Current position of the blob on canvas */
  position: { x: number; y: number };
  /** Current rotation angle in degrees */
  rotation: number;
  /** Current scale factor */
  scale: number;
}

/**
 * Represents a rectangular region that needs to be redrawn
 */
interface DirtyRegion {
  /** X coordinate of the region */
  x: number;
  /** Y coordinate of the region */
  y: number;
  /** Width of the region */
  width: number;
  /** Height of the region */
  height: number;
}

/**
 * Internal blob data structure (simplified from BlobData)
 */
interface InternalBlobData {
  path: Path2D;
  rotation: number; // Just a number, not an object
  scale: number;
}

const BLOB_PATHS = [
  "M25.7,-30.2C32.4,-25.1,36.2,-16.1,38.3,-6.4C40.3,3.2,40.6,13.4,36.8,22.3C32.9,31.3,25,39,15.5,42.2C6.1,45.4,-4.8,44.2,-13.5,39.8C-22.3,35.5,-29,28,-33.3,19.7C-37.6,11.3,-39.6,2,-38.7,-7.5C-37.8,-17,-34.1,-26.6,-27.2,-31.7C-20.3,-36.7,-10.1,-37.3,-0.3,-36.9C9.5,-36.6,19.1,-35.3,25.7,-30.2Z",
  "M22.4,-27.2C29.7,-20.7,36.6,-14.2,37.9,-6.7C39.1,0.7,34.7,9.1,29.7,16.4C24.6,23.8,18.9,30,11.9,32.5C4.9,35,-3.5,33.7,-11.7,31.1C-19.9,28.5,-28,24.7,-33.6,17.9C-39.2,11.2,-42.3,1.6,-40.4,-6.8C-38.5,-15.2,-31.6,-22.3,-24.1,-28.8C-16.5,-35.3,-8.2,-41.1,-0.3,-40.7C7.6,-40.3,15.2,-33.8,22.4,-27.2Z",
  "M23.1,-27.4C28.5,-23,30.4,-14.4,31,-6.1C31.6,2.1,31.1,9.8,27.6,16C24.1,22.1,17.7,26.5,10,30.9C2.3,35.2,-6.8,39.3,-14.7,37.6C-22.7,36,-29.5,28.5,-33.2,20.1C-36.9,11.8,-37.5,2.5,-36.1,-6.6C-34.8,-15.8,-31.7,-24.9,-25.3,-29.1C-19,-33.3,-9.5,-32.6,-0.3,-32.3C8.9,-31.9,17.7,-31.8,23.1,-27.4Z",
] as const;

/**
 * Path2D object pool for better memory management and performance
 * Reuses Path2D objects instead of creating new ones for each blob
 */
class Path2DPool {
  private pool = new Map<string, Path2D>();

  /**
   * Gets a Path2D object from the pool, creating it if it doesn't exist
   * @param rawPath - SVG path string
   * @returns Path2D object
   */
  getPath(rawPath: string): Path2D {
    if (!this.pool.has(rawPath)) {
      this.pool.set(rawPath, new Path2D(rawPath));
    }
    return this.pool.get(rawPath)!;
  }

  /**
   * Clears all cached Path2D objects to prevent memory leaks
   */
  clear(): void {
    this.pool.clear();
  }
}

/**
 * Calculates the bounding box for a blob including padding for smooth transitions
 * @param blob - Blob data containing scale information
 * @param position - Current position of the blob
 * @param scale - Additional scale factor
 * @param canvasWidth - Width of the canvas to clamp bounds to
 * @param canvasHeight - Height of the canvas to clamp bounds to
 * @returns DirtyRegion representing the area the blob occupies
 */
const calculateBlobBounds = (
  blob: InternalBlobData,
  position: { x: number; y: number },
  scale: number,
  canvasWidth: number,
  canvasHeight: number
): DirtyRegion => {
  const padding = ANIMATION_CONFIG.dirtyRegion.padding;
  const size = Math.max(
    blob.scale * scale * ANIMATION_CONFIG.dirtyRegion.blobSizeMultiplier,
    ANIMATION_CONFIG.dirtyRegion.minBlobSize
  );
  const totalSize = size * 2 + padding * 2;

  const x = Math.max(0, position.x - size - padding);
  const y = Math.max(0, position.y - size - padding);

  return {
    x,
    y,
    width: Math.min(totalSize, canvasWidth - x),
    height: Math.min(totalSize, canvasHeight - y),
  };
};

/**
 * Merges overlapping dirty regions to minimize the number of clear operations
 * @param regions - Array of dirty regions to merge
 * @returns Array of merged regions with reduced overlap
 */
const mergeDirtyRegions = (regions: DirtyRegion[]): DirtyRegion[] => {
  if (regions.length <= 1) return regions;

  // Simple merging: if regions overlap significantly, combine them
  const merged: DirtyRegion[] = [];

  for (const region of regions) {
    let mergedWithExisting = false;

    for (let i = 0; i < merged.length; i++) {
      const existing = merged[i];
      const overlapX = Math.max(
        0,
        Math.min(region.x + region.width, existing.x + existing.width) -
          Math.max(region.x, existing.x)
      );
      const overlapY = Math.max(
        0,
        Math.min(region.y + region.height, existing.y + existing.height) -
          Math.max(region.y, existing.y)
      );
      const overlapArea = overlapX * overlapY;
      const regionArea = region.width * region.height;
      const existingArea = existing.width * existing.height;

      // If overlap is more than 50% of either region, merge them
      if (overlapArea > regionArea * 0.5 || overlapArea > existingArea * 0.5) {
        merged[i] = {
          x: Math.min(region.x, existing.x),
          y: Math.min(region.y, existing.y),
          width:
            Math.max(region.x + region.width, existing.x + existing.width) -
            Math.min(region.x, existing.x),
          height:
            Math.max(region.y + region.height, existing.y + existing.height) -
            Math.min(region.y, existing.y),
        };
        mergedWithExisting = true;
        break;
      }
    }

    if (!mergedWithExisting) {
      merged.push(region);
    }
  }

  return merged;
};

/**
 * Gradient cache for better performance
 * Reuses CanvasGradient objects instead of creating new ones for each frame
 */
class GradientCache {
  private cache = new Map<string, CanvasGradient>();
  private canvas: HTMLCanvasElement | null = null;

  /**
   * Sets the canvas context and clears the cache
   * @param canvas - HTMLCanvasElement to use for gradient creation
   */
  setCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.clear(); // Clear cache when canvas changes
  }

  /**
   * Gets a gradient from the cache, creating it if it doesn't exist
   * @param key - Unique key for the gradient
   * @param createFn - Function to create the gradient if not cached
   * @returns CanvasGradient object
   */
  getGradient(key: string, createFn: () => CanvasGradient): CanvasGradient {
    if (!this.cache.has(key)) {
      this.cache.set(key, createFn());
    }
    return this.cache.get(key)!;
  }

  /**
   * Clears all cached gradients to prevent memory leaks
   */
  clear(): void {
    this.cache.clear();
  }
}

/**
 * Color string cache for better performance
 * Avoids repeated HSL string conversions during rendering
 */
class ColorCache {
  private cache = new Map<string, string>();

  /**
   * Gets a color string from cache, creating it if it doesn't exist
   * @param key - Cache key (HSL values)
   * @param createFn - Function to create the color string if not cached
   * @returns Color string
   */
  getColor(key: string, createFn: () => string): string {
    if (!this.cache.has(key)) {
      this.cache.set(key, createFn());
    }
    return this.cache.get(key)!;
  }

  /**
   * Clears all cached colors to prevent memory leaks
   */
  clear(): void {
    this.cache.clear();
  }
}

/**
 * Converts HSL color object to CSS string format with caching
 * @param hsl - HSL color object
 * @param colorCache - Instance of ColorCache to use for caching
 * @returns CSS HSL string (e.g., "hsl(180, 50%, 50%)")
 */
const hslToString = (hsl: HSLColor, colorCache: ColorCache): string => {
  const key = `${hsl.h},${hsl.s},${hsl.l}`;
  return colorCache.getColor(key, () => `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`);
};

/**
 * Converts colorPair to gradient colors
 * @param colorPair - Array of two HSL colors
 * @param colorCache - Instance of ColorCache to use for caching
 * @returns Object with gradient color strings
 */
const getGradientColors = (
  colorPair: [HSLColor, HSLColor],
  colorCache: ColorCache
): { a: string; b: string } => {
  return {
    a: hslToString(colorPair[0], colorCache),
    b: hslToString(colorPair[1], colorCache),
  };
};

/**
 * Helper function to get per-blob or shared value
 * @param value - Single value or array of values
 * @param index - Blob index
 * @param defaultValue - Default value if value is undefined
 * @param totalBlobs - Total number of blobs
 * @returns The value for this blob
 */
function getPerBlobValue<T>(
  value: T | T[] | undefined,
  index: number,
  defaultValue: T
): T {
  if (value === undefined) return defaultValue;
  if (Array.isArray(value)) {
    return value[index] ?? defaultValue;
  }
  return value;
}

/**
 * Generates blob data with paths and initial properties
 * @param count - Number of blobs to generate
 * @param path2DPool - Path2D pool for reusing paths
 * @param initialRotations - Optional initial rotations (single or per-blob)
 * @returns Array of InternalBlobData objects ready for rendering
 */
const generateBlobs = (
  count: number,
  path2DPool: Path2DPool,
  initialRotations?: number | number[]
): InternalBlobData[] => {
  const blobs: InternalBlobData[] = [];

  for (let i = 0; i < count; i++) {
    const rawPath = BLOB_PATHS[Math.floor(Math.random() * BLOB_PATHS.length)];
    const path2D = path2DPool.getPath(rawPath);

    // Get initial rotation (or use random)
    const initialRotation = getPerBlobValue(
      initialRotations,
      i,
      Math.random() * 360
    );

    blobs.push({
      path: path2D,
      rotation: initialRotation, // Just a number, not an object
      scale:
        ANIMATION_CONFIG.scaleRange.min +
        (1 - i / (count - 1)) *
          (ANIMATION_CONFIG.scaleRange.max - ANIMATION_CONFIG.scaleRange.min),
    });
  }
  return blobs;
};

/**
 * AnimatedBackground2 - A fully prop-driven, static background component
 *
 * This component renders animated blob backgrounds. All animation must be driven
 * by changing prop values from outside the component. If props never change,
 * the background will be static.
 *
 * Features:
 * - Hardware-adaptive quality settings
 * - Frame rate limiting for consistent performance
 * - Dirty region tracking for optimized rendering
 * - Path2D and gradient caching for memory efficiency
 * - Comprehensive error handling and validation
 *
 * @example
 * ```tsx
 * // Static background (no animation)
 * <AnimatedBackground2
 *   colorPair={[{ h: 0, s: 50, l: 50 }, { h: 180, s: 50, l: 50 }]}
 *   numBlobs={12}
 * />
 *
 * // Animated externally
 * const [rotation, setRotation] = useState(0);
 * useEffect(() => {
 *   const interval = setInterval(() => setRotation(r => r + 1), 16);
 *   return () => clearInterval(interval);
 * }, []);
 * <AnimatedBackground2
 *   colorPair={[...]}
 *   blobRotations={rotation}
 *   blobY={Math.sin(rotation / 100) * 0.5 + 0.5}
 * />
 * ```
 */
const AnimatedBackground2 = React.memo<AnimatedBackground2Props>(
  ({
    colorPair,
    numBlobs = DEFAULT_PROPS.numBlobs,
    renderSize = DEFAULT_PROPS.renderSize,
    blobX = DEFAULT_PROPS.blobX,
    blobY = DEFAULT_PROPS.blobY,
    blobRotations,
  }) => {
    const { performanceTier, loading } = useHardwareCapability();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const blobs = useRef<InternalBlobData[]>([]);

    // Color storage (separate from blob data to avoid regeneration)
    const blobColorsRef = useRef<{ a: string; b: string }>({ a: "", b: "" });

    const lastFrameTime = useRef(performance.now());
    const frameCount = useRef(0);
    const lastFpsUpdate = useRef(performance.now());
    const [canvasBlurSupported, setCanvasBlurSupported] = useState(true);

    // Dirty region tracking state
    const previousBlobStates = useRef<BlobState[]>([]);
    const isFirstFrame = useRef(true);

    // Store current prop values in refs so render loop doesn't restart when props change
    const blobXRef = useRef(blobX);
    const blobYRef = useRef(blobY);
    const blobRotationsRef = useRef(blobRotations);

    // Update refs when props change (without restarting render loop)
    useEffect(() => {
      blobXRef.current = blobX;
    }, [blobX]);
    useEffect(() => {
      blobYRef.current = blobY;
    }, [blobY]);
    useEffect(() => {
      blobRotationsRef.current = blobRotations;
    }, [blobRotations]);

    // Debounced resize handler
    const debouncedResize = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Instance-based caches for better multi-instance support
    const path2DPoolRef = useRef<Path2DPool | null>(null);
    const gradientCacheRef = useRef<GradientCache | null>(null);
    const colorCacheRef = useRef<ColorCache | null>(null);

    // Lazy initialization of caches
    if (!path2DPoolRef.current) {
      path2DPoolRef.current = new Path2DPool();
    }
    if (!gradientCacheRef.current) {
      gradientCacheRef.current = new GradientCache();
    }
    if (!colorCacheRef.current) {
      colorCacheRef.current = new ColorCache();
    }

    const path2DPool = path2DPoolRef.current;
    const colorCache = colorCacheRef.current;

    /**
     * Validates component props and logs warnings for invalid values
     * Memoized to prevent re-running validation on every render
     */
    const validationResult = useMemo(() => {
      const errors: string[] = [];
      const warnings: string[] = [];

      // Critical errors that could cause crashes
      if (!colorPair || !Array.isArray(colorPair) || colorPair.length !== 2) {
        errors.push("colorPair must be an array with exactly 2 HSL colors");
      } else {
        // Validate color structure
        colorPair.forEach((color, colorIndex) => {
          if (
            !color ||
            typeof color.h !== "number" ||
            typeof color.s !== "number" ||
            typeof color.l !== "number"
          ) {
            errors.push(
              `colorPair[${colorIndex}] must be a valid HSL color object`
            );
          }
        });
      }

      // Validate array lengths if provided as arrays
      if (Array.isArray(blobX) && blobX.length !== numBlobs) {
        warnings.push(
          `blobX array length (${blobX.length}) should match numBlobs (${numBlobs})`
        );
      }
      if (Array.isArray(blobY) && blobY.length !== numBlobs) {
        warnings.push(
          `blobY array length (${blobY.length}) should match numBlobs (${numBlobs})`
        );
      }
      if (Array.isArray(blobRotations) && blobRotations.length !== numBlobs) {
        warnings.push(
          `blobRotations array length (${blobRotations.length}) should match numBlobs (${numBlobs})`
        );
      }

      // Performance warnings
      if (numBlobs < 1 || numBlobs > 50) {
        warnings.push(
          "numBlobs should be between 1 and 50 for optimal performance"
        );
      }

      if (renderSize < 16 || renderSize > 128) {
        warnings.push(
          "renderSize should be between 16 and 128 for optimal quality"
        );
      }

      // Log errors (always) and warnings (development only)
      if (errors.length > 0) {
        console.error("AnimatedBackground2 validation errors:", errors);
      }

      if (warnings.length > 0 && process.env.NODE_ENV === "development") {
        console.warn("AnimatedBackground2 validation warnings:", warnings);
      }

      return { errors, warnings };
    }, [colorPair, numBlobs, renderSize, blobX, blobY, blobRotations]);

    const { errors } = validationResult;

    const handleResize = useCallback(() => {
      if (debouncedResize.current) {
        clearTimeout(debouncedResize.current);
      }
      debouncedResize.current = setTimeout(() => {
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
        }
      }, ANIMATION_CONFIG.resizeDebounceDelayMs);
    }, []);

    /**
     * Adjusts quality settings based on device performance capabilities
     */
    const qualitySettings = useMemo(() => {
      if (loading)
        return {
          blobCount: numBlobs,
          frameRate: ANIMATION_CONFIG.frameRates.medium,
          blurAmount: ANIMATION_CONFIG.blurAmounts.medium,
        };

      switch (performanceTier) {
        case "low":
          return {
            blobCount: ANIMATION_CONFIG.blobCount.low,
            frameRate: ANIMATION_CONFIG.frameRates.low,
            blurAmount: ANIMATION_CONFIG.blurAmounts.low,
          };
        case "medium":
          return {
            blobCount: ANIMATION_CONFIG.blobCount.medium,
            frameRate: ANIMATION_CONFIG.frameRates.medium,
            blurAmount: ANIMATION_CONFIG.blurAmounts.medium,
          };
        case "high":
          return {
            blobCount: numBlobs,
            frameRate: ANIMATION_CONFIG.frameRates.high,
            blurAmount: ANIMATION_CONFIG.blurAmounts.high,
          };
        default:
          return {
            blobCount: numBlobs,
            frameRate: ANIMATION_CONFIG.frameRates.medium,
            blurAmount: ANIMATION_CONFIG.blurAmounts.medium,
          };
      }
    }, [loading, performanceTier, numBlobs]);

    // Adaptive frame rate adjustment
    const [adaptiveFrameRate, setAdaptiveFrameRate] = useState(
      qualitySettings.frameRate
    );

    useEffect(() => {
      setAdaptiveFrameRate(qualitySettings.frameRate);
    }, [qualitySettings.frameRate]);

    // Performance monitoring (development only)
    useEffect(() => {
      if (process.env.NODE_ENV !== "development") return;

      const performanceCheckInterval = setInterval(() => {
        console.log(
          `🎨 Performance Check: Current frame rate target: ${adaptiveFrameRate}fps`
        );
      }, 5000);

      return (): void => clearInterval(performanceCheckInterval);
    }, [adaptiveFrameRate]);

    // Log hardware detection and quality settings
    useEffect(() => {
      if (!loading) {
        console.table({
          "🎨 AnimatedBackground2 - Hardware Detection": {
            performanceTier,
            blobCount: qualitySettings.blobCount,
            frameRate: `${qualitySettings.frameRate}fps${
              qualitySettings.frameRate === 60 ? " (High Performance)" : ""
            }`,
            blurAmount: qualitySettings.blurAmount,
          },
        });
      }
    }, [performanceTier, loading, qualitySettings]);

    // Initialize blobs with appropriate count (only when count changes)
    // Note: blobRotations is NOT in dependencies - we don't want to regenerate
    // blobs when rotations change, only update them in the render loop
    useEffect(() => {
      if (!path2DPool) return;
      // Use undefined for initial rotations - blobs will use random initial rotations
      // and then be updated by props in the render loop
      blobs.current = generateBlobs(
        qualitySettings.blobCount,
        path2DPool,
        undefined
      );

      // Reset dirty region tracking state when blobs regenerate
      previousBlobStates.current = [];
      isFirstFrame.current = true;
    }, [qualitySettings.blobCount, path2DPool]);

    // Initialize/update colors when colorPair changes (without regenerating blobs)
    useEffect(() => {
      if (!colorCache) return;
      blobColorsRef.current = getGradientColors(colorPair, colorCache);
      // Force redraw on next frame
      isFirstFrame.current = true;
    }, [colorPair, colorCache]);

    // Feature detection for canvas filter: blur support
    useEffect(() => {
      if (typeof window === "undefined") return;
      try {
        const testCanvas = document.createElement("canvas");
        testCanvas.width = testCanvas.height = 8;
        const ctx = testCanvas.getContext("2d");
        if (!ctx || typeof ctx.filter === "undefined") {
          setCanvasBlurSupported(false);
          return;
        }
        ctx.filter = "blur(2px)";
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, 8, 8);
        if (ctx.filter === "none" || ctx.filter === "") {
          setCanvasBlurSupported(false);
          return;
        }
        setCanvasBlurSupported(true);
      } catch {
        setCanvasBlurSupported(false);
      }
    }, []);

    useEffect(() => {
      // Validate canvas and context availability
      const canvas = canvasRef.current;
      if (!canvas) {
        console.error("Canvas ref not available");
        return;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        console.error("2D context not supported");
        return;
      }

      const offscreen = document.createElement("canvas");
      const offCtx = offscreen.getContext("2d");
      if (!offCtx) {
        console.error("Offscreen 2D context not supported");
        return;
      }

      // Set up gradient cache for offscreen canvas
      if (gradientCacheRef.current) {
        gradientCacheRef.current.setCanvas(offscreen);
      }

      // Set target resolution for offscreen rendering
      const renderWidth = renderSize;
      const renderHeight = renderSize;

      offscreen.width = renderWidth;
      offscreen.height = renderHeight;

      window.addEventListener("resize", handleResize);
      handleResize(); // Initial setup

      const render = (currentTime: number): void => {
        // Frame rate limiting based on adaptive quality settings
        const targetFrameTime = 1000 / adaptiveFrameRate;
        const timeSinceLastFrame = currentTime - lastFrameTime.current;

        if (timeSinceLastFrame < targetFrameTime) {
          requestAnimationFrame(render);
          return;
        }

        lastFrameTime.current = currentTime;

        // Track frame rate for performance monitoring
        frameCount.current++;
        const timeSinceFpsUpdate = currentTime - lastFpsUpdate.current;
        if (timeSinceFpsUpdate >= 1000) {
          const actualFps = Math.round(
            (frameCount.current * 1000) / timeSinceFpsUpdate
          );
          if (process.env.NODE_ENV === "development") {
            console.log(
              `🎨 AnimatedBackground2 FPS: ${actualFps}/${adaptiveFrameRate} target`
            );
          }
          frameCount.current = 0;
          lastFpsUpdate.current = currentTime;
        }

        // Calculate current blob states for dirty region tracking
        const currentBlobStates: BlobState[] = [];
        const dirtyRegions: DirtyRegion[] = [];

        // Determine which regions need to be redrawn
        if (!isFirstFrame.current) {
          for (let i = 0; i < blobs.current.length; i++) {
            const blob = blobs.current[i];
            const prevState = previousBlobStates.current[i];

            // Get per-blob values from refs (to avoid restarting render loop on prop changes)
            const blobXValue = getPerBlobValue(blobXRef.current, i, 0.5);
            const blobYValue = getPerBlobValue(blobYRef.current, i, 0.5);
            const blobRotationValue = getPerBlobValue(
              blobRotationsRef.current,
              i,
              blob.rotation
            );

            // Update blob rotation from prop
            blob.rotation = blobRotationValue;

            // Calculate current blob position
            const currentPosition = {
              x: blobXValue * renderWidth,
              y: blobYValue * renderHeight, // Remove divisor to use full Y range
            };

            const currentState: BlobState = {
              position: currentPosition,
              rotation: blob.rotation,
              scale: blob.scale,
            };

            currentBlobStates.push(currentState);

            // Check if blob has changed significantly
            if (prevState) {
              const rotationChanged =
                Math.abs(currentState.rotation - prevState.rotation) >
                ANIMATION_CONFIG.dirtyRegion.rotationThresholdDegrees;
              const positionChanged =
                Math.abs(currentState.position.x - prevState.position.x) >
                  ANIMATION_CONFIG.dirtyRegion.positionThresholdPixels ||
                Math.abs(currentState.position.y - prevState.position.y) >
                  ANIMATION_CONFIG.dirtyRegion.positionThresholdPixels;

              if (rotationChanged || positionChanged) {
                dirtyRegions.push(
                  calculateBlobBounds(
                    blob,
                    prevState.position,
                    prevState.scale,
                    renderWidth,
                    renderHeight
                  )
                );
                dirtyRegions.push(
                  calculateBlobBounds(
                    blob,
                    currentState.position,
                    currentState.scale,
                    renderWidth,
                    renderHeight
                  )
                );
              }
            }
          }
        } else {
          // First frame: redraw everything
          isFirstFrame.current = false;
          offCtx.clearRect(0, 0, renderWidth, renderHeight);
        }

        // Clear only dirty regions (or entire canvas on first frame)
        if (dirtyRegions.length > 0) {
          const mergedRegions = mergeDirtyRegions(dirtyRegions);
          mergedRegions.forEach((region) => {
            offCtx.clearRect(region.x, region.y, region.width, region.height);
          });

          // Log dirty region performance in development
          if (
            process.env.NODE_ENV === "development" &&
            frameCount.current % 60 === 0
          ) {
            const totalCanvasArea = renderWidth * renderHeight;
            const dirtyArea = mergedRegions.reduce(
              (sum, region) => sum + region.width * region.height,
              0
            );
            const efficiency = (
              ((totalCanvasArea - dirtyArea) / totalCanvasArea) *
              100
            ).toFixed(1);
            console.log(
              `🎨 Dirty Regions: ${mergedRegions.length} regions, ${efficiency}% efficiency`
            );
          }
        }

        // Batch canvas operations for better performance
        offCtx.save();

        // Get colors from ref (not from blob data)
        const colors = blobColorsRef.current;

        // Set global blur filter
        if (canvasBlurSupported) {
          offCtx.filter = `blur(${qualitySettings.blurAmount}px)`;
        } else {
          offCtx.filter = "none";
        }

        // Pre-calculate all blob transformations and prepare rendering data
        const blobRenderData: Array<{
          blob: InternalBlobData;
          rotation: number;
          gradient: CanvasGradient;
          transform: {
            rotation: number;
            scale: number;
          };
          position: { x: number; y: number };
        }> = [];

        for (let i = 0; i < blobs.current.length; i++) {
          const blob = blobs.current[i];
          try {
            // Get per-blob values from refs (to avoid restarting render loop on prop changes)
            const blobXValue = getPerBlobValue(blobXRef.current, i, 0.5);
            const blobYValue = getPerBlobValue(blobYRef.current, i, 0.5);
            const blobRotationValue = getPerBlobValue(
              blobRotationsRef.current,
              i,
              blob.rotation
            );

            // Update blob rotation
            blob.rotation = blobRotationValue;

            // Calculate absolute position
            const positionX = blobXValue * renderWidth;
            const positionY = blobYValue * renderHeight; // Remove divisor to use full Y range

            // Create gradient cache key
            const gradientKey = `${colors.a}-${colors.b}-${renderSize}`;

            const grad = gradientCacheRef.current?.getGradient(
              gradientKey,
              () => {
                const gradient = offCtx.createLinearGradient(
                  -(renderSize / 2),
                  renderSize / 2,
                  renderSize /
                    ANIMATION_CONFIG.rendering.gradientPositionDivisor,
                  -(
                    renderSize /
                    ANIMATION_CONFIG.rendering.gradientPositionDivisor
                  )
                );
                gradient.addColorStop(0, colors.a);
                gradient.addColorStop(1, colors.b);
                return gradient;
              }
            );

            if (!grad) continue;

            blobRenderData.push({
              blob,
              rotation: blobRotationValue,
              gradient: grad,
              transform: {
                rotation: (blobRotationValue * Math.PI) / 180,
                scale: blob.scale,
              },
              position: { x: positionX, y: positionY },
            });
          } catch (error) {
            console.error("Error preparing blob data:", error);
          }
        }

        // Batch render all blobs with minimal context state changes
        const renderStartTime = performance.now();
        for (const renderData of blobRenderData) {
          offCtx.save();
          offCtx.translate(renderData.position.x, renderData.position.y);
          offCtx.rotate(renderData.transform.rotation);
          offCtx.scale(renderData.transform.scale, renderData.transform.scale);
          offCtx.fillStyle = renderData.gradient;
          offCtx.fill(renderData.blob.path);
          offCtx.restore();
        }
        const renderEndTime = performance.now();

        // Log batch rendering performance in development
        if (
          process.env.NODE_ENV === "development" &&
          frameCount.current % 120 === 0
        ) {
          const renderTime = renderEndTime - renderStartTime;
          console.log(
            `🎨 Batch Rendering: ${
              blobRenderData.length
            } blobs in ${renderTime.toFixed(2)}ms`
          );
        }

        offCtx.restore();

        // Update previous blob states for next frame
        if (currentBlobStates.length > 0) {
          previousBlobStates.current = currentBlobStates;
        }

        // Batch main canvas operations
        const mainCanvasStartTime = performance.now();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(offscreen, 0, 0, canvas.width, canvas.height);
        const mainCanvasEndTime = performance.now();

        // Log main canvas performance in development
        if (
          process.env.NODE_ENV === "development" &&
          frameCount.current % 120 === 0
        ) {
          const mainCanvasTime = mainCanvasEndTime - mainCanvasStartTime;
          console.log(`🎨 Main Canvas: ${mainCanvasTime.toFixed(2)}ms`);
        }

        requestAnimationFrame(render);
      };

      render(performance.now());
      return (): void => {
        window.removeEventListener("resize", handleResize);
        if (debouncedResize.current) {
          clearTimeout(debouncedResize.current);
        }
        // Clean up instance-based caches to prevent memory leaks
        if (path2DPoolRef.current) {
          path2DPoolRef.current.clear();
        }
        if (gradientCacheRef.current) {
          gradientCacheRef.current.clear();
        }
        if (colorCacheRef.current) {
          colorCacheRef.current.clear();
        }
      };
    }, [
      qualitySettings,
      adaptiveFrameRate,
      canvasBlurSupported,
      handleResize,
      renderSize,
      // Note: blobX, blobY, blobRotations are NOT in dependencies
      // They are stored in refs and read directly in the render loop
      // This prevents the render loop from restarting when props change
    ]);

    // Don't render if there are critical validation errors
    if (errors.length > 0) {
      return (
        <div
          style={{
            position: "absolute",
            inset: 0,
            width: "100vw",
            height: "100vh",
            zIndex: -1,
            pointerEvents: "none",
            background: "#000",
          }}
        />
      );
    }

    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          width: "100vw",
          height: "100vh",
          zIndex: -1,
          pointerEvents: "none",
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            width: "100vw",
            height: "100vh",
            display: "block",
            background: blobColorsRef.current.b || "#000",
          }}
        />
        {!canvasBlurSupported && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              width: "100vw",
              height: "100vh",
              pointerEvents: "none",
              zIndex: 1,
              backdropFilter: `blur(${qualitySettings.blurAmount * 10}px)`,
              WebkitBackdropFilter: `blur(${
                qualitySettings.blurAmount * 20
              }px)`,
              background: "transparent",
              transition: "backdrop-filter 0.3s",
            }}
          />
        )}
      </div>
    );
  }
);

AnimatedBackground2.displayName = "AnimatedBackground2";

export default AnimatedBackground2;
