import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_PRESSURE_CURVE,
  generateCurvePoints,
  PressureCurvePoint,
} from "../libs/pressureCurve";
import { useGlobalSettings } from "../store/globalSetting";

export function PressureCurveEditor({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null!);
  const [dragging, setDragging] = useState<number | null>(null); // Index of the control point being dragged
  const globalSettings = useGlobalSettings();

  const width = 200;
  const height = 150;
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

    const dpr = window.devicePixelRatio || 1;
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

    // Draw the pressure curve
    if (globalSettings.pressureCurve.enabled) {
      const curvePoints = generateCurvePoints(
        globalSettings.pressureCurve.points,
        100
      );

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
    }

    // Draw control points
    const points = globalSettings.pressureCurve.points;
    points.forEach((point, i) => {
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
    if (globalSettings.pressureCurve.enabled) {
      ctx.strokeStyle = "#9ca3af";
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);

      // Line from start to control1
      const [x0, y0] = toCanvas(points[0]);
      const [x1, y1] = toCanvas(points[1]);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();

      // Line from control2 to end
      const [x2, y2] = toCanvas(points[2]);
      const [x3, y3] = toCanvas(points[3]);
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x3, y3);
      ctx.stroke();

      ctx.setLineDash([]);
    }

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
    const points = globalSettings.pressureCurve.points;
    for (let i = 1; i <= 2; i++) {
      // Only control points 1 and 2 are draggable
      const [px, py] = toCanvas(points[i]);
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
    const newPoints = [
      ...globalSettings.pressureCurve.points,
    ] as typeof globalSettings.pressureCurve.points;
    newPoints[dragging] = newPoint;

    useGlobalSettings.setState({
      pressureCurve: {
        ...globalSettings.pressureCurve,
        points: newPoints,
      },
    });
  };

  const handlePointerUp = () => {
    setDragging(null);
  };

  const resetCurve = () => {
    useGlobalSettings.setState({
      pressureCurve: {
        ...globalSettings.pressureCurve,
        points: DEFAULT_PRESSURE_CURVE.points,
      },
    });
  };

  useEffect(() => {
    drawCurve();
  }, [globalSettings.pressureCurve]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    drawCurve();
  }, []);

  return (
    <div className={className}>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="pressureCurveEnabled"
            checked={globalSettings.pressureCurve.enabled}
            onChange={(e) =>
              useGlobalSettings.setState({
                pressureCurve: {
                  ...globalSettings.pressureCurve,
                  enabled: e.target.checked,
                },
              })
            }
            className="w-4 h-4"
          />
          <label htmlFor="pressureCurveEnabled" className="text-sm font-medium">
            Enable Pressure Curve
          </label>
        </div>

        <div className="relative">
          <canvas
            ref={canvasRef}
            className="cursor-pointer touch-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          />

          {!globalSettings.pressureCurve.enabled && (
            <div className="absolute inset-0 bg-gray-50/75 rounded flex items-center justify-center">
              <span className="text-sm text-gray-900">Disabled</span>
            </div>
          )}
        </div>

        <p className="text-xs text-gray-600">
          Drag the blue control points to adjust the pressure curve.
        </p>

        <button
          onClick={resetCurve}
          className="px-2 py-1 text-xs rounded text-gray-800 bg-gray-200 hover:bg-gray-300 transition-colors"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
