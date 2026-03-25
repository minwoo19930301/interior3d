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
    label: { en: 'House', ko: '집' },
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

export function getSpawnPosition(index) {
  const columns = 4;
  const spacing = 2.8;
  const column = index % columns;
  const row = Math.floor(index / columns);

  return [
    roundNumber((column - (columns - 1) / 2) * spacing, 2),
    0,
    roundNumber((row - 0.5) * spacing, 2),
  ];
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
