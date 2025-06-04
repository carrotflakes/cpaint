import { useMemo } from "react";
import { useAppState } from "../../store/appState";

export function EyeDropper({
  color,
  pos,
}: {
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
  }, [view, pos]);

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
