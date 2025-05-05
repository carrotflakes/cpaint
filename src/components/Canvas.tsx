import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useViewControl } from "../hooks/useViewControl";
import { createCheckCanvas } from "../libs/check";
import { TmpCanvas } from "../libs/tmpCanvas";
import { StateRender } from "../model/state";
import { useGlobalSettings, useStore } from "../state";
import { Op } from "../model/op";

export default function Canvas() {
  const store = useStore();
  const tmpCanvas = useMemo(() => new TmpCanvas(), []);
  const [updatedAt, setUpdatedAt] = useState(0);

  const containerRef = useRef<null | HTMLDivElement>(null);
  const canvasRef = useRef<null | HTMLCanvasElement>(null);

  const redraw = useCallback(() => {
    setUpdatedAt(Date.now());
  }, []);
  useControl(canvasRef, containerRef, tmpCanvas, redraw);
  useViewControl(containerRef);

  const checkPat = useMemo(() => {
    const url = createCheckCanvas().toDataURL();
    return `url(${url})`;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    StateRender(store.stateContainer.state, ctx, {
      layerId: store.stateContainer.state.layers[store.uiState.layerIndex].id,
      apply: (ctx) => {
        ctx.save();
        if (store.uiState.tool === "eraser")
          ctx.globalCompositeOperation = "destination-out";
        ctx.globalAlpha = store.uiState.opacity;
        ctx.drawImage(tmpCanvas.canvas, 0, 0);
        ctx.restore();
      }
    });
  }, [store, canvasRef, tmpCanvas.canvas, updatedAt]);

  const canvasWidth = store.stateContainer.state.layers[0].canvas.width;
  const canvasHeight = store.stateContainer.state.layers[0].canvas.height;
  return (
    <div
      className="relative w-full h-full overflow-hidden"
      ref={containerRef}
      style={{
        backgroundImage: checkPat,
      }}
    >
      <canvas
        className="absolute shadow-[0_0_0_99999px_#f3f4f6] dark:shadow-gray-950"
        width={canvasWidth}
        height={canvasHeight}
        style={{
          top: `calc(50% + ${
            -(canvasWidth * store.uiState.canvasView.scale) / 2 +
            store.uiState.canvasView.pan[1]
          }px)`,
          left: `calc(50% + ${
            -(canvasHeight * store.uiState.canvasView.scale) / 2 +
            store.uiState.canvasView.pan[0]
          }px)`,
          width: canvasWidth * store.uiState.canvasView.scale,
          height: canvasHeight * store.uiState.canvasView.scale,
          transform: `rotate(${store.uiState.canvasView.angle}rad)`,
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
  redraw: () => void
) {
  const { fingerOperations } = useGlobalSettings((state) => state);

  const state = useRef<
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
        angleUnnormalized: number;
      }
    | {
        type: "translate";
        pointerId: number;
      }
  >(null);

  const computePos = useCallback((e: MouseEvent): [number, number] => {
    if (!containerRef.current) return [0, 0];
    const bbox = containerRef.current.getBoundingClientRect();

    const {
      stateContainer: {
        state: { layers },
      },
      uiState: { canvasView: cv },
    } = useStore.getState();
    const firstCanvas = layers[0].canvas;
    const pos_ = [
      (e.clientX - (bbox.left + bbox.width / 2) - cv.pan[0]) / cv.scale,
      (e.clientY - (bbox.top + bbox.height / 2) - cv.pan[1]) / cv.scale,
    ];
    const sin = Math.sin(-cv.angle);
    const cos = Math.cos(-cv.angle);
    return [
      pos_[0] * cos - pos_[1] * sin + firstCanvas.width / 2,
      pos_[0] * sin + pos_[1] * cos + firstCanvas.height / 2,
    ];
  }, []);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      e.preventDefault();
      if (!canvasRef.current || !containerRef.current) return;
      const pos = computePos(e);

      const store = useStore.getState();

      if (
        state.current?.type !== "drawing" &&
        e.button === 0 &&
        !(fingerOperations && e.pointerType === "touch")
      ) {
        const size = store.uiState.penSize * e.pressure;
        const path = [{ pos, size }];
        const firstCanvas = store.stateContainer.state.layers[0].canvas;
        tmpCanvas.begin({
          size: [firstCanvas.width, firstCanvas.height],
          style: {
            pen: store.uiState.color,
            eraser: "#fff",
            fill: "#f00",
          }[store.uiState.tool],
          soft: store.uiState.softPen,
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
        // Middle button to pan
        if (e.pointerType === "mouse" && e.button === 1) {
          state.current = {
            type: "translate",
            pointerId: e.pointerId,
          };
          return;
        }

        state.current = {
          type: "panning",
          pointers: [{ id: e.pointerId, pos: [e.clientX, e.clientY] }],
          angleUnnormalized: store.uiState.canvasView.angle,
        };
        return;
      }

      if (state.current.type === "panning") {
        if (state.current.pointers.length < 2)
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
          const size = store.uiState.penSize * e.pressure;
          path.push({ pos, size });
          const lineWidth = store.uiState.tool === "fill" ? 1 : size;
          tmpCanvas.addLine({
            line: [...lastPos, ...pos],
            lineWidth,
          });
          state.current.lastPos = pos;
          redraw();
        }
        return;
      }

      if (state.current.type === "panning") {
        const pi = state.current.pointers.findIndex(
          (p) => p.id === e.pointerId
        );
        if (pi !== -1) {
          if (state.current.pointers.length === 2) {
            const ps = state.current.pointers;
            const prevPos = ps[pi].pos;
            const d1 = dist(ps[0].pos, ps[1].pos);
            const a1 = Math.atan2(
              ps[0].pos[1] - ps[1].pos[1],
              ps[0].pos[0] - ps[1].pos[0]
            );
            ps[pi].pos = [e.clientX, e.clientY];
            const d2 = dist(ps[0].pos, ps[1].pos);
            const a2 = Math.atan2(
              ps[0].pos[1] - ps[1].pos[1],
              ps[0].pos[0] - ps[1].pos[0]
            );
            const bbox = containerRef.current.getBoundingClientRect();
            const panOffset = [
              bbox.left + bbox.width / 2,
              bbox.top + bbox.height / 2,
            ];
            const angleUnnormalized =
              (state.current.angleUnnormalized + (a2 - a1)) % (2 * Math.PI);
            state.current.angleUnnormalized = angleUnnormalized;
            useStore.setState((state) => {
              const prevPan_ = [
                state.uiState.canvasView.pan[0] + panOffset[0],
                state.uiState.canvasView.pan[1] + panOffset[1],
              ] as Pos;
              const pan_ = calculateTransformedPoint(
                ps[1 - pi].pos,
                prevPos,
                ps[pi].pos,
                prevPan_
              );
              const pan = [
                pan_[0] - panOffset[0],
                pan_[1] - panOffset[1],
              ] as Pos;

              return {
                uiState: {
                  ...state.uiState,
                  canvasView: {
                    ...state.uiState.canvasView,
                    angle: normalizeAngle(angleUnnormalized),
                    scale: (state.uiState.canvasView.scale * d2) / d1,
                    pan,
                  },
                },
              };
            });
          } else {
            state.current.pointers[pi].pos = [e.clientX, e.clientY];
          }
        }
        return;
      }

      if (state.current.type === "translate") {
        if (e.pointerId === state.current.pointerId) {
          useStore.setState((state) => ({
            uiState: {
              ...state.uiState,
              canvasView: {
                ...state.uiState.canvasView,
                pan: [
                  state.uiState.canvasView.pan[0] + e.movementX,
                  state.uiState.canvasView.pan[1] + e.movementY,
                ],
              },
            },
          }));
        }
        return;
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!canvasRef.current || !containerRef.current || !state.current) return;

      const store = useStore.getState();

      if (state.current.type === "drawing") {
        if (e.pointerId !== state.current.pointerId) return;
        const { path } = state.current;
        apply: {
          if (store.uiState.tool === "fill") {
            tmpCanvas.style = store.uiState.color;
            tmpCanvas.fill(path);
            if (!tmpCanvas.isDirty()) break apply;

            const op: Op = {
              type: "fill",
              fillColor: store.uiState.color,
              opacity: store.uiState.opacity,
              path,
              layerIndex: store.uiState.layerIndex,
            };
            store.apply(op, tmpCanvas.canvas);
          } else {
            if (!tmpCanvas.isDirty()) break apply;

            const op: Op = {
              type: "stroke",
              erase: store.uiState.tool === "eraser",
              strokeStyle: {
                color: tmpCanvas.style,
                soft: store.uiState.softPen,
              },
              opacity: store.uiState.opacity,
              path,
              layerIndex: store.uiState.layerIndex,
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
        return;
      }

      if (state.current.type === "translate") {
        if (e.button === 1) {
          state.current = null;
        }
        return;
      }
    };

    const el = containerRef.current;
    el?.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp); // FIXME

    return () => {
      el?.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.addEventListener("pointercancel", onPointerUp);
    };
  }, [canvasRef, containerRef, tmpCanvas, redraw, fingerOperations]);
}

function dist(a: [number, number], b: [number, number]) {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2);
}

const angleGripGrace = 0.05;

function normalizeAngle(angle: number) {
  const a = (angle / (2 * Math.PI)) * 4;
  const b = Math.round(a);
  const d = Math.abs(a - b);
  if (d < angleGripGrace) return (b * (2 * Math.PI)) / 4;
  return angle;
}

type Pos = [number, number];

function calculateTransformedPoint(o: Pos, a1: Pos, a2: Pos, p: Pos): Pos {
  const a1x = a1[0] - o[0];
  const a1y = a1[1] - o[1];
  const a2x = a2[0] - o[0];
  const a2y = a2[1] - o[1];
  const px = p[0] - o[0];
  const py = p[1] - o[1];

  const d = a1x ** 2 + a1y ** 2;
  const a = (a1x * a2x + a1y * a2y) / d;
  const b = (a1x * a2y - a1y * a2x) / d;

  const x = a * px - b * py + o[0];
  const y = b * px + a * py + o[1];
  return [x, y];
}
