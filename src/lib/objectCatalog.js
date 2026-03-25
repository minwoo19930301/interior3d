import { localizeText } from './i18n';

const GENERIC_MIN_DIMENSIONS = [0.2, 0.2, 0.05];

export const UNIT_SYSTEMS = {
  m: { label: 'm', factor: 1, step: 0.05, precision: 2 },
  cm: { label: 'cm', factor: 100, step: 5, precision: 0 },
};

export const OBJECT_GROUPS = [
  { id: 'structure', label: { en: 'Structure', ko: '구조' } },
  { id: 'living', label: { en: 'Living', ko: '거실' } },
  { id: 'work', label: { en: 'Work', ko: '작업' } },
  { id: 'appliance', label: { en: 'Appliance', ko: '가전' } },
  { id: 'bath', label: { en: 'Bath & Kitchen', ko: '욕실·주방' } },
];

export const OBJECT_CATALOG = [
  {
    id: 'room',
    label: { en: 'House templates', ko: '집 템플릿' },
    group: 'structure',
    dimensions: [4, 2.4, 4],
    minDimensions: [2, 2, 2],
    color: '#d7d1c7',
    planner: true,
  },
  {
    id: 'wall',
    label: { en: 'Wall', ko: '벽' },
    group: 'structure',
    dimensions: [3.2, 2.4, 0.08],
    minDimensions: [0.6, 1.4, 0.05],
    color: '#d7d1c7',
  },
  {
    id: 'floorPanel',
    label: { en: 'Floor', ko: '바닥' },
    group: 'structure',
    dimensions: [3.2, 0.12, 3.2],
    minDimensions: [1, 0.05, 1],
    color: '#ece8df',
  },
  {
    id: 'ceilingPanel',
    label: { en: 'Ceiling', ko: '천장' },
    group: 'structure',
    dimensions: [3.2, 0.12, 3.2],
    minDimensions: [1, 0.05, 1],
    color: '#e4e8ed',
  },
  {
    id: 'door',
    label: { en: 'Door', ko: '문' },
    group: 'structure',
    dimensions: [0.9, 2.1, 0.08],
    minDimensions: [0.7, 1.9, 0.08],
    color: '#9f7b59',
    openable: true,
  },
  {
    id: 'cube',
    label: { en: 'Cube', ko: '큐브' },
    group: 'structure',
    dimensions: [1, 1, 1],
    minDimensions: [0.2, 0.2, 0.2],
    color: '#c78854',
  },
  {
    id: 'sofa',
    label: { en: 'Sofa', ko: '소파' },
    group: 'living',
    dimensions: [2.1, 0.85, 0.92],
    minDimensions: [1.1, 0.6, 0.5],
    color: '#8d7764',
  },
  {
    id: 'bed',
    label: { en: 'Bed', ko: '침대' },
    group: 'living',
    dimensions: [1.7, 0.72, 2.2],
    minDimensions: [1.1, 0.4, 1.7],
    color: '#6e5d58',
  },
  {
    id: 'chair',
    label: { en: 'Chair', ko: '의자' },
    group: 'living',
    dimensions: [0.52, 0.92, 0.54],
    minDimensions: [0.3, 0.45, 0.3],
    color: '#a86d43',
  },
  {
    id: 'table',
    label: { en: 'Table', ko: '테이블' },
    group: 'living',
    dimensions: [1.6, 0.75, 0.92],
    minDimensions: [0.7, 0.55, 0.5],
    color: '#9c714c',
  },
  {
    id: 'desk',
    label: { en: 'Desk', ko: '책상' },
    group: 'work',
    dimensions: [1.4, 0.75, 0.7],
    minDimensions: [0.8, 0.6, 0.45],
    color: '#8b6548',
  },
  {
    id: 'tv',
    label: { en: 'TV', ko: 'TV' },
    group: 'work',
    dimensions: [1.4, 0.9, 0.12],
    minDimensions: [0.6, 0.4, 0.05],
    color: '#1f2328',
  },
  {
    id: 'cabinet',
    label: { en: 'Cabinet', ko: '수납장' },
    group: 'work',
    dimensions: [0.9, 1.6, 0.45],
    minDimensions: [0.45, 0.8, 0.3],
    color: '#8a715b',
    openable: true,
  },
  {
    id: 'wardrobe',
    label: { en: 'Wardrobe', ko: '옷장' },
    group: 'work',
    dimensions: [1.6, 2.1, 0.65],
    minDimensions: [0.8, 1.5, 0.4],
    color: '#8b7968',
    openable: true,
  },
  {
    id: 'refrigerator',
    label: { en: 'Refrigerator', ko: '냉장고' },
    group: 'appliance',
    dimensions: [0.9, 1.85, 0.82],
    minDimensions: [0.5, 1.3, 0.45],
    color: '#d8dde3',
  },
  {
    id: 'washingMachine',
    label: { en: 'Washing Machine', ko: '세탁기' },
    group: 'appliance',
    dimensions: [0.68, 0.92, 0.68],
    minDimensions: [0.45, 0.6, 0.45],
    color: '#dfe3e8',
  },
  {
    id: 'sink',
    label: { en: 'Sink', ko: '싱크대' },
    group: 'bath',
    dimensions: [1.1, 0.92, 0.62],
    minDimensions: [0.6, 0.65, 0.35],
    color: '#aab6c3',
  },
  {
    id: 'cooktop',
    label: { en: 'Cooktop', ko: '인덕션' },
    group: 'bath',
    dimensions: [0.78, 0.16, 0.58],
    minDimensions: [0.4, 0.08, 0.3],
    color: '#20252d',
  },
  {
    id: 'bathtub',
    label: { en: 'Bathtub', ko: '욕조' },
    group: 'bath',
    dimensions: [1.7, 0.58, 0.82],
    minDimensions: [1, 0.35, 0.5],
    color: '#e8ecef',
  },
  {
    id: 'toilet',
    label: { en: 'Toilet', ko: '변기' },
    group: 'bath',
    dimensions: [0.42, 0.78, 0.7],
    minDimensions: [0.28, 0.45, 0.4],
    color: '#eef1f4',
  },
  {
    id: 'shower',
    label: { en: 'Shower', ko: '샤워기' },
    group: 'bath',
    dimensions: [0.9, 2.1, 0.9],
    minDimensions: [0.55, 1.7, 0.55],
    color: '#b8d4e8',
  },
];

const OBJECT_CATALOG_BY_ID = Object.fromEntries(
  OBJECT_CATALOG.map((item) => [item.id, item]),
);

const COLOR_PATTERN = /^#[0-9a-f]{6}$/i;
const FREE_Y_POSITION_TYPES = new Set(['ceilingPanel', 'floorPanel']);
const NON_BLOCKING_SPAWN_TYPES = new Set(['floorPanel', 'ceilingPanel']);
const DEFAULT_FORWARD = [0.707, 0, 0.707];
const SPAWN_CLEARANCE = 0.2;

export const DEFAULT_CAMERA_STATE = {
  position: [9, 7.5, 9],
  target: [0, 0, 0],
};

export function getObjectDefinition(type) {
  return OBJECT_CATALOG_BY_ID[type] ?? OBJECT_CATALOG_BY_ID.cube;
}

export function getObjectLabel(type, locale) {
  return localizeText(getObjectDefinition(type).label, locale);
}

export function getObjectGroupLabel(groupId, locale) {
  const group = OBJECT_GROUPS.find((item) => item.id === groupId);
  return localizeText(group?.label ?? '', locale);
}

export function isObjectOpenable(type) {
  return Boolean(getObjectDefinition(type).openable);
}

export function normalizeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function roundNumber(value, digits = 3) {
  const factor = 10 ** digits;
  return Math.round(normalizeNumber(value) * factor) / factor;
}

export function normalizeVector(value, fallback) {
  return fallback.map((item, index) =>
    roundNumber(
      normalizeNumber(Array.isArray(value) ? value[index] : undefined, item),
    ),
  );
}

export function normalizePositionForType(type, value, fallback = [0, 0, 0]) {
  const nextPosition = normalizeVector(value, fallback);

  if (!FREE_Y_POSITION_TYPES.has(type)) {
    nextPosition[1] = 0;
  }

  return nextPosition;
}

export function normalizeColor(value, fallback) {
  return COLOR_PATTERN.test(value ?? '') ? value : fallback;
}

export function clampDimensions(type, dimensions) {
  const definition = getObjectDefinition(type);
  const minimums = definition.minDimensions ?? GENERIC_MIN_DIMENSIONS;

  return dimensions.map((value, index) =>
    roundNumber(
      Math.max(
        normalizeNumber(value, definition.dimensions[index]),
        minimums[index] ?? GENERIC_MIN_DIMENSIONS[index],
      ),
    ),
  );
}

export function normalizeObject(rawObject) {
  const definition = getObjectDefinition(rawObject?.type);

  return {
    type: definition.id,
    position: normalizePositionForType(definition.id, rawObject?.position, [0, 0, 0]),
    rotation: normalizeVector(rawObject?.rotation, [0, 0, 0]),
    dimensions: clampDimensions(
      definition.id,
      normalizeVector(rawObject?.dimensions, definition.dimensions),
    ),
    color: normalizeColor(rawObject?.color, definition.color),
    isOpen:
      definition.openable
        ? rawObject?.isOpen !== undefined
          ? Boolean(rawObject.isOpen)
          : definition.id === 'door'
        : undefined,
    swing:
      definition.id === 'door'
        ? rawObject?.swing === 'right'
          ? 'right'
          : 'left'
        : undefined,
  };
}

function getHorizontalFootprint(dimensions, rotation = [0, 0, 0]) {
  const [width, , depth] = dimensions;
  const yaw = normalizeNumber(rotation?.[1], 0);
  const cos = Math.abs(Math.cos(yaw));
  const sin = Math.abs(Math.sin(yaw));

  return {
    width: roundNumber(width * cos + depth * sin, 3),
    depth: roundNumber(width * sin + depth * cos, 3),
  };
}

function normalizeHorizontalDirection(vector, fallback = DEFAULT_FORWARD) {
  const x = normalizeNumber(vector?.[0], fallback[0]);
  const z = normalizeNumber(vector?.[2], fallback[2]);
  const length = Math.hypot(x, z);

  if (length < 0.001) {
    return [...fallback];
  }

  return [roundNumber(x / length, 4), 0, roundNumber(z / length, 4)];
}

function getSpawnBasis(cameraState = DEFAULT_CAMERA_STATE) {
  const position = normalizeVector(
    cameraState?.position,
    DEFAULT_CAMERA_STATE.position,
  );
  const target = normalizeVector(cameraState?.target, DEFAULT_CAMERA_STATE.target);
  const forward = normalizeHorizontalDirection([
    target[0] - position[0],
    0,
    target[2] - position[2],
  ]);

  return {
    target: [roundNumber(target[0], 3), 0, roundNumber(target[2], 3)],
    forward,
    right: [-forward[2], 0, forward[0]],
  };
}

function isSpawnBlockingType(type) {
  return !NON_BLOCKING_SPAWN_TYPES.has(type);
}

function getObjectFootprint(object) {
  return getHorizontalFootprint(
    clampDimensions(
      object.type,
      normalizeVector(
        object.dimensions,
        getObjectDefinition(object.type).dimensions,
      ),
    ),
    normalizeVector(object.rotation, [0, 0, 0]),
  );
}

function hasSpawnCollision(candidate, footprint, objects) {
  return objects.some((object) => {
    if (!isSpawnBlockingType(object.type)) {
      return false;
    }

    const objectFootprint = getObjectFootprint(object);
    const minGapX = footprint.width / 2 + objectFootprint.width / 2 + SPAWN_CLEARANCE;
    const minGapZ = footprint.depth / 2 + objectFootprint.depth / 2 + SPAWN_CLEARANCE;

    return (
      Math.abs(candidate[0] - object.position[0]) < minGapX &&
      Math.abs(candidate[2] - object.position[2]) < minGapZ
    );
  });
}

function createSpawnOffsets(maxRadius = 6) {
  const offsets = [[0, 0]];

  for (let radius = 1; radius <= maxRadius; radius += 1) {
    for (let column = -radius; column <= radius; column += 1) {
      offsets.push([column, -radius]);
      offsets.push([column, radius]);
    }

    for (let row = -radius + 1; row <= radius - 1; row += 1) {
      offsets.push([-radius, row]);
      offsets.push([radius, row]);
    }
  }

  return offsets;
}

export function getSpawnPosition(options = 0) {
  if (typeof options === 'number') {
    const columns = 4;
    const spacing = 2.8;
    const column = options % columns;
    const row = Math.floor(options / columns);

    return [
      roundNumber((column - (columns - 1) / 2) * spacing, 2),
      0,
      roundNumber((row - 0.5) * spacing, 2),
    ];
  }

  const {
    type = 'cube',
    dimensions = getObjectDefinition(type).dimensions,
    rotation = [0, 0, 0],
    objects = [],
    selectedObject = null,
    cameraState = DEFAULT_CAMERA_STATE,
    preferredPosition = null,
  } = options ?? {};
  const footprint = getHorizontalFootprint(
    clampDimensions(type, normalizeVector(dimensions, getObjectDefinition(type).dimensions)),
    normalizeVector(rotation, [0, 0, 0]),
  );
  const { target, forward, right } = getSpawnBasis(cameraState);
  const anchorSource = preferredPosition ?? selectedObject?.position ?? target;
  const anchorPosition = normalizePositionForType(type, anchorSource, target);
  const anchor = [anchorPosition[0], anchorPosition[1], anchorPosition[2]];
  const stepX = Math.max(footprint.width + SPAWN_CLEARANCE * 1.5, 0.7);
  const stepZ = Math.max(footprint.depth + SPAWN_CLEARANCE * 1.5, 0.7);
  const candidateOffsets = createSpawnOffsets(6);

  for (const [column, row] of candidateOffsets) {
    const candidate = normalizePositionForType(
      type,
      [
        anchor[0] + right[0] * column * stepX + forward[0] * row * stepZ,
        anchor[1],
        anchor[2] + right[2] * column * stepX + forward[2] * row * stepZ,
      ],
      anchor,
    );

    if (!hasSpawnCollision(candidate, footprint, objects)) {
      return candidate;
    }
  }

  return normalizePositionForType(type, anchor, anchor);
}

export function toDisplayValue(value, unitSystem) {
  const unit = UNIT_SYSTEMS[unitSystem] ?? UNIT_SYSTEMS.m;
  return roundNumber(value * unit.factor, unit.precision);
}

export function fromDisplayValue(value, unitSystem) {
  const unit = UNIT_SYSTEMS[unitSystem] ?? UNIT_SYSTEMS.m;
  return roundNumber(normalizeNumber(value, 0) / unit.factor);
}

export function radiansToDegrees(value) {
  return roundNumber((normalizeNumber(value, 0) * 180) / Math.PI, 1);
}

export function degreesToRadians(value) {
  return roundNumber((normalizeNumber(value, 0) * Math.PI) / 180, 4);
}
