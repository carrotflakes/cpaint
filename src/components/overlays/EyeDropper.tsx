import { useMemo } from "react";
import { useAppState } from "../../store/appState";

const lensSize = 100;

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
    const px = (pos[0] - cx) * (view.flipX ? -1 : 1);
    const py = (pos[1] - cy) * (view.flipY ? -1 : 1);
    const sin = Math.sin(view.angle);
    const cos = Math.cos(view.angle);
    const rx = px * cos - py * sin;
    const ry = px * sin + py * cos;
    const sx = rx * view.scale;
    const sy = ry * view.scale;
    return [sx + view.pan[0], sy + view.pan[1]];
  }, [view, pos]);

  return (
    <g transform={`translate(${screenPos[0]}, ${screenPos[1]})`}>
      <circle
        r={lensSize / 2}
        stroke={color}
        strokeWidth={8}
        fill="none"
        pointerEvents="none"
      />
      <circle
        r={lensSize / 2 - 4}
        stroke="black"
        strokeWidth={0.5}
        fill="none"
        pointerEvents="none"
      />
      <circle
        r={lensSize / 2 + 4}
        stroke="black"
        strokeWidth={0.5}
        fill="none"
        pointerEvents="none"
      />
    </g>
  );
}
