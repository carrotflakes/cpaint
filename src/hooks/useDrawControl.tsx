import * as color from "color-convert";
import { JSX, useEffect, useState } from "react";
import { computePos } from "../components/CanvasArea";
import { CursorIndicator } from "../components/overlays/CursorIndicator";
import { EyeDropper } from "../components/overlays/EyeDropper";
import { dist, Pos } from "../libs/geometry";
import { Selection } from "../libs/selection";
import { Op } from "../model/op";
import { LayerMod, State } from "../model/state";
import { createOp, createTouch, useAppState } from "../store/appState";
import { useGlobalSettings } from "../store/globalSetting";
import { SelectionRect } from "../components/overlays/SelectionRect";

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
  const [overlay, setOverlay] = useState<JSX.Element | null>(null);

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
            canvasRef.current &&
              startEyeDropper(
                container,
                e,
                setLock,
                canvasRef.current,
                setOverlay
              );
            break;
          case "selection":
            startSelection(container, e, setLock, setOverlay);
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
    layerMod,
    overlay: overlay ?? <CursorIndicator containerRef={containerRef} />,
  };
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

  let lastPos = pos;
  setLayerMod({
    layerId,
    apply: touch.transfer,
  });

  const onPointerMove = (e: PointerEvent) => {
    const pos = computePos(e, container);

    const viewScale = store.uiState.canvasView.scale;
    if (dist(lastPos, pos) * viewScale > (bucketFill ? 1 : 3)) {
      opPush(op, pos, e.pressure);

      touch.stroke(pos[0], pos[1], e.pressure);
      lastPos = pos;
      setLayerMod({
        layerId,
        apply: touch.transfer,
      });
    }
  };

  const onPointerUp = (e: PointerEvent) => {
    const pos = computePos(e, container);

    // If the pointer is moved, we need to add the last position
    if (dist(lastPos, pos) > 0) {
      opPush(op, pos, e.pressure);

      touch.stroke(pos[0], pos[1], 0);
    }

    touch.end();
    store.apply(op, touch.transfer);

    setLayerMod(null);
  };

  listenPointer(e.pointerId, setLock, onPointerMove, onPointerUp);
}

function startEyeDropper(
  container: HTMLDivElement,
  e: PointerEvent,
  setLock: (lock: boolean) => void,
  canvas: HTMLCanvasElement,
  setOverlay: (overlay: JSX.Element | null) => void
) {
  const pos = computePos(e, container);

  const updateEyeDropper = (pos: Pos, final?: boolean) => {
    const ctx = canvas.getContext("2d")!;
    const color = pixelColor(ctx, pos[0], pos[1]);
    if (final) {
      useAppState.getState().update((draft) => {
        draft.uiState.color = color;
      });
      setOverlay(null);
    } else {
      setOverlay(<EyeDropper color={color} pos={pos} />);
    }
  };

  updateEyeDropper(pos);

  const onPointerMove = (e: PointerEvent) => {
    const pos = computePos(e, container);
    updateEyeDropper(pos);
  };
  const onPointerUp = (e: PointerEvent) => {
    const pos = computePos(e, container);
    updateEyeDropper(pos, true);
  };

  listenPointer(e.pointerId, setLock, onPointerMove, onPointerUp);
}

function startSelection(
  container: HTMLDivElement,
  e: PointerEvent,
  setLock: (lock: boolean) => void,
  setOverlay: (overlay: JSX.Element | null) => void
) {
  const startPos = computePos(e, container);
  const store = useAppState.getState();

  const onPointerMove = (e: PointerEvent) => {
    const pos = computePos(e, container);
    setOverlay(
      <SelectionRect
        rect={{
          x: Math.min(startPos[0], pos[0]),
          y: Math.min(startPos[1], pos[1]),
          width: Math.abs(pos[0] - startPos[0]),
          height: Math.abs(pos[1] - startPos[1]),
        }}
        ellipse={store.uiState.selectionTool === "ellipse"}
      />
    );
  };
  const onPointerUp = (e: PointerEvent) => {
    const pos = computePos(e, container);

    // WIP select rect
    select(startPos, pos);
    setOverlay(null);
  };

  listenPointer(e.pointerId, setLock, onPointerMove, onPointerUp);
}

function listenPointer(
  pointerId: number,
  setLock: (lock: boolean) => void,
  onPointerMove: (e: PointerEvent) => void,
  onPointerUp: (e: PointerEvent) => void
) {
  setLock(true);
  const onMove = (e: PointerEvent) => {
    if (e.pointerId !== pointerId) return;
    onPointerMove(e);
  };
  const onUp = (e: PointerEvent) => {
    if (e.pointerId !== pointerId) return;
    onPointerUp(e);
    setLock(false);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);
  };
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
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
  if (store.uiState.selectionTool === "ellipse") {
    selection.addEllipse(
      (startPos[0] + endPos[0]) / 2,
      (startPos[1] + endPos[1]) / 2,
      Math.abs(endPos[0] - startPos[0]) / 2,
      Math.abs(endPos[1] - startPos[1]) / 2,
      store.uiState.selectionOperation
    );
  } else {
    selection.addRect(
      Math.round(Math.min(startPos[0], endPos[0])),
      Math.round(Math.min(startPos[1], endPos[1])),
      Math.round(Math.abs(endPos[0] - startPos[0])),
      Math.round(Math.abs(endPos[1] - startPos[1])),
      store.uiState.selectionOperation
    );
  }
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
