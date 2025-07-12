import { computePos } from "@/components/CanvasArea";
import { SimplePath } from "@/components/overlays/SimplePath";
import { Op } from "@/model/op";
import { LayerMod } from "@/model/StateRenderer";
import { useAppState, wrapTransferWithClip } from "@/store/appState";
import { JSX } from "react";
import { listenPointer } from ".";

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

    let transfer = createFill(path, op.fillColor, op.opacity, op.erase);
    transfer = wrapTransferWithClip(
      transfer,
      store.stateContainer.state.selection
    );

    store.apply(op, transfer);
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

function createFill(
  path: { x: number; y: number }[],
  color: string,
  opacity: number,
  erase: boolean
) {
  return (
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
  ) => {
    ctx.save();
    ctx.fillStyle = color;
    ctx.globalAlpha = opacity;
    if (erase) ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    for (const p of path) ctx.lineTo(p.x, p.y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };
}
