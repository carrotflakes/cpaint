import { useState, useEffect } from "react";
import { useAppState } from "../../store/appState";

export function CursorIndicator({
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
