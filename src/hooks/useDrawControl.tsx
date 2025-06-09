import * as color from "color-convert";
import { JSX, useEffect, useState } from "react";
import { computePos } from "../components/CanvasArea";
import { CursorIndicator } from "../components/overlays/CursorIndicator";
import { EyeDropper } from "../components/overlays/EyeDropper";
import { LassoPath } from "../components/overlays/LassoPath";
import { dist, Pos } from "../libs/geometry";
import { Selection } from "../libs/Selection";
import { Op } from "../model/op";
import { LayerMod } from "../model/state";
import {
  createOp,
  createTouch,
  patchSelection,
  useAppState,
  wrapTransferWithClip,
} from "../store/appState";
import { useGlobalSettings } from "../store/globalSetting";
import { SelectionRect } from "../components/overlays/SelectionRect";
import { applyPressureCurve } from "../libs/pressureCurve";

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
  const store = useAppState.getState();
  const { pressureCurve } = useGlobalSettings.getState();

  const layerId =
    store.stateContainer.state.layers[store.uiState.layerIndex]?.id;
  if (!layerId) return;

  const bucketFill = store.uiState.tool === "bucketFill";

  const pos = computePos(e, container);
  const pressure = applyPressureCurve(e.pressure, pressureCurve);

  const touch = createTouch(store);
  if (touch == null) return;
  touch.transfer = wrapTransferWithClip(
    touch.transfer,
    store.stateContainer.state.selection
  );
  touch.stroke(pos[0], pos[1], pressure);

  let op = createOp(store);
  if (op == null) return;
  opPush(op, pos, pressure);

  if (!store.uiState.erase) store.addColorToHistory(store.uiState.color);

  let lastPos = pos;
  setLayerMod({
    layerId,
    apply: touch.transfer,
  });

  const onPointerMove = (e: PointerEvent) => {
    const pos = computePos(e, container);
    const pressure = applyPressureCurve(e.pressure, pressureCurve);

    const viewScale = store.uiState.canvasView.scale;
    if (dist(lastPos, pos) * viewScale > (bucketFill ? 1 : 3)) {
      opPush(op, pos, pressure);

      touch.stroke(pos[0], pos[1], pressure);
      lastPos = pos;
      setLayerMod({
        layerId,
        apply: touch.transfer,
      });
    }
  };

  const onPointerUp = (e: PointerEvent) => {
    const pos = computePos(e, container);
    const pressure = applyPressureCurve(e.pressure, pressureCurve);

    // If the pointer is moved, we need to add the last position
    if (e.type === "pointerup" && dist(lastPos, pos) > 0) {
      opPush(op, pos, pressure);

      touch.stroke(pos[0], pos[1], pressure);
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
    if (e.type === "pointercancel")
      return;

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

  // Handle magic wand selection
  if (store.uiState.selectionTool === "magicWand") {
    const pos = computePos(e, container);
    selectMagicWand(Math.round(pos[0]), Math.round(pos[1]));
    return;
  }

  // Handle lasso selection
  if (store.uiState.selectionTool === "lasso") {
    const lassoPath: { x: number; y: number }[] = [
      { x: startPos[0], y: startPos[1] },
    ];

    const onPointerMove = (e: PointerEvent) => {
      const pos = computePos(e, container);

      const lastPoint = lassoPath.at(-1)!;
      const distance = Math.sqrt(
        Math.pow(pos[0] - lastPoint.x, 2) + Math.pow(pos[1] - lastPoint.y, 2)
      );

      if (distance > 2) {
        lassoPath.push({ x: pos[0], y: pos[1] });

        setOverlay(<LassoPath path={[...lassoPath]} />);
      }
    };

    const onPointerUp = () => {
      // Close the path by connecting back to start if needed
      if (lassoPath.length > 2) {
        const firstPoint = lassoPath[0];
        const lastPoint = lassoPath.at(-1)!;
        const distance = Math.sqrt(
          Math.pow(lastPoint.x - firstPoint.x, 2) +
          Math.pow(lastPoint.y - firstPoint.y, 2)
        );

        // Only add closing point if the path isn't already closed
        if (distance > 5) {
          lassoPath.push({ x: firstPoint.x, y: firstPoint.y });
        }

        // Apply lasso selection
        selectLasso(lassoPath);
      }

      setOverlay(null);
    };

    listenPointer(e.pointerId, setLock, onPointerMove, onPointerUp);
    return;
  }

  // Handle rectangular and elliptical selection
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
    selectRect(startPos, pos);
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

function selectRect(startPos: [number, number], endPos: [number, number]) {
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
  patchSelection(selection);
}

function selectLasso(path: Array<{ x: number; y: number }>) {
  const store = useAppState.getState();
  const firstCanvas = store.stateContainer.state.layers[0].canvas;
  const selection =
    store.stateContainer.state.selection?.clone() ??
    new Selection(firstCanvas.width, firstCanvas.height, false);

  selection.addLasso(path, store.uiState.selectionOperation);
  patchSelection(selection);
}

function selectMagicWand(x: number, y: number) {
  const store = useAppState.getState();
  const firstCanvas = store.stateContainer.state.layers[0].canvas;
  const selection =
    store.stateContainer.state.selection?.clone() ??
    new Selection(firstCanvas.width, firstCanvas.height, false);

  selection.addMagicWand(
    firstCanvas.getCanvas(),
    x,
    y,
    store.uiState.selectionTolerance
  );
  patchSelection(selection);
}
