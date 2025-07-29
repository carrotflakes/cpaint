import { computePos } from "@/components/CanvasArea";
import { dist } from "@/libs/geometry";
import { applyPressureCurve } from "@/libs/pressureCurve";
import { Op } from "@/model/op";
import { LayerMod } from "@/model/StateRenderer";
import {
  createOp,
  createTouch,
  useAppState,
  wrapTransferWithClip,
} from "@/store/appState";
import { useGlobalSettings } from "@/store/globalSetting";
import { JSX } from "react";
import { listenPointer } from ".";

export function startDrawing(
  container: HTMLDivElement,
  e: PointerEvent,
  lockRef: React.RefObject<boolean>,
  drawOrPanningRef: { current: "draw" | "panning" | null },
  setRet: (ret: { layerMod?: LayerMod; overlay?: JSX.Element }) => void
) {
  const store = useAppState.getState();
  const { pressureCurve } = useGlobalSettings.getState();

  const layerId = store.uiState.currentLayerId;
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
      rect: touch.rect ? roundRect(touch.rect) : "none",
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
          rect: touch.rect ? roundRect(touch.rect) : "none",
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
    store.apply(op, {
      layerId,
      apply: touch.transfer,
      rect: touch.rect ? roundRect(touch.rect) : "none",
    });
  };

  listenPointer(
    e,
    lockRef,
    drawOrPanningRef,
    setRet,
    onPointerMove,
    onPointerUp,
    true
  );
}

export function opPush(op: Op, pos: [number, number], pressure: number) {
  if (op.type === "bucketFill") {
    op.pos = pos;
  } else if (op.type === "stroke") {
    op.path.push({ pos, pressure });
  } else {
    throw new Error(`Unsupported operation type: ${op.type}`);
  }
}

export function getPressure(e: PointerEvent) {
  // NOTE: e.pressure will be 0 for touch events on iPad chrome.
  return e.pointerType === "touch" && e.pressure === 0 ? 0.5 : e.pressure;
}

export function roundRect(rect: {
  x: number;
  y: number;
  width: number;
  height: number;
}) {
  const x = Math.floor(rect.x);
  const y = Math.floor(rect.y);
  return {
    x,
    y,
    width: Math.ceil(rect.x + rect.width) - x,
    height: Math.ceil(rect.y + rect.height) - y,
  };
}
