import React, { useState, useEffect } from "react";
import { AnimatedBackground } from "../src/index";

/**
 * Simple test component for AnimatedBackground
 * 
 * To test:
 * 1. Build the package: npm run build
 * 2. Use npm link to link locally, or
 * 3. Import directly from src/ in a React app
 */
export function TestComponent() {
  const [rotation, setRotation] = useState(0);
  const [yPosition, setYPosition] = useState(0.5);

  // Simple animation loop
  useEffect(() => {
    const interval = setInterval(() => {
      setRotation((r) => (r + 1) % 360);
      setYPosition((y) => {
        const newY = y + 0.01;
        return newY > 1 ? 0 : newY;
      });
    }, 16); // ~60fps

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
      <AnimatedBackground
        colorPair={[
          { h: 200, s: 70, l: 50 },
          { h: 300, s: 70, l: 50 },
        ]}
        numBlobs={12}
        blobRotations={rotation}
        blobY={yPosition}
      />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <h1 style={{ fontSize: "3rem", marginBottom: "1rem", textShadow: "2px 2px 4px rgba(0,0,0,0.5)" }}>
          AnimatedBackground Test
        </h1>
        <p style={{ fontSize: "1.2rem", textShadow: "1px 1px 2px rgba(0,0,0,0.5)" }}>
          Rotation: {rotation.toFixed(0)}°
        </p>
        <p style={{ fontSize: "1.2rem", textShadow: "1px 1px 2px rgba(0,0,0,0.5)" }}>
          Y Position: {yPosition.toFixed(2)}
        </p>
      </div>
    </div>
  );
}

