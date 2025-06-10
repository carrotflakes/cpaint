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
  useKeyboardShortcuts();

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    StateRender(store.stateContainer.state.layers, ctx, layerMod);
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

function useKeyboardShortcuts() {
  const store = useAppState();

  useEffect(() => {
    const keyDown = (e: KeyboardEvent) => {
      if (e.key === "p")
        useAppState.setState({ uiState: { ...store.uiState, tool: "brush" } });
      if (e.key === "e")
        useAppState.getState().update((draft) => {
          draft.uiState.erase = !draft.uiState.erase;
        });
      if (e.key === "f")
        useAppState.setState({ uiState: { ...store.uiState, tool: "fill" } });
      if (e.ctrlKey && e.key === "z") store.undo();
      if (e.ctrlKey && e.key === "Z") store.redo();
    };
    window.addEventListener("keydown", keyDown);
    return () => window.removeEventListener("keydown", keyDown);
  }, [store.uiState, store.undo, store.redo]);
}
