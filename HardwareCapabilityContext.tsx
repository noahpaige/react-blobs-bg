"use client";
import React, { createContext, useContext, useEffect, useState } from "react";

export type PerformanceTier = "low" | "medium" | "high";

export type BrowserInfo = {
  name: string;
  version: string;
  userAgent: string;
  os: string;
};

export type HardwareCapability = {
  gpuTier: number | null;
  ram: number;
  cores: number;
  loading: boolean;
  performanceTier: PerformanceTier;
  isMobile: boolean;
  browser: BrowserInfo;
};

const defaultBrowserInfo: BrowserInfo = {
  name: "Unknown",
  version: "",
  userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
  os: "Unknown",
};

const HardwareCapabilityContext = createContext<HardwareCapability>({
  gpuTier: null,
  ram: 2,
  cores: 2,
  loading: true,
  performanceTier: "medium",
  isMobile: false,
  browser: defaultBrowserInfo,
});

// Helper function to determine performance tier
const getPerformanceTier = (
  gpuTier: number | null,
  ram: number,
  cores: number
): PerformanceTier => {
  // Low-end devices
  if ((gpuTier !== null && gpuTier <= 1) || ram <= 4 || cores <= 2) {
    return "low";
  }

  // High-end devices
  if (gpuTier !== null && gpuTier >= 3 && ram >= 8 && cores >= 4) {
    return "high";
  }

  // Everything else is medium
  return "medium";
};

// Simple GPU detection fallback
const detectGPUSimple = async (): Promise<number | null> => {
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl") ||
      (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);

    if (!gl) return null;

    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    if (!debugInfo) return null;

    const renderer = gl.getParameter(
      debugInfo.UNMASKED_RENDERER_WEBGL
    ) as string;

    // Simple heuristic based on renderer string
    if (renderer.includes("Intel") || renderer.includes("HD Graphics"))
      return 1;
    if (renderer.includes("AMD") || renderer.includes("Radeon")) return 2;
    if (renderer.includes("NVIDIA") || renderer.includes("GeForce")) return 3;
    if (
      renderer.includes("Apple") ||
      renderer.includes("M1") ||
      renderer.includes("M2")
    )
      return 3;

    return 2; // Default to medium
  } catch {
    return null;
  }
};

// Browser detection helper
const detectBrowser = (): BrowserInfo => {
  if (typeof navigator === "undefined") return defaultBrowserInfo;
  const ua = navigator.userAgent;
  let name = "Unknown";
  let version = "";
  let os = "Unknown";

  // Detect browser name and version
  if (/firefox|fxios/i.test(ua)) {
    name = "Firefox";
    version = (ua.match(/Firefox\/([\d.]+)/) || [])[1] || "";
  } else if (/edg/i.test(ua)) {
    name = "Edge";
    version = (ua.match(/Edg\/([\d.]+)/) || [])[1] || "";
  } else if (/opr\//i.test(ua)) {
    name = "Opera";
    version = (ua.match(/OPR\/([\d.]+)/) || [])[1] || "";
  } else if (/chrome|crios/i.test(ua)) {
    name = "Chrome";
    version = (ua.match(/(?:Chrome|CriOS)\/([\d.]+)/) || [])[1] || "";
  } else if (/safari/i.test(ua)) {
    name = "Safari";
    version = (ua.match(/Version\/([\d.]+)/) || [])[1] || "";
  }

  // Detect OS
  if (/windows nt/i.test(ua)) {
    os = "Windows";
  } else if (/android/i.test(ua)) {
    os = "Android";
  } else if (/iphone|ipad|ipod/i.test(ua)) {
    os = "iOS";
  } else if (/macintosh|mac os x/i.test(ua)) {
    os = "macOS";
  } else if (/linux/i.test(ua)) {
    os = "Linux";
  }

  return {
    name,
    version,
    userAgent: ua,
    os,
  };
};

export const HardwareCapabilityProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [capability, setCapability] = useState<HardwareCapability>({
    gpuTier: null,
    ram: 2,
    cores: 2,
    loading: true,
    performanceTier: "medium",
    isMobile: false,
    browser: defaultBrowserInfo,
  });

  useEffect(() => {
    async function detect() {
      try {
        // @ts-expect-error: deviceMemory is not in the TS DOM typings yet
        const ram = navigator.deviceMemory || 2;
        const cores = navigator.hardwareConcurrency || 2;
        const isMobile =
          /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent
          );

        // Try to detect GPU tier
        const gpuTier = await detectGPUSimple();
        const browser = detectBrowser();
        const performanceTier = getPerformanceTier(gpuTier, ram, cores);

        const finalCapability = {
          gpuTier,
          ram,
          cores,
          loading: false,
          performanceTier,
          isMobile,
          browser,
        };

        // Log overall hardware detection results
        console.table({
          "🔧 Hardware Detection Complete": {
            gpuTier,
            ram: `${ram}GB`,
            cores,
            isMobile,
            performanceTier,
            detectionMethod: gpuTier !== null ? "WebGL" : "Fallback",
            browser: `${browser.name} ${browser.version}`,
            os: browser.os,
          },
        });

        setCapability(finalCapability);
      } catch (error) {
        console.warn("Failed to detect hardware capabilities:", error);
        // Fallback to medium tier
        setCapability({
          gpuTier: null,
          ram: 2,
          cores: 2,
          loading: false,
          performanceTier: "medium",
          isMobile: false,
          browser: defaultBrowserInfo,
        });
      }
    }
    detect();
  }, []);

  return (
    <HardwareCapabilityContext.Provider value={capability}>
      {children}
    </HardwareCapabilityContext.Provider>
  );
};

export function useHardwareCapability() {
  return useContext(HardwareCapabilityContext);
}
