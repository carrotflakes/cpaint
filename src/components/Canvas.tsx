import { useEffect, useMemo, useState } from "react";
import { useMouse } from "../hooks/useMouse";
import { useStore } from "../state";
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
      let lastPos = pos;
      e.preventDefault();
      tmpCanvas.begin({
        size: [store.canvas.width, store.canvas.height],
        style: store.tool === "pen" ? store.color : "#fff",
        soft: store.softPen,
        opacity: store.opacity,
      });
      return {
        onMouseMove: (pos) => {
          if (dist(lastPos, pos) > 10) {
            tmpCanvas.addLine({
              line: [...lastPos, ...pos],
              lineWidth: store.penSize,
            });
            lastPos = pos;
            setUpdatedAt(Date.now());
          }
        },
        onMouseUp: () => {
          store.finish(tmpCanvas.canvas);
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
    <canvas className="border" width="400" height="400" {...mouse.props} />
  );
}

function dist(a: [number, number], b: [number, number]) {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2);
}
