const DEFAULT_WALL_COLOR = '#d7d1c7';
const DEFAULT_FLOOR_COLOR = '#8b6f57';
const DEFAULT_CEILING_COLOR = '#e4e8ed';
const DEFAULT_DOOR_COLOR = '#9f7b59';
const DEFAULT_DECK_COLOR = '#9d8163';

function getSurfaceThickness(wallThickness) {
  return Math.max(0.08, Math.min(0.18, wallThickness));
}

export const HOUSE_TEMPLATES = [
  {
    id: 'compact-one-bedroom',
    label: 'Compact 1BR',
    description: 'Bedroom, living room, kitchen, and bath in one compact shell.',
    footprint: { width: 6.4, depth: 4.2 },
    rooms: [
      { label: 'Bedroom', x: -1.95, z: -1.2, width: 2.5, depth: 1.8 },
      { label: 'Living', x: -1.5, z: 1.0, width: 3.4, depth: 1.9 },
      { label: 'Kitchen', x: 2.05, z: -1.0, width: 2.2, depth: 1.8 },
      { label: 'Bath', x: 2.05, z: 1.15, width: 2.2, depth: 1.7 },
    ],
    surfaces: [
      { x: 0, z: 0, width: 6.4, depth: 4.2, color: DEFAULT_FLOOR_COLOR },
    ],
    walls: [
      { from: [-3.2, -2.1], to: [3.2, -2.1] },
      { from: [-3.2, 2.1], to: [3.2, 2.1] },
      { from: [-3.2, -2.1], to: [-3.2, -0.3] },
      { from: [-3.2, 0.8], to: [-3.2, 2.1] },
      { from: [3.2, -2.1], to: [3.2, 2.1] },
      { from: [-3.2, -0.3], to: [-2.15, -0.3] },
      { from: [-1.25, -0.3], to: [-0.7, -0.3] },
      { from: [-0.7, -2.1], to: [-0.7, -0.3] },
      { from: [0.9, -2.1], to: [0.9, -1.2] },
      { from: [0.9, -0.4], to: [0.9, 0.6] },
      { from: [0.9, 1.45], to: [0.9, 2.1] },
      { from: [0.9, 0.3], to: [3.2, 0.3] },
    ],
    doors: [
      { x: -3.2, z: 0.25, width: 0.9, axis: 'v', swing: 'right' },
      { x: -1.7, z: -0.3, width: 0.9, axis: 'h', swing: 'left' },
      { x: 0.9, z: -0.8, width: 0.82, axis: 'v', swing: 'left' },
      { x: 0.9, z: 1.0, width: 0.82, axis: 'v', swing: 'right' },
    ],
  },
  {
    id: 'hallway-family',
    label: 'Hallway Family',
    description: 'Wide corridor plan with separated bedroom, bath, kitchen, and living zones.',
    footprint: { width: 9.6, depth: 6.8 },
    rooms: [
      { label: 'Dress', x: -3.9, z: -2.35, width: 1.6, depth: 2.1 },
      { label: 'Bath', x: -2.1, z: -2.35, width: 1.8, depth: 2.1 },
      { label: 'Hall', x: -0.1, z: -2.35, width: 2.2, depth: 2.1 },
      { label: 'Kitchen', x: 2.2, z: -2.2, width: 2.4, depth: 2.4 },
      { label: 'Laundry', x: 4.1, z: -2.2, width: 1.4, depth: 2.4 },
      { label: 'Bedroom', x: -3.1, z: 2.1, width: 3.4, depth: 2.6 },
      { label: 'Living', x: 2.6, z: 2.1, width: 4.4, depth: 2.6 },
    ],
    surfaces: [
      { x: 0, z: 0, width: 9.6, depth: 6.8, color: DEFAULT_FLOOR_COLOR },
    ],
    walls: [
      { from: [-4.8, -3.4], to: [4.8, -3.4] },
      { from: [-4.8, 3.4], to: [4.8, 3.4] },
      { from: [-4.8, -3.4], to: [-4.8, 3.4] },
      { from: [4.8, -3.4], to: [4.8, -0.55] },
      { from: [4.8, 0.55], to: [4.8, 3.4] },
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
      { x: 4.8, z: 0, width: 1.0, axis: 'v', swing: 'left' },
      { x: -2.1, z: -1.3, width: 0.9, axis: 'h', swing: 'right' },
      { x: 2.2, z: -1.0, width: 1.0, axis: 'h', swing: 'left' },
      { x: 4.1, z: -1.0, width: 0.8, axis: 'h', swing: 'left' },
      { x: -2.3, z: 0.8, width: 0.9, axis: 'h', swing: 'right' },
      { x: 1.1, z: 0.8, width: 1.0, axis: 'h', swing: 'left' },
    ],
  },
  {
    id: 'deck-house',
    label: 'Deck House',
    description: 'Service rooms up front, open living space, and wraparound deck surfaces.',
    footprint: { width: 7.8, depth: 6.5 },
    rooms: [
      { label: 'Bath', x: -2.35, z: -1.8, width: 1.3, depth: 1.2 },
      { label: 'Laundry', x: -2.35, z: -0.5, width: 1.3, depth: 1.2 },
      { label: 'Kitchen', x: -1.5, z: 1.15, width: 2.4, depth: 2.2 },
      { label: 'Entry', x: -0.7, z: -1.7, width: 1.4, depth: 1.3 },
      { label: 'Bedroom', x: 1.8, z: -1.4, width: 2.4, depth: 1.7 },
      { label: 'Living', x: 1.6, z: 1.0, width: 2.8, depth: 2.2 },
      { label: 'Deck', x: -0.7, z: 3.15, width: 3.4, depth: 1.8, accent: '#83674f' },
      { label: 'Deck', x: 3.7, z: 0.55, width: 1.2, depth: 4.2, accent: '#83674f' },
    ],
    surfaces: [
      { x: 0, z: 0, width: 6.2, depth: 4.8, color: DEFAULT_FLOOR_COLOR },
      { x: -0.7, z: 3.15, width: 3.4, depth: 1.8, color: DEFAULT_DECK_COLOR, ceiling: false },
      { x: 3.7, z: 0.55, width: 1.2, depth: 4.2, color: DEFAULT_DECK_COLOR, ceiling: false },
    ],
    walls: [
      { from: [-3.1, -2.4], to: [3.1, -2.4] },
      { from: [-3.1, 2.4], to: [3.1, 2.4] },
      { from: [-3.1, -2.4], to: [-3.1, 2.4] },
      { from: [3.1, -2.4], to: [3.1, 2.4] },
      { from: [-1.8, -2.4], to: [-1.8, -1.35] },
      { from: [-1.8, -0.95], to: [-1.8, -0.1] },
      { from: [-1.8, 0.45], to: [-1.8, 2.4] },
      { from: [0.3, -2.4], to: [0.3, -1.55] },
      { from: [0.3, -0.7], to: [0.3, 0.1] },
      { from: [0.3, 0.95], to: [0.3, 2.4] },
      { from: [-3.1, -1.2], to: [-1.8, -1.2] },
      { from: [-3.1, 0.1], to: [-1.8, 0.1] },
      { from: [0.3, -0.4], to: [3.1, -0.4] },
      { from: [-1.1, -2.4], to: [-0.15, -2.4] },
    ],
    doors: [
      { x: -0.62, z: -2.4, width: 0.95, axis: 'h', swing: 'right' },
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

function scaleValue(value, scale) {
  return Math.round(value * scale * 1000) / 1000;
}

function createSurfaceObject(surface, scale, wallHeight, thickness, type) {
  return {
    type,
    dimensions: [
      scaleValue(surface.width, scale),
      thickness,
      scaleValue(surface.depth, scale),
    ],
    position: [scaleValue(surface.x, scale), wallHeight, scaleValue(surface.z, scale)],
    rotation: [0, 0, 0],
    color: surface.color,
  };
}

function createWallObject(segment, scale, wallHeight, wallThickness) {
  const [x1, z1] = segment.from;
  const [x2, z2] = segment.to;
  const isVertical = x1 === x2;
  const length = isVertical ? Math.abs(z2 - z1) : Math.abs(x2 - x1);
  const position = isVertical
    ? [scaleValue(x1, scale), 0, scaleValue((z1 + z2) / 2, scale)]
    : [scaleValue((x1 + x2) / 2, scale), 0, scaleValue(z1, scale)];

  return {
    type: 'wall',
    dimensions: isVertical
      ? [wallThickness, wallHeight, scaleValue(length, scale)]
      : [scaleValue(length, scale), wallHeight, wallThickness],
    position,
    rotation: [0, 0, 0],
    color: segment.color ?? DEFAULT_WALL_COLOR,
  };
}

function createDoorObject(door, scale, wallHeight, wallThickness) {
  const maxDoorHeight = Math.max(1.95, wallHeight - 0.18);

  return {
    type: 'door',
    dimensions: [
      scaleValue(door.width, scale),
      maxDoorHeight,
      Math.max(0.08, Math.min(0.16, wallThickness * 0.9)),
    ],
    position: [scaleValue(door.x, scale), 0, scaleValue(door.z, scale)],
    rotation: [0, door.axis === 'v' ? Math.PI / 2 : 0, 0],
    color: door.color ?? DEFAULT_DOOR_COLOR,
    isOpen: false,
  };
}

export function getHouseTemplate(templateId) {
  return HOUSE_TEMPLATE_MAP[templateId] ?? HOUSE_TEMPLATES[0];
}

export function buildHouseObjects({
  templateId,
  scale = 1,
  wallHeight = 2.5,
  wallThickness = 0.12,
  includeFloor = true,
  includeCeiling = false,
  includeDoors = true,
}) {
  const template = getHouseTemplate(templateId);
  const safeScale = Math.max(0.7, Math.min(1.6, scale));
  const safeWallHeight = Math.max(2.1, wallHeight);
  const safeWallThickness = Math.max(0.08, wallThickness);
  const surfaceThickness = getSurfaceThickness(safeWallThickness);
  const objects = [];

  if (includeFloor) {
    template.surfaces.forEach((surface) => {
      objects.push(
        createSurfaceObject(surface, safeScale, 0, surfaceThickness, 'floorPanel'),
      );
    });
  }

  if (includeCeiling) {
    template.surfaces
      .filter((surface) => surface.ceiling !== false)
      .forEach((surface) => {
        objects.push({
          ...createSurfaceObject(
            {
              ...surface,
              color: surface.ceilingColor ?? DEFAULT_CEILING_COLOR,
            },
            safeScale,
            safeWallHeight - surfaceThickness,
            surfaceThickness,
            'ceilingPanel',
          ),
        });
      });
  }

  template.walls.forEach((segment) => {
    objects.push(createWallObject(segment, safeScale, safeWallHeight, safeWallThickness));
  });

  if (includeDoors) {
    template.doors.forEach((door) => {
      objects.push(createDoorObject(door, safeScale, safeWallHeight, safeWallThickness));
    });
  }

  return objects;
}

export function buildRoomObjects(config) {
  return buildHouseObjects(config);
}
