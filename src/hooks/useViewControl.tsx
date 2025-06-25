import { useEffect } from "react";
import {
  calculateTransformedPoint,
  dist,
  normalizeAngle,
  Pos,
} from "../libs/geometry";
import { useAppState } from "../store/appState";
import { useGlobalSettings } from "../store/globalSetting";

export function useViewControl(
  containerRef: {
    current: HTMLDivElement | null;
  },
  drawOrPanningRef?: { current: "draw" | "panning" | null }
) {
  const { wheelZoom, angleSnapDivisor } = useGlobalSettings();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let state:
      | null
      | {
          type: "panning";
          active: boolean;
          pointers: { id: number; pos: [number, number] }[];
          angleUnnormalized: number;
          panUnnormalized: Pos;
        }
      | {
          type: "translate";
          pointerId: number;
        } = null;

    const onPointerDown = (e: PointerEvent) => {
      e.preventDefault();
      const store = useAppState.getState();

      if (state == null) {
        // Middle button to pan
        if (e.pointerType === "mouse" && e.button === 1) {
          state = {
            type: "translate",
            pointerId: e.pointerId,
          };
        }
        if (e.pointerType === "touch") {
          state = {
            type: "panning",
            active: false,
            pointers: [{ id: e.pointerId, pos: [e.clientX, e.clientY] }],
            angleUnnormalized: store.uiState.canvasView.angle,
            panUnnormalized: store.uiState.canvasView.pan,
          };
        }
        return;
      }

      if (state.type === "panning") {
        if (e.pointerType === "touch" && state.pointers.length < 2) {
          state.active = true;
          state.pointers.push({
            id: e.pointerId,
            pos: [e.clientX, e.clientY],
          });
          if (drawOrPanningRef && drawOrPanningRef.current == null)
            drawOrPanningRef.current = "panning";
        }
        return;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!state) return;
      if (drawOrPanningRef?.current && drawOrPanningRef.current !== "panning") {
        state = null;
        return;
      }

      if (state.type === "panning") {
        if (!state.active) return;

        const pi = state.pointers.findIndex((p) => p.id === e.pointerId);
        if (pi === -1) return;

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
          const bbox = container.getBoundingClientRect();
          const panOffset = [
            bbox.left + bbox.width / 2,
            bbox.top + bbox.height / 2,
          ];
          const angleUnnormalized =
            (state.angleUnnormalized + (a2 - a1)) % (2 * Math.PI);
          state.angleUnnormalized = angleUnnormalized;
          const angle =
            angleSnapDivisor > 0
              ? normalizeAngle(angleUnnormalized, angleSnapDivisor)
              : angleUnnormalized;

          const prevPan_ = [
            state.panUnnormalized[0] + panOffset[0],
            state.panUnnormalized[1] + panOffset[1],
          ] as Pos;
          const pan_ = calculateTransformedPoint(
            ps[1 - pi].pos,
            prevPos,
            ps[pi].pos,
            prevPan_
          );
          state.panUnnormalized = [
            pan_[0] - panOffset[0],
            pan_[1] - panOffset[1],
          ] as Pos;
          let pan = state.panUnnormalized;
          if (angle !== angleUnnormalized) {
            const dangle = angle - angleUnnormalized;
            const cos = Math.cos(dangle);
            const sin = Math.sin(dangle);
            pan = [pan[0] * cos - pan[1] * sin, pan[0] * sin + pan[1] * cos];
          }

          useAppState.getState().update((draft) => {
            draft.uiState.canvasView = {
              ...draft.uiState.canvasView,
              pan,
              angle,
              scale: (draft.uiState.canvasView.scale * d2) / d1,
            };
          });
        } else {
          const pos = state.pointers[pi].pos;
          useAppState.getState().update((draft) => {
            draft.uiState.canvasView.pan = [
              draft.uiState.canvasView.pan[0] + (e.clientX - pos[0]),
              draft.uiState.canvasView.pan[1] + (e.clientY - pos[1]),
            ];
          });
          state.pointers[pi].pos = [e.clientX, e.clientY];
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
      if (!state) return;

      if (state.type === "panning") {
        state.pointers = state.pointers.filter((p) => p.id !== e.pointerId);
        if (state.pointers.length === 0) {
          state = null;
          if (drawOrPanningRef?.current === "panning")
            drawOrPanningRef.current = null;
        }
        return;
      }

      if (state.type === "translate") {
        if (e.pointerId === state.pointerId) {
          state = null;
        }
        return;
      }
    };

    container.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);

    return () => {
      container.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [angleSnapDivisor]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();

      if (wheelZoom || e.ctrlKey) {
        if (e.deltaMode !== 0) return;
        const base = 0.995;
        const scaleFactor = base ** e.deltaY;

        const bbox = container.getBoundingClientRect();
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

    container.addEventListener("wheel", onWheel, {
      passive: false,
    });
    return () => container.removeEventListener("wheel", onWheel);
  }, [wheelZoom]);
}
