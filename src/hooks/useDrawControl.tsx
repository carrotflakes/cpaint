import { selectLasso, selectMagicWand, selectRect } from "@/store/selection";
import * as color from "color-convert";
import { JSX, useEffect, useRef, useState } from "react";
import { computePos } from "../components/CanvasArea";
import { CursorIndicator } from "../components/overlays/CursorIndicator";
import { EyeDropper } from "../components/overlays/EyeDropper";
import { EyeDropperLens } from "../components/overlays/EyeDropperLens";
import { LassoPath } from "../components/overlays/LassoPath";
import { SelectionRect } from "../components/overlays/SelectionRect";
import { isSafari } from "../libs/browser";
import { dist, Pos } from "../libs/geometry";
import { applyPressureCurve } from "../libs/pressureCurve";
import { Op } from "../model/op";
import { LayerMod } from "../model/state";
import {
  createOp,
  createTouch,
  useAppState,
  wrapTransferWithClip,
} from "../store/appState";
import { useGlobalSettings } from "../store/globalSetting";

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

function startDrawing(
  container: HTMLDivElement,
  e: PointerEvent,
  lockRef: React.RefObject<boolean>,
  drawOrPanningRef: { current: "draw" | "panning" | null },
  setRet: (ret: { layerMod?: LayerMod; overlay?: JSX.Element }) => void
) {
  const store = useAppState.getState();
  const { pressureCurve } = useGlobalSettings.getState();

  const layerId =
    store.stateContainer.state.layers[store.uiState.layerIndex]?.id;
  if (!layerId) return;

  const bucketFill = store.uiState.tool === "bucketFill";

  const pos = computePos(e, container);
  const pressure = applyPressureCurve(getPressure(e), pressureCurve);

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
  setRet({
    layerMod: {
      layerId,
      apply: touch.transfer,
    },
  });

  const onPointerMove = (e: PointerEvent) => {
    const pos = computePos(e, container);
    const pressure = applyPressureCurve(getPressure(e), pressureCurve);

    const viewScale = store.uiState.canvasView.scale;
    if (dist(lastPos, pos) * viewScale > (bucketFill ? 1 : 3)) {
      opPush(op, pos, pressure);

      touch.stroke(pos[0], pos[1], pressure);
      lastPos = pos;
      setRet({
        layerMod: {
          layerId,
          apply: touch.transfer,
        },
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
  };

  listenPointer(
    e,
    lockRef,
    drawOrPanningRef,
    setRet,
    onPointerMove,
    onPointerUp
  );
}

function startEyeDropper(
  container: HTMLDivElement,
  e: PointerEvent,
  lockRef: React.RefObject<boolean>,
  drawOrPanningRef: { current: "draw" | "panning" | null },
  canvas: HTMLCanvasElement,
  setRet: (ret: { layerMod?: LayerMod; overlay?: JSX.Element }) => void
) {
  const pos = computePos(e, container);

  const updateEyeDropper = (pos: Pos, final?: boolean) => {
    const ctx = canvas.getContext("2d")!;
    const color = pixelColor(ctx, pos[0], pos[1]);
    if (final) {
      useAppState.getState().update((draft) => {
        draft.uiState.color = color;
      });
    } else {
      const EyeDropperComponent = isSafari() ? EyeDropper : EyeDropperLens;
      setRet({
        overlay: (
          <EyeDropperComponent color={color} pos={pos} canvas={canvas} />
        ),
      });
    }
  };

  updateEyeDropper(pos);

  const onPointerMove = (e: PointerEvent) => {
    const pos = computePos(e, container);
    updateEyeDropper(pos);
  };
  const onPointerUp = (e: PointerEvent) => {
    if (e.type === "pointercancel") return;

    const pos = computePos(e, container);
    updateEyeDropper(pos, true);
  };

  listenPointer(
    e,
    lockRef,
    drawOrPanningRef,
    setRet,
    onPointerMove,
    onPointerUp
  );
}

function startSelection(
  container: HTMLDivElement,
  e: PointerEvent,
  lockRef: React.RefObject<boolean>,
  drawOrPanningRef: { current: "draw" | "panning" | null },
  setRet: (ret: { layerMod?: LayerMod; overlay?: JSX.Element }) => void
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

        setRet({
          overlay: <LassoPath path={[...lassoPath]} />,
        });
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
    };

    listenPointer(
      e,
      lockRef,
      drawOrPanningRef,
      setRet,
      onPointerMove,
      onPointerUp
    );
    return;
  }

  // Handle rectangular and elliptical selection
  const onPointerMove = (e: PointerEvent) => {
    const pos = computePos(e, container);
    setRet({
      overlay: (
        <SelectionRect
          rect={{
            x: Math.min(startPos[0], pos[0]),
            y: Math.min(startPos[1], pos[1]),
            width: Math.abs(pos[0] - startPos[0]),
            height: Math.abs(pos[1] - startPos[1]),
          }}
          ellipse={store.uiState.selectionTool === "ellipse"}
        />
      ),
    });
  };
  const onPointerUp = (e: PointerEvent) => {
    const pos = computePos(e, container);

    // WIP select rect
    selectRect(startPos, pos);
  };

  listenPointer(
    e,
    lockRef,
    drawOrPanningRef,
    setRet,
    onPointerMove,
    onPointerUp
  );
}

function listenPointer(
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

function getPressure(e: PointerEvent) {
  // NOTE: e.pressure will be 0 for touch events on iPad chrome.
  return e.pointerType === "touch" && e.pressure === 0 ? 0.5 : e.pressure;
}
