import { useEffect, useRef } from "react";
import { useViewControl } from "../hooks/useViewControl";
import { StateRender } from "../model/state";
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

    // Render all layers with the current layer replaced by preview canvas
    const layers = store.stateContainer.state.layers.map((layer, index) => {
      if (index === store.uiState.layerIndex) {
        return {
          ...layer,
          canvas: effectPreview.previewCanvas,
        };
      }
      return layer;
    });

    StateRender(layers, ctx, null);
  }, [
    store.stateContainer.state.layers,
    effectPreview?.previewCanvas,
    store.uiState.layerIndex,
    canvasRef,
  ]);

  if (!effectPreview) {
    return "Oops, not in effect preview mode🤔";
  }

  const firstCanvas = store.stateContainer.state.layers[0].canvas;
  return (
    <div className="relative w-full h-full">
      <CanvasArea
        canvasSize={firstCanvas}
        canvasView={store.uiState.canvasView}
        containerRef={containerRef}
        canvasRef={canvasRef}
      />

      <EffectPreviewDialog initialEffect={effectPreview.effect} />
    </div>
  );
}
