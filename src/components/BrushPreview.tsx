import { useEffect, useRef } from "react";
import { startTouchBrush } from "../libs/touch/brush";

export function BrushPreview({
  brushType,
  overwriteProps,
}: {
  brushType: string;
  overwriteProps?: {
    width?: number;
    color?: string;
    opacity?: number;
  };
}) {
  const width = 300;
  const height = 100;
  const dpr = window.devicePixelRatio ?? 1;

  const canvasRef = useRef<HTMLCanvasElement>(null!);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { desynchronized: true });
    if (!ctx) return;
    const cw = canvas.width;
    const ch = canvas.height;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, cw, ch);

    const touch = startTouchBrush({
      brushType,
      width: 20 * dpr,
      color: "black",
      opacity: 1,
      erase: false,
      alphaLock: false,
      canvasSize: [cw, ch],
      ...overwriteProps,
    });

    const startX = 20 * dpr;
    const endX = 280 * dpr;
    const n = 100;
    for (let i = 0; i <= n; i++) {
      touch.stroke(
        startX + ((endX - startX) * i) / n,
        (height / 2 + Math.sin((i / n) * 2 * Math.PI) * 20) * dpr,
        Math.sin((i / n) * Math.PI)
      );
    }
    touch.end();
    touch.transfer(ctx);
  }, [brushType, JSON.stringify(overwriteProps)]);

  return (
    <canvas
      ref={canvasRef}
      width={(width * dpr) | 0}
      height={(height * dpr) | 0}
      style={{
        width: `${width}px`,
        height: `${height}px`,
      }}
    ></canvas>
  );
}
