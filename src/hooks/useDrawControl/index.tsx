import { CursorIndicator } from "@/components/overlays/CursorIndicator";
import { dist, Pos } from "@/libs/geometry";
import { LayerMod } from "@/model/state";
import { useAppState } from "@/store/appState";
import { useGlobalSettings } from "@/store/globalSetting";
import { JSX, useEffect, useRef, useState } from "react";
import { startDrawing } from "./startDrawing";
import { startEyeDropper } from "./startEyeDropper";
import { startSelection } from "./startSelection";

export function useDrawControl(
  containerRef: {
    current: HTMLDivElement | null;
  },
  canvasRef: {
    current: HTMLCanvasElement | null;
  },
  drawOrPanningRef: { current: "draw" | "panning" | null }
) {
  const { touchToDraw } = useGlobalSettings((state) => state);
  const lockRef = useRef(false);
  const [ret, setRet] = useState<{
    layerMod?: LayerMod;
    overlay?: JSX.Element;
  }>({});

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onPointerDown = (e: PointerEvent) => {
      if (lockRef.current) return;

      e.preventDefault();

      if (
        (e.pointerType === "mouse" && e.button === 0) ||
        e.pointerType === "pen" ||
        (touchToDraw && e.pointerType === "touch")
      ) {
        const store = useAppState.getState();
        switch (store.uiState.tool) {
          case "brush":
          case "bucketFill":
          case "fill":
            startDrawing(container, e, lockRef, drawOrPanningRef, setRet);
            break;
          case "eyeDropper":
            canvasRef.current &&
              startEyeDropper(
                container,
                e,
                lockRef,
                drawOrPanningRef,
                canvasRef.current,
                setRet
              );
            break;
          case "selection":
            startSelection(container, e, lockRef, drawOrPanningRef, setRet);
            break;
        }
      }
    };

    container.addEventListener("pointerdown", onPointerDown);
    return () => {
      container.removeEventListener("pointerdown", onPointerDown);
    };
  }, [containerRef, touchToDraw]);

  return {
    layerMod: ret.layerMod ?? null,
    overlay: ret.overlay ?? <CursorIndicator containerRef={containerRef} />,
  };
}

export function listenPointer(
  e: PointerEvent,
  lockRef: React.RefObject<boolean>,
  drawOrPanningRef: { current: "draw" | "panning" | null },
  setRet: (ret: { layerMod?: LayerMod; overlay?: JSX.Element }) => void,
  onPointerMove: (e: PointerEvent) => void,
  onPointerUp: (e: PointerEvent) => void
) {
  const pointerId = e.pointerId;
  const pos: Pos = [e.clientX, e.clientY];
  lockRef.current = true;

  const cleanup = () => {
    lockRef.current = false;
    if (drawOrPanningRef?.current === "draw") drawOrPanningRef.current = null;
    setRet({});

    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);
  };

  const onMove = (e: PointerEvent) => {
    if (e.pointerId !== pointerId) return;
    if (drawOrPanningRef?.current && drawOrPanningRef.current !== "draw") {
      cleanup();
      return;
    }
    if (
      drawOrPanningRef?.current === null &&
      dist(pos, [e.clientX, e.clientY]) > 3
    ) {
      drawOrPanningRef.current = "draw";
    }

    onPointerMove(e);
  };

  const onUp = (e: PointerEvent) => {
    if (e.pointerId !== pointerId) return;
    onPointerUp(e);
    cleanup();
  };

  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
}
