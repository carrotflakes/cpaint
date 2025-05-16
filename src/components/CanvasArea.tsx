import { CHECK_PATTERN } from "../libs/check";
import { useAppState } from "../store/appState";

export default function CanvasArea({
  canvas,
  canvasView,
  containerRef,
  canvasRef,
}: {
  canvas: { width: number; height: number };
  canvasView: {
    angle: number;
    scale: number;
    pan: [number, number];
  };
  containerRef: { current: HTMLDivElement | null };
  canvasRef: { current: HTMLCanvasElement | null };
}) {
  const transform = `translate(${canvasView.pan[0]}px, ${canvasView.pan[1]}px) rotate(${canvasView.angle}rad) scale(${canvasView.scale})`;
  return (
    <div
      className="relative w-full h-full grid place-items-center overflow-hidden"
      ref={containerRef}
      style={{
        backgroundImage: CHECK_PATTERN,
      }}
    >
      <canvas
        className="absolute shadow-[0_0_0_99999px_#f3f4f6] dark:shadow-gray-950"
        width={canvas.width}
        height={canvas.height}
        style={{
          transform,
          imageRendering: "pixelated",
        }}
        ref={canvasRef}
      />
    </div>
  );
}

export function computePos(
  e: { clientX: number; clientY: number },
  containerEl: HTMLDivElement
): [number, number] {
  const bbox = containerEl.getBoundingClientRect();

  const {
    stateContainer: {
      state: { layers },
    },
    uiState: { canvasView: cv },
  } = useAppState.getState();
  const firstCanvas = layers[0].canvas;
  const pos_ = [
    (e.clientX - (bbox.left + bbox.width / 2) - cv.pan[0]) / cv.scale,
    (e.clientY - (bbox.top + bbox.height / 2) - cv.pan[1]) / cv.scale,
  ];
  const sin = Math.sin(-cv.angle);
  const cos = Math.cos(-cv.angle);
  return [
    pos_[0] * cos - pos_[1] * sin + firstCanvas.width / 2,
    pos_[0] * sin + pos_[1] * cos + firstCanvas.height / 2,
  ];
}
