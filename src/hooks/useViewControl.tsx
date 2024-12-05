import { useEffect } from "react";
import { useGlobalSettings, useStore } from "../state";

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

        useStore.setState((state) => {
          const scale = state.canvasView.scale * scaleFactor;
          const pan = [
            (state.canvasView.pan[0] - pos[0]) * scaleFactor + pos[0],
            (state.canvasView.pan[1] - pos[1]) * scaleFactor + pos[1],
          ] as Pos;
          return {
            canvasView: {
              ...state.canvasView,
              scale,
              pan,
            },
          };
        });
      } else {
        if (e.deltaMode !== 0) return;

        useStore.setState((state) => {
          return {
            canvasView: {
              ...state.canvasView,
              pan: [
                state.canvasView.pan[0] - e.deltaX,
                state.canvasView.pan[1] - e.deltaY,
              ],
            },
          };
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
