import { useEffect, useMemo, useState } from "react";
import { useAppState } from "../../store/appState";
import { viewToSVGTransform } from "../CanvasArea";

export function SelectionOverlay() {
  const store = useAppState();
  const selection = store.stateContainer.state.selection;
  const view = store.uiState.canvasView;
  const canvasSize = store.canvasSize();
  const [dashOffset, setDashOffset] = useState(0);

  const path = useMemo(() => {
    return selection?.toPath() ?? "";
  }, [selection]);

  // Animate marching ants
  const startTime = useMemo(() => Date.now(), []);
  useEffect(() => {
    let animationId: number;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const speed = 0.01;
      const newOffset = (elapsed * speed) % 16;
      setDashOffset(newOffset);
      animationId = requestAnimationFrame(animate);
    };

    if (selection) {
      animationId = requestAnimationFrame(animate);
    }

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [selection]);

  const transform = useMemo(
    () => viewToSVGTransform(view, canvasSize),
    [view, canvasSize]
  );

  const dashSize = 8 / view.scale;

  return (
    <g transform={transform}>
      <path
        d={path}
        stroke="black"
        strokeWidth={1 / view.scale}
        strokeDasharray={`${dashSize} ${dashSize}`}
        strokeDashoffset={dashOffset / view.scale}
        fill="none"
      />
      <path
        d={path}
        stroke="white"
        strokeWidth={1 / view.scale}
        strokeDasharray={`${dashSize} ${dashSize}`}
        strokeDashoffset={((dashOffset + 8) % 16) / view.scale}
        fill="none"
      />
    </g>
  );
}
