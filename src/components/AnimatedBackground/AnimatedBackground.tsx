import React, {
  useEffect,
  useRef,
  useCallback,
  useState,
  useMemo,
} from "react";
import { BlobsBgProps } from "./AnimatedBackground.types";
import { BlobState, InternalBlobData, DirtyRegion } from "../../types";
import { Path2DPool, GradientCache, ColorCache } from "../../utils/caching";
import {
  calculateBlobBounds,
  mergeDirtyRegions,
} from "../../utils/dirty-regions";
import { hslToString, getGradientColors } from "../../utils/color-helpers";
import { getPerBlobValue, generateBlobs } from "../../utils/canvas-helpers";
import { detectPerformanceTier } from "../../utils/performance-detection";
import { ANIMATION_CONFIG, DEFAULT_PROPS } from "../../constants";

/**
 * AnimatedBackground - A fully prop-driven, static background component
 *
 * This component renders animated blob backgrounds. All animation must be driven
 * by changing prop values from outside the component. If props never change,
 * the background will be static.
 *
 * Features:
 * - Hardware-adaptive quality settings (auto-detected or overridden)
 * - Frame rate limiting for consistent performance
 * - Dirty region tracking for optimized rendering
 * - Path2D and gradient caching for memory efficiency
 * - Comprehensive error handling and validation
 *
 * @example
 * ```tsx
 * // Static background (no animation)
 * <AnimatedBackground
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
 * <AnimatedBackground
 *   colorPair={[...]}
 *   blobRotations={rotation}
 *   blobY={Math.sin(rotation / 100) * 0.5 + 0.5}
 * />
 * ```
 */
const AnimatedBackground = React.memo<BlobsBgProps>(
  ({
    colorPair,
    numBlobs = DEFAULT_PROPS.numBlobs,
    renderSize = DEFAULT_PROPS.renderSize,
    blobX = DEFAULT_PROPS.blobX,
    blobY = DEFAULT_PROPS.blobY,
    blobRotations,
    performanceTier: performanceTierProp,
    qualitySettings: qualitySettingsProp,
    className,
    style,
    onError,
  }) => {
    // Performance tier state (auto-detected or from prop)
    const [detectedPerformanceTier, setDetectedPerformanceTier] = useState<
      "low" | "medium" | "high" | null
    >(null);
    const [loading, setLoading] = useState(true);

    // Use prop override if provided, otherwise use detected tier
    const performanceTier =
      performanceTierProp || detectedPerformanceTier || "medium";

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

    // Auto-detect performance tier on mount (only if not provided via prop)
    useEffect(() => {
      if (performanceTierProp) {
        setLoading(false);
        return;
      }

      const detectTier = async () => {
        try {
          const tier = await detectPerformanceTier();
          setDetectedPerformanceTier(tier);
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          console.warn("Failed to detect performance tier:", err);
          if (onError) {
            onError(err);
          }
          setDetectedPerformanceTier("medium");
        } finally {
          setLoading(false);
        }
      };

      detectTier();
    }, [performanceTierProp, onError]);

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
        console.error("AnimatedBackground validation errors:", errors);
      }

      if (warnings.length > 0 && process.env.NODE_ENV === "development") {
        console.warn("AnimatedBackground validation warnings:", warnings);
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
      // If quality settings are provided via prop, use them
      if (qualitySettingsProp) {
        return {
          blobCount: qualitySettingsProp.blobCount ?? numBlobs,
          frameRate:
            qualitySettingsProp.frameRate ?? ANIMATION_CONFIG.frameRates.medium,
          blurAmount:
            qualitySettingsProp.blurAmount ??
            ANIMATION_CONFIG.blurAmounts.medium,
        };
      }

      if (loading)
        return {
          blobCount: numBlobs,
          frameRate: ANIMATION_CONFIG.frameRates.medium,
          blurAmount: ANIMATION_CONFIG.blurAmounts.medium,
        };

      switch (performanceTier) {
        case "low":
          return {
            blobCount: Math.min(ANIMATION_CONFIG.blobCount.low, numBlobs),
            frameRate: ANIMATION_CONFIG.frameRates.low,
            blurAmount: ANIMATION_CONFIG.blurAmounts.low,
          };
        case "medium":
          return {
            blobCount: Math.min(ANIMATION_CONFIG.blobCount.medium, numBlobs),
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
    }, [loading, performanceTier, numBlobs, qualitySettingsProp]);

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
          "🎨 AnimatedBackground - Quality Settings": {
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
              `🎨 AnimatedBackground FPS: ${actualFps}/${adaptiveFrameRate} target`
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
              y: blobYValue * renderHeight,
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
            const positionY = blobYValue * renderHeight;

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
          className={className}
          style={{
            position: "absolute",
            inset: 0,
            width: "100vw",
            height: "100vh",
            zIndex: -1,
            pointerEvents: "none",
            background: "#000",
            ...style,
          }}
        />
      );
    }

    return (
      <div
        className={className}
        style={{
          position: "absolute",
          inset: 0,
          width: "100vw",
          height: "100vh",
          zIndex: -1,
          pointerEvents: "none",
          ...style,
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

AnimatedBackground.displayName = "AnimatedBackground";

export default AnimatedBackground;
