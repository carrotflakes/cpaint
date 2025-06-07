import { useRef, useEffect } from "react";
import { useAppState } from "../../store/appState";
import { MCanvas } from "../../libs/mCanvas";

export type Rect = {
  cx: number; // Center X coordinate
  cy: number; // Center Y coordinate
  hw: number; // Half width
  hh: number; // Half height
  angle: number; // Rotation angle
};

export function TransformRectHandles({
  rect,
  onRectChange,
  canvasSize,
}: {
  rect: Rect;
  onRectChange?: (r: Rect) => void;
  canvasSize: { width: number; height: number };
}) {
  const view = useAppState((state) => state.uiState.canvasView);
  const polygonRef = useRef<SVGPolygonElement | null>(null);
  const rotateHandleRef = useRef<SVGCircleElement | null>(null);
  const handlesRef = useRef<SVGGElement | null>(null);
  const lockRef = useRef(false);

  const keepAspectRatio = true; // TODO

  function toScreen([x, y]: [number, number]): [number, number] {
    const cx = canvasSize.width / 2;
    const cy = canvasSize.height / 2;
    const px = x - cx;
    const py = y - cy;
    const sin = Math.sin(view.angle);
    const cos = Math.cos(view.angle);
    const rx = px * cos - py * sin;
    const ry = px * sin + py * cos;
    const sx = rx * view.scale;
    const sy = ry * view.scale;
    return [sx + view.pan[0], sy + view.pan[1]];
  }
  function toCanvas([sx, sy]: [number, number]): [number, number] {
    const cx = canvasSize.width / 2;
    const cy = canvasSize.height / 2;
    const px = (sx - view.pan[0]) / view.scale;
    const py = (sy - view.pan[1]) / view.scale;
    const sin = Math.sin(-view.angle);
    const cos = Math.cos(-view.angle);
    const rx = px * cos - py * sin;
    const ry = px * sin + py * cos;
    return [rx + cx, ry + cy];
  }

  // --- handle move ---
  useEffect(() => {
    const polygon = polygonRef.current;
    if (!polygon || !onRectChange) return;

    return addPointerEventsHandler(polygon, lockRef, (e) => {
      const [startCanvasX, startCanvasY] = toCanvas([e.clientX, e.clientY]);

      return {
        onMove(e) {
          const [nowCanvasX, nowCanvasY] = toCanvas([e.clientX, e.clientY]);
          const diffX = nowCanvasX - startCanvasX;
          const diffY = nowCanvasY - startCanvasY;
          onRectChange({
            ...rect,
            cx: rect.cx + diffX,
            cy: rect.cy + diffY,
          });
        },
      };
    });
  }, [rect, onRectChange, toCanvas]);

  // --- handle rotate ---
  useEffect(() => {
    const handle = rotateHandleRef.current;
    if (!handle || !onRectChange) return;

    function getAngleFromCenter(e: { clientX: number; clientY: number }) {
      if (!handle) return 0;
      const bbox = handle.ownerSVGElement?.getBoundingClientRect();
      if (!bbox) return 0;
      const svgX = e.clientX - bbox.left - bbox.width / 2;
      const svgY = e.clientY - bbox.top - bbox.height / 2;
      const [centerX, centerY] = toScreen([rect.cx, rect.cy]);
      return Math.atan2(svgY - centerY, svgX - centerX);
    }

    return addPointerEventsHandler(handle, lockRef, (e) => {
      const startAngle = rect.angle;
      const startPointerAngle = getAngleFromCenter(e);
      return {
        onMove(e) {
          const nowPointerAngle = getAngleFromCenter(e);
          const newAngle = startAngle + (nowPointerAngle - startPointerAngle);
          onRectChange({ ...rect, angle: newAngle });
        },
      };
    });
  }, [rect, onRectChange, toScreen]);

  // --- handle resize ---
  useEffect(() => {
    const handles = handlesRef.current;
    if (!handles || !onRectChange) return;

    function getRelPos(e: { clientX: number; clientY: number }) {
      if (!handles) return [0, 0, 0, 0];
      const bbox = handles.ownerSVGElement?.getBoundingClientRect();
      if (!bbox) return [0, 0, 0, 0];
      const svgX = e.clientX - bbox.left - bbox.width / 2;
      const svgY = e.clientY - bbox.top - bbox.height / 2;
      const canvasPos = toCanvas([svgX, svgY]);
      const sin = Math.sin(-rect.angle);
      const cos = Math.cos(-rect.angle);
      const x = (canvasPos[0] - rect.cx) * cos - (canvasPos[1] - rect.cy) * sin;
      const y = (canvasPos[0] - rect.cx) * sin + (canvasPos[1] - rect.cy) * cos;
      return [x, y, canvasPos[0], canvasPos[1]];
    }

    return addPointerEventsHandler(handles, lockRef, (e) => {
      if (
        !(e.target instanceof SVGCircleElement) ||
        e.target.dataset.handle == null
      )
        return;
      const handleIndex = Number(e.target.dataset.handle);
      const startRelPos = getRelPos(e);
      return {
        onMove(e) {
          const relPos = getRelPos(e);
          const dx = relPos[0] - startRelPos[0];
          const dy = relPos[1] - startRelPos[1];
          const sin = Math.sin(-rect.angle);
          const cos = Math.cos(-rect.angle);
          const scale =
            ((relPos[0] / startRelPos[0] + relPos[1] / startRelPos[1]) / 2 +
              1) /
            2;
          const sx = rect.hw * (scale - 1);
          const sy = rect.hh * (scale - 1);
          switch (handleIndex) {
            case 0: // lt
              if (keepAspectRatio) {
                onRectChange({
                  ...rect,
                  cx: rect.cx + (-sx * cos - sy * sin),
                  cy: rect.cy + (sx * sin - sy * cos),
                  hw: rect.hw * scale,
                  hh: rect.hh * scale,
                });
              } else {
                onRectChange({
                  ...rect,
                  cx: rect.cx + (relPos[2] - startRelPos[2]) / 2,
                  cy: rect.cy + (relPos[3] - startRelPos[3]) / 2,
                  hw: rect.hw - dx / 2,
                  hh: rect.hh - dy / 2,
                });
              }
              break;
            case 1: // rt
              if (keepAspectRatio) {
                onRectChange({
                  ...rect,
                  cx: rect.cx + (sx * cos - sy * sin),
                  cy: rect.cy + (-sx * sin - sy * cos),
                  hw: rect.hw * scale,
                  hh: rect.hh * scale,
                });
              } else {
                onRectChange({
                  ...rect,
                  cx: rect.cx + (relPos[2] - startRelPos[2]) / 2,
                  cy: rect.cy + (relPos[3] - startRelPos[3]) / 2,
                  hw: rect.hw + dx / 2,
                  hh: rect.hh - dy / 2,
                });
              }
              break;
            case 2: // lb
              if (keepAspectRatio) {
                onRectChange({
                  ...rect,
                  cx: rect.cx + (-sx * cos + sy * sin),
                  cy: rect.cy + (sx * sin + sy * cos),
                  hw: rect.hw * scale,
                  hh: rect.hh * scale,
                });
              } else {
                onRectChange({
                  ...rect,
                  cx: rect.cx + (relPos[2] - startRelPos[2]) / 2,
                  cy: rect.cy + (relPos[3] - startRelPos[3]) / 2,
                  hw: rect.hw - dx / 2,
                  hh: rect.hh + dy / 2,
                });
              }
              break;
            case 3: // rb
              if (keepAspectRatio) {
                onRectChange({
                  ...rect,
                  cx: rect.cx + (sx * cos + sy * sin),
                  cy: rect.cy + (-sx * sin + sy * cos),
                  hw: rect.hw * scale,
                  hh: rect.hh * scale,
                });
              } else {
                onRectChange({
                  ...rect,
                  cx: rect.cx + (relPos[2] - startRelPos[2]) / 2,
                  cy: rect.cy + (relPos[3] - startRelPos[3]) / 2,
                  hw: rect.hw + dx / 2,
                  hh: rect.hh + dy / 2,
                });
              }
              break;
            case 4: // mt
              onRectChange({
                ...rect,
                cx: rect.cx + (dy * sin) / 2,
                cy: rect.cy + (dy * cos) / 2,
                hh: rect.hh - dy / 2,
              });
              break;
            case 5: // mb
              onRectChange({
                ...rect,
                cx: rect.cx + (dy * sin) / 2,
                cy: rect.cy + (dy * cos) / 2,
                hh: rect.hh + dy / 2,
              });
              break;
            case 6: // ml
              onRectChange({
                ...rect,
                cx: rect.cx + (dx * cos) / 2,
                cy: rect.cy - (dx * sin) / 2,
                hw: rect.hw - dx / 2,
              });
              break;
            case 7: // mr
              onRectChange({
                ...rect,
                cx: rect.cx + (dx * cos) / 2,
                cy: rect.cy - (dx * sin) / 2,
                hw: rect.hw + dx / 2,
              });
              break;
          }
        },
      };
    });
  }, [rect, onRectChange, toCanvas]);

  const handles = computeHandlePositions(rect, view.scale);
  const lt = toScreen(handles.lt);
  const rt = toScreen(handles.rt);
  const lb = toScreen(handles.lb);
  const rb = toScreen(handles.rb);
  const mt = toScreen(handles.mt);
  const mb = toScreen(handles.mb);
  const ml = toScreen(handles.ml);
  const mr = toScreen(handles.mr);
  const ah = toScreen(handles.ah);

  return (
    <>
      {/* Rectangle */}
      <polygon
        ref={polygonRef}
        points={`${lt[0]},${lt[1]} ${rt[0]},${rt[1]} ${rb[0]},${rb[1]} ${lb[0]},${lb[1]}`}
        fill="transparent"
        stroke="#2196f3"
        strokeWidth={2}
        cursor="move"
      />
      {/* Rotation handle */}
      <line
        x1={mt[0]}
        y1={mt[1]}
        x2={ah[0]}
        y2={ah[1]}
        stroke="#2196f3"
        strokeWidth={2}
        pointerEvents="none"
      />
      <circle
        ref={rotateHandleRef}
        cx={ah[0]}
        cy={ah[1]}
        r={9}
        fill="#fff"
        stroke="#2196f3"
        strokeWidth={2}
        cursor="move"
      />
      {/* 8 handles (corners + edge centers) */}
      <g ref={handlesRef}>
        {[lt, rt, lb, rb, mt, mb, ml, mr].map(([x, y], i) => {
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={9}
              fill="#fff"
              stroke="#2196f3"
              strokeWidth={2}
              cursor="move"
              data-handle={i}
            />
          );
        })}
      </g>
    </>
  );
}

function addPointerEventsHandler(
  element: SVGElement,
  lockRef: React.RefObject<boolean>,
  onDown: (e: PointerEvent) =>
    | {
        onMove: (e: PointerEvent) => void;
        onUp?: (e: PointerEvent) => void;
      }
    | undefined
) {
  function pointerDown(e: PointerEvent) {
    if (lockRef.current) return;
    if (e.pointerType === "mouse" && e.button !== 0) return; // Only left button

    e.stopPropagation();
    const pointerId = e.pointerId;
    element.setPointerCapture?.(pointerId);
    const handlers = onDown(e);
    if (!handlers) return;
    function pointerMove(e: PointerEvent) {
      if (e.pointerId !== pointerId) return;
      handlers?.onMove(e);
    }
    function pointerUp(e: PointerEvent) {
      if (e.pointerId !== pointerId) return;
      handlers?.onUp?.(e);
      element.releasePointerCapture?.(pointerId);
      window.removeEventListener("pointermove", pointerMove);
      window.removeEventListener("pointerup", pointerUp);
      window.removeEventListener("pointercancel", pointerUp);

      lockRef.current = false;
    }
    window.addEventListener("pointermove", pointerMove);
    window.addEventListener("pointerup", pointerUp);
    window.addEventListener("pointercancel", pointerUp);

    lockRef.current = true;
  }

  element.addEventListener("pointerdown", pointerDown);
  return () => {
    element.removeEventListener("pointerdown", pointerDown);
  };
}

function computeHandlePositions(
  rect: {
    cx: number;
    cy: number;
    hw: number;
    hh: number;
    angle: number;
  },
  viewScale: number
) {
  const sin = Math.sin(rect.angle);
  const cos = Math.cos(rect.angle);
  return {
    lt: [
      rect.cx - rect.hw * cos - rect.hh * -sin,
      rect.cy - rect.hw * sin - rect.hh * cos,
    ],
    rt: [
      rect.cx + rect.hw * cos - rect.hh * -sin,
      rect.cy + rect.hw * sin - rect.hh * cos,
    ],
    lb: [
      rect.cx - rect.hw * cos + rect.hh * -sin,
      rect.cy - rect.hw * sin + rect.hh * cos,
    ],
    rb: [
      rect.cx + rect.hw * cos + rect.hh * -sin,
      rect.cy + rect.hw * sin + rect.hh * cos,
    ],
    mt: [rect.cx - rect.hh * -sin, rect.cy - rect.hh * cos],
    mb: [rect.cx + rect.hh * -sin, rect.cy + rect.hh * cos],
    ml: [rect.cx - rect.hw * cos, rect.cy - rect.hw * sin],
    mr: [rect.cx + rect.hw * cos, rect.cy + rect.hw * sin],
    ah: [
      rect.cx - (rect.hh + 50 / viewScale) * -sin,
      rect.cy - (rect.hh + 50 / viewScale) * cos,
    ],
  } satisfies Record<string, [number, number]>;
}

export function makeApply(
  baseCanvas: MCanvas | null,
  canvas: MCanvas,
  rect: Rect
) {
  return (
    ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D
  ) => {
    ctx.save();
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    if (baseCanvas) ctx.drawImage(baseCanvas.getCanvas(), 0, 0);
    ctx.translate(rect.cx, rect.cy);
    ctx.rotate(rect.angle);
    ctx.scale((rect.hw * 2) / canvas.width, (rect.hh * 2) / canvas.height);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);
    ctx.drawImage(canvas.getCanvas(), 0, 0, canvas.width, canvas.height);
    ctx.restore();
  };
}
