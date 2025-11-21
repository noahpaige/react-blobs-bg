/**
 * Performance tier type for hardware-adaptive quality settings
 */
export type PerformanceTier = "low" | "medium" | "high";

/**
 * Performance settings interface
 */
export interface PerformanceSettings {
  performanceTier?: PerformanceTier;
  blobCount?: number;
  frameRate?: number;
  blurAmount?: number;
}

