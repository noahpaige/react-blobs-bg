import { PerformanceTier, PerformanceSettings } from "../types";

/**
 * Simple GPU detection fallback
 * @returns GPU tier number (1-3) or null if detection fails
 */
const detectGPUSimple = async (): Promise<number | null> => {
  if (typeof window === "undefined") return null;

  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl") ||
      (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);

    if (!gl) return null;

    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    if (!debugInfo) return null;

    const renderer = gl.getParameter(
      debugInfo.UNMASKED_RENDERER_WEBGL
    ) as string;

    // Simple heuristic based on renderer string
    if (renderer.includes("Intel") || renderer.includes("HD Graphics"))
      return 1;
    if (renderer.includes("AMD") || renderer.includes("Radeon")) return 2;
    if (renderer.includes("NVIDIA") || renderer.includes("GeForce")) return 3;
    if (
      renderer.includes("Apple") ||
      renderer.includes("M1") ||
      renderer.includes("M2") ||
      renderer.includes("M3")
    )
      return 3;

    return 2; // Default to medium
  } catch {
    return null;
  }
};

/**
 * Helper function to determine performance tier
 * @param gpuTier - GPU tier number (1-3) or null
 * @param ram - RAM in GB
 * @param cores - Number of CPU cores
 * @returns Performance tier
 */
const getPerformanceTier = (
  gpuTier: number | null,
  ram: number,
  cores: number
): PerformanceTier => {
  // Low-end devices
  if ((gpuTier !== null && gpuTier <= 1) || ram <= 4 || cores <= 2) {
    return "low";
  }

  // High-end devices
  if (gpuTier !== null && gpuTier >= 3 && ram >= 8 && cores >= 4) {
    return "high";
  }

  // Everything else is medium
  return "medium";
};

/**
 * Detects performance tier based on hardware capabilities
 * @returns Promise that resolves to the detected performance tier
 */
export const detectPerformanceTier = async (): Promise<PerformanceTier> => {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return "medium";
  }

  try {
    // @ts-expect-error: deviceMemory is not in the TS DOM typings yet
    const ram = navigator.deviceMemory || 2;
    const cores = navigator.hardwareConcurrency || 2;
    const gpuTier = await detectGPUSimple();
    const performanceTier = getPerformanceTier(gpuTier, ram, cores);

    if (process.env.NODE_ENV === "development") {
      console.table({
        "🔧 Performance Detection": {
          gpuTier: gpuTier !== null ? gpuTier : "unknown",
          ram: `${ram}GB`,
          cores,
          performanceTier,
        },
      });
    }

    return performanceTier;
  } catch (error) {
    console.warn("Failed to detect hardware capabilities:", error);
    return "medium"; // Fallback to medium tier
  }
};

/**
 * Gets performance settings based on tier
 * @param performanceTier - Performance tier
 * @param numBlobs - Default number of blobs
 * @returns Performance settings object
 */
export const getPerformanceSettings = (
  performanceTier: PerformanceTier,
  numBlobs: number
): PerformanceSettings => {
  // Import ANIMATION_CONFIG dynamically to avoid circular dependencies
  // We'll import it in the component instead
  return {
    performanceTier,
    blobCount: numBlobs,
    frameRate: performanceTier === "low" ? 20 : performanceTier === "medium" ? 30 : 60,
    blurAmount: performanceTier === "low" ? 2 : performanceTier === "medium" ? 3 : 4,
  };
};

