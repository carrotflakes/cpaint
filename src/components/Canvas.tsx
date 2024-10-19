import { useEffect, useMemo, useRef, useState } from "react";
import { TmpCanvas } from "../libs/tmpCanvas";
import { Op, useGlobalSettings, useStore } from "../state";

export default function Canvas() {
  const store = useStore();
  const tmpCanvas = useMemo(() => new TmpCanvas(), []);
  const [updatedAt, setUpdatedAt] = useState(0);

  const containerRef = useRef(null as null | HTMLDivElement);
  const canvasRef = useRef(null as null | HTMLCanvasElement);

  useControl(canvasRef, containerRef, tmpCanvas, setUpdatedAt);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d", { alpha: false })!;

    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, store.canvas.width, store.canvas.height);
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

function useControl(
  canvasRef: { current: HTMLCanvasElement | null },
  containerRef: { current: HTMLDivElement | null },
  tmpCanvas: TmpCanvas,
  setUpdatedAt: (time: number) => void
) {
  const fingerOperations = useGlobalSettings((state) => state.fingerOperations);
  const state = useRef(
    null as
      | null
      | {
          type: "drawing";
          path: any[];
          lastPos: [number, number];
          pointerId: number;
        }
      | {
          type: "panning";
          pointers: { id: number; pos: [number, number] }[];
        }
  );

  useEffect(() => {
    function computePos(e: PointerEvent): [number, number] {
      if (!canvasRef.current) return [0, 0];
      const bbox = canvasRef.current.getBoundingClientRect();

      const store = useStore.getState();
      return [
        (e.clientX - bbox.left) / store.canvasScale,
        (e.clientY - bbox.top) / store.canvasScale,
      ];
    }

    const onPointerDown = (e: PointerEvent) => {
      e.preventDefault();
      if (!canvasRef.current || !containerRef.current) return;
      const pos = computePos(e);

      const store = useStore.getState();

      if (
        state.current?.type !== "drawing" &&
        !(fingerOperations && e.pointerType === "touch")
      ) {
        const size = store.penSize * (e.pressure ?? 1);
        const path = [{ pos, size }];
        tmpCanvas.begin({
          size: [store.canvas.width, store.canvas.height],
          style: {
            pen: store.color,
            eraser: "#fff",
            fill: "#f00",
          }[store.tool],
          soft: store.softPen,
        });

        state.current = {
          type: "drawing",
          path,
          lastPos: pos,
          pointerId: e.pointerId,
        };
        return;
      }

      if (state.current == null) {
        state.current = {
          type: "panning",
          pointers: [{ id: e.pointerId, pos: [e.clientX, e.clientY] }],
        };
        return;
      }

      if (state.current.type === "panning") {
        if (state.current.pointers.length > 2) return;
        state.current.pointers.push({
          id: e.pointerId,
          pos: [e.clientX, e.clientY],
        });
        return;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!canvasRef.current || !containerRef.current || !state.current) return;

      if (state.current.type === "drawing") {
        if (e.pointerId !== state.current.pointerId) return;
        const pos = computePos(e);

        const store = useStore.getState();

        const { path, lastPos } = state.current;
        if (dist(lastPos, pos) > 3) {
          const size = store.penSize * (e.pressure ?? 1);
          path.push({ pos, size });
          const lineWidth = store.tool === "fill" ? 1 : size;
          tmpCanvas.addLine({
            line: [...lastPos, ...pos],
            lineWidth,
          });
          state.current.lastPos = pos;
          setUpdatedAt(Date.now());
        }
      }

      if (state.current.type === "panning") {
        const po = state.current.pointers.find((p) => p.id === e.pointerId);
        if (po) {
          if (state.current.pointers.length === 2) {
            const d1 = dist(
              state.current.pointers[0].pos,
              state.current.pointers[1].pos
            );
            po.pos = [e.clientX, e.clientY];
            const d2 = dist(
              state.current.pointers[0].pos,
              state.current.pointers[1].pos
            );
            const scale = d2 / d1;
            const store = useStore.getState();
            store.setCanvasScale(store.canvasScale * scale);
          } else {
            po.pos = [e.clientX, e.clientY];
          }
        }
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!canvasRef.current || !containerRef.current || !state.current) return;

      const store = useStore.getState();

      if (state.current.type === "drawing") {
        if (e.pointerId !== state.current.pointerId) return;
        const { path } = state.current;
        apply: {
          if (store.tool === "fill") {
            tmpCanvas.style = store.color;
            tmpCanvas.fill(path);
            if (!tmpCanvas.isDirty()) break apply;

            const op: Op = {
              type: "fill",
              fillColor: store.color,
              opacity: store.opacity,
              path,
            };
            store.apply(op, tmpCanvas.canvas);
          } else {
            if (!tmpCanvas.isDirty()) break apply;

            const op: Op = {
              type: "stroke",
              strokeStyle: {
                color: tmpCanvas.style,
                soft: store.softPen,
              },
              opacity: store.opacity,
              path,
            };
            store.apply(op, tmpCanvas.canvas);
          }
        }
        tmpCanvas.finish();
        state.current = null;
        return;
      }

      if (state.current.type === "panning") {
        state.current.pointers = state.current.pointers.filter(
          (p) => p.id !== e.pointerId
        );
      }
    };

    containerRef.current?.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    return () => {
      containerRef.current?.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [canvasRef, containerRef, tmpCanvas, setUpdatedAt, fingerOperations]);
}

function dist(a: [number, number], b: [number, number]) {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2);
}
