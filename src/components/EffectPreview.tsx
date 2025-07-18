import { StateContainerRender } from "@/model/stateContainer";
import { useEffect, useRef } from "react";
import { useViewControl } from "../hooks/useViewControl";
import { useAppState } from "../store/appState";
import CanvasArea from "./CanvasArea";
import { EffectPreviewDialog } from "./toolbar/EffectPreviewDialog";

export default function EffectPreview() {
  const store = useAppState();
  const effectPreview = store.mode.type === "effectPreview" ? store.mode : null;

  const containerRef = useRef<null | HTMLDivElement>(null);
  const canvasRef = useRef<null | HTMLCanvasElement>(null);

  useViewControl(containerRef);

  useEffect(() => {
    if (!effectPreview) return;

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    const layerMod = {
      layerId: store.uiState.currentLayerId,
      apply: (
        ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
      ) => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(effectPreview.previewCanvas.getCanvas(), 0, 0);
      },
    };

    StateContainerRender(store.stateContainer, ctx, layerMod);
  }, [
    store.stateContainer.state.layers,
    effectPreview?.previewCanvas.getVersion(),
    store.uiState.currentLayerId,
    canvasRef,
  ]);

  if (!effectPreview) {
    return "Oops, not in effect preview mode🤔";
  }

  const canvasSize = store.canvasSize();
  return (
    <div className="relative w-full h-full">
      <CanvasArea
        canvasSize={canvasSize}
        canvasView={store.uiState.canvasView}
        containerRef={containerRef}
        canvasRef={canvasRef}
      />

      <EffectPreviewDialog initialEffect={effectPreview.effect} />
    </div>
  );
}
