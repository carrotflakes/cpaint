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
  };
  containerRef: { current: HTMLDivElement | null };
  canvasRef: { current: HTMLCanvasElement | null };
  children?: React.ReactNode;
}) {
  const [containerSize, setContainerSize] = useState({
    width: 0,
    height: 0,
  });

  const handleResize = () => {
    if (containerRef.current) {
      setContainerSize({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });
    }
  };
  useEffect(() => {
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [containerRef]);

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
}): string {
  return `translate(${canvasView.pan[0]}px, ${canvasView.pan[1]}px) rotate(${canvasView.angle}rad) scale(${canvasView.scale})`;
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
