import { OBJECT_CATALOG, UNIT_SYSTEMS, normalizeObject } from './objectCatalog.js';

export const MAX_PROJECT_BYTES = 2 * 1024 * 1024;
export const MAX_PROJECT_OBJECTS = 2000;
const PROJECT_FORMAT = 'interior3d-project';
const knownTypes = new Set(OBJECT_CATALOG.map((item) => item.id));

export class ProjectFileError extends Error {
  constructor(code) {
    super(code);
    this.name = 'ProjectFileError';
    this.code = code;
  }
}

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isVector = (value) => Array.isArray(value) && value.length === 3 && value.every(Number.isFinite);

// Validate before touching the store: broken or newer files cannot silently turn
// into an empty room or substitute unknown furniture with cubes.
export function validateProjectScene(scene) {
  if (!isRecord(scene) || typeof scene.unitSystem !== 'string' || !Object.hasOwn(UNIT_SYSTEMS, scene.unitSystem) ||
      !Array.isArray(scene.objects)) throw new ProjectFileError('invalid');
  if (scene.objects.length > MAX_PROJECT_OBJECTS) throw new ProjectFileError('too_large');
  const objects = scene.objects.map((object) => {
    if (!isRecord(object) || !knownTypes.has(object.type) ||
        !isVector(object.position) || !isVector(object.rotation) ||
        !isVector(object.dimensions) || object.dimensions.some((value) => value <= 0) ||
        typeof object.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(object.color) ||
        (object.isOpen !== undefined && typeof object.isOpen !== 'boolean') ||
        (object.swing !== undefined && !['left', 'right'].includes(object.swing))) {
      throw new ProjectFileError('invalid');
    }
    return normalizeObject(object);
  });
  return { objects, unitSystem: scene.unitSystem };
}

export function serializeProject(scene) {
  const prepared = validateProjectScene(scene);
  const text = JSON.stringify({ format: PROJECT_FORMAT, version: 1, ...prepared }, null, 2);
  if (new TextEncoder().encode(text).length > MAX_PROJECT_BYTES) throw new ProjectFileError('too_large');
  return text;
}

export function parseProject(text) {
  if (typeof text !== 'string') throw new ProjectFileError('invalid');
  if (new TextEncoder().encode(text).length > MAX_PROJECT_BYTES) throw new ProjectFileError('too_large');
  let payload;
  try {
    payload = JSON.parse(text.replace(/^\uFEFF/, ''));
  } catch {
    throw new ProjectFileError('invalid');
  }
  if (!isRecord(payload) || payload.format !== PROJECT_FORMAT) throw new ProjectFileError('invalid');
  if (payload.version !== 1) throw new ProjectFileError('version');
  return validateProjectScene(payload);
}

export async function readProjectFile(file) {
  if (!file || file.size > MAX_PROJECT_BYTES) throw new ProjectFileError('too_large');
  return parseProject(await file.text());
}
