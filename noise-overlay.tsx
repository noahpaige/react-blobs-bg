"use client";

import React, { useEffect, useRef, useCallback } from "react";

interface NoiseOverlayProps {
  opacity?: number;
  resolution?: number;
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
}

const NoiseOverlay = React.memo<NoiseOverlayProps>(
  ({ opacity = 0.05, resolution = 1, scrollContainerRef }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const getContainerSize = () => {
      if (scrollContainerRef && scrollContainerRef.current) {
        return {
          width: Math.min(scrollContainerRef.current.scrollWidth, 16384), // Max canvas width
          height: Math.min(scrollContainerRef.current.scrollHeight, 16384), // Max canvas height
        };
      }
      return {
        width: window.innerWidth,
        height: window.innerHeight,
      };
    };

    // Debounced resize handler - only for window resize, not scroll
    const debouncedResize = useRef<NodeJS.Timeout | null>(null);
    const handleResize = useCallback(() => {
      if (debouncedResize.current) {
        clearTimeout(debouncedResize.current);
      }
      debouncedResize.current = setTimeout(() => {
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext("2d")!;
          const { width, height } = getContainerSize();
          const effWidth = Math.min(width * resolution, 16384); // Max canvas width
          const effHeight = Math.min(height * resolution, 16384); // Max canvas height

          canvas.width = effWidth;
          canvas.height = effHeight;
          canvas.style.width = "100%";
          canvas.style.height = `${height}px`;

          // Redraw the noise pattern after resize
          const imageData = ctx.createImageData(effWidth, effHeight);
          const buffer = new Uint32Array(imageData.data.buffer);
          for (let i = 0; i < buffer.length; i++) {
            buffer[i] = Math.random() < 0.5 ? 0xffffffff : 0xff000000;
          }
          ctx.putImageData(imageData, 0, 0);
        }
      }, 100); // 100ms debounce delay
    }, [resolution, scrollContainerRef]);

    useEffect(() => {
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext("2d")!;

      const drawStaticNoise = () => {
        const { width, height } = getContainerSize();
        const effWidth = Math.min(width * resolution, 16384); // Max canvas width
        const effHeight = Math.min(height * resolution, 16384); // Max canvas height

        canvas.width = effWidth;
        canvas.height = effHeight;
        canvas.style.width = "100%";
        canvas.style.height = `${height}px`;

        const imageData = ctx.createImageData(effWidth, effHeight);
        const buffer = new Uint32Array(imageData.data.buffer);
        for (let i = 0; i < buffer.length; i++) {
          buffer[i] = Math.random() < 0.5 ? 0xffffffff : 0xff000000;
        }

        ctx.putImageData(imageData, 0, 0);
      };

      drawStaticNoise();
      window.addEventListener("resize", handleResize);
      // Removed scroll event listener to prevent temporal incoherence
      return () => {
        window.removeEventListener("resize", handleResize);
        if (debouncedResize.current) {
          clearTimeout(debouncedResize.current);
        }
      };
    }, [resolution, scrollContainerRef]);

    return (
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          zIndex: -1,
          pointerEvents: "none",
          opacity: opacity,
          imageRendering: "pixelated",
          // iOS Safari fix: prevent overlay from disappearing during scroll
          transform: "translateZ(0)",
          willChange: "transform",
        }}
      />
    );
  }
);

NoiseOverlay.displayName = "NoiseOverlay";

export default NoiseOverlay;
