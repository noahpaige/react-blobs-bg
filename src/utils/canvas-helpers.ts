import { InternalBlobData } from "../types";
import { Path2DPool } from "./caching";
import { BLOB_PATHS, ANIMATION_CONFIG } from "../constants";

/**
 * Helper function to get per-blob or shared value
 * @param value - Single value or array of values
 * @param index - Blob index
 * @param defaultValue - Default value if value is undefined
 * @returns The value for this blob
 */
export function getPerBlobValue<T>(
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
export const generateBlobs = (
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
      rotation: initialRotation,
      scale:
        ANIMATION_CONFIG.scaleRange.min +
        (1 - i / (count - 1)) *
          (ANIMATION_CONFIG.scaleRange.max - ANIMATION_CONFIG.scaleRange.min),
    });
  }
  return blobs;
};

