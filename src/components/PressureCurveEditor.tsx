import { useEffect, useRef, useState } from "react";
import {
  applyPressureCurve,
  DEFAULT_PRESSURE_CURVE,
  generateCurvePoints,
  PressureCurve,
  PressureCurvePoint,
} from "../libs/pressureCurve";
import { startTouchBrush } from "../libs/touch/brush";

export function PressureCurveEditor({
  className,
  pressureCurve,
  setPressureCurve,
}: {
  className?: string;
  pressureCurve: PressureCurve;
  setPressureCurve: (points: PressureCurve) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null!);
  const [dragging, setDragging] = useState<number | null>(null); // Index of the control point being dragged
  const [inputValue, setInputValue] = useState<number>(0);

  const dpr = window.devicePixelRatio ?? 1;
  const width = 200;
  const height = 200;
  const padding = 20;
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;

  // Convert curve coordinate (0-1) to canvas coordinate
  const toCanvas = (point: PressureCurvePoint): [number, number] => [
    padding + point.x * plotWidth,
    padding + (1 - point.y) * plotHeight, // Flip Y axis
  ];

  // Convert canvas coordinate to curve coordinate (0-1)
  const fromCanvas = (x: number, y: number): PressureCurvePoint => ({
    x: Math.max(0, Math.min(1, (x - padding) / plotWidth)),
    y: Math.max(0, Math.min(1, 1 - (y - padding) / plotHeight)), // Flip Y axis
  });

  const drawCurve = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.resetTransform();
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background
    ctx.fillStyle = "#f3f4f6";
    ctx.fillRect(padding, padding, plotWidth, plotHeight);

    // Draw grid
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);

    // Vertical grid lines
    for (let i = 1; i < 4; i++) {
      const x = padding + (i / 4) * plotWidth;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, padding + plotHeight);
      ctx.stroke();
    }

    // Horizontal grid lines
    for (let i = 1; i < 4; i++) {
      const y = padding + (i / 4) * plotHeight;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(padding + plotWidth, y);
      ctx.stroke();
    }

    ctx.setLineDash([]);

    // Draw border
    ctx.strokeStyle = "#9ca3af";
    ctx.lineWidth = 1;
    ctx.strokeRect(padding, padding, plotWidth, plotHeight);

    // Draw diagonal reference line (linear curve)
    ctx.strokeStyle = "#d1d5db";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padding, padding + plotHeight);
    ctx.lineTo(padding + plotWidth, padding);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw input/output value line
    if (inputValue > 0) {
      const inputX = padding + inputValue * plotWidth;
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(inputX, padding);
      ctx.lineTo(inputX, padding + plotHeight);
      ctx.stroke();

      const outputY =
        padding +
        (1 - applyPressureCurve(inputValue, pressureCurve)) * plotHeight;
      ctx.strokeStyle = "#f59e0b";
      ctx.beginPath();
      ctx.moveTo(padding, outputY);
      ctx.lineTo(padding + plotWidth, outputY);
      ctx.stroke();
    }

    // Draw the pressure curve
    const curvePoints = generateCurvePoints(pressureCurve.points, 100);

    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2;
    ctx.beginPath();

    curvePoints.forEach((point, i) => {
      const [x, y] = toCanvas(point);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw control points
    pressureCurve.points.forEach((point, i) => {
      const [x, y] = toCanvas(point);

      // Control points 1 and 2 are draggable
      if (i === 1 || i === 2) {
        ctx.fillStyle = dragging === i ? "#ef4444" : "#3b82f6";
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();

        // White border
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        // Fixed endpoints
        ctx.fillStyle = "#6b7280";
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Draw control lines
    ctx.strokeStyle = "#9ca3af";
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);

    // Line from start to control1
    const [x0, y0] = toCanvas(pressureCurve.points[0]);
    const [x1, y1] = toCanvas(pressureCurve.points[1]);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();

    // Line from control2 to end
    const [x2, y2] = toCanvas(pressureCurve.points[2]);
    const [x3, y3] = toCanvas(pressureCurve.points[3]);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.stroke();

    ctx.setLineDash([]);

    // Labels
    ctx.fillStyle = "#374151";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Input Pressure", width / 2, height - 5);

    ctx.save();
    ctx.translate(10, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("Output Pressure", 0, 0);
    ctx.restore();
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicking on a draggable control point
    for (let i = 1; i <= 2; i++) {
      // Only control points 1 and 2 are draggable
      const [px, py] = toCanvas(pressureCurve.points[i]);
      const dist = Math.sqrt((x - px) ** 2 + (y - py) ** 2);
      if (dist <= 8) {
        setDragging(i);
        canvas.setPointerCapture(e.pointerId);
        break;
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragging === null) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newPoint = fromCanvas(x, y);

    // Update the control point
    const newPoints = [...pressureCurve.points] as typeof pressureCurve.points;
    newPoints[dragging] = newPoint;

    setPressureCurve({ ...pressureCurve, points: newPoints });
  };

  const handlePointerUp = () => {
    setDragging(null);
  };

  const resetCurve = () => {
    setPressureCurve({
      ...pressureCurve,
      points: [...DEFAULT_PRESSURE_CURVE.points],
    });
  };

  useEffect(() => {
    drawCurve();
  }, [pressureCurve, dragging, inputValue, dpr]);

  return (
    <div
      className={"flex gap-2 overflow-x-auto " + (className ?? "")}
      data-scroll
    >
      <div className="flex flex-col gap-2">
        <div className="self-center relative">
          <canvas
            ref={canvasRef}
            className="cursor-pointer touch-none"
            width={(width * dpr) | 0}
            height={(height * dpr) | 0}
            style={{
              width: `${width}px`,
              height: `${height}px`,
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          />

          {!pressureCurve.enabled && (
            <div className="absolute inset-0 bg-gray-50/75 rounded flex items-center justify-center">
              <span className="text-sm text-gray-900">Disabled</span>
            </div>
          )}
        </div>

        <button
          onClick={resetCurve}
          className="self-start px-2 py-1 text-xs rounded text-gray-800 bg-gray-200 hover:bg-gray-300 transition-colors"
        >
          Reset Curve
        </button>
      </div>

      <TestCanvas pressureCurve={pressureCurve} onInputValue={setInputValue} />
    </div>
  );
}

function TestCanvas({
  pressureCurve,
  onInputValue,
}: {
  pressureCurve: PressureCurve;
  onInputValue: (value: number) => void;
}) {
  const dpr = window.devicePixelRatio ?? 1;
  const width = 240;
  const height = 240;

  const canvasRef = useRef<HTMLCanvasElement>(null!);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, [dpr]);

  const onPointerDown = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = canvas;

    function computePos(e: PointerEvent) {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * dpr;
      const y = (e.clientY - rect.top) * dpr;
      return [x, y];
    }

    const pointerId = e.pointerId;
    const touch = startTouchBrush({
      brushType: "particle1",
      width: (10 * dpr) | 0,
      color: "#000",
      opacity: 1,
      erase: false,
      alphaLock: false,
      canvasSize: [width, height],
    });
    const pos = computePos(e.nativeEvent);
    onInputValue(getPressure(e.nativeEvent));
    const pressure = applyPressureCurve(
      getPressure(e.nativeEvent),
      pressureCurve
    );
    touch.stroke(pos[0], pos[1], pressure);

    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;

      const pos = computePos(e);
      onInputValue(getPressure(e));
      const pressure = applyPressureCurve(getPressure(e), pressureCurve);
      touch.stroke(pos[0], pos[1], pressure);

      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, width, height);
      touch.transfer(ctx);
    };
    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;

      onInputValue(0);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  return (
    <canvas
      ref={canvasRef}
      className="touch-none"
      width={(width * dpr) | 0}
      height={(height * dpr) | 0}
      style={{
        width: `${width}px`,
        height: `${height}px`,
      }}
      onPointerDown={onPointerDown}
    />
  );
}

function getPressure(e: PointerEvent) {
  // NOTE: e.pressure will be 0 for touch events on iPad chrome.
  return e.pointerType === "touch" && e.pressure === 0 ? 0.5 : e.pressure;
}
