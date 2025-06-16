import { useEffect, useMemo, useRef } from "react";
import { useAppState } from "../../store/appState";

const offsetY = -80;
const lensSize = 100;
const radius = 5;
const kernelSize = 2 * radius + 1;

export function EyeDropperLens({
  color,
  pos,
  canvas,
}: {
  color: string;
  pos: [number, number];
  canvas: HTMLCanvasElement;
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

  const dpr = window.devicePixelRatio ?? 1;
  const canvasRef = useRef<HTMLCanvasElement>(null!);

  useEffect(() => {
    const { width, height } = canvasRef.current;
    const ctx = canvasRef.current.getContext("2d")!;
    ctx.save();

    ctx.imageSmoothingEnabled = false;
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, width / 2, 0, Math.PI * 2);
    ctx.clip();

    ctx.fillStyle = "#f3f4f6";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(
      canvas,
      Math.floor(pos[0]) - radius,
      Math.floor(pos[1]) - radius,
      kernelSize,
      kernelSize,
      0,
      0,
      width,
      height
    );

    ctx.restore();
  }, [color, pos, canvas]);

  // NOTE: Canvas in foreignObject does not support on safari
  // https://bugs.webkit.org/show_bug.cgi?id=23113
  return (
    <g transform={`translate(${screenPos[0]}, ${screenPos[1] + offsetY})`}>
      <foreignObject
        x={-lensSize / 2}
        y={-lensSize / 2}
        width={lensSize}
        height={lensSize}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          width={(lensSize * dpr) | 0}
          height={(lensSize * dpr) | 0}
        />
      </foreignObject>
      <rect
        x={-lensSize / kernelSize / 2}
        y={-lensSize / kernelSize / 2}
        width={lensSize / kernelSize}
        height={lensSize / kernelSize}
        stroke="red"
        strokeWidth={0.5}
        fill="none"
        pointerEvents="none"
      />
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
