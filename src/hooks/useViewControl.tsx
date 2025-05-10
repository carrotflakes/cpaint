import { useEffect } from "react";
import { useGlobalSettings, useAppState } from "../state";

export type Pos = [number, number];

export function useViewControl(containerRef: {
  current: HTMLDivElement | null;
}) {
  const { wheelZoom } = useGlobalSettings((state) => state);

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

        useAppState.getState().update(draft => {
          draft.uiState.canvasView.scale *= scaleFactor;
          draft.uiState.canvasView.pan[0] =
            (draft.uiState.canvasView.pan[0] - pos[0]) * scaleFactor + pos[0];
          draft.uiState.canvasView.pan[1] =
            (draft.uiState.canvasView.pan[1] - pos[1]) * scaleFactor + pos[1];
        });
      } else {
        if (e.deltaMode !== 0) return;

        useAppState.getState().update(draft => {
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
