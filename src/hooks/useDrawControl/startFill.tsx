import { computePos } from "@/components/CanvasArea";
import { SimplePath } from "@/components/overlays/SimplePath";
import { Op } from "@/model/op";
import { LayerMod } from "@/model/StateRenderer";
import { useAppState, wrapTransferWithClip } from "@/store/appState";
import { JSX } from "react";
import { listenPointer } from ".";
import { createFill } from "../../libs/createFill";

export function startFill(
  container: HTMLDivElement,
  e: PointerEvent,
  lockRef: React.RefObject<boolean>,
  drawOrPanningRef: { current: "draw" | "panning" | null },
  setRet: (ret: { layerMod?: LayerMod; overlay?: JSX.Element }) => void
) {
  const store = useAppState.getState();
  const op: Op = {
    type: "fill",
    fillColor: store.uiState.color,
    opacity: store.uiState.opacity,
    erase: store.uiState.erase,
    layerId: store.uiState.currentLayerId,
    path: [],
  };

  const startPos = computePos(e, container);

  const path: { x: number; y: number }[] = [{ x: startPos[0], y: startPos[1] }];

  const onPointerMove = (e: PointerEvent) => {
    const pos = computePos(e, container);

    const lastPoint = path.at(-1)!;
    const distance = Math.sqrt(
      Math.pow(pos[0] - lastPoint.x, 2) + Math.pow(pos[1] - lastPoint.y, 2)
    );

    if (distance > 2) {
      path.push({ x: pos[0], y: pos[1] });

      setRet({
        overlay: <SimplePath path={[...path]} color={op.fillColor} />,
      });
    }
  };

  const onPointerUp = () => {
    op.path = path.map((p) => [p.x, p.y]);

    let transfer = createFill(op.path, op.fillColor, op.opacity, op.erase);
    transfer = wrapTransferWithClip(
      transfer,
      store.stateContainer.state.selection
    );

    store.apply(op, {
      layerId: op.layerId,
      apply: transfer,
      rect: pathToBounds(path),
    });
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

function pathToBounds(path: { x: number; y: number }[]) {
  if (path.length <= 1) return "none";

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const point of path) {
    if (point.x < minX) minX = point.x;
    if (point.y < minY) minY = point.y;
    if (point.x > maxX) maxX = point.x;
    if (point.y > maxY) maxY = point.y;
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
