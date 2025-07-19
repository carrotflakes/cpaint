import { useEffect, useState } from "react";
import { CHECK_PATTERN } from "../libs/check";
import { useAppState } from "../store/appState";

export default function CanvasArea({
  canvasSize,
  canvasView,
  containerRef,
  canvasRef,
  children,
}: {
  canvasSize: { width: number; height: number };
  canvasView: {
    angle: number;
    scale: number;
    pan: [number, number];
    flipX: boolean;
    flipY: boolean;
  };
  containerRef: { current: HTMLDivElement | null };
  canvasRef: { current: HTMLCanvasElement | null };
  children?: React.ReactNode;
}) {
  const [containerSize, setContainerSize] = useState({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [containerRef]);

  return (
    <div
      className="relative w-full h-full grid place-items-center overflow-hidden touch-none"
      ref={containerRef}
      style={{
        backgroundImage: CHECK_PATTERN,
      }}
      tabIndex={-1}
    >
      <canvas
        className="absolute shadow-[0_0_0_99999px_#f3f4f6] dark:shadow-gray-950"
        width={canvasSize.width}
        height={canvasSize.height}
        style={{
          transform: viewToTransform(canvasView),
          imageRendering: "pixelated",
        }}
        ref={canvasRef}
      />
      <svg
        width={containerSize.width}
        height={containerSize.height}
        className="absolute top-0 left-0"
      >
        <g
          transform={`translate(${containerSize.width / 2}, ${
            containerSize.height / 2
          })`}
        >
          {children}
        </g>
      </svg>
    </div>
  );
}

export function viewToTransform(canvasView: {
  angle: number;
  scale: number;
  pan: [number, number];
  flipX: boolean;
  flipY: boolean;
}): string {
  const sx = canvasView.scale * (canvasView.flipX ? -1 : 1);
  const sy = canvasView.scale * (canvasView.flipY ? -1 : 1);
  return `translate(${canvasView.pan[0]}px, ${canvasView.pan[1]}px) rotate(${canvasView.angle}rad) scale(${sx}, ${sy})`;
}

export function viewToSVGTransform(
  canvasView: {
    angle: number;
    scale: number;
    pan: [number, number];
    flipX: boolean;
    flipY: boolean;
  },
  canvasSize: { width: number; height: number }
): string {
  const sx = canvasView.scale * (canvasView.flipX ? -1 : 1);
  const sy = canvasView.scale * (canvasView.flipY ? -1 : 1);
  return `translate(${canvasView.pan[0]} ${canvasView.pan[1]}) rotate(${
    (canvasView.angle / (2 * Math.PI)) * 360
  }) scale(${sx} ${sy}) translate(${-canvasSize.width / 2} ${
    -canvasSize.height / 2
  })`;
}

export function computePos(
  e: { clientX: number; clientY: number },
  containerEl: HTMLDivElement
): [number, number] {
  const bbox = containerEl.getBoundingClientRect();

  const state = useAppState.getState();
  const cv = state.uiState.canvasView;
  const canvasSize = state.canvasSize();
  const pos_ = [
    (e.clientX - (bbox.left + bbox.width / 2) - cv.pan[0]) / cv.scale,
    (e.clientY - (bbox.top + bbox.height / 2) - cv.pan[1]) / cv.scale,
  ];
  const sin = Math.sin(-cv.angle);
  const cos = Math.cos(-cv.angle);
  let x = pos_[0] * cos - pos_[1] * sin;
  let y = pos_[0] * sin + pos_[1] * cos;
  if (cv.flipX) x = -x;
  if (cv.flipY) y = -y;
  return [x + canvasSize.width / 2, y + canvasSize.height / 2];
}
