import { getObjectDefinition } from './objectCatalog';
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
export const DEFAULT_CUSTOM_COLUMN_COUNT = 4;
export const DEFAULT_CUSTOM_ROW_COUNT = 3;

export const ROOM_TILE_TYPES = [
  { id: 'empty', label: { en: 'Empty', ko: '비움' }, accent: 'rgba(255,255,255,0.03)' },
  { id: 'entry', label: { en: 'Entry', ko: '현관' }, accent: '#8d6f54' },
  { id: 'bath', label: { en: 'Bath', ko: '화장실' }, accent: '#6c8ea5' },
  { id: 'bedroom', label: { en: 'Bedroom', ko: '방' }, accent: '#7e6f98' },
  { id: 'kitchen', label: { en: 'Kitchen', ko: '부엌' }, accent: '#8e7a50' },
  { id: 'living', label: { en: 'Living', ko: '거실' }, accent: '#6e8b61' },
  { id: 'utility', label: { en: 'Utility', ko: '다용도실' }, accent: '#6f7d8d' },
];

const ROOM_TILE_TYPE_MAP = Object.fromEntries(
  ROOM_TILE_TYPES.map((item) => [item.id, item]),
);
const OPEN_ROOM_PAIR_MAP = new Set(['kitchen|living']);
const DOOR_ROOM_TYPES = new Set(['entry', 'bath', 'bedroom', 'utility']);

function roundPlanValue(value) {
  return Math.round(value * 100) / 100;
}

function clampValue(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getSurfaceThickness(wallThickness) {
  return Math.max(0.08, Math.min(0.18, wallThickness));
}

function getRoomPairKey(typeA, typeB) {
  return [typeA, typeB].sort().join('|');
}

export function getRoomTileDefinition(type) {
  return ROOM_TILE_TYPE_MAP[type] ?? ROOM_TILE_TYPE_MAP.empty;
}

export function getRoomTileLabel(type, locale) {
  return localizeText(getRoomTileDefinition(type).label, locale);
}

export function createDefaultTileGrid(
  columnCount = DEFAULT_CUSTOM_COLUMN_COUNT,
  rowCount = DEFAULT_CUSTOM_ROW_COUNT,
) {
  const safeColumns = clampValue(Math.round(columnCount), 1, MAX_CUSTOM_SECTIONS);
  const safeRows = clampValue(Math.round(rowCount), 1, MAX_CUSTOM_SECTIONS);
  const grid = Array.from({ length: safeRows }, () =>
    Array.from({ length: safeColumns }, () => 'empty'),
  );
  const seedLayout = [
    ['bath', 'entry', 'bedroom', 'bedroom'],
    ['kitchen', 'kitchen', 'living', 'living'],
    ['utility', 'kitchen', 'living', 'living'],
  ];

  for (let rowIndex = 0; rowIndex < safeRows; rowIndex += 1) {
    for (let columnIndex = 0; columnIndex < safeColumns; columnIndex += 1) {
      grid[rowIndex][columnIndex] =
        seedLayout[rowIndex]?.[columnIndex] ?? grid[rowIndex][columnIndex];
    }
  }

  if (safeRows * safeColumns <= 2) {
    grid[0][0] = 'entry';
    if (safeColumns > 1) {
      grid[0][1] = 'living';
    } else if (safeRows > 1) {
      grid[1][0] = 'living';
    }
  }

  return grid;
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

function normalizeTileGrid(rawTileGrid, rowCount, columnCount) {
  const safeRows = clampValue(Math.round(rowCount), 1, MAX_CUSTOM_SECTIONS);
  const safeColumns = clampValue(Math.round(columnCount), 1, MAX_CUSTOM_SECTIONS);
  const fallbackGrid = createDefaultTileGrid(safeColumns, safeRows);

  return Array.from({ length: safeRows }, (_, rowIndex) =>
    Array.from({ length: safeColumns }, (_, columnIndex) => {
      const type = rawTileGrid?.[rowIndex]?.[columnIndex];
      return ROOM_TILE_TYPE_MAP[type] ? type : fallbackGrid[rowIndex][columnIndex];
    }),
  );
}

function buildCustomPreviewRoomsFromSegments(columnSizes, rowSizes, tileGrid, locale) {
  const totalWidth = sumSegments(columnSizes);
  const totalDepth = sumSegments(rowSizes);
  const rooms = [];
  let zCursor = -totalDepth / 2;

  rowSizes.forEach((rowDepth, rowIndex) => {
    let xCursor = -totalWidth / 2;

    columnSizes.forEach((columnWidth, columnIndex) => {
      const tileType = tileGrid[rowIndex]?.[columnIndex] ?? 'empty';
      const definition = getRoomTileDefinition(tileType);

      rooms.push({
        id: `${rowIndex}-${columnIndex}`,
        row: rowIndex,
        column: columnIndex,
        type: tileType,
        label: definition.label,
        x: roundPlanValue(xCursor + columnWidth / 2),
        z: roundPlanValue(zCursor + rowDepth / 2),
        width: columnWidth,
        depth: rowDepth,
        accent: definition.accent,
      });
      xCursor += columnWidth;
    });

    zCursor += rowDepth;
  });

  return rooms.map((room) => ({
    ...room,
    labelText: localizeText(room.label, locale),
  }));
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
  const tileGrid = normalizeTileGrid(
    config.tileGrid,
    rowSizes.length,
    columnSizes.length,
  );

  return {
    width: roundPlanValue(sumSegments(columnSizes)),
    depth: roundPlanValue(sumSegments(rowSizes)),
    columnSizes,
    rowSizes,
    tileGrid,
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

function getAxisEdges(sizes) {
  const edges = [-sumSegments(sizes) / 2];

  sizes.forEach((size) => {
    edges.push(roundPlanValue(edges[edges.length - 1] + size));
  });

  return edges;
}

function getCellBounds(xEdges, zEdges, rowIndex, columnIndex) {
  const x1 = xEdges[columnIndex];
  const x2 = xEdges[columnIndex + 1];
  const z1 = zEdges[rowIndex];
  const z2 = zEdges[rowIndex + 1];

  return {
    x1,
    x2,
    z1,
    z2,
    width: roundPlanValue(x2 - x1),
    depth: roundPlanValue(z2 - z1),
    centerX: roundPlanValue((x1 + x2) / 2),
    centerZ: roundPlanValue((z1 + z2) / 2),
  };
}

function isFilledTile(type) {
  return Boolean(type) && type !== 'empty';
}

function shouldCreatePartition(typeA, typeB) {
  if (!isFilledTile(typeA) || !isFilledTile(typeB) || typeA === typeB) {
    return false;
  }

  return !OPEN_ROOM_PAIR_MAP.has(getRoomPairKey(typeA, typeB));
}

function shouldCreateInteriorDoor(typeA, typeB) {
  return (
    shouldCreatePartition(typeA, typeB) &&
    (DOOR_ROOM_TYPES.has(typeA) || DOOR_ROOM_TYPES.has(typeB))
  );
}

function collectLayoutEdges(tileGrid, columnSizes, rowSizes, includeOuterWalls) {
  const rows = tileGrid.length;
  const columns = tileGrid[0]?.length ?? 0;
  const xEdges = getAxisEdges(columnSizes);
  const zEdges = getAxisEdges(rowSizes);
  const edges = [];

  for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
    for (let columnIndex = 0; columnIndex < columns; columnIndex += 1) {
      const roomType = tileGrid[rowIndex][columnIndex];

      if (!isFilledTile(roomType)) {
        continue;
      }

      const bounds = getCellBounds(xEdges, zEdges, rowIndex, columnIndex);
      const rightType =
        columnIndex + 1 < columns ? tileGrid[rowIndex][columnIndex + 1] : 'empty';
      const bottomType =
        rowIndex + 1 < rows ? tileGrid[rowIndex + 1][columnIndex] : 'empty';
      const leftType = columnIndex > 0 ? tileGrid[rowIndex][columnIndex - 1] : 'empty';
      const topType = rowIndex > 0 ? tileGrid[rowIndex - 1][columnIndex] : 'empty';

      if (includeOuterWalls && !isFilledTile(leftType)) {
        edges.push({
          orientation: 'v',
          line: bounds.x1,
          start: bounds.z1,
          end: bounds.z2,
          outer: true,
          roomType,
          side: 'left',
        });
      }

      if (includeOuterWalls && !isFilledTile(topType)) {
        edges.push({
          orientation: 'h',
          line: bounds.z1,
          start: bounds.x1,
          end: bounds.x2,
          outer: true,
          roomType,
          side: 'top',
        });
      }

      if (!isFilledTile(rightType)) {
        if (includeOuterWalls) {
          edges.push({
            orientation: 'v',
            line: bounds.x2,
            start: bounds.z1,
            end: bounds.z2,
            outer: true,
            roomType,
            side: 'right',
          });
        }
      } else if (shouldCreatePartition(roomType, rightType)) {
        edges.push({
          orientation: 'v',
          line: bounds.x2,
          start: bounds.z1,
          end: bounds.z2,
          outer: false,
          roomTypes: [roomType, rightType],
        });
      }

      if (!isFilledTile(bottomType)) {
        if (includeOuterWalls) {
          edges.push({
            orientation: 'h',
            line: bounds.z2,
            start: bounds.x1,
            end: bounds.x2,
            outer: true,
            roomType,
            side: 'bottom',
          });
        }
      } else if (shouldCreatePartition(roomType, bottomType)) {
        edges.push({
          orientation: 'h',
          line: bounds.z2,
          start: bounds.x1,
          end: bounds.x2,
          outer: false,
          roomTypes: [roomType, bottomType],
        });
      }
    }
  }

  return edges;
}

function getEdgeMergeKey(edge) {
  return edge.outer
    ? `${edge.orientation}|${edge.line}|outer|${edge.roomType}|${edge.side}`
    : `${edge.orientation}|${edge.line}|inner|${getRoomPairKey(
        edge.roomTypes[0],
        edge.roomTypes[1],
      )}`;
}

function mergeLayoutEdges(edges) {
  const sorted = [...edges].sort((left, right) => {
    if (left.orientation !== right.orientation) {
      return left.orientation.localeCompare(right.orientation);
    }

    if (left.line !== right.line) {
      return left.line - right.line;
    }

    return left.start - right.start;
  });

  return sorted.reduce((merged, edge) => {
    const previous = merged[merged.length - 1];

    if (
      previous &&
      getEdgeMergeKey(previous) === getEdgeMergeKey(edge) &&
      Math.abs(previous.end - edge.start) < 0.01
    ) {
      previous.end = edge.end;
      return merged;
    }

    merged.push({ ...edge });
    return merged;
  }, []);
}

function pushHorizontalWallRange(objects, x1, x2, z, wallHeight, wallThickness) {
  pushHorizontalWall(
    objects,
    roundPlanValue((x1 + x2) / 2),
    z,
    roundPlanValue(x2 - x1),
    wallHeight,
    wallThickness,
  );
}

function pushVerticalWallRange(objects, x, z1, z2, wallHeight, wallThickness) {
  pushVerticalWall(
    objects,
    x,
    roundPlanValue((z1 + z2) / 2),
    roundPlanValue(z2 - z1),
    wallHeight,
    wallThickness,
  );
}

function pushHorizontalWallGapRange(
  objects,
  x1,
  x2,
  z,
  wallHeight,
  wallThickness,
  doorCenterX,
  doorWidth,
) {
  const gapStart = Math.max(x1, doorCenterX - doorWidth / 2);
  const gapEnd = Math.min(x2, doorCenterX + doorWidth / 2);

  if (gapStart - x1 > 0.06) {
    pushHorizontalWallRange(objects, x1, gapStart, z, wallHeight, wallThickness);
  }

  if (x2 - gapEnd > 0.06) {
    pushHorizontalWallRange(objects, gapEnd, x2, z, wallHeight, wallThickness);
  }
}

function pushVerticalWallGapRange(
  objects,
  x,
  z1,
  z2,
  wallHeight,
  wallThickness,
  doorCenterZ,
  doorWidth,
) {
  const gapStart = Math.max(z1, doorCenterZ - doorWidth / 2);
  const gapEnd = Math.min(z2, doorCenterZ + doorWidth / 2);

  if (gapStart - z1 > 0.06) {
    pushVerticalWallRange(objects, x, z1, gapStart, wallHeight, wallThickness);
  }

  if (z2 - gapEnd > 0.06) {
    pushVerticalWallRange(objects, x, gapEnd, z2, wallHeight, wallThickness);
  }
}

function getDoorWidthForEdge(edge, outer = false) {
  const edgeLength = roundPlanValue(edge.end - edge.start);
  const targetWidth = outer ? 0.95 : 0.9;
  return roundPlanValue(Math.min(targetWidth, edgeLength - 0.16));
}

function createEdgeDoorObject(edge, wallHeight, wallThickness, outer = false) {
  const doorWidth = getDoorWidthForEdge(edge, outer);

  if (!Number.isFinite(doorWidth) || doorWidth < 0.55) {
    return null;
  }

  return {
    type: 'door',
    dimensions: [
      doorWidth,
      Math.max(1.95, wallHeight - 0.18),
      Math.max(0.08, Math.min(0.12, wallThickness)),
    ],
    position:
      edge.orientation === 'h'
        ? [roundPlanValue((edge.start + edge.end) / 2), 0, edge.line]
        : [edge.line, 0, roundPlanValue((edge.start + edge.end) / 2)],
    rotation: [0, edge.orientation === 'v' ? Math.PI / 2 : 0, 0],
    color: DEFAULT_DOOR_COLOR,
    isOpen: true,
    swing: outer ? 'left' : 'right',
  };
}

function appendEdgeGeometry(objects, edge, wallHeight, wallThickness, withDoor = false) {
  const door = withDoor ? createEdgeDoorObject(edge, wallHeight, wallThickness, edge.outer) : null;

  if (!door) {
    if (edge.orientation === 'h') {
      pushHorizontalWallRange(
        objects,
        edge.start,
        edge.end,
        edge.line,
        wallHeight,
        wallThickness,
      );
    } else {
      pushVerticalWallRange(
        objects,
        edge.line,
        edge.start,
        edge.end,
        wallHeight,
        wallThickness,
      );
    }
    return;
  }

  if (edge.orientation === 'h') {
    pushHorizontalWallGapRange(
      objects,
      edge.start,
      edge.end,
      edge.line,
      wallHeight,
      wallThickness,
      door.position[0],
      door.dimensions[0],
    );
  } else {
    pushVerticalWallGapRange(
      objects,
      edge.line,
      edge.start,
      edge.end,
      wallHeight,
      wallThickness,
      door.position[2],
      door.dimensions[0],
    );
  }

  objects.push(door);
}

function chooseEntryOuterDoorEdge(edges) {
  const priority = {
    bottom: 0,
    right: 1,
    left: 2,
    top: 3,
  };

  return edges
    .filter((edge) => edge.outer && edge.roomType === 'entry')
    .sort((left, right) => {
      const sideGap = (priority[left.side] ?? 99) - (priority[right.side] ?? 99);

      if (sideGap !== 0) {
        return sideGap;
      }

      return (right.end - right.start) - (left.end - left.start);
    })[0];
}

function buildTileRegions(tileGrid, columnSizes, rowSizes) {
  const rows = tileGrid.length;
  const columns = tileGrid[0]?.length ?? 0;
  const xEdges = getAxisEdges(columnSizes);
  const zEdges = getAxisEdges(rowSizes);
  const visited = Array.from({ length: rows }, () =>
    Array.from({ length: columns }, () => false),
  );
  const regions = [];

  for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
    for (let columnIndex = 0; columnIndex < columns; columnIndex += 1) {
      const roomType = tileGrid[rowIndex][columnIndex];

      if (!isFilledTile(roomType) || visited[rowIndex][columnIndex]) {
        continue;
      }

      const queue = [[rowIndex, columnIndex]];
      const cells = [];
      let minX = Infinity;
      let maxX = -Infinity;
      let minZ = Infinity;
      let maxZ = -Infinity;

      visited[rowIndex][columnIndex] = true;

      while (queue.length > 0) {
        const [currentRow, currentColumn] = queue.shift();
        const bounds = getCellBounds(xEdges, zEdges, currentRow, currentColumn);
        const neighbors = [
          [currentRow - 1, currentColumn],
          [currentRow + 1, currentColumn],
          [currentRow, currentColumn - 1],
          [currentRow, currentColumn + 1],
        ];

        cells.push([currentRow, currentColumn]);
        minX = Math.min(minX, bounds.x1);
        maxX = Math.max(maxX, bounds.x2);
        minZ = Math.min(minZ, bounds.z1);
        maxZ = Math.max(maxZ, bounds.z2);

        neighbors.forEach(([nextRow, nextColumn]) => {
          if (
            nextRow < 0 ||
            nextColumn < 0 ||
            nextRow >= rows ||
            nextColumn >= columns ||
            visited[nextRow][nextColumn] ||
            tileGrid[nextRow][nextColumn] !== roomType
          ) {
            return;
          }

          visited[nextRow][nextColumn] = true;
          queue.push([nextRow, nextColumn]);
        });
      }

      regions.push({
        type: roomType,
        cells,
        x1: roundPlanValue(minX),
        x2: roundPlanValue(maxX),
        z1: roundPlanValue(minZ),
        z2: roundPlanValue(maxZ),
        width: roundPlanValue(maxX - minX),
        depth: roundPlanValue(maxZ - minZ),
        centerX: roundPlanValue((minX + maxX) / 2),
        centerZ: roundPlanValue((minZ + maxZ) / 2),
      });
    }
  }

  return regions;
}

function clampObjectCoordinate(value, minEdge, maxEdge, size) {
  return roundPlanValue(
    Math.min(maxEdge - size / 2 - 0.1, Math.max(minEdge + size / 2 + 0.1, value)),
  );
}

function createPlacedRoomObject(type, bounds, options = {}) {
  const definition = getObjectDefinition(type);
  const dimensions = (options.dimensions ?? definition.dimensions).map(roundPlanValue);
  const desiredX = options.x ?? bounds.centerX;
  const desiredZ = options.z ?? bounds.centerZ;

  return {
    type,
    dimensions,
    position: [
      clampObjectCoordinate(desiredX, bounds.x1, bounds.x2, dimensions[0]),
      0,
      clampObjectCoordinate(desiredZ, bounds.z1, bounds.z2, dimensions[2]),
    ],
    rotation: [0, options.rotationY ?? 0, 0],
    color: options.color ?? definition.color,
    isOpen: definition.openable ? options.isOpen ?? false : undefined,
    swing: type === 'door' ? options.swing ?? 'left' : undefined,
  };
}

function buildDefaultRoomObjects(tileGrid, columnSizes, rowSizes) {
  const regions = buildTileRegions(tileGrid, columnSizes, rowSizes);
  const objects = [];

  regions.forEach((region) => {
    if (region.type === 'entry') {
      objects.push(
        createPlacedRoomObject('cabinet', region, {
          dimensions: [
            Math.min(0.95, Math.max(0.7, region.width * 0.48)),
            1.15,
            0.38,
          ],
          z: region.z1 + 0.28,
        }),
      );
    }

    if (region.type === 'bath') {
      objects.push(
        createPlacedRoomObject('sink', region, {
          dimensions: [
            Math.min(1, Math.max(0.75, region.width * 0.55)),
            0.92,
            0.58,
          ],
          z: region.z1 + 0.34,
        }),
      );
      objects.push(
        createPlacedRoomObject('toilet', region, {
          x: region.x1 + Math.min(0.38, region.width * 0.28),
          z: region.centerZ,
        }),
      );

      if (region.width > 1.25 && region.depth > 1.25) {
        objects.push(
          createPlacedRoomObject('shower', region, {
            dimensions: [
              Math.min(0.9, Math.max(0.7, region.width * 0.36)),
              2.1,
              Math.min(0.9, Math.max(0.7, region.depth * 0.36)),
            ],
            x: region.x2 - 0.42,
            z: region.z2 - 0.42,
          }),
        );
      }
    }
  });

  return objects;
}

function buildCustomHouseObjects({
  width = 10,
  depth = 8,
  columnSizes,
  rowSizes,
  tileGrid,
  customColumns = DEFAULT_CUSTOM_COLUMN_COUNT,
  customRows = DEFAULT_CUSTOM_ROW_COUNT,
  wallHeight = 2.5,
  wallThickness = 0.08,
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
    tileGrid,
    customColumns,
    customRows,
  });
  const safeWallHeight = clampValue(wallHeight, 2.1, 4.2);
  const safeWallThickness = clampValue(wallThickness, 0.08, 0.4);
  const surfaceThickness = getSurfaceThickness(safeWallThickness);
  const xEdges = getAxisEdges(customLayout.columnSizes);
  const zEdges = getAxisEdges(customLayout.rowSizes);
  const objects = [];

  if (includeFloor) {
    customLayout.tileGrid.forEach((row, rowIndex) => {
      row.forEach((roomType, columnIndex) => {
        if (!isFilledTile(roomType)) {
          return;
        }

        const bounds = getCellBounds(xEdges, zEdges, rowIndex, columnIndex);
        objects.push({
          type: 'floorPanel',
          dimensions: [bounds.width, surfaceThickness, bounds.depth],
          position: [bounds.centerX, 0, bounds.centerZ],
          rotation: [0, 0, 0],
          color: DEFAULT_FLOOR_COLOR,
        });
      });
    });
  }

  if (includeCeiling) {
    customLayout.tileGrid.forEach((row, rowIndex) => {
      row.forEach((roomType, columnIndex) => {
        if (!isFilledTile(roomType)) {
          return;
        }

        const bounds = getCellBounds(xEdges, zEdges, rowIndex, columnIndex);
        objects.push({
          type: 'ceilingPanel',
          dimensions: [bounds.width, surfaceThickness, bounds.depth],
          position: [bounds.centerX, safeWallHeight - surfaceThickness, bounds.centerZ],
          rotation: [0, 0, 0],
          color: DEFAULT_CEILING_COLOR,
        });
      });
    });
  }

  const layoutEdges = mergeLayoutEdges(
    collectLayoutEdges(
      customLayout.tileGrid,
      customLayout.columnSizes,
      customLayout.rowSizes,
      includeOuterWalls,
    ),
  );
  const entranceEdge =
    includeOuterWalls && includeDoors ? chooseEntryOuterDoorEdge(layoutEdges) : null;

  layoutEdges.forEach((edge) => {
    const withDoor = edge.outer
      ? edge === entranceEdge
      : includeDoors &&
        shouldCreateInteriorDoor(edge.roomTypes[0], edge.roomTypes[1]);
    appendEdgeGeometry(objects, edge, safeWallHeight, safeWallThickness, withDoor);
  });

  objects.push(
    ...buildDefaultRoomObjects(
      customLayout.tileGrid,
      customLayout.columnSizes,
      customLayout.rowSizes,
    ),
  );

  return objects;
}

export function getHouseTemplate(templateId) {
  if (templateId === CUSTOM_TEMPLATE_ID) {
    return {
      id: CUSTOM_TEMPLATE_ID,
      label: { en: 'Custom template', ko: '사용자 템플릿' },
      description: {
        en: 'Paint the plan by assigning entry, bath, bedroom, kitchen, and living tiles.',
        ko: '현관, 화장실, 방, 부엌, 거실 타일을 배치해서 평면을 만듭니다.',
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
  const tiles = buildCustomPreviewRoomsFromSegments(
    customLayout.columnSizes,
    customLayout.rowSizes,
    customLayout.tileGrid,
    locale,
  );

  return {
    footprint: {
      width: customLayout.width,
      depth: customLayout.depth,
    },
    columnSizes: customLayout.columnSizes,
    rowSizes: customLayout.rowSizes,
    tileGrid: customLayout.tileGrid,
    tiles,
    rooms: tiles.filter((tile) => isFilledTile(tile.type)),
  };
}

export function getDefaultHouseSize(templateId) {
  if (templateId === CUSTOM_TEMPLATE_ID) {
    return {
      width: 12,
      depth: 9,
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
    wallThickness = 0.08,
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
