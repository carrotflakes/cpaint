export type PressureCurvePoint = {
  x: number; // input pressure (0-1)
  y: number; // output pressure (0-1)
};

export type PressureCurve = {
  enabled: boolean;
  points: [PressureCurvePoint, PressureCurvePoint, PressureCurvePoint, PressureCurvePoint];
};

export const DEFAULT_PRESSURE_CURVE: Readonly<PressureCurve> = {
  enabled: false,
  points: [
    { x: 0, y: 0 },       // start
    { x: 0.33, y: 0.33 }, // control1
    { x: 0.67, y: 0.67 }, // control2
    { x: 1, y: 1 }        // end
  ]
};

/**
 * Evaluate a cubic bezier curve at parameter t (0-1)
 * P(t) = (1-t)³P₀ + 3(1-t)²tP₁ + 3(1-t)t²P₂ + t³P₃
 */
function evaluateCubicBezier(
  p0: PressureCurvePoint,
  p1: PressureCurvePoint,
  p2: PressureCurvePoint,
  p3: PressureCurvePoint,
  t: number
): PressureCurvePoint {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;

  const x = uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x;
  const y = uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y;

  return { x, y };
}

/**
 * Find the output pressure for a given input pressure using the bezier curve
 * Uses binary search to find the t value that gives the desired x (input pressure)
 */
function findPressureOutput(
  points: [PressureCurvePoint, PressureCurvePoint, PressureCurvePoint, PressureCurvePoint],
  inputPressure: number,
): number {
  // Clamp input to valid range
  inputPressure = Math.max(0, Math.min(1, inputPressure));

  // Binary search for the t value that gives us the desired x
  let t0 = 0;
  let t1 = 1;
  let t = 0.5;

  for (let i = 0; i < 20; i++) { // 20 iterations should give us good precision
    const point = evaluateCubicBezier(points[0], points[1], points[2], points[3], t);

    if (Math.abs(point.x - inputPressure) < 0.001) {
      return Math.max(0, Math.min(1, point.y));
    }

    if (point.x < inputPressure) {
      t0 = t;
    } else {
      t1 = t;
    }

    t = (t0 + t1) / 2;
  }

  // Return the y value for the final t
  const finalPoint = evaluateCubicBezier(points[0], points[1], points[2], points[3], t);
  return Math.max(0, Math.min(1, finalPoint.y));
}

/**
 * Apply pressure curve transformation to input pressure
 */
export function applyPressureCurve(
  inputPressure: number,
  curve: PressureCurve,
): number {
  if (!curve.enabled) {
    return inputPressure;
  }

  return findPressureOutput(curve.points, inputPressure);
}

/**
 * Generate points for rendering the pressure curve
 */
export function generateCurvePoints(
  points: [PressureCurvePoint, PressureCurvePoint, PressureCurvePoint, PressureCurvePoint],
  numPoints = 100
) {
  const result: { x: number, y: number }[] = [];

  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const point = evaluateCubicBezier(points[0], points[1], points[2], points[3], t);
    result.push(point);
  }

  return result;
}
