import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import {
  getObjectDefinition,
  getSpawnPosition,
  normalizeColor,
  normalizeObject,
  normalizeVector,
  clampDimensions,
} from '../lib/objectCatalog';
import { loadSceneFromUrl } from '../lib/sceneUrl';

const initialScene = loadSceneFromUrl();

function createSceneObject(type, index) {
  const definition = getObjectDefinition(type);

  return {
    id: uuidv4(),
    type: definition.id,
    position: getSpawnPosition(index),
    rotation: [0, 0, 0],
    dimensions: [...definition.dimensions],
    color: definition.color,
  };
}

function patchObject(currentObject, newData) {
  const nextType = newData.type ?? currentObject.type;
  const definition = getObjectDefinition(nextType);

  return {
    ...currentObject,
    ...newData,
    type: definition.id,
    position: newData.position
      ? normalizeVector(newData.position, currentObject.position)
      : currentObject.position,
    rotation: newData.rotation
      ? normalizeVector(newData.rotation, currentObject.rotation)
      : currentObject.rotation,
    dimensions: newData.dimensions
      ? clampDimensions(
          definition.id,
          normalizeVector(newData.dimensions, currentObject.dimensions),
        )
      : currentObject.dimensions,
    color:
      newData.color !== undefined
        ? normalizeColor(newData.color, currentObject.color)
        : currentObject.color,
  };
}

const initialObjects = (initialScene?.objects ?? []).map((object) => ({
  id: uuidv4(),
  ...normalizeObject(object),
}));

const useStore = create((set) => ({
  objects: initialObjects,
  selectedId: null,
  unitSystem: initialScene?.unitSystem === 'cm' ? 'cm' : 'm',
  transformMode: 'translate',

  addObject: (type) =>
    set((state) => {
      const newObject = createSceneObject(type, state.objects.length);
      return {
        objects: [...state.objects, newObject],
        selectedId: newObject.id,
      };
    }),

  removeObject: (id) =>
    set((state) => ({
      objects: state.objects.filter((object) => object.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
    })),

  selectObject: (id) => set({ selectedId: id }),

  setUnitSystem: (unitSystem) =>
    set({ unitSystem: unitSystem === 'cm' ? 'cm' : 'm' }),

  setTransformMode: (transformMode) =>
    set({
      transformMode: transformMode === 'rotate' ? 'rotate' : 'translate',
    }),

  updateObject: (id, newData) =>
    set((state) => ({
      objects: state.objects.map((object) =>
        object.id === id ? patchObject(object, newData) : object,
      ),
    })),
}));

export default useStore;
