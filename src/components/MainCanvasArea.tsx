import { useEffect, useRef } from "react";
import { useDrawControl } from "../hooks/useDrawControl";
import { useViewControl } from "../hooks/useViewControl";
import { StateRender } from "../model/state";
import { useAppState } from "../store/appState";
import CanvasArea from "./CanvasArea";
import { SelectionOverlay } from "./overlays/SelectionOverlay";

export default function MainCanvasArea() {
  const store = useAppState();

  const containerRef = useRef<null | HTMLDivElement>(null);
  const canvasRef = useRef<null | HTMLCanvasElement>(null);

  const { layerMod, overlay } = useDrawControl(containerRef, canvasRef);
  useViewControl(containerRef);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    StateRender(store.stateContainer.state, ctx, layerMod);
  }, [store.stateContainer.state, canvasRef, layerMod]);

  const firstCanvas = store.stateContainer.state.layers[0].canvas;
  return (
    <CanvasArea
      canvasSize={firstCanvas}
      canvasView={store.uiState.canvasView}
      containerRef={containerRef}
      canvasRef={canvasRef}
    >
      {overlay}
      <SelectionOverlay />
    </CanvasArea>
  );
}
