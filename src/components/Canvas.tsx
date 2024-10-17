import { useEffect, useMemo, useRef, useState } from "react";
import { TmpCanvas } from "../ccanvas";
import { useMouse } from "../hooks/useMouse";
import { Op, useStore } from "../state";

export default function Canvas() {
  const store = useStore();
  const tmpCanvas = useMemo(() => new TmpCanvas(), []);
  const [updatedAt, setUpdatedAt] = useState(0);

  const containerRef = useRef(null as null | HTMLDivElement);
  const canvasRef = useRef(null as null | HTMLCanvasElement);

  useEffect(() => {
    store.setSize(400, 400);
  }, []);

  useMouse<HTMLCanvasElement>({
    ref: canvasRef,
    containerRef,
    onMouseDown: (pos, e) => {
      pos = [pos[0] / store.canvasScale, pos[1] / store.canvasScale];
      let lastPos = pos;
      e.preventDefault();
      const size = store.penSize * (e.force ?? 1);
      const path = [{ pos, size }];
      tmpCanvas.begin({
        size: [store.canvas.width, store.canvas.height],
        style: {
          pen: store.color,
          eraser: "#fff",
          fill: "#f00",
        }[store.tool],
        soft: store.softPen,
        opacity: store.opacity,
      });
      return {
        onMouseMove: (pos, e) => {
          pos = [pos[0] / store.canvasScale, pos[1] / store.canvasScale];
          if (dist(lastPos, pos) > 3) {
            const size = store.penSize * (e.force ?? 1);
            path.push({ pos, size });
            const lineWidth = store.tool === "fill" ? 1 : size;
            tmpCanvas.addLine({
              line: [...lastPos, ...pos],
              lineWidth,
            });
            lastPos = pos;
            setUpdatedAt(Date.now());
          }
        },
        onMouseUp: () => {
          if (store.tool === "fill") {
            tmpCanvas.style = store.color;
            tmpCanvas.fill(path);
            const op: Op = {
              type: "fill",
              fillColor: store.color,
              path,
            };
            store.apply(op, tmpCanvas.canvas);
          } else {
            const op: Op = {
              type: "stroke",
              strokeStyle: {
                color: store.color,
                width: store.penSize,
                soft: store.softPen,
              },
              path,
            };
            store.apply(op, tmpCanvas.canvas);
          }
          tmpCanvas.finish();
        },
      };
    },
  });

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    ctx.clearRect(0, 0, store.canvas.width, store.canvas.height);
    ctx.drawImage(store.canvas, 0, 0);

    ctx.save();
    ctx.globalAlpha = store.opacity;
    ctx.drawImage(tmpCanvas.canvas, 0, 0);
    ctx.restore();
  }, [store, canvasRef, tmpCanvas.canvas, updatedAt]);

  return (
    <div
      className="w-full h-full flex items-center justify-center"
      ref={containerRef}
    >
      <canvas
        className="border bg-white"
        width={store.canvas.width}
        height={store.canvas.height}
        style={{
          width: store.canvas.width * store.canvasScale,
          height: store.canvas.height * store.canvasScale,
          imageRendering: "pixelated",
        }}
        ref={canvasRef}
      />
    </div>
  );
}

function dist(a: [number, number], b: [number, number]) {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2);
}
