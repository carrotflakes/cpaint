import { useEffect } from "react";
import {
  dist,
  Pos,
  calculateTransformedPoint,
  normalizeAngle,
} from "../libs/geometry";
import { useAppState } from "../store/appState";
import { useGlobalSettings } from "../store/globalSetting";

export function useViewControl(
  containerRef: {
    current: HTMLDivElement | null;
  },
  noDraw?: boolean
) {
  const { wheelZoom, touchToDraw, angleSnapDivisor } = useGlobalSettings();
  const allowTouch = noDraw || !touchToDraw;

  useEffect(() => {
    let state:
      | null
      | {
          type: "panning";
          pointers: { id: number; pos: [number, number] }[];
          angleUnnormalized: number;
        }
      | {
          type: "translate";
          pointerId: number;
        } = null;

    const onPointerDown = (e: PointerEvent) => {
      e.preventDefault();
      if (!containerRef.current) return;
      const store = useAppState.getState();

      if (state == null) {
        // Middle button to pan
        if (e.pointerType === "mouse" && e.button === 1) {
          state = {
            type: "translate",
            pointerId: e.pointerId,
          };
        }
        if (allowTouch && e.pointerType === "touch") {
          state = {
            type: "panning",
            pointers: [{ id: e.pointerId, pos: [e.clientX, e.clientY] }],
            angleUnnormalized: store.uiState.canvasView.angle,
          };
        }
        return;
      }

      if (state.type === "panning") {
        if (e.pointerType === "touch" && state.pointers.length < 2)
          state.pointers.push({
            id: e.pointerId,
            pos: [e.clientX, e.clientY],
          });
        return;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!containerRef.current || !state) return;

      if (state.type === "panning") {
        const pi = state.pointers.findIndex((p) => p.id === e.pointerId);
        if (pi !== -1) {
          if (state.pointers.length === 2) {
            const ps = state.pointers;
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
              (state.angleUnnormalized + (a2 - a1)) % (2 * Math.PI);
            state.angleUnnormalized = angleUnnormalized;
            useAppState.getState().update((draft) => {
              const prevPan_ = [
                draft.uiState.canvasView.pan[0] + panOffset[0],
                draft.uiState.canvasView.pan[1] + panOffset[1],
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

              draft.uiState.canvasView = {
                pan,
                angle:
                  angleSnapDivisor > 0
                    ? normalizeAngle(angleUnnormalized, angleSnapDivisor)
                    : angleUnnormalized,
                scale: (draft.uiState.canvasView.scale * d2) / d1,
              };
            });
          } else {
            state.pointers[pi].pos = [e.clientX, e.clientY];
          }
        }
        return;
      }

      if (state.type === "translate") {
        if (e.pointerId === state.pointerId) {
          useAppState.getState().update((draft) => {
            draft.uiState.canvasView.pan = [
              draft.uiState.canvasView.pan[0] + e.movementX,
              draft.uiState.canvasView.pan[1] + e.movementY,
            ];
          });
        }
        return;
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!containerRef.current || !state) return;

      if (state.type === "panning") {
        state.pointers = state.pointers.filter((p) => p.id !== e.pointerId);
        return;
      }

      if (state.type === "translate") {
        if (e.pointerId === state.pointerId) {
          state = null;
        }
        return;
      }
    };

    const el = containerRef.current;
    el?.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);

    return () => {
      el?.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [containerRef, angleSnapDivisor, allowTouch]);

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (!containerRef.current) return;
      e.preventDefault();

      if (wheelZoom || e.ctrlKey) {
        if (e.deltaMode !== 0) return;
        const base = 0.995;
        const scaleFactor = base ** e.deltaY;

        const bbox = containerRef.current.getBoundingClientRect();
        const pos = [
          e.clientX - bbox.left - bbox.width / 2,
          e.clientY - bbox.top - bbox.height / 2,
        ] as Pos;

        useAppState.getState().update((draft) => {
          draft.uiState.canvasView.scale *= scaleFactor;
          draft.uiState.canvasView.pan[0] =
            (draft.uiState.canvasView.pan[0] - pos[0]) * scaleFactor + pos[0];
          draft.uiState.canvasView.pan[1] =
            (draft.uiState.canvasView.pan[1] - pos[1]) * scaleFactor + pos[1];
        });
      } else {
        if (e.deltaMode !== 0) return;

        useAppState.getState().update((draft) => {
          draft.uiState.canvasView.pan[0] -= e.deltaX;
          draft.uiState.canvasView.pan[1] -= e.deltaY;
        });
      }
    };

    const el = containerRef.current;
    el?.addEventListener("wheel", onWheel, {
      passive: false,
    });
    return () => el?.removeEventListener("wheel", onWheel);
  }, [wheelZoom]);
}
