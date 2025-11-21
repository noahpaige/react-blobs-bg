import { HSLColor } from "../types";
import { ColorCache } from "./caching";

/**
 * Converts HSL color object to CSS string format with caching
 * @param hsl - HSL color object
 * @param colorCache - Instance of ColorCache to use for caching
 * @returns CSS HSL string (e.g., "hsl(180, 50%, 50%)")
 */
export const hslToString = (hsl: HSLColor, colorCache: ColorCache): string => {
  const key = `${hsl.h},${hsl.s},${hsl.l}`;
  return colorCache.getColor(key, () => `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`);
};

/**
 * Converts colorPair to gradient colors
 * @param colorPair - Array of two HSL colors
 * @param colorCache - Instance of ColorCache to use for caching
 * @returns Object with gradient color strings
 */
export const getGradientColors = (
  colorPair: [HSLColor, HSLColor],
  colorCache: ColorCache
): { a: string; b: string } => {
  return {
    a: hslToString(colorPair[0], colorCache),
    b: hslToString(colorPair[1], colorCache),
  };
};

