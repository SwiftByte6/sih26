export interface TransformableObject {
  row: number;
  col: number;
  width?: number;
  height?: number;
  scale?: { x: number; y: number; z: number };
  rotX?: number;
  rotY?: number;
  rotZ?: number;
  posY?: number;
}

export interface TransformedFootprint {
  centerX: number;
  centerZ: number;
  halfW: number;
  halfH: number;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  corners: { x: number; z: number }[];
}

/**
 * Calculates the exact 2D world-space Oriented Bounding Box (OBB)
 * of a transformed object based on its position, scale, and rotation.
 */
export function getObjectTransformedFootprint(
  obj: TransformableObject,
  cellSize: number = 20,
  paddingMargin: number = 3
): TransformedFootprint {
  const width = Math.max(1, obj.width ?? 1);
  const height = Math.max(1, obj.height ?? 1);
  const scaleX = Math.max(0.01, obj.scale?.x ?? 1);
  const scaleZ = Math.max(0.01, obj.scale?.z ?? 1);
  const rotYDeg = obj.rotY ?? 0;

  const centerX = (obj.col + width / 2) * cellSize;
  const centerZ = (obj.row + height / 2) * cellSize;

  const halfW = (width * cellSize * scaleX) / 2 + paddingMargin;
  const halfH = (height * cellSize * scaleZ) / 2 + paddingMargin;

  const rad = (rotYDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const localCorners = [
    { x: -halfW, z: -halfH },
    { x: halfW, z: -halfH },
    { x: halfW, z: halfH },
    { x: -halfW, z: halfH },
  ];

  const corners = localCorners.map((lc) => ({
    x: centerX + lc.x * cos + lc.z * sin,
    z: centerZ - lc.x * sin + lc.z * cos,
  }));

  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (const c of corners) {
    if (c.x < minX) minX = c.x;
    if (c.x > maxX) maxX = c.x;
    if (c.z < minZ) minZ = c.z;
    if (c.z > maxZ) maxZ = c.z;
  }

  return {
    centerX,
    centerZ,
    halfW,
    halfH,
    minX,
    maxX,
    minZ,
    maxZ,
    corners,
  };
}

/**
 * Checks if a specific grid cell (cellRow, cellCol) overlaps the transformed 2D footprint of an object
 * using 2D Separating Axis Theorem (SAT).
 */
export function isCellOverlappingObject(
  cellRow: number,
  cellCol: number,
  obj: TransformableObject,
  cellSize: number = 20,
  paddingMargin: number = 3
): boolean {
  const footprint = getObjectTransformedFootprint(obj, cellSize, paddingMargin);

  const cellMinX = cellCol * cellSize;
  const cellMaxX = (cellCol + 1) * cellSize;
  const cellMinZ = cellRow * cellSize;
  const cellMaxZ = (cellRow + 1) * cellSize;

  // 1. Quick AABB Rejection Test
  if (
    cellMaxX <= footprint.minX ||
    cellMinX >= footprint.maxX ||
    cellMaxZ <= footprint.minZ ||
    cellMinZ >= footprint.maxZ
  ) {
    return false;
  }

  // Fast path: if object is unscaled & unrotated (rotY % 90 === 0 with unit scale) and margin is 0
  const isUnrotated = (obj.rotY ?? 0) % 90 === 0;
  const isUnitScaled = (obj.scale?.x ?? 1) === 1 && (obj.scale?.z ?? 1) === 1;
  if (isUnrotated && isUnitScaled && paddingMargin === 0) {
    return true;
  }

  // 2. Separating Axis Theorem (SAT) testing between Cell AABB and Object OBB
  const cellCorners = [
    { x: cellMinX, z: cellMinZ },
    { x: cellMaxX, z: cellMinZ },
    { x: cellMaxX, z: cellMaxZ },
    { x: cellMinX, z: cellMaxZ },
  ];

  const rotYRad = ((obj.rotY ?? 0) * Math.PI) / 180;
  const cos = Math.cos(rotYRad);
  const sin = Math.sin(rotYRad);

  // Test axes: 2 cell axes + 2 OBB axes
  const axes = [
    { x: 1, z: 0 },
    { x: 0, z: 1 },
    { x: cos, z: -sin },
    { x: sin, z: cos },
  ];

  for (const axis of axes) {
    let minCell = Infinity;
    let maxCell = -Infinity;
    for (const p of cellCorners) {
      const proj = p.x * axis.x + p.z * axis.z;
      if (proj < minCell) minCell = proj;
      if (proj > maxCell) maxCell = proj;
    }

    let minObb = Infinity;
    let maxObb = -Infinity;
    for (const p of footprint.corners) {
      const proj = p.x * axis.x + p.z * axis.z;
      if (proj < minObb) minObb = proj;
      if (proj > maxObb) maxObb = proj;
    }

    // If there is a separating axis (no overlap along this axis), they do not intersect
    if (maxCell <= minObb || maxObb <= minCell) {
      return false;
    }
  }

  return true;
}

/**
 * Checks if two transformable objects overlap in 2D world space using SAT.
 */
export function objectsOverlapTransformed(
  objA: TransformableObject,
  objB: TransformableObject,
  cellSize: number = 20
): boolean {
  const fpA = getObjectTransformedFootprint(objA, cellSize);
  const fpB = getObjectTransformedFootprint(objB, cellSize);

  // Quick AABB rejection
  if (
    fpA.maxX <= fpB.minX ||
    fpA.minX >= fpB.maxX ||
    fpA.maxZ <= fpB.minZ ||
    fpA.minZ >= fpB.maxZ
  ) {
    return false;
  }

  const radA = ((objA.rotY ?? 0) * Math.PI) / 180;
  const radB = ((objB.rotY ?? 0) * Math.PI) / 180;

  const axes = [
    { x: Math.cos(radA), z: -Math.sin(radA) },
    { x: Math.sin(radA), z: Math.cos(radA) },
    { x: Math.cos(radB), z: -Math.sin(radB) },
    { x: Math.sin(radB), z: Math.cos(radB) },
  ];

  for (const axis of axes) {
    let minA = Infinity, maxA = -Infinity;
    for (const p of fpA.corners) {
      const proj = p.x * axis.x + p.z * axis.z;
      if (proj < minA) minA = proj;
      if (proj > maxA) maxA = proj;
    }

    let minB = Infinity, maxB = -Infinity;
    for (const p of fpB.corners) {
      const proj = p.x * axis.x + p.z * axis.z;
      if (proj < minB) minB = proj;
      if (proj > maxB) maxB = proj;
    }

    if (maxA <= minB || maxB <= minA) {
      return false;
    }
  }

  return true;
}
