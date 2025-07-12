import { useMemo } from "react";
import { useAppState } from "../../store/appState";
import { viewToSVGTransform } from "../CanvasArea";

export function SimplePath({
  path,
  color = "black",
}: {
  path: { x: number; y: number }[];
  color?: string;
}) {
  const store = useAppState();
  const view = store.uiState.canvasView;
  const canvasSize = store.canvasSize();

  const transform = useMemo(
    () => viewToSVGTransform(view, canvasSize),
    [view, canvasSize]
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
      stroke={color}
      strokeWidth={1 / view.scale}
      fill="none"
      transform={transform}
    />
  );
}
