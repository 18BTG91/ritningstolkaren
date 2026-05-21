/**
 * Client-side line tracing on canvas pixel data.
 * Given a seed point (from Gemini's approximation), traces the actual dark line
 * on the rendered PDF drawing.
 */

interface Point {
  x: number;
  y: number;
}

// 8-directional offsets
const DIRS = [
  { dx: 1, dy: 0 },
  { dx: 1, dy: 1 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 1 },
  { dx: -1, dy: 0 },
  { dx: -1, dy: -1 },
  { dx: 0, dy: -1 },
  { dx: 1, dy: -1 },
];

/**
 * Get brightness (0-255) of a pixel. 0 = black, 255 = white.
 */
function getBrightness(imageData: ImageData, x: number, y: number): number {
  const i = (y * imageData.width + x) * 4;
  const r = imageData.data[i];
  const g = imageData.data[i + 1];
  const b = imageData.data[i + 2];
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Check if a pixel is "dark" (part of a line)
 */
function isDark(imageData: ImageData, x: number, y: number, threshold: number): boolean {
  if (x < 0 || y < 0 || x >= imageData.width || y >= imageData.height) return false;
  return getBrightness(imageData, x, y) < threshold;
}

/**
 * Find the nearest dark pixel to the given seed point within a search radius.
 */
function findNearestDarkPixel(
  imageData: ImageData,
  seedX: number,
  seedY: number,
  threshold: number,
  maxRadius: number = 30
): Point | null {
  const sx = Math.round(seedX);
  const sy = Math.round(seedY);

  if (isDark(imageData, sx, sy, threshold)) return { x: sx, y: sy };

  for (let r = 1; r <= maxRadius; r++) {
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue; // only perimeter
        const px = sx + dx;
        const py = sy + dy;
        if (isDark(imageData, px, py, threshold)) {
          return { x: px, y: py };
        }
      }
    }
  }
  return null;
}

/**
 * Trace a line from a starting point in a given direction.
 * Returns an array of points along the line.
 */
function traceDirection(
  imageData: ImageData,
  start: Point,
  initialDir: number, // index into DIRS
  threshold: number,
  visited: Set<string>,
  maxSteps: number = 2000
): Point[] {
  const points: Point[] = [];
  let current = start;
  let dir = initialDir;
  let steps = 0;

  while (steps < maxSteps) {
    steps++;
    let found = false;

    // Look ahead in the current direction and neighbors (±2 directions)
    for (let offset = 0; offset <= 3; offset++) {
      const tryOffsets = offset === 0 ? [0] : [-offset, offset];
      for (const off of tryOffsets) {
        const newDir = (dir + off + 8) % 8;
        const nx = current.x + DIRS[newDir].dx;
        const ny = current.y + DIRS[newDir].dy;
        const key = `${nx},${ny}`;

        if (visited.has(key)) continue;
        if (isDark(imageData, nx, ny, threshold)) {
          visited.add(key);
          current = { x: nx, y: ny };
          dir = newDir;
          points.push(current);
          found = true;
          break;
        }
      }
      if (found) break;
    }

    if (!found) break;
  }

  return points;
}

/**
 * Simplify a path by removing intermediate points on straight segments.
 * Uses Ramer-Douglas-Peucker algorithm.
 */
function simplifyPath(points: Point[], epsilon: number): Point[] {
  if (points.length <= 2) return points;

  let maxDist = 0;
  let maxIdx = 0;
  const start = points[0];
  const end = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], start, end);
    if (d > maxDist) {
      maxDist = d;
      maxIdx = i;
    }
  }

  if (maxDist > epsilon) {
    const left = simplifyPath(points.slice(0, maxIdx + 1), epsilon);
    const right = simplifyPath(points.slice(maxIdx), epsilon);
    return [...left.slice(0, -1), ...right];
  }

  return [start, end];
}

function perpendicularDistance(p: Point, lineStart: Point, lineEnd: Point): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p.x - lineStart.x, p.y - lineStart.y);
  const t = Math.max(0, Math.min(1, ((p.x - lineStart.x) * dx + (p.y - lineStart.y) * dy) / lenSq));
  const projX = lineStart.x + t * dx;
  const projY = lineStart.y + t * dy;
  return Math.hypot(p.x - projX, p.y - projY);
}

/**
 * Main entry: trace a cable line starting from a seed point.
 * Returns normalized coordinates (0-1000) for the SVG overlay.
 */
export function traceCableLine(
  canvas: HTMLCanvasElement,
  seedNormX: number, // 0-1000
  seedNormY: number, // 0-1000
  darkThreshold: number = 100
): Point[] | null {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const w = canvas.width;
  const h = canvas.height;

  // Convert normalized coords to pixel coords
  const pixelX = (seedNormX / 1000) * w;
  const pixelY = (seedNormY / 1000) * h;

  // Get image data (cache-friendly: get the whole image once)
  const imageData = ctx.getImageData(0, 0, w, h);

  // Find the nearest dark pixel to our seed
  const startPixel = findNearestDarkPixel(imageData, pixelX, pixelY, darkThreshold, 50);
  if (!startPixel) return null;

  // Trace in all 8 directions from start, pick the two longest paths (opposite directions)
  const visited = new Set<string>();
  visited.add(`${startPixel.x},${startPixel.y}`);

  const traces: { dir: number; points: Point[] }[] = [];
  for (let d = 0; d < 8; d++) {
    const visitedCopy = new Set(visited);
    const pts = traceDirection(imageData, startPixel, d, darkThreshold, visitedCopy);
    traces.push({ dir: d, points: pts });
  }

  // Sort by length, pick the two longest that are roughly opposite
  traces.sort((a, b) => b.points.length - a.points.length);

  let bestA = traces[0];
  let bestB: { dir: number; points: Point[] } | null = null;

  for (let i = 1; i < traces.length; i++) {
    const angleDiff = Math.abs(((traces[i].dir - bestA.dir + 4) % 8) - 4);
    if (angleDiff >= 3) {
      // Roughly opposite direction
      bestB = traces[i];
      break;
    }
  }

  if (bestA.points.length < 10) return null; // too short to be a cable

  // Combine: reverse bestB + start + bestA
  const fullPath: Point[] = [];
  if (bestB && bestB.points.length > 5) {
    fullPath.push(...bestB.points.reverse());
  }
  fullPath.push(startPixel);
  fullPath.push(...bestA.points);

  if (fullPath.length < 10) return null;

  // Simplify path
  const simplified = simplifyPath(fullPath, 3);

  // Convert back to normalized coords (0-1000)
  const normalized = simplified.map((p) => ({
    x: Math.round((p.x / w) * 1000),
    y: Math.round((p.y / h) * 1000),
  }));

  return normalized;
}

/**
 * Trace multiple cable lines given an array of seed points.
 */
export function traceCableLines(
  canvas: HTMLCanvasElement,
  seeds: { x: number; y: number }[], // normalized 0-1000
  darkThreshold: number = 100
): Point[][] {
  const results: Point[][] = [];

  for (const seed of seeds) {
    const traced = traceCableLine(canvas, seed.x, seed.y, darkThreshold);
    if (traced && traced.length >= 2) {
      results.push(traced);
    }
  }

  return results;
}
