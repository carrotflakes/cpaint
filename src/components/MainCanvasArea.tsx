import { useDrawControl } from "@/hooks/useDrawControl";
import { StateContainerRender } from "@/model/stateContainer";
import { useEffect, useRef } from "react";
import { useGestureControl } from "../hooks/useGestureControl";
import { useViewControl } from "../hooks/useViewControl";
import { useAppState } from "../store/appState";
import { save } from "../store/save";
import CanvasArea from "./CanvasArea";
import { SelectionOverlay } from "./overlays/SelectionOverlay";

export default function MainCanvasArea() {
  const store = useAppState();

  const containerRef = useRef<null | HTMLDivElement>(null);
  const canvasRef = useRef<null | HTMLCanvasElement>(null);

  const drawOrPanningRef = useRef<"draw" | "panning" | null>(null);
  const { layerMod, overlay, selection } = useDrawControl(
    containerRef,
    canvasRef,
    drawOrPanningRef
  );
  useViewControl(containerRef, drawOrPanningRef);
  useKeyboardShortcuts();
  useGestureControl(containerRef);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    StateContainerRender(store.stateContainer, ctx, layerMod);
  }, [store.stateContainer, canvasRef, layerMod]);

  const canvasSize = store.canvasSize();
  return (
    <CanvasArea
      canvasSize={canvasSize}
      canvasView={store.uiState.canvasView}
      containerRef={containerRef}
      canvasRef={canvasRef}
    >
      {overlay}
      <SelectionOverlay
        selection={selection ?? store.stateContainer.state.selection}
      />
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
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        save();
      }
      if (e.ctrlKey && e.key === "z") store.undo();
      if (e.ctrlKey && e.key === "Z") store.redo();
    };
    window.addEventListener("keydown", keyDown);
    return () => window.removeEventListener("keydown", keyDown);
  }, [store.uiState, store.undo, store.redo]);
}
