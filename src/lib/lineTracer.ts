/**
 * Client-side line tracing on canvas pixel data.
 * Uses Gemini's approximate path as a guide to trace the actual cable line
 * from the electrical panel all the way to the endpoint (outlet, etc.).
 * Handles crossings by preferring the direction toward the next waypoint.
 */

interface Point {
  x: number;
  y: number;
}

const DIRS = [
  { dx: 1, dy: 0 },   // 0: right
  { dx: 1, dy: 1 },   // 1: down-right
  { dx: 0, dy: 1 },   // 2: down
  { dx: -1, dy: 1 },  // 3: down-left
  { dx: -1, dy: 0 },  // 4: left
  { dx: -1, dy: -1 }, // 5: up-left
  { dx: 0, dy: -1 },  // 6: up
  { dx: 1, dy: -1 },  // 7: up-right
];

function getBrightness(data: Uint8ClampedArray, width: number, x: number, y: number): number {
  const i = (y * width + x) * 4;
  return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
}

function isDark(data: Uint8ClampedArray, width: number, height: number, x: number, y: number, threshold: number): boolean {
  if (x < 0 || y < 0 || x >= width || y >= height) return false;
  return getBrightness(data, width, x, y) < threshold;
}

function findNearestDark(
  data: Uint8ClampedArray, width: number, height: number,
  sx: number, sy: number, threshold: number, maxRadius: number
): Point | null {
  const cx = Math.round(sx);
  const cy = Math.round(sy);
  if (isDark(data, width, height, cx, cy, threshold)) return { x: cx, y: cy };

  for (let r = 1; r <= maxRadius; r++) {
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
        const px = cx + dx, py = cy + dy;
        if (isDark(data, width, height, px, py, threshold)) return { x: px, y: py };
      }
    }
  }
  return null;
}

/**
 * Trace toward a target point, following dark pixels.
 * At each step, prefer directions that move closer to the target.
 * This handles crossings by biasing toward the goal.
 */
function traceToward(
  data: Uint8ClampedArray, width: number, height: number,
  start: Point, target: Point, threshold: number,
  visited: Set<number>, maxSteps: number
): Point[] {
  const points: Point[] = [start];
  let current = start;
  let prevDir = -1;
  const targetDist = Math.hypot(target.x - start.x, target.y - start.y);
  if (targetDist < 3) return [start, target];

  for (let step = 0; step < maxSteps; step++) {
    // Check if we're close enough to target
    const dx = target.x - current.x;
    const dy = target.y - current.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 5) break;

    // Score each direction: prefer (1) dark pixel, (2) direction toward target, (3) continuity
    let bestScore = -Infinity;
    let bestDir = -1;
    let bestPt: Point | null = null;

    // Preferred direction toward target
    const idealAngle = Math.atan2(dy, dx);

    for (let d = 0; d < 8; d++) {
      // Try stepping 1-3 pixels in this direction to skip thin crossings
      for (let stepSize = 1; stepSize <= 2; stepSize++) {
        const nx = current.x + DIRS[d].dx * stepSize;
        const ny = current.y + DIRS[d].dy * stepSize;
        const key = ny * width + nx;

        if (visited.has(key)) continue;
        if (!isDark(data, width, height, nx, ny, threshold)) continue;

        // Score: how much this direction aligns with target direction
        const dirAngle = Math.atan2(DIRS[d].dy, DIRS[d].dx);
        let angleDiff = Math.abs(idealAngle - dirAngle);
        if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
        const alignScore = (Math.PI - angleDiff) / Math.PI; // 0-1, 1 = perfect

        // Continuity bonus: prefer same direction as previous
        const continueBonus = (prevDir >= 0 && d === prevDir) ? 0.3 : 0;

        // Penalty for step size > 1 (jumping over gaps)
        const stepPenalty = (stepSize - 1) * 0.2;

        const score = alignScore + continueBonus - stepPenalty;
        if (score > bestScore) {
          bestScore = score;
          bestDir = d;
          bestPt = { x: nx, y: ny };
        }
        break; // only try larger stepSize if stepSize=1 didn't find a dark pixel
      }
    }

    if (!bestPt || bestScore < 0.1) {
      // Try jumping a bigger gap (crossing another line or whitespace)
      const jumpDist = Math.min(15, dist * 0.3);
      const jumpX = Math.round(current.x + Math.cos(idealAngle) * jumpDist);
      const jumpY = Math.round(current.y + Math.sin(idealAngle) * jumpDist);
      const found = findNearestDark(data, width, height, jumpX, jumpY, threshold, 8);
      if (found) {
        const key = found.y * width + found.x;
        if (!visited.has(key)) {
          visited.add(key);
          current = found;
          points.push(current);
          prevDir = -1;
          continue;
        }
      }
      break; // dead end
    }

    // Mark visited
    const key = bestPt.y * width + bestPt.x;
    visited.add(key);
    current = bestPt;
    prevDir = bestDir;
    points.push(current);
  }

  return points;
}

/**
 * Ramer-Douglas-Peucker path simplification
 */
function simplifyPath(points: Point[], epsilon: number): Point[] {
  if (points.length <= 2) return points;

  let maxDist = 0;
  let maxIdx = 0;
  const start = points[0];
  const end = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const d = perpDist(points[i], start, end);
    if (d > maxDist) { maxDist = d; maxIdx = i; }
  }

  if (maxDist > epsilon) {
    const left = simplifyPath(points.slice(0, maxIdx + 1), epsilon);
    const right = simplifyPath(points.slice(maxIdx), epsilon);
    return [...left.slice(0, -1), ...right];
  }
  return [start, end];
}

function perpDist(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/**
 * Main entry: trace a full cable path using Gemini's approximate waypoints as guide.
 * Traces segment by segment, following actual dark pixels on the canvas.
 */
export function traceCableLine(
  canvas: HTMLCanvasElement,
  seedNormX: number, // 0-1000 — single seed (used when path not available)
  seedNormY: number, // 0-1000
  darkThreshold: number = 120
): Point[] | null {
  // Delegate to traceFullPath with a single seed
  return traceFullPath(canvas, [{ x: seedNormX, y: seedNormY }], darkThreshold);
}

/**
 * Trace a full cable given multiple waypoints from Gemini (from panel to outlet).
 * Each waypoint pair becomes a guided trace segment.
 */
export function traceFullPath(
  canvas: HTMLCanvasElement,
  waypoints: Point[], // normalized 0-1000
  darkThreshold: number = 120
): Point[] | null {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const w = canvas.width;
  const h = canvas.height;
  const imageData = ctx.getImageData(0, 0, w, h);
  const { data } = imageData;

  // Convert normalized waypoints to pixel coords
  const pixelWaypoints = waypoints.map((p) => ({
    x: Math.round((p.x / 1000) * w),
    y: Math.round((p.y / 1000) * h),
  }));

  const visited = new Set<number>();
  const fullPath: Point[] = [];

  for (let i = 0; i < pixelWaypoints.length - 1; i++) {
    const fromWp = pixelWaypoints[i];
    const toWp = pixelWaypoints[i + 1];

    // Snap waypoints to nearest dark pixel
    const fromSnap = findNearestDark(data, w, h, fromWp.x, fromWp.y, darkThreshold, 40);
    const toSnap = findNearestDark(data, w, h, toWp.x, toWp.y, darkThreshold, 40);

    if (!fromSnap || !toSnap) continue;

    const segmentPoints = traceToward(
      data, w, h, fromSnap, toSnap, darkThreshold, visited, 5000
    );

    // Append segment (skip first point if continuing from previous segment)
    if (fullPath.length > 0 && segmentPoints.length > 0) {
      fullPath.push(...segmentPoints.slice(1));
    } else {
      fullPath.push(...segmentPoints);
    }
  }

  // If only single waypoint, do undirected trace in both directions
  if (pixelWaypoints.length === 1) {
    const seed = findNearestDark(data, w, h, pixelWaypoints[0].x, pixelWaypoints[0].y, darkThreshold, 50);
    if (!seed) return null;

    // Try all 8 directions, pick two longest opposite traces
    const traces: { dir: number; pts: Point[] }[] = [];
    for (let d = 0; d < 8; d++) {
      const target = { x: seed.x + DIRS[d].dx * 500, y: seed.y + DIRS[d].dy * 500 };
      const v = new Set<number>();
      v.add(seed.y * w + seed.x);
      const pts = traceToward(data, w, h, seed, target, darkThreshold, v, 3000);
      traces.push({ dir: d, pts });
    }
    traces.sort((a, b) => b.pts.length - a.pts.length);

    const bestA = traces[0];
    let bestB: { dir: number; pts: Point[] } | null = null;
    for (let i = 1; i < traces.length; i++) {
      const diff = Math.abs(((traces[i].dir - bestA.dir + 4) % 8) - 4);
      if (diff >= 3) { bestB = traces[i]; break; }
    }

    if (bestA.pts.length < 5) return null;

    if (bestB && bestB.pts.length > 5) {
      fullPath.push(...bestB.pts.reverse());
    }
    fullPath.push(seed);
    fullPath.push(...bestA.pts);
  }

  if (fullPath.length < 5) return null;

  // Simplify
  const simplified = simplifyPath(fullPath, 4);

  // Normalize back to 0-1000
  return simplified.map((p) => ({
    x: Math.round((p.x / w) * 1000),
    y: Math.round((p.y / h) * 1000),
  }));
}
