"use client";

import { useCallback, useRef } from "react";
import { HEAT_W, HEAT_H } from "@/lib/constants";
import { HEATMAP_LUT } from "@/lib/heatmap-lut";

export interface HeatmapRenderConfig {
  heatmapDecayMode: boolean;
  isNight: boolean;
}

export function useHeatmapRenderer(
  configRef: React.RefObject<HeatmapRenderConfig>
) {
  const heatGridRef = useRef<Float32Array>(new Float32Array(HEAT_W * HEAT_H));
  const offscreenHeatCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const miniHeatmapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fullHeatmapCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const updateAndRenderHeatmaps = useCallback(
    (
      gx: number,
      gy: number,
      rowsRect: DOMRect,
      curLine: number,
      lineCount: number,
      curLineHeight: number
    ) => {
      const grid = heatGridRef.current;
      const decayMode = configRef.current?.heatmapDecayMode ?? true;
      const isNight = configRef.current?.isNight ?? false;

      const decay = decayMode ? 0.965 : 0.999;
      for (let i = 0; i < grid.length; i++) {
        grid[i] *= decay;
      }

      const cx = Math.round(
        (gx / Math.max(1, window.innerWidth)) * (HEAT_W - 1)
      );
      const cy = Math.round(
        (gy / Math.max(1, window.innerHeight)) * (HEAT_H - 1)
      );
      const radius = 13;
      const r2 = radius * radius;

      const yMin = Math.max(0, cy - radius);
      const yMax = Math.min(HEAT_H - 1, cy + radius);
      const xMin = Math.max(0, cx - radius);
      const xMax = Math.min(HEAT_W - 1, cx + radius);

      for (let y = yMin; y <= yMax; y++) {
        const dy2 = (y - cy) * (y - cy);
        const rowOffset = y * HEAT_W;
        for (let x = xMin; x <= xMax; x++) {
          const d2 = (x - cx) * (x - cx) + dy2;
          if (d2 <= r2) {
            const boost = Math.exp(-d2 / (2 * 30)) * 22;
            grid[rowOffset + x] = Math.min(255, grid[rowOffset + x] + boost);
          }
        }
      }

      if (!offscreenHeatCanvasRef.current) {
        const c = document.createElement("canvas");
        c.width = HEAT_W;
        c.height = HEAT_H;
        offscreenHeatCanvasRef.current = c;
      }
      const offCtx = offscreenHeatCanvasRef.current.getContext("2d");
      if (!offCtx) return;

      const imgData = offCtx.createImageData(HEAT_W, HEAT_H);
      const buf32 = new Uint32Array(imgData.data.buffer);
      for (let i = 0; i < grid.length; i++) {
        buf32[i] = HEATMAP_LUT[Math.min(255, grid[i] | 0)];
      }
      offCtx.putImageData(imgData, 0, 0);

      if (fullHeatmapCanvasRef.current) {
        const fCtx = fullHeatmapCanvasRef.current.getContext("2d");
        if (fCtx) {
          fCtx.clearRect(0, 0, HEAT_W, HEAT_H);
          fCtx.drawImage(offscreenHeatCanvasRef.current, 0, 0, HEAT_W, HEAT_H);
        }
      }

      if (miniHeatmapCanvasRef.current) {
        const mCanvas = miniHeatmapCanvasRef.current;
        const mCtx = mCanvas.getContext("2d");
        if (mCtx) {
          const mw = mCanvas.width;
          const mh = mCanvas.height;
          mCtx.clearRect(0, 0, mw, mh);

          mCtx.fillStyle = isNight ? "#181a1e" : "#f5f3ef";
          mCtx.fillRect(0, 0, mw, mh);

          const scaleX = mw / Math.max(1, window.innerWidth);
          const scaleY = mh / Math.max(1, window.innerHeight);
          mCtx.strokeStyle = isNight
            ? "rgba(120, 113, 108, 0.45)"
            : "rgba(168, 162, 158, 0.65)";
          mCtx.strokeRect(
            rowsRect.left * scaleX,
            rowsRect.top * scaleY,
            rowsRect.width * scaleX,
            rowsRect.height * scaleY
          );

          for (let i = 0; i < lineCount; i++) {
            const ly = (rowsRect.top + i * curLineHeight) * scaleY;
            const lh = (curLineHeight - 4) * scaleY;
            mCtx.fillStyle =
              i === curLine
                ? isNight
                  ? "rgba(99, 102, 241, 0.35)"
                  : "rgba(28, 25, 23, 0.18)"
                : isNight
                ? "rgba(41, 37, 36, 0.65)"
                : "rgba(214, 211, 209, 0.55)";
            mCtx.fillRect(
              rowsRect.left * scaleX,
              ly,
              rowsRect.width * scaleX,
              lh
            );
          }

          mCtx.drawImage(offscreenHeatCanvasRef.current, 0, 0, mw, mh);

          const mx = gx * scaleX;
          const my = gy * scaleY;
          mCtx.strokeStyle = isNight ? "#ffffff" : "#1c1917";
          mCtx.lineWidth = 1.4;
          mCtx.beginPath();
          mCtx.arc(mx, my, 4, 0, Math.PI * 2);
          mCtx.stroke();
        }
      }
    },
    [configRef]
  );

  const clearHeatmap = useCallback(() => {
    const grid = heatGridRef.current;
    for (let i = 0; i < grid.length; i++) {
      grid[i] = 0;
    }
  }, []);

  return {
    heatGridRef,
    offscreenHeatCanvasRef,
    miniHeatmapCanvasRef,
    fullHeatmapCanvasRef,
    updateAndRenderHeatmaps,
    clearHeatmap,
  };
}