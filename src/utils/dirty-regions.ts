import { DirtyRegion, InternalBlobData } from "../types";
import { ANIMATION_CONFIG } from "../constants";

/**
 * Calculates the bounding box for a blob including padding for smooth transitions
 * @param blob - Blob data containing scale information
 * @param position - Current position of the blob
 * @param scale - Additional scale factor
 * @param canvasWidth - Width of the canvas to clamp bounds to
 * @param canvasHeight - Height of the canvas to clamp bounds to
 * @returns DirtyRegion representing the area the blob occupies
 */
export const calculateBlobBounds = (
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
export const mergeDirtyRegions = (regions: DirtyRegion[]): DirtyRegion[] => {
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

