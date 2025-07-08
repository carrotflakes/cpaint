import { computePos } from "@/components/CanvasArea";
import { EyeDropper } from "@/components/overlays/EyeDropper";
import { EyeDropperLens } from "@/components/overlays/EyeDropperLens";
import { isSafari } from "@/libs/browser";
import { Pos } from "@/libs/geometry";
import { LayerMod } from "@/model/StateRenderer";
import { useAppState } from "@/store/appState";
import * as color from "color-convert";
import { JSX } from "react";
import { listenPointer } from ".";

export function startEyeDropper(
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

export function pixelColor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number
) {
  const imageData = ctx.getImageData(x, y, 1, 1);
  return (
    "#" +
    color.rgb.hex([imageData.data[0], imageData.data[1], imageData.data[2]])
  );
}
