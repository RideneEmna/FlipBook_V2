/**
 * High-Resolution Drawing Crop & Contour Mask Generator
 * Extracts pixel-perfect outer silhouette masks and enclosed coloring regions from drawing crops.
 */

export interface ColoringRegion {
  id: string;
  label?: string;
  pathD?: string; // SVG path data (M x y L x y ... Z) in %
  points?: [number, number][]; // Boundary points in % [0..100, 0..100]
  bbox: { x: number; y: number; w: number; h: number }; // Bounding box in percentage [0..100]
  pixelCount: number;
  seedPoint: [number, number]; // Normalized seed [0..1, 0..1]
  maskDataUrl?: string; // Alpha mask PNG for this region
}

export interface ContourExtractionResult {
  outerPolygonPoints: [number, number][]; // Outer silhouette points in % [0..100]
  outerContourSvg: string; // SVG path for outer silhouette
  silhouetteMaskDataUrl: string; // PNG alpha mask for the whole drawing silhouette
  regions: ColoringRegion[]; // Distinct enclosed regions for free coloring
  cropImageDataUrl: string; // High-res cropped drawing PNG
  cropWidth: number;
  cropHeight: number;
  lineThreshold: number;
  smoothing: number;
}

export interface ContourExtractionOptions {
  threshold?: number; // Luminance threshold (0..255), default 135
  smoothing?: number; // Boundary simplification epsilon, default 2.0
  minRegionPixels?: number; // Minimum pixels for an enclosed region, default 25
}

/**
 * Traces the boundary polygon of a connected component using 8-directional edge tracing.
 */
function traceBoundaryPolygon(
  grid: Uint8Array | Int32Array,
  w: number,
  h: number,
  targetVal: number
): [number, number][] {
  // Find top-left pixel
  let startX = -1;
  let startY = -1;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (grid[y * w + x] === targetVal) {
        // Must be on edge of region
        if (
          x === 0 || y === 0 || x === w - 1 || y === h - 1 ||
          grid[y * w + (x - 1)] !== targetVal || grid[y * w + (x + 1)] !== targetVal ||
          grid[(y - 1) * w + x] !== targetVal || grid[(y + 1) * w + x] !== targetVal
        ) {
          startX = x;
          startY = y;
          break;
        }
      }
    }
    if (startX !== -1) break;
  }

  if (startX === -1) return [];

  // 8-connected Moore neighborhood directions: 0:N, 1:NE, 2:E, 3:SE, 4:S, 5:SW, 6:W, 7:NW
  const dx = [0, 1, 1, 1, 0, -1, -1, -1];
  const dy = [-1, -1, 0, 1, 1, 1, 0, -1];

  const points: [number, number][] = [];
  let currX = startX;
  let currY = startY;
  let dir = 7; // backtrack direction

  points.push([currX, currY]);
  const maxSteps = Math.min(w * h, 25000);
  let step = 0;

  while (step++ < maxSteps) {
    const searchStart = (dir + 5) % 8;
    let found = false;

    for (let i = 0; i < 8; i++) {
      const checkDir = (searchStart + i) % 8;
      const nx = currX + dx[checkDir];
      const ny = currY + dy[checkDir];

      if (nx >= 0 && nx < w && ny >= 0 && ny < h && grid[ny * w + nx] === targetVal) {
        currX = nx;
        currY = ny;
        dir = checkDir;
        found = true;
        break;
      }
    }

    if (!found) break;

    // Jacob's stopping criterion: looped back to start after taking enough steps
    if (currX === startX && currY === startY && points.length > 8) break;

    const last = points[points.length - 1];
    if (last[0] !== currX || last[1] !== currY) {
      points.push([currX, currY]);
    }
  }

  return points;
}

/**
 * Simplifies a polyline using Ramer-Douglas-Peucker algorithm.
 */
function simplifyPoints(points: [number, number][], epsilon: number): [number, number][] {
  if (points.length <= 4) return points;

  let maxDist = 0;
  let index = 0;
  const start = points[0];
  const end = points[points.length - 1];

  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const lineLenSq = dx * dx + dy * dy;

  for (let i = 1; i < points.length - 1; i++) {
    const pt = points[i];
    let dist = 0;
    if (lineLenSq === 0) {
      dist = Math.hypot(pt[0] - start[0], pt[1] - start[1]);
    } else {
      const t = Math.max(0, Math.min(1, ((pt[0] - start[0]) * dx + (pt[1] - start[1]) * dy) / lineLenSq));
      dist = Math.hypot(pt[0] - (start[0] + t * dx), pt[1] - (start[1] + t * dy));
    }
    if (dist > maxDist) {
      maxDist = dist;
      index = i;
    }
  }

  if (maxDist > epsilon) {
    const left = simplifyPoints(points.slice(0, index + 1), epsilon);
    const right = simplifyPoints(points.slice(index), epsilon);
    return left.slice(0, -1).concat(right);
  }
  return [start, end];
}

/**
 * Converts pixel points to percentage coordinates (0..100) and formats an SVG path string.
 */
function pointsToSvgAndPct(
  rawPoints: [number, number][],
  w: number,
  h: number,
  epsilon: number,
  maxPoints = 140
): { points: [number, number][]; pathD: string } {
  if (rawPoints.length === 0) return { points: [], pathD: '' };

  let simplified = simplifyPoints(rawPoints, epsilon);
  if (simplified.length > maxPoints) {
    const factor = Math.ceil(simplified.length / maxPoints);
    simplified = simplified.filter((_, idx) => idx % factor === 0);
  }

  const pctPoints: [number, number][] = simplified.map(([x, y]) => [
    parseFloat(((x / w) * 100).toFixed(2)),
    parseFloat(((y / h) * 100).toFixed(2)),
  ]);

  if (pctPoints.length === 0) return { points: [], pathD: '' };

  const first = pctPoints[0];
  const last = pctPoints[pctPoints.length - 1];
  if (Math.hypot(first[0] - last[0], first[1] - last[1]) > 0.5) {
    pctPoints.push([first[0], first[1]]);
  }

  const pathD = `M ${pctPoints[0][0]} ${pctPoints[0][1]} ` +
    pctPoints.slice(1).map((p) => `L ${p[0]} ${p[1]}`).join(' ') +
    ' Z';

  return { points: pctPoints, pathD };
}

/**
 * Extracts a high-resolution crop of the selected drawing, analyzes its pixels,
 * and generates pixel-perfect silhouette masks and distinct enclosed regions.
 */
export function extractDrawingContours(
  sourceCanvas: HTMLCanvasElement,
  rect: { x: number; y: number; w: number; h: number },
  options?: ContourExtractionOptions
): ContourExtractionResult {
  const threshold = options?.threshold ?? 135;
  const smoothing = options?.smoothing ?? 2.0;
  const minRegionPixels = options?.minRegionPixels ?? 25;

  const srcW = sourceCanvas.width;
  const srcH = sourceCanvas.height;

  // Calculate pixel bounds of the crop from normalized coords (0..1)
  const cropX = Math.max(0, Math.floor(rect.x * srcW));
  const cropY = Math.max(0, Math.floor(rect.y * srcH));
  const cropW = Math.max(10, Math.min(srcW - cropX, Math.ceil(rect.w * srcW)));
  const cropH = Math.max(10, Math.min(srcH - cropY, Math.ceil(rect.h * srcH)));

  // Create crop canvas
  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = cropW;
  cropCanvas.height = cropH;
  const cropCtx = cropCanvas.getContext('2d', { willReadFrequently: true });

  if (!cropCtx) {
    return {
      outerPolygonPoints: [[0, 0], [100, 0], [100, 100], [0, 100]],
      outerContourSvg: 'M 0 0 L 100 0 L 100 100 L 0 100 Z',
      silhouetteMaskDataUrl: '',
      regions: [],
      cropImageDataUrl: '',
      cropWidth: cropW,
      cropHeight: cropH,
      lineThreshold: threshold,
      smoothing,
    };
  }

  // Draw slice from source canvas
  cropCtx.drawImage(sourceCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

  let cropImageDataUrl = '';
  try {
    cropImageDataUrl = cropCanvas.toDataURL('image/png');
  } catch (err) {
    console.warn('crop toDataURL error:', err);
  }

  const imgData = cropCtx.getImageData(0, 0, cropW, cropH);
  const pixels = imgData.data;

  // Step 1: Pixel luminance classification
  // luma < threshold => dark stroke line (1)
  // luma >= threshold => light background / interior (0)
  const isStroke = new Uint8Array(cropW * cropH);
  const lumaArray = new Uint8Array(cropW * cropH);

  for (let y = 0; y < cropH; y++) {
    for (let x = 0; x < cropW; x++) {
      const idx = (y * cropW + x) * 4;
      const luma = Math.round(0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2]);
      lumaArray[y * cropW + x] = luma;
      const alpha = pixels[idx + 3] / 255;
      if (alpha > 0.2 && luma < threshold) {
        isStroke[y * cropW + x] = 1;
      }
    }
  }

  // Step 2: Flood-fill from borders to isolate exterior background outside drawing
  // 0 = interior space, 1 = stroke, 2 = exterior background
  const cellType = new Uint8Array(cropW * cropH);
  for (let i = 0; i < cropW * cropH; i++) {
    cellType[i] = isStroke[i] ? 1 : 0;
  }

  const queueX = new Int32Array(cropW * cropH);
  const queueY = new Int32Array(cropW * cropH);
  let qHead = 0;
  let qTail = 0;

  // Enqueue non-stroke pixels on all 4 borders of the crop
  for (let x = 0; x < cropW; x++) {
    if (cellType[x] === 0) {
      cellType[x] = 2;
      queueX[qTail] = x; queueY[qTail] = 0; qTail++;
    }
    const btm = (cropH - 1) * cropW + x;
    if (cellType[btm] === 0) {
      cellType[btm] = 2;
      queueX[qTail] = x; queueY[qTail] = cropH - 1; qTail++;
    }
  }
  for (let y = 0; y < cropH; y++) {
    const left = y * cropW;
    if (cellType[left] === 0) {
      cellType[left] = 2;
      queueX[qTail] = 0; queueY[qTail] = y; qTail++;
    }
    const right = y * cropW + (cropW - 1);
    if (cellType[right] === 0) {
      cellType[right] = 2;
      queueX[qTail] = cropW - 1; queueY[qTail] = y; qTail++;
    }
  }

  // Breadth-first search for exterior background
  while (qHead < qTail) {
    const cx = queueX[qHead];
    const cy = queueY[qHead];
    qHead++;

    const nbs = [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]];
    for (let i = 0; i < 4; i++) {
      const nx = nbs[i][0];
      const ny = nbs[i][1];
      if (nx >= 0 && nx < cropW && ny >= 0 && ny < cropH) {
        const nPos = ny * cropW + nx;
        if (cellType[nPos] === 0) {
          cellType[nPos] = 2;
          queueX[qTail] = nx; queueY[qTail] = ny; qTail++;
        }
      }
    }
  }

  // Step 3: Generate pixel-perfect Silhouette Mask (for Colorier les bons dessins)
  // Pixels that are NOT exterior (drawing strokes + enclosed interior spaces)
  const silhouetteCanvas = document.createElement('canvas');
  silhouetteCanvas.width = cropW;
  silhouetteCanvas.height = cropH;
  const silCtx = silhouetteCanvas.getContext('2d');
  const silImgData = silCtx ? silCtx.createImageData(cropW, cropH) : null;

  const drawingMask = new Uint8Array(cropW * cropH);
  let drawingPixelCount = 0;

  for (let y = 0; y < cropH; y++) {
    for (let x = 0; x < cropW; x++) {
      const p = y * cropW + x;
      const p4 = p * 4;
      if (cellType[p] !== 2) {
        drawingMask[p] = 1;
        drawingPixelCount++;
        if (silImgData) {
          silImgData.data[p4] = 255;
          silImgData.data[p4 + 1] = 255;
          silImgData.data[p4 + 2] = 255;
          silImgData.data[p4 + 3] = 255; // Opaque inside drawing
        }
      } else if (silImgData) {
        silImgData.data[p4 + 3] = 0; // Transparent outside drawing
      }
    }
  }

  let silhouetteMaskDataUrl = '';
  if (silCtx && silImgData) {
    silCtx.putImageData(silImgData, 0, 0);
    try {
      silhouetteMaskDataUrl = silhouetteCanvas.toDataURL('image/png');
    } catch (e) {}
  }

  // Boundary polygon of the silhouette
  let outerPolygonPoints: [number, number][] = [];
  let outerContourSvg = '';

  if (drawingPixelCount > 30) {
    const rawBoundary = traceBoundaryPolygon(drawingMask, cropW, cropH, 1);
    if (rawBoundary.length >= 3) {
      const converted = pointsToSvgAndPct(rawBoundary, cropW, cropH, smoothing, 140);
      outerPolygonPoints = converted.points;
      outerContourSvg = converted.pathD;
    }
  }

  if (outerPolygonPoints.length < 3) {
    outerPolygonPoints = [[2, 2], [98, 2], [98, 98], [2, 98], [2, 2]];
    outerContourSvg = 'M 2 2 L 98 2 L 98 98 L 2 98 Z';
  }

  // Step 4: Extract all distinct enclosed coloring regions (for Coloriage libre)
  // Interior spaces are pixels where cellType === 0
  const regionVisited = new Uint8Array(cropW * cropH);
  const regions: ColoringRegion[] = [];
  let regionIdCounter = 1;

  for (let y = 1; y < cropH - 1; y++) {
    for (let x = 1; x < cropW - 1; x++) {
      const p = y * cropW + x;
      if (cellType[p] === 0 && !regionVisited[p]) {
        // Found a new enclosed space!
        const rId = regionIdCounter++;
        let pCount = 0;
        let sumX = 0;
        let sumY = 0;
        let minX = x;
        let maxX = x;
        let minY = y;
        let maxY = y;

        const regionPixels: number[] = [];

        let rHead = 0;
        let rTail = 0;
        queueX[rTail] = x;
        queueY[rTail] = y;
        rTail++;
        regionVisited[p] = 1;

        while (rHead < rTail) {
          const rx = queueX[rHead];
          const ry = queueY[rHead];
          rHead++;

          pCount++;
          sumX += rx;
          sumY += ry;
          regionPixels.push(ry * cropW + rx);

          if (rx < minX) minX = rx;
          if (rx > maxX) maxX = rx;
          if (ry < minY) minY = ry;
          if (ry > maxY) maxY = ry;

          const rNbs = [
            [rx + 1, ry],
            [rx - 1, ry],
            [rx, ry + 1],
            [rx, ry - 1],
          ];

          for (let i = 0; i < 4; i++) {
            const nnx = rNbs[i][0];
            const nny = rNbs[i][1];
            if (nnx >= 0 && nnx < cropW && nny >= 0 && nny < cropH) {
              const np = nny * cropW + nnx;
              if (cellType[np] === 0 && !regionVisited[np]) {
                regionVisited[np] = 1;
                queueX[rTail] = nnx;
                queueY[rTail] = nny;
                rTail++;
              }
            }
          }
        }

        // Keep region if it satisfies the minimum size filter
        if (pCount >= minRegionPixels) {
          // Generate dedicated alpha mask for this sub-region
          let regMaskDataUrl = '';
          const regCanvas = document.createElement('canvas');
          regCanvas.width = cropW;
          regCanvas.height = cropH;
          const regCtx = regCanvas.getContext('2d');
          if (regCtx) {
            const regImgData = regCtx.createImageData(cropW, cropH);
            for (let i = 0; i < regionPixels.length; i++) {
              const pixIdx = regionPixels[i] * 4;
              regImgData.data[pixIdx] = 255;
              regImgData.data[pixIdx + 1] = 255;
              regImgData.data[pixIdx + 2] = 255;
              regImgData.data[pixIdx + 3] = 255;
            }
            regCtx.putImageData(regImgData, 0, 0);
            try {
              regMaskDataUrl = regCanvas.toDataURL('image/png');
            } catch (e) {}
          }

          // Generate SVG boundary path for this region
          const regGrid = new Uint8Array(cropW * cropH);
          for (let i = 0; i < regionPixels.length; i++) {
            regGrid[regionPixels[i]] = 1;
          }
          const regBoundary = traceBoundaryPolygon(regGrid, cropW, cropH, 1);
          let pathD = '';
          let points: [number, number][] = [];
          if (regBoundary.length >= 3) {
            const c = pointsToSvgAndPct(regBoundary, cropW, cropH, Math.max(1.0, smoothing * 0.75), 100);
            pathD = c.pathD;
            points = c.points;
          }

          regions.push({
            id: `reg_${rId}`,
            label: `Zone ${regions.length + 1}`,
            pathD,
            points,
            bbox: {
              x: parseFloat(((minX / cropW) * 100).toFixed(2)),
              y: parseFloat(((minY / cropH) * 100).toFixed(2)),
              w: parseFloat((((maxX - minX + 1) / cropW) * 100).toFixed(2)),
              h: parseFloat((((maxY - minY + 1) / cropH) * 100).toFixed(2)),
            },
            pixelCount: pCount,
            seedPoint: [
              parseFloat((sumX / pCount / cropW).toFixed(4)),
              parseFloat((sumY / pCount / cropH).toFixed(4)),
            ],
            maskDataUrl: regMaskDataUrl,
          });
        }
      }
    }
  }

  // Sort regions by area
  regions.sort((a, b) => b.pixelCount - a.pixelCount);

  return {
    outerPolygonPoints,
    outerContourSvg,
    silhouetteMaskDataUrl,
    regions,
    cropImageDataUrl,
    cropWidth: cropW,
    cropHeight: cropH,
    lineThreshold: threshold,
    smoothing,
  };
}

/**
 * Performs a contour-aware pixel flood fill starting from a relative click coordinate [0..1, 0..1].
 * Returns a canvas containing only the filled pixels for that region.
 */
export function floodFillRegionAt(
  cropCanvas: HTMLCanvasElement,
  normX: number,
  normY: number,
  fillColorRgba: [number, number, number, number],
  threshold = 135
): { fillCanvas: HTMLCanvasElement; pixelCount: number } | null {
  const cw = cropCanvas.width;
  const ch = cropCanvas.height;
  if (cw <= 0 || ch <= 0) return null;

  const ctx = cropCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  const imgData = ctx.getImageData(0, 0, cw, ch);
  const pixels = imgData.data;

  const startX = Math.round(Math.max(0, Math.min(cw - 1, normX * cw)));
  const startY = Math.round(Math.max(0, Math.min(ch - 1, normY * ch)));
  const startIdx = (startY * cw + startX) * 4;

  const startLuma = 0.299 * pixels[startIdx] + 0.587 * pixels[startIdx + 1] + 0.114 * pixels[startIdx + 2];
  // Do not fill if clicked directly on a black line
  if (startLuma < threshold) return null;

  // Flood-fill interior connected component bounded by black lines
  const fillCanvas = document.createElement('canvas');
  fillCanvas.width = cw;
  fillCanvas.height = ch;
  const fCtx = fillCanvas.getContext('2d');
  if (!fCtx) return null;

  const outImgData = fCtx.createImageData(cw, ch);
  const outPixels = outImgData.data;
  const visited = new Uint8Array(cw * ch);

  const qX = new Int32Array(cw * ch);
  const qY = new Int32Array(cw * ch);
  let qH = 0;
  let qT = 0;

  qX[qT] = startX;
  qY[qT] = startY;
  qT++;
  visited[startY * cw + startX] = 1;
  let filledCount = 0;

  while (qH < qT) {
    const cx = qX[qH];
    const cy = qY[qH];
    qH++;

    const p = cy * cw + cx;
    const p4 = p * 4;
    outPixels[p4] = fillColorRgba[0];
    outPixels[p4 + 1] = fillColorRgba[1];
    outPixels[p4 + 2] = fillColorRgba[2];
    outPixels[p4 + 3] = fillColorRgba[3];
    filledCount++;

    const nbs = [
      [cx + 1, cy],
      [cx - 1, cy],
      [cx, cy + 1],
      [cx, cy - 1],
    ];

    for (let i = 0; i < 4; i++) {
      const nx = nbs[i][0];
      const ny = nbs[i][1];
      if (nx >= 0 && nx < cw && ny >= 0 && ny < ch) {
        const np = ny * cw + nx;
        if (!visited[np]) {
          visited[np] = 1;
          const nIdx = np * 4;
          const nLuma = 0.299 * pixels[nIdx] + 0.587 * pixels[nIdx + 1] + 0.114 * pixels[nIdx + 2];
          if (nLuma >= threshold) {
            qX[qT] = nx;
            qY[qT] = ny;
            qT++;
          }
        }
      }
    }
  }

  fCtx.putImageData(outImgData, 0, 0);
  return { fillCanvas, pixelCount: filledCount };
}
