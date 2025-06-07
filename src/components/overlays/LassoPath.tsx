import { useMemo } from "react";
import { useAppState } from "../../store/appState";
import { viewToSVGTransform } from "../CanvasArea";

export function LassoPath({ path }: { path: { x: number; y: number }[] }) {
  const store = useAppState();
  const view = store.uiState.canvasView;

  const transform = useMemo(
    () => viewToSVGTransform(view, store.stateContainer.state.layers[0].canvas),
    [view, store.stateContainer.state.layers[0].canvas]
  );

  const pathString = useMemo(() => {
    if (path.length < 2) return "";

    const commands = path.map((point, index) => {
      return `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`;
    });

    return commands.join(" ");
  }, [path]);

  if (path.length < 2) return null;

  return (
    <path
      d={pathString}
      stroke="black"
      strokeWidth={1 / view.scale}
      fill="none"
      transform={transform}
    />
  );
}
