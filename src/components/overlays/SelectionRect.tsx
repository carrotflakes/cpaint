import { useMemo } from "react";
import { useAppState } from "../../store/appState";
import { viewToSVGTransform } from "../CanvasArea";

export function SelectionRect({
  rect,
  ellipse = false,
}: {
  rect: { x: number; y: number; width: number; height: number };
  ellipse?: boolean;
}) {
  const store = useAppState();
  const view = store.uiState.canvasView;

  const transform = useMemo(
    () => viewToSVGTransform(view, store.stateContainer.state.layers[0].canvas),
    [view, store.stateContainer.state.layers[0].canvas]
  );

  if (ellipse) {
    return (
      <ellipse
        cx={rect.x + rect.width / 2}
        cy={rect.y + rect.height / 2}
        rx={rect.width / 2}
        ry={rect.height / 2}
        stroke="black"
        strokeWidth={1 / view.scale}
        fill="none"
        transform={transform}
      />
    );
  }

  return (
    <rect
      x={rect.x}
      y={rect.y}
      width={rect.width}
      height={rect.height}
      stroke="black"
      strokeWidth={1 / view.scale}
      fill="none"
      transform={transform}
    />
  );
}
