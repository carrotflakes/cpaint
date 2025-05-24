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
  const canvasRef = useRef<HTMLCanvasElement>(null!);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const touch = startTouchBrush({
      brushType,
      width: 20,
      color: "black",
      opacity: 1,
      erase: false,
      alphaLock: false,
      canvasSize: [canvas.width, canvas.height],
      ...overwriteProps,
    });

    const startX = 20;
    const endX = 280;
    const n = 100;
    for (let i = 0; i <= n; i++) {
      touch.stroke(
        startX + ((endX - startX) * i) / n,
        50 + Math.sin((i / n) * 2 * Math.PI) * 20,
        Math.sin((i / n) * Math.PI)
      );
    }
    touch.end();
    touch.transfer(ctx);
  }, [brushType, JSON.stringify(overwriteProps)]);

  return <canvas ref={canvasRef} width={300} height={100}></canvas>;
}
