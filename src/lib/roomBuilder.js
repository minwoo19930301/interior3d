import { localizeText } from './i18n';

const DEFAULT_WALL_COLOR = '#d7d1c7';
const DEFAULT_FLOOR_COLOR = '#8b6f57';
const DEFAULT_CEILING_COLOR = '#e4e8ed';
const DEFAULT_DOOR_COLOR = '#9f7b59';
const DEFAULT_DECK_COLOR = '#9d8163';
const DEFAULT_WIDTH_MULTIPLIER = 1.25;
const DEFAULT_DEPTH_MULTIPLIER = 1.18;

export const CUSTOM_TEMPLATE_ID = 'custom';
export const MAX_CUSTOM_SECTIONS = 6;
export const DEFAULT_CUSTOM_COLUMN_COUNT = 3;
export const DEFAULT_CUSTOM_ROW_COUNT = 2;

function roundPlanValue(value) {
  return Math.round(value * 100) / 100;
}

function clampValue(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getSurfaceThickness(wallThickness) {
  return Math.max(0.08, Math.min(0.18, wallThickness));
}

function sumSegments(values) {
  return values.reduce((sum, value) => sum + value, 0);
}

function finalizeSegments(values, total) {
  if (!values.length) {
    return [roundPlanValue(total)];
  }

  const rounded = values.map((value) => roundPlanValue(value));
  const difference = roundPlanValue(total - sumSegments(rounded));
  rounded[rounded.length - 1] = roundPlanValue(
    (rounded[rounded.length - 1] ?? 0) + difference,
  );
  return rounded;
}

function distributeSegments(weights, total, minimum) {
  if (!weights.length) {
    return [];
  }

  const safeWeights = weights.map((value) => Math.max(0.01, value));
  const totalWeight = sumSegments(safeWeights) || safeWeights.length;
  const scaled = safeWeights.map((value) => (value / totalWeight) * total);
  const belowMinimum = scaled
    .map((value, index) => ({ value, index }))
    .filter((item) => item.value < minimum);

  if (!belowMinimum.length) {
    return scaled;
  }

  if (belowMinimum.length === safeWeights.length) {
    return Array.from({ length: safeWeights.length }, () => total / safeWeights.length);
  }

  const fixedIndexes = new Set(belowMinimum.map((item) => item.index));
  const remainingWeights = safeWeights.filter((_, index) => !fixedIndexes.has(index));
  const remainingTotal = total - minimum * fixedIndexes.size;
  const distributedRemainder = distributeSegments(
    remainingWeights,
    remainingTotal,
    minimum,
  );
  let remainderIndex = 0;

  return safeWeights.map((_, index) => {
    if (fixedIndexes.has(index)) {
      return minimum;
    }

    const value = distributedRemainder[remainderIndex] ?? minimum;
    remainderIndex += 1;
    return value;
  });
}

export function createEvenSegments(total, count) {
  const safeTotal = clampValue(total, 3.5, 24);
  const safeCount = clampValue(Math.round(count), 1, MAX_CUSTOM_SECTIONS);
  return finalizeSegments(
    Array.from({ length: safeCount }, () => safeTotal / safeCount),
    safeTotal,
  );
}

function normalizeSegmentArray(total, rawSizes, fallbackCount) {
  const safeTotal = clampValue(total, 3.5, 24);
  const safeCount = clampValue(
    Math.round(
      Array.isArray(rawSizes) && rawSizes.length > 0 ? rawSizes.length : fallbackCount,
    ),
    1,
    MAX_CUSTOM_SECTIONS,
  );
  const baseValues = Array.isArray(rawSizes)
    ? rawSizes.slice(0, safeCount).map((value) => clampValue(Number(value) || 0, 0.01, 24))
    : [];
  const weights =
    baseValues.length === safeCount && baseValues.some((value) => value > 0)
      ? baseValues
      : createEvenSegments(safeTotal, safeCount);
  const minimumSize = Math.max(0.45, Math.min(1.2, (safeTotal / safeCount) * 0.42));

  return finalizeSegments(
    distributeSegments(weights, safeTotal, minimumSize),
    safeTotal,
  );
}

function getSegmentCenters(sizes) {
  const total = sumSegments(sizes);
  let cursor = -total / 2;

  return sizes.map((size) => {
    const center = roundPlanValue(cursor + size / 2);
    cursor += size;
    return center;
  });
}

function getDividerPositions(sizes) {
  const total = sumSegments(sizes);
  let cursor = -total / 2;
  const positions = [];

  sizes.slice(0, -1).forEach((size) => {
    cursor += size;
    positions.push(roundPlanValue(cursor));
  });

  return positions;
}

function buildCustomPreviewRoomsFromSegments(columnSizes, rowSizes, locale) {
  const totalWidth = sumSegments(columnSizes);
  const totalDepth = sumSegments(rowSizes);
  const rooms = [];
  let zCursor = -totalDepth / 2;
  let roomIndex = 1;

  rowSizes.forEach((rowDepth) => {
    let xCursor = -totalWidth / 2;

    columnSizes.forEach((columnWidth) => {
      rooms.push({
        label: {
          en: `Room ${roomIndex}`,
          ko: `방 ${roomIndex}`,
        },
        x: roundPlanValue(xCursor + columnWidth / 2),
        z: roundPlanValue(zCursor + rowDepth / 2),
        width: columnWidth,
        depth: rowDepth,
      });
      roomIndex += 1;
      xCursor += columnWidth;
    });

    zCursor += rowDepth;
  });

  return rooms.map((room) => ({
    ...room,
    labelText: localizeText(room.label, locale),
  }));
}

function getNearestCenter(values) {
  return values.reduce(
    (closest, value) => (Math.abs(value) < Math.abs(closest) ? value : closest),
    values[0] ?? 0,
  );
}

export function normalizeCustomLayoutConfig(config = {}) {
  const safeWidth = clampValue(config.width ?? 10, 3.5, 24);
  const safeDepth = clampValue(config.depth ?? 8, 3.5, 24);
  const fallbackColumns = config.customColumns ?? DEFAULT_CUSTOM_COLUMN_COUNT;
  const fallbackRows = config.customRows ?? DEFAULT_CUSTOM_ROW_COUNT;
  const columnSizes = normalizeSegmentArray(
    safeWidth,
    config.columnSizes,
    fallbackColumns,
  );
  const rowSizes = normalizeSegmentArray(
    safeDepth,
    config.rowSizes,
    fallbackRows,
  );

  return {
    width: roundPlanValue(sumSegments(columnSizes)),
    depth: roundPlanValue(sumSegments(rowSizes)),
    columnSizes,
    rowSizes,
  };
}

export const HOUSE_TEMPLATES = [
  {
    id: 'compact-one-bedroom',
    label: { en: 'Compact 1BR', ko: '컴팩트 1베드' },
    description: {
      en: 'Bedroom, living room, kitchen, and bath in one compact shell.',
      ko: '침실, 거실, 주방, 욕실이 한 번에 들어가는 컴팩트한 구성입니다.',
    },
    footprint: { width: 6.4, depth: 4.2 },
    rooms: [
      { label: { en: 'Bedroom', ko: '침실' }, x: -1.95, z: -1.2, width: 2.5, depth: 1.8 },
      { label: { en: 'Living', ko: '거실' }, x: -1.5, z: 1.0, width: 3.4, depth: 1.9 },
      { label: { en: 'Kitchen', ko: '주방' }, x: 2.05, z: -1.0, width: 2.2, depth: 1.8 },
      { label: { en: 'Bath', ko: '욕실' }, x: 2.05, z: 1.15, width: 2.2, depth: 1.7 },
    ],
    surfaces: [
      { x: 0, z: 0, width: 6.4, depth: 4.2, color: DEFAULT_FLOOR_COLOR },
    ],
    walls: [
      { from: [-3.2, -2.1], to: [3.2, -2.1], outer: true },
      { from: [-3.2, 2.1], to: [3.2, 2.1], outer: true },
      { from: [-3.2, -2.1], to: [-3.2, -0.3], outer: true },
      { from: [-3.2, 0.8], to: [-3.2, 2.1], outer: true },
      { from: [3.2, -2.1], to: [3.2, 2.1], outer: true },
      { from: [-3.2, -0.3], to: [-2.15, -0.3] },
      { from: [-1.25, -0.3], to: [-0.7, -0.3] },
      { from: [-0.7, -2.1], to: [-0.7, -0.3] },
      { from: [0.9, -2.1], to: [0.9, -1.2] },
      { from: [0.9, -0.4], to: [0.9, 0.6] },
      { from: [0.9, 1.45], to: [0.9, 2.1] },
      { from: [0.9, 0.3], to: [3.2, 0.3] },
    ],
    doors: [
      { x: -3.2, z: 0.25, width: 0.9, axis: 'v', outer: true, swing: 'right' },
      { x: -1.7, z: -0.3, width: 0.9, axis: 'h', swing: 'left' },
      { x: 0.9, z: -0.8, width: 0.82, axis: 'v', swing: 'left' },
      { x: 0.9, z: 1.0, width: 0.82, axis: 'v', swing: 'right' },
    ],
  },
  {
    id: 'hallway-family',
    label: { en: 'Hallway Family', ko: '복도형 패밀리' },
    description: {
      en: 'Wide corridor plan with separated bedroom, bath, kitchen, and living zones.',
      ko: '복도를 중심으로 침실, 욕실, 주방, 거실이 분리된 구성입니다.',
    },
    footprint: { width: 9.6, depth: 6.8 },
    rooms: [
      { label: { en: 'Dress', ko: '드레스룸' }, x: -3.9, z: -2.35, width: 1.6, depth: 2.1 },
      { label: { en: 'Bath', ko: '욕실' }, x: -2.1, z: -2.35, width: 1.8, depth: 2.1 },
      { label: { en: 'Hall', ko: '복도' }, x: -0.1, z: -2.35, width: 2.2, depth: 2.1 },
      { label: { en: 'Kitchen', ko: '주방' }, x: 2.2, z: -2.2, width: 2.4, depth: 2.4 },
      { label: { en: 'Laundry', ko: '다용도실' }, x: 4.1, z: -2.2, width: 1.4, depth: 2.4 },
      { label: { en: 'Bedroom', ko: '안방' }, x: -3.1, z: 2.1, width: 3.4, depth: 2.6 },
      { label: { en: 'Living', ko: '거실' }, x: 2.6, z: 2.1, width: 4.4, depth: 2.6 },
    ],
    surfaces: [
      { x: 0, z: 0, width: 9.6, depth: 6.8, color: DEFAULT_FLOOR_COLOR },
    ],
    walls: [
      { from: [-4.8, -3.4], to: [4.8, -3.4], outer: true },
      { from: [-4.8, 3.4], to: [4.8, 3.4], outer: true },
      { from: [-4.8, -3.4], to: [-4.8, 3.4], outer: true },
      { from: [4.8, -3.4], to: [4.8, -0.55], outer: true },
      { from: [4.8, 0.55], to: [4.8, 3.4], outer: true },
      { from: [-3.0, -3.4], to: [-3.0, -1.3] },
      { from: [-1.2, -3.4], to: [-1.2, -1.3] },
      { from: [1.0, -3.4], to: [1.0, -1.0] },
      { from: [3.4, -3.4], to: [3.4, -1.0] },
      { from: [-3.0, -1.3], to: [-2.55, -1.3] },
      { from: [-1.65, -1.3], to: [-1.2, -1.3] },
      { from: [1.0, -1.0], to: [1.7, -1.0] },
      { from: [2.7, -1.0], to: [3.4, -1.0] },
      { from: [3.4, -1.0], to: [3.7, -1.0] },
      { from: [4.5, -1.0], to: [4.8, -1.0] },
      { from: [-4.8, 0.8], to: [-2.75, 0.8] },
      { from: [-1.85, 0.8], to: [-1.4, 0.8] },
      { from: [0.4, 0.8], to: [0.6, 0.8] },
      { from: [1.6, 0.8], to: [4.8, 0.8] },
      { from: [-1.4, 0.8], to: [-1.4, 3.4] },
    ],
    doors: [
      { x: 4.8, z: 0, width: 1.0, axis: 'v', outer: true, swing: 'left' },
      { x: -2.1, z: -1.3, width: 0.9, axis: 'h', swing: 'right' },
      { x: 2.2, z: -1.0, width: 1.0, axis: 'h', swing: 'left' },
      { x: 4.1, z: -1.0, width: 0.8, axis: 'h', swing: 'left' },
      { x: -2.3, z: 0.8, width: 0.9, axis: 'h', swing: 'right' },
      { x: 1.1, z: 0.8, width: 1.0, axis: 'h', swing: 'left' },
    ],
  },
  {
    id: 'deck-house',
    label: { en: 'Deck House', ko: '데크형 하우스' },
    description: {
      en: 'Service rooms up front, open living space, and wraparound deck surfaces.',
      ko: '서비스 공간과 오픈 거실, 데크가 함께 들어가는 구성입니다.',
    },
    footprint: { width: 7.8, depth: 6.5 },
    rooms: [
      { label: { en: 'Bath', ko: '욕실' }, x: -2.35, z: -1.8, width: 1.3, depth: 1.2 },
      { label: { en: 'Laundry', ko: '세탁실' }, x: -2.35, z: -0.5, width: 1.3, depth: 1.2 },
      { label: { en: 'Kitchen', ko: '주방' }, x: -1.5, z: 1.15, width: 2.4, depth: 2.2 },
      { label: { en: 'Entry', ko: '현관' }, x: -0.7, z: -1.7, width: 1.4, depth: 1.3 },
      { label: { en: 'Bedroom', ko: '침실' }, x: 1.8, z: -1.4, width: 2.4, depth: 1.7 },
      { label: { en: 'Living', ko: '거실' }, x: 1.6, z: 1.0, width: 2.8, depth: 2.2 },
      { label: { en: 'Deck', ko: '데크' }, x: -0.7, z: 3.15, width: 3.4, depth: 1.8, accent: '#83674f' },
      { label: { en: 'Deck', ko: '데크' }, x: 3.7, z: 0.55, width: 1.2, depth: 4.2, accent: '#83674f' },
    ],
    surfaces: [
      { x: 0, z: 0, width: 6.2, depth: 4.8, color: DEFAULT_FLOOR_COLOR },
      { x: -0.7, z: 3.15, width: 3.4, depth: 1.8, color: DEFAULT_DECK_COLOR, ceiling: false },
      { x: 3.7, z: 0.55, width: 1.2, depth: 4.2, color: DEFAULT_DECK_COLOR, ceiling: false },
    ],
    walls: [
      { from: [-3.1, -2.4], to: [-1.1, -2.4], outer: true },
      { from: [-0.15, -2.4], to: [3.1, -2.4], outer: true },
      { from: [-3.1, 2.4], to: [3.1, 2.4], outer: true },
      { from: [-3.1, -2.4], to: [-3.1, 2.4], outer: true },
      { from: [3.1, -2.4], to: [3.1, 2.4], outer: true },
      { from: [-1.8, -2.4], to: [-1.8, -1.35] },
      { from: [-1.8, -0.95], to: [-1.8, -0.1] },
      { from: [-1.8, 0.45], to: [-1.8, 2.4] },
      { from: [0.3, -2.4], to: [0.3, -1.55] },
      { from: [0.3, -0.7], to: [0.3, 0.1] },
      { from: [0.3, 0.95], to: [0.3, 2.4] },
      { from: [-3.1, -1.2], to: [-1.8, -1.2] },
      { from: [-3.1, 0.1], to: [-1.8, 0.1] },
      { from: [0.3, -0.4], to: [3.1, -0.4] },
    ],
    doors: [
      { x: -0.62, z: -2.4, width: 0.95, axis: 'h', outer: true, swing: 'right' },
      { x: -1.8, z: -1.15, width: 0.8, axis: 'v', swing: 'left' },
      { x: -1.8, z: -0.25, width: 0.8, axis: 'v', swing: 'left' },
      { x: 0.3, z: -1.1, width: 0.9, axis: 'v', swing: 'right' },
      { x: 0.3, z: 0.55, width: 0.9, axis: 'v', swing: 'left' },
    ],
  },
];

const HOUSE_TEMPLATE_MAP = Object.fromEntries(
  HOUSE_TEMPLATES.map((template) => [template.id, template]),
);

function scaleXAxis(value, scaleX) {
  return roundPlanValue(value * scaleX);
}

function scaleZAxis(value, scaleZ) {
  return roundPlanValue(value * scaleZ);
}

function createSurfaceObject(surface, scaleX, scaleZ, y, thickness, type) {
  return {
    type,
    dimensions: [
      scaleXAxis(surface.width, scaleX),
      thickness,
      scaleZAxis(surface.depth, scaleZ),
    ],
    position: [scaleXAxis(surface.x, scaleX), y, scaleZAxis(surface.z, scaleZ)],
    rotation: [0, 0, 0],
    color: surface.color,
  };
}

function createWallObject(segment, scaleX, scaleZ, wallHeight, wallThickness) {
  const [x1, z1] = segment.from;
  const [x2, z2] = segment.to;
  const isVertical = x1 === x2;
  const length = isVertical ? Math.abs(z2 - z1) : Math.abs(x2 - x1);
  const position = isVertical
    ? [scaleXAxis(x1, scaleX), 0, scaleZAxis((z1 + z2) / 2, scaleZ)]
    : [scaleXAxis((x1 + x2) / 2, scaleX), 0, scaleZAxis(z1, scaleZ)];

  return {
    type: 'wall',
    dimensions: isVertical
      ? [wallThickness, wallHeight, scaleZAxis(length, scaleZ)]
      : [scaleXAxis(length, scaleX), wallHeight, wallThickness],
    position,
    rotation: [0, 0, 0],
    color: segment.color ?? DEFAULT_WALL_COLOR,
  };
}

function createDoorObject(door, scaleX, scaleZ, wallHeight, wallThickness) {
  const maxDoorHeight = Math.max(1.95, wallHeight - 0.18);
  const width =
    door.axis === 'v'
      ? scaleZAxis(door.width, scaleZ)
      : scaleXAxis(door.width, scaleX);

  return {
    type: 'door',
    dimensions: [
      width,
      maxDoorHeight,
      Math.max(0.08, Math.min(0.16, wallThickness * 0.9)),
    ],
    position: [scaleXAxis(door.x, scaleX), 0, scaleZAxis(door.z, scaleZ)],
    rotation: [0, door.axis === 'v' ? Math.PI / 2 : 0, 0],
    color: door.color ?? DEFAULT_DOOR_COLOR,
    isOpen: true,
    swing: door.swing === 'right' ? 'right' : 'left',
  };
}

function pushHorizontalWall(objects, centerX, z, width, wallHeight, wallThickness) {
  if (width <= 0.06) {
    return;
  }

  objects.push({
    type: 'wall',
    dimensions: [roundPlanValue(width), wallHeight, wallThickness],
    position: [roundPlanValue(centerX), 0, roundPlanValue(z)],
    rotation: [0, 0, 0],
    color: DEFAULT_WALL_COLOR,
  });
}

function pushVerticalWall(objects, x, centerZ, depth, wallHeight, wallThickness) {
  if (depth <= 0.06) {
    return;
  }

  objects.push({
    type: 'wall',
    dimensions: [wallThickness, wallHeight, roundPlanValue(depth)],
    position: [roundPlanValue(x), 0, roundPlanValue(centerZ)],
    rotation: [0, 0, 0],
    color: DEFAULT_WALL_COLOR,
  });
}

function pushHorizontalWallWithDoorGap(
  objects,
  z,
  totalWidth,
  wallHeight,
  wallThickness,
  doorCenterX,
  doorWidth,
) {
  const halfWidth = totalWidth / 2;
  const gapSize = Math.min(
    totalWidth - 0.12,
    doorWidth + Math.max(0.1, wallThickness * 0.8),
  );
  const gapStart = Math.max(-halfWidth, doorCenterX - gapSize / 2);
  const gapEnd = Math.min(halfWidth, doorCenterX + gapSize / 2);
  const leftWidth = gapStart + halfWidth;
  const rightWidth = halfWidth - gapEnd;

  pushHorizontalWall(
    objects,
    -halfWidth + leftWidth / 2,
    z,
    leftWidth,
    wallHeight,
    wallThickness,
  );
  pushHorizontalWall(
    objects,
    gapEnd + rightWidth / 2,
    z,
    rightWidth,
    wallHeight,
    wallThickness,
  );
}

function pushVerticalWallWithDoorGap(
  objects,
  x,
  totalDepth,
  wallHeight,
  wallThickness,
  doorCenterZ,
  doorWidth,
) {
  const halfDepth = totalDepth / 2;
  const gapSize = Math.min(
    totalDepth - 0.12,
    doorWidth + Math.max(0.1, wallThickness * 0.8),
  );
  const gapStart = Math.max(-halfDepth, doorCenterZ - gapSize / 2);
  const gapEnd = Math.min(halfDepth, doorCenterZ + gapSize / 2);
  const lowerDepth = gapStart + halfDepth;
  const upperDepth = halfDepth - gapEnd;

  pushVerticalWall(
    objects,
    x,
    -halfDepth + lowerDepth / 2,
    lowerDepth,
    wallHeight,
    wallThickness,
  );
  pushVerticalWall(
    objects,
    x,
    gapEnd + upperDepth / 2,
    upperDepth,
    wallHeight,
    wallThickness,
  );
}

function buildCustomHouseObjects({
  width = 10,
  depth = 8,
  columnSizes,
  rowSizes,
  customColumns = DEFAULT_CUSTOM_COLUMN_COUNT,
  customRows = DEFAULT_CUSTOM_ROW_COUNT,
  wallHeight = 2.5,
  wallThickness = 0.12,
  includeFloor = true,
  includeCeiling = false,
  includeDoors = true,
  includeOuterWalls = false,
}) {
  const customLayout = normalizeCustomLayoutConfig({
    width,
    depth,
    columnSizes,
    rowSizes,
    customColumns,
    customRows,
  });
  const safeWidth = customLayout.width;
  const safeDepth = customLayout.depth;
  const safeWallHeight = clampValue(wallHeight, 2.1, 4.2);
  const safeWallThickness = clampValue(wallThickness, 0.08, 0.4);
  const surfaceThickness = getSurfaceThickness(safeWallThickness);
  const verticalDividers = getDividerPositions(customLayout.columnSizes);
  const horizontalDividers = getDividerPositions(customLayout.rowSizes);
  const columnCenters = getSegmentCenters(customLayout.columnSizes);
  const rowCenters = getSegmentCenters(customLayout.rowSizes);
  const verticalDoorZ = getNearestCenter(rowCenters);
  const horizontalDoorX = getNearestCenter(columnCenters);
  const interiorDoorWidth = 0.9;
  const entranceDoorWidth = 0.95;
  const objects = [];

  if (includeFloor) {
    objects.push({
      type: 'floorPanel',
      dimensions: [safeWidth, surfaceThickness, safeDepth],
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      color: DEFAULT_FLOOR_COLOR,
    });
  }

  if (includeCeiling) {
    objects.push({
      type: 'ceilingPanel',
      dimensions: [safeWidth, surfaceThickness, safeDepth],
      position: [0, safeWallHeight - surfaceThickness, 0],
      rotation: [0, 0, 0],
      color: DEFAULT_CEILING_COLOR,
    });
  }

  if (includeOuterWalls) {
    pushHorizontalWall(
      objects,
      0,
      -(safeDepth / 2 - safeWallThickness / 2),
      safeWidth,
      safeWallHeight,
      safeWallThickness,
    );
    if (includeDoors) {
      pushHorizontalWallWithDoorGap(
        objects,
        safeDepth / 2 - safeWallThickness / 2,
        safeWidth,
        safeWallHeight,
        safeWallThickness,
        0,
        entranceDoorWidth,
      );
    } else {
      pushHorizontalWall(
        objects,
        0,
        safeDepth / 2 - safeWallThickness / 2,
        safeWidth,
        safeWallHeight,
        safeWallThickness,
      );
    }
    pushVerticalWall(
      objects,
      -(safeWidth / 2 - safeWallThickness / 2),
      0,
      safeDepth,
      safeWallHeight,
      safeWallThickness,
    );
    pushVerticalWall(
      objects,
      safeWidth / 2 - safeWallThickness / 2,
      0,
      safeDepth,
      safeWallHeight,
      safeWallThickness,
    );
  }

  verticalDividers.forEach((xPosition, columnIndex) => {
    if (includeDoors) {
      pushVerticalWallWithDoorGap(
        objects,
        xPosition,
        safeDepth,
        safeWallHeight,
        safeWallThickness,
        verticalDoorZ,
        interiorDoorWidth,
      );
    } else {
      pushVerticalWall(
        objects,
        xPosition,
        0,
        safeDepth,
        safeWallHeight,
        safeWallThickness,
      );
    }

    if (includeDoors) {
      objects.push({
        type: 'door',
        dimensions: [interiorDoorWidth, Math.max(1.95, safeWallHeight - 0.18), safeWallThickness],
        position: [xPosition, 0, verticalDoorZ],
        rotation: [0, Math.PI / 2, 0],
        color: DEFAULT_DOOR_COLOR,
        isOpen: true,
        swing: columnIndex % 2 === 0 ? 'right' : 'left',
      });
    }
  });

  horizontalDividers.forEach((zPosition, rowIndex) => {
    if (includeDoors) {
      pushHorizontalWallWithDoorGap(
        objects,
        zPosition,
        safeWidth,
        safeWallHeight,
        safeWallThickness,
        horizontalDoorX,
        interiorDoorWidth,
      );
    } else {
      pushHorizontalWall(
        objects,
        0,
        zPosition,
        safeWidth,
        safeWallHeight,
        safeWallThickness,
      );
    }

    if (includeDoors) {
      objects.push({
        type: 'door',
        dimensions: [interiorDoorWidth, Math.max(1.95, safeWallHeight - 0.18), safeWallThickness],
        position: [horizontalDoorX, 0, zPosition],
        rotation: [0, 0, 0],
        color: DEFAULT_DOOR_COLOR,
        isOpen: true,
        swing: rowIndex % 2 === 0 ? 'right' : 'left',
      });
    }
  });

  if (includeOuterWalls && includeDoors) {
    objects.push({
      type: 'door',
      dimensions: [entranceDoorWidth, Math.max(1.95, safeWallHeight - 0.18), safeWallThickness],
      position: [0, 0, safeDepth / 2 - safeWallThickness / 2],
      rotation: [0, 0, 0],
      color: DEFAULT_DOOR_COLOR,
      isOpen: true,
      swing: 'left',
    });
  }

  return objects;
}

export function getHouseTemplate(templateId) {
  if (templateId === CUSTOM_TEMPLATE_ID) {
    return {
      id: CUSTOM_TEMPLATE_ID,
      label: { en: 'Custom template', ko: '사용자 템플릿' },
      description: {
        en: 'Build your own shell with a simple room grid.',
        ko: '방 격자를 정해서 직접 집 틀을 만듭니다.',
      },
      footprint: { width: 10, depth: 8 },
      rooms: [],
      surfaces: [],
      walls: [],
      doors: [],
    };
  }

  return HOUSE_TEMPLATE_MAP[templateId] ?? HOUSE_TEMPLATES[0];
}

export function getTemplateLabel(template, locale) {
  return localizeText(template?.label ?? '', locale);
}

export function getTemplateDescription(template, locale) {
  return localizeText(template?.description ?? '', locale);
}

export function getTemplateRooms(template, locale) {
  return (template?.rooms ?? []).map((room) => ({
    ...room,
    labelText: localizeText(room.label, locale),
  }));
}

export function getCustomTemplatePreview(config, locale) {
  const customLayout = normalizeCustomLayoutConfig(config);

  return {
    footprint: {
      width: customLayout.width,
      depth: customLayout.depth,
    },
    columnSizes: customLayout.columnSizes,
    rowSizes: customLayout.rowSizes,
    rooms: buildCustomPreviewRoomsFromSegments(
      customLayout.columnSizes,
      customLayout.rowSizes,
      locale,
    ),
  };
}

export function getDefaultHouseSize(templateId) {
  if (templateId === CUSTOM_TEMPLATE_ID) {
    return {
      width: 11,
      depth: 8.5,
    };
  }

  const template = getHouseTemplate(templateId);

  return {
    width: roundPlanValue(template.footprint.width * DEFAULT_WIDTH_MULTIPLIER),
    depth: roundPlanValue(template.footprint.depth * DEFAULT_DEPTH_MULTIPLIER),
  };
}

export function buildHouseObjects(config) {
  if (config.templateId === CUSTOM_TEMPLATE_ID) {
    return buildCustomHouseObjects(config);
  }

  const {
    templateId,
    width,
    depth,
    wallHeight = 2.5,
    wallThickness = 0.12,
    includeFloor = true,
    includeCeiling = false,
    includeDoors = true,
    includeOuterWalls = false,
  } = config;
  const template = getHouseTemplate(templateId);
  const requestedWidth = Number.isFinite(width) ? width : template.footprint.width;
  const requestedDepth = Number.isFinite(depth) ? depth : template.footprint.depth;
  const scaleX = clampValue(requestedWidth / template.footprint.width, 0.7, 2.2);
  const scaleZ = clampValue(requestedDepth / template.footprint.depth, 0.7, 2.2);
  const safeWallHeight = clampValue(wallHeight, 2.1, 4.2);
  const safeWallThickness = clampValue(wallThickness, 0.08, 0.4);
  const surfaceThickness = getSurfaceThickness(safeWallThickness);
  const objects = [];

  if (includeFloor) {
    template.surfaces.forEach((surface) => {
      objects.push(
        createSurfaceObject(surface, scaleX, scaleZ, 0, surfaceThickness, 'floorPanel'),
      );
    });
  }

  if (includeCeiling) {
    template.surfaces
      .filter((surface) => surface.ceiling !== false)
      .forEach((surface) => {
        objects.push(
          createSurfaceObject(
            {
              ...surface,
              color: surface.ceilingColor ?? DEFAULT_CEILING_COLOR,
            },
            scaleX,
            scaleZ,
            safeWallHeight - surfaceThickness,
            surfaceThickness,
            'ceilingPanel',
          ),
        );
      });
  }

  template.walls
    .filter((segment) => includeOuterWalls || !segment.outer)
    .forEach((segment) => {
      objects.push(
        createWallObject(
          segment,
          scaleX,
          scaleZ,
          safeWallHeight,
          safeWallThickness,
        ),
      );
    });

  if (includeDoors) {
    template.doors
      .filter((door) => includeOuterWalls || !door.outer)
      .forEach((door) => {
        objects.push(
          createDoorObject(
            door,
            scaleX,
            scaleZ,
            safeWallHeight,
            safeWallThickness,
          ),
        );
      });
  }

  return objects;
}

export function buildRoomObjects(config) {
  return buildHouseObjects(config);
}
