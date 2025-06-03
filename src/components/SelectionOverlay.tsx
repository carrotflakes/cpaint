import { useMemo, useState, useEffect } from "react";
import { useAppState } from "../store/appState";

export function SelectionOverlay() {
  const store = useAppState();
  const selection = store.stateContainer.state.selection;
  const view = store.uiState.canvasView;
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
    () => viewToSVGTransform(view, store.stateContainer.state.layers[0].canvas),
    [view, store.stateContainer.state.layers[0].canvas]
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

export function viewToSVGTransform(
  canvasView: {
    angle: number;
    scale: number;
    pan: [number, number];
  },
  canvasSize: { width: number; height: number }
): string {
  return `translate(${canvasView.pan[0]} ${canvasView.pan[1]}) rotate(${
    (canvasView.angle / (2 * Math.PI)) * 360
  }) scale(${canvasView.scale}) translate(${-canvasSize.width / 2} ${
    -canvasSize.height / 2
  })`;
}
