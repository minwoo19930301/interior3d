const GENERIC_MIN_DIMENSIONS = [0.2, 0.2, 0.05];

export const UNIT_SYSTEMS = {
  m: { label: 'm', factor: 1, step: 0.05, precision: 2 },
  cm: { label: 'cm', factor: 100, step: 5, precision: 0 },
};

export const OBJECT_GROUPS = [
  { id: 'structure', label: 'Structure' },
  { id: 'living', label: 'Living' },
  { id: 'work', label: 'Work' },
  { id: 'appliance', label: 'Appliance' },
  { id: 'bath', label: 'Bath & Kitchen' },
];

export const OBJECT_CATALOG = [
  {
    id: 'wall',
    label: 'Wall',
    group: 'structure',
    dimensions: [3.2, 2.4, 0.12],
    minDimensions: [0.6, 1.4, 0.05],
    color: '#d7d1c7',
  },
  {
    id: 'cube',
    label: 'Cube',
    group: 'structure',
    dimensions: [1, 1, 1],
    minDimensions: [0.2, 0.2, 0.2],
    color: '#c78854',
  },
  {
    id: 'sofa',
    label: 'Sofa',
    group: 'living',
    dimensions: [2.1, 0.85, 0.92],
    minDimensions: [1.1, 0.6, 0.5],
    color: '#8d7764',
  },
  {
    id: 'bed',
    label: 'Bed',
    group: 'living',
    dimensions: [1.7, 0.72, 2.2],
    minDimensions: [1.1, 0.4, 1.7],
    color: '#6e5d58',
  },
  {
    id: 'chair',
    label: 'Chair',
    group: 'living',
    dimensions: [0.52, 0.92, 0.54],
    minDimensions: [0.3, 0.45, 0.3],
    color: '#a86d43',
  },
  {
    id: 'table',
    label: 'Table',
    group: 'living',
    dimensions: [1.6, 0.75, 0.92],
    minDimensions: [0.7, 0.55, 0.5],
    color: '#9c714c',
  },
  {
    id: 'desk',
    label: 'Desk',
    group: 'work',
    dimensions: [1.4, 0.75, 0.7],
    minDimensions: [0.8, 0.6, 0.45],
    color: '#8b6548',
  },
  {
    id: 'tv',
    label: 'TV',
    group: 'work',
    dimensions: [1.4, 0.9, 0.12],
    minDimensions: [0.6, 0.4, 0.05],
    color: '#1f2328',
  },
  {
    id: 'cabinet',
    label: 'Cabinet',
    group: 'work',
    dimensions: [0.9, 1.6, 0.45],
    minDimensions: [0.45, 0.8, 0.3],
    color: '#8a715b',
  },
  {
    id: 'wardrobe',
    label: 'Wardrobe',
    group: 'work',
    dimensions: [1.6, 2.1, 0.65],
    minDimensions: [0.8, 1.5, 0.4],
    color: '#8b7968',
  },
  {
    id: 'refrigerator',
    label: 'Refrigerator',
    group: 'appliance',
    dimensions: [0.9, 1.85, 0.82],
    minDimensions: [0.5, 1.3, 0.45],
    color: '#d8dde3',
  },
  {
    id: 'washingMachine',
    label: 'Washing Machine',
    group: 'appliance',
    dimensions: [0.68, 0.92, 0.68],
    minDimensions: [0.45, 0.6, 0.45],
    color: '#dfe3e8',
  },
  {
    id: 'sink',
    label: 'Sink',
    group: 'bath',
    dimensions: [1.1, 0.92, 0.62],
    minDimensions: [0.6, 0.65, 0.35],
    color: '#aab6c3',
  },
  {
    id: 'cooktop',
    label: 'Cooktop',
    group: 'bath',
    dimensions: [0.78, 0.16, 0.58],
    minDimensions: [0.4, 0.08, 0.3],
    color: '#20252d',
  },
  {
    id: 'bathtub',
    label: 'Bathtub',
    group: 'bath',
    dimensions: [1.7, 0.58, 0.82],
    minDimensions: [1, 0.35, 0.5],
    color: '#e8ecef',
  },
  {
    id: 'toilet',
    label: 'Toilet',
    group: 'bath',
    dimensions: [0.42, 0.78, 0.7],
    minDimensions: [0.28, 0.45, 0.4],
    color: '#eef1f4',
  },
  {
    id: 'shower',
    label: 'Shower',
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

export function getObjectDefinition(type) {
  return OBJECT_CATALOG_BY_ID[type] ?? OBJECT_CATALOG_BY_ID.cube;
}

export function getObjectLabel(type) {
  return getObjectDefinition(type).label;
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
    position: normalizeVector(rawObject?.position, [0, 0, 0]),
    rotation: normalizeVector(rawObject?.rotation, [0, 0, 0]),
    dimensions: clampDimensions(
      definition.id,
      normalizeVector(rawObject?.dimensions, definition.dimensions),
    ),
    color: normalizeColor(rawObject?.color, definition.color),
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

