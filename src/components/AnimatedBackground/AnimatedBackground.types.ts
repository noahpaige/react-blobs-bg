import { HSLColor, PerformanceTier } from "../../types";

/**
 * Props for AnimatedBackground component
 */
export interface AnimatedBackgroundProps {
  /** Single color pair for blob gradients */
  colorPair: [HSLColor, HSLColor];

  // Rendering configuration
  /** Number of blobs to render. Default: 12 */
  numBlobs?: number;
  /** Render size for offscreen canvas. Default: 32 */
  renderSize?: number;

  /** Normalized X position for blobs. Single number applies to all, array for per-blob positioning. 0 = left edge, 0.5 = center, 1 = right edge. Values outside 0-1 position blobs off-screen. Default: 0.5 */
  blobX?: number | number[];
  /** Normalized Y position for blobs. Single number applies to all, array for per-blob positioning. 0 = top, 0.5 = center, 1 = bottom. Default: 0.5 */
  blobY?: number | number[];
  /** Rotation angles in degrees. Single number applies to all, array for per-blob rotations. Default: random initial rotation */
  blobRotations?: number | number[];

  // Performance settings (optional - will use built-in detection if not provided)
  /** Performance tier override. If not provided, will auto-detect. */
  performanceTier?: PerformanceTier;
  /** Quality settings override */
  qualitySettings?: {
    blobCount?: number;
    frameRate?: number;
    blurAmount?: number;
  };

  // Advanced configuration
  /** CSS className for the container */
  className?: string;
  /** Inline styles for the container */
  style?: React.CSSProperties;
  /** Error callback */
  onError?: (error: Error) => void;
}

