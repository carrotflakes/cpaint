import * as color from "color-convert";
import { useCallback, useEffect, useState } from "react";
import { computePos } from "../components/CanvasArea";
import { CursorIndicator } from "../components/overlays/CursorIndicator";
import { EyeDropper } from "../components/overlays/EyeDropper";
import { dist, Pos } from "../libs/geometry";
import { Selection } from "../libs/selection";
import { Op } from "../model/op";
import { LayerMod, State } from "../model/state";
import { createOp, createTouch, useAppState } from "../store/appState";
import { useGlobalSettings } from "../store/globalSetting";

export function useDrawControl(
  containerRef: {
    current: HTMLDivElement | null;
  },
  canvasRef: {
    current: HTMLCanvasElement | null;
  }
) {
  const { touchToDraw } = useGlobalSettings((state) => state);
  const [lock, setLock] = useState(false);
  const [layerMod, setLayerMod] = useState<null | LayerMod>(null);
  const { eyeDropper, updateEyeDropper } = useEyeDropper(canvasRef);

  useEffect(() => {
    if (lock) return;

    const container = containerRef.current;
    if (!container) return;

    const onPointerDown = (e: PointerEvent) => {
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
            startDrawing(container, e, setLock, setLayerMod);
            break;
          case "eyeDropper":
            startEyeDropper(container, e, setLock, updateEyeDropper);
            break;
          case "selection":
            startSelection(container, e, setLock);
            break;
        }
      }
    };

    container.addEventListener("pointerdown", onPointerDown);
    return () => {
      container.removeEventListener("pointerdown", onPointerDown);
    };
  }, [containerRef, touchToDraw]);

  const overlay = (
    <>
      <CursorIndicator containerRef={containerRef} />
      {eyeDropper && (
        <EyeDropper color={eyeDropper.color} pos={eyeDropper.pos} />
      )}
    </>
  );

  return { layerMod, overlay };
}

function startDrawing(
  container: HTMLDivElement,
  e: PointerEvent,
  setLock: (lock: boolean) => void,
  setLayerMod: (mod: LayerMod | null) => void
) {
  const pos = computePos(e, container);
  const store = useAppState.getState();

  const layerId =
    store.stateContainer.state.layers[store.uiState.layerIndex]?.id;
  if (!layerId) return;

  const bucketFill = store.uiState.tool === "bucketFill";

  const touch = createTouch(store);
  if (touch == null) return;
  touch.stroke(pos[0], pos[1], e.pressure);

  let op = createOp(store);
  if (op == null) return;
  opPush(op, pos, e.pressure);

  if (!store.uiState.erase) store.addColorToHistory(store.uiState.color);

  const state = {
    lastPos: pos,
    pointerId: e.pointerId,
  };
  setLayerMod({
    layerId,
    apply: touch.transfer,
  });
  setLock(true);

  const onPointerMove = (e: PointerEvent) => {
    if (e.pointerId !== state.pointerId) return;
    const pos = computePos(e, container);

    const { lastPos } = state;
    if (dist(lastPos, pos) > (bucketFill ? 1 : 3)) {
      opPush(op, pos, e.pressure);

      touch.stroke(pos[0], pos[1], e.pressure);
      state.lastPos = pos;
      setLayerMod({
        layerId,
        apply: touch.transfer,
      });
    }
  };

  const onPointerUp = (e: PointerEvent) => {
    if (e.pointerId !== state.pointerId) return;

    const pos = computePos(e, container);

    // If the pointer is moved, we need to add the last position
    if (dist(state.lastPos, pos) > 0) {
      opPush(op, pos, e.pressure);

      touch.stroke(pos[0], pos[1], 0);
    }

    touch.end();
    store.apply(op, touch.transfer);

    setLayerMod(null);
    setLock(false);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerUp);
  };

  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);
}

function startEyeDropper(
  container: HTMLDivElement,
  e: PointerEvent,
  setLock: (lock: boolean) => void,
  updateEyeDropper: (pos: Pos, final?: boolean) => void
) {
  const pos = computePos(e, container);
  const pointerId = e.pointerId;
  updateEyeDropper(pos);
  setLock(true);
  const onPointerMove = (e: PointerEvent) => {
    if (e.pointerId !== pointerId) return;
    const pos = computePos(e, container);
    updateEyeDropper(pos);
  };
  const onPointerUp = (e: PointerEvent) => {
    if (e.pointerId !== pointerId) return;
    const pos = computePos(e, container);
    updateEyeDropper(pos, true);
    setLock(false);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerUp);
  };
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);
}

function startSelection(
  container: HTMLDivElement,
  e: PointerEvent,
  setLock: (lock: boolean) => void
) {
  const startPos = computePos(e, container);
  const pointerId = e.pointerId;
  setLock(true);
  const onPointerUp = (e: PointerEvent) => {
    if (e.pointerId !== pointerId) return;
    const pos = computePos(e, container);

    // WIP select rect
    select(startPos, pos);

    setLock(false);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerUp);
  };
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);
}

function opPush(op: Op, pos: [number, number], pressure: number) {
  if (op.type === "fill") {
    op.path.push({ pos });
  } else if (op.type === "bucketFill") {
    op.pos = pos;
  } else if (op.type === "stroke") {
    op.path.push({ pos, pressure });
  } else {
    throw new Error(`Unsupported operation type: ${op.type}`);
  }
}

function useEyeDropper(canvasRef: { current: HTMLCanvasElement | null }) {
  const [eyeDropper, setEyeDropper] = useState<null | {
    pos: [number, number];
    color: string;
  }>(null);

  const updateEyeDropper = useCallback(
    (pos: Pos, final?: boolean) => {
      const ctx = canvasRef.current?.getContext("2d")!;
      const color = pixelColor(ctx, pos[0], pos[1]);
      if (final) {
        useAppState.getState().update((draft) => {
          draft.uiState.color = color;
        });
        setEyeDropper(null);
      } else {
        setEyeDropper({ pos, color });
      }
    },
    [canvasRef]
  );

  return { eyeDropper, updateEyeDropper };
}

function pixelColor(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const imageData = ctx.getImageData(x, y, 1, 1);
  return (
    "#" +
    color.rgb.hex([imageData.data[0], imageData.data[1], imageData.data[2]])
  );
}

function select(startPos: [number, number], endPos: [number, number]) {
  const store = useAppState.getState();
  const firstCanvas = store.stateContainer.state.layers[0].canvas;
  const selection =
    store.stateContainer.state.selection?.clone() ??
    new Selection(firstCanvas.width, firstCanvas.height, false);
  selection.addRect(
    Math.round(Math.min(startPos[0], endPos[0])),
    Math.round(Math.min(startPos[1], endPos[1])),
    Math.round(Math.abs(endPos[0] - startPos[0])),
    Math.round(Math.abs(endPos[1] - startPos[1]))
  );
  store.apply(
    {
      type: "patch",
      patches: [
        {
          op: "replace",
          path: "/selection",
          value: selection satisfies State["selection"],
        },
      ],
    },
    null
  );
}
