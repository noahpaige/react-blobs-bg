/**
 * Represents the state of a blob for change detection
 */
export interface BlobState {
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
export interface DirtyRegion {
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
 * Internal blob data structure
 */
export interface InternalBlobData {
  path: Path2D;
  rotation: number;
  scale: number;
}

export * from "./colors";
export * from "./performance";

