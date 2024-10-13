import { useEffect, useMemo, useState } from "react";
import { useMouse } from "../hooks/useMouse";
import { Op, useStore } from "../state";
import { TmpCanvas } from "../ccanvas";

export default function Canvas() {
  const store = useStore();
  const tmpCanvas = useMemo(() => new TmpCanvas(), []);
  const [updatedAt, setUpdatedAt] = useState(0);

  useEffect(() => {
    store.setSize(400, 400);
  }, []);

  const mouse = useMouse<HTMLCanvasElement>({
    onMouseDown: (pos, e) => {
      pos = [pos[0] / store.canvasScale, pos[1] / store.canvasScale];
      let lastPos = pos;
      e.preventDefault();
      const poss = [pos];
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
        onMouseMove: (pos) => {
          pos = [pos[0] / store.canvasScale, pos[1] / store.canvasScale];
          if (dist(lastPos, pos) > 3) {
            poss.push(pos);
            tmpCanvas.addLine({
              line: [...lastPos, ...pos],
              lineWidth: store.tool === "fill" ? 1 : store.penSize,
            });
            lastPos = pos;
            setUpdatedAt(Date.now());
          }
        },
        onMouseUp: () => {
          if (store.tool === "fill") {
            const ctx = tmpCanvas.canvas.getContext("2d")!;
            ctx.fillStyle = store.color;
            ctx.clearRect(0, 0, store.canvas.width, store.canvas.height);
            ctx.beginPath();
            for (const pos of poss) {
              ctx.lineTo(pos[0], pos[1]);
            }
            ctx.fill();
            const op: Op = {
              type: "fill",
              fillColor: store.color,
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
              path: poss,
            };
            store.apply(op, tmpCanvas.canvas);
          }
          tmpCanvas.finish();
        },
      };
    },
  });

  useEffect(() => {
    const canvas = mouse.props.ref.current!;
    const ctx = canvas.getContext("2d")!;

    ctx.putImageData(
      store.canvas
        .getContext("2d", { willReadFrequently: true })!
        .getImageData(0, 0, store.canvas.width, store.canvas.height),
      0,
      0
    );

    ctx.save();
    ctx.globalAlpha = store.opacity;
    ctx.drawImage(tmpCanvas.canvas, 0, 0);
    ctx.restore();
  }, [store, mouse.props.ref, tmpCanvas.canvas, updatedAt]);

  return (
    <canvas
      className="border"
      width={store.canvas.width}
      height={store.canvas.height}
      style={{
        width: store.canvas.width * store.canvasScale,
        height: store.canvas.height * store.canvasScale,
        imageRendering: "pixelated",
      }}
      {...mouse.props}
    />
  );
}

function dist(a: [number, number], b: [number, number]) {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2);
}
