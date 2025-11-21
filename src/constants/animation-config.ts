/**
 * Configuration objects for animation, performance tuning, and rendering
 */
export const ANIMATION_CONFIG = {
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

export const DEFAULT_PROPS = {
  numBlobs: ANIMATION_CONFIG.blobCount.default,
  renderSize: ANIMATION_CONFIG.renderSize,
  blobX: 0.5, // Normalized X position (0-1), can be outside for off-screen, 0.5 = center
  blobY: 0.5, // Normalized Y position (0-1), 0.5 = center
} as const;

