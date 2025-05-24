import { useEffect, useMemo, useRef, useState } from "react";
import { useDrawControl } from "../hooks/useDrawControl";
import { useViewControl } from "../hooks/useViewControl";
import { StateRender } from "../model/state";
import { useAppState } from "../store/appState";
import CanvasArea from "./CanvasArea";

export default function MainCanvasArea() {
  const store = useAppState();

  const containerRef = useRef<null | HTMLDivElement>(null);
  const canvasRef = useRef<null | HTMLCanvasElement>(null);

  const { layerMod, eyeDropper } = useDrawControl(containerRef, canvasRef);
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
      <CursorIndicator containerRef={containerRef} />
      {eyeDropper && (
        <EyeDropper
          containerRef={containerRef}
          color={eyeDropper.color}
          pos={eyeDropper.pos}
        />
      )}
    </CanvasArea>
  );
}

function CursorIndicator({
  containerRef,
}: {
  containerRef: { current: HTMLDivElement | null };
}) {
  const store = useAppState();
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(
    null
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const rect = el.getBoundingClientRect();
      setCursorPos({
        x: e.clientX - rect.left - rect.width / 2,
        y: e.clientY - rect.top - rect.height / 2,
      });
    };
    const handlePointerLeave = () => {
      setCursorPos(null);
    };
    el.addEventListener("pointermove", handlePointerMove);
    el.addEventListener("pointerleave", handlePointerLeave);
    return () => {
      el.removeEventListener("pointermove", handlePointerMove);
      el.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, [containerRef]);

  if (store.uiState.tool !== "brush" || !cursorPos) return null;

  return (
    <circle
      cx={cursorPos.x}
      cy={cursorPos.y}
      r={(store.uiState.penSize / 2) * store.uiState.canvasView.scale}
      stroke={store.uiState.color}
      strokeWidth={1}
      fill="none"
      pointerEvents="none"
    />
  );
}

function EyeDropper({
  containerRef,
  color,
  pos,
}: {
  containerRef: { current: HTMLDivElement | null };
  color: string;
  pos: [number, number];
}) {
  const view = useAppState((state) => state.uiState.canvasView);
  const canvasSize = useAppState(
    (state) => state.stateContainer.state.layers[0].canvas
  );

  const screenPos = useMemo(() => {
    const cx = canvasSize.width / 2;
    const cy = canvasSize.height / 2;
    const px = pos[0] - cx;
    const py = pos[1] - cy;
    const sin = Math.sin(view.angle);
    const cos = Math.cos(view.angle);
    const rx = px * cos - py * sin;
    const ry = px * sin + py * cos;
    const sx = rx * view.scale;
    const sy = ry * view.scale;
    return [sx + view.pan[0], sy + view.pan[1]];
  }, [containerRef, view, pos]);

  return (
    <circle
      cx={screenPos[0]}
      cy={screenPos[1]}
      r={52}
      stroke={color}
      strokeWidth={8}
      fill="none"
      pointerEvents="none"
    />
  );
}
