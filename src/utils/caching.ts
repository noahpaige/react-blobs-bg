/**
 * Path2D object pool for better memory management and performance
 * Reuses Path2D objects instead of creating new ones for each blob
 */
export class Path2DPool {
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
 * Gradient cache for better performance
 * Reuses CanvasGradient objects instead of creating new ones for each frame
 */
export class GradientCache {
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
export class ColorCache {
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

