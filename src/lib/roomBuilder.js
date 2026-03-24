function getSurfaceThickness(wallThickness) {
  return Math.max(0.08, Math.min(0.18, wallThickness));
}

export function buildRoomObjects({
  width,
  depth,
  wallHeight,
  wallThickness,
  includeFloor,
  includeCeiling,
  openings,
}) {
  const safeWidth = Math.max(2, width);
  const safeDepth = Math.max(2, depth);
  const safeWallHeight = Math.max(2, wallHeight);
  const safeWallThickness = Math.max(0.08, wallThickness);
  const safeOpenings = openings ?? {};
  const surfaceThickness = getSurfaceThickness(safeWallThickness);
  const roomObjects = [];

  if (includeFloor) {
    roomObjects.push({
      type: 'floorPanel',
      dimensions: [safeWidth, surfaceThickness, safeDepth],
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      color: '#8b6f57',
    });
  }

  if (includeCeiling) {
    roomObjects.push({
      type: 'ceilingPanel',
      dimensions: [safeWidth, surfaceThickness, safeDepth],
      position: [0, safeWallHeight - surfaceThickness, 0],
      rotation: [0, 0, 0],
      color: '#e4e8ed',
    });
  }

  if (!safeOpenings.north) {
    roomObjects.push({
      type: 'wall',
      dimensions: [safeWidth, safeWallHeight, safeWallThickness],
      position: [0, 0, -(safeDepth / 2 - safeWallThickness / 2)],
      rotation: [0, 0, 0],
      color: '#d7d1c7',
    });
  }

  if (!safeOpenings.south) {
    roomObjects.push({
      type: 'wall',
      dimensions: [safeWidth, safeWallHeight, safeWallThickness],
      position: [0, 0, safeDepth / 2 - safeWallThickness / 2],
      rotation: [0, 0, 0],
      color: '#d7d1c7',
    });
  }

  if (!safeOpenings.west) {
    roomObjects.push({
      type: 'wall',
      dimensions: [safeWallThickness, safeWallHeight, safeDepth],
      position: [-(safeWidth / 2 - safeWallThickness / 2), 0, 0],
      rotation: [0, 0, 0],
      color: '#d7d1c7',
    });
  }

  if (!safeOpenings.east) {
    roomObjects.push({
      type: 'wall',
      dimensions: [safeWallThickness, safeWallHeight, safeDepth],
      position: [safeWidth / 2 - safeWallThickness / 2, 0, 0],
      rotation: [0, 0, 0],
      color: '#d7d1c7',
    });
  }

  return roomObjects;
}
