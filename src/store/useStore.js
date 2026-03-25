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
const HISTORY_LIMIT = 60;
const PASTE_OFFSET = [0.45, 0, 0.45];

function createSceneObject(type, index) {
  const definition = getObjectDefinition(type);

  return {
    id: uuidv4(),
    type: definition.id,
    position: getSpawnPosition(index),
    rotation: [0, 0, 0],
    dimensions: [...definition.dimensions],
    color: definition.color,
    isOpen: definition.openable ? false : undefined,
    swing: definition.id === 'door' ? 'left' : undefined,
  };
}

function cloneSceneObject(object) {
  return {
    id: object.id,
    type: object.type,
    position: [...object.position],
    rotation: [...object.rotation],
    dimensions: [...object.dimensions],
    color: object.color,
    isOpen: object.isOpen,
    swing: object.swing,
  };
}

function cloneClipboardObject(object) {
  return {
    type: object.type,
    position: [...object.position],
    rotation: [...object.rotation],
    dimensions: [...object.dimensions],
    color: object.color,
    isOpen: object.isOpen,
    swing: object.swing,
  };
}

function createHistoryEntry(state) {
  return {
    objects: state.objects.map(cloneSceneObject),
    selectedId: state.selectedId,
  };
}

function pushHistoryEntry(historyPast, state) {
  const nextHistory = [...historyPast, createHistoryEntry(state)];
  return nextHistory.slice(-HISTORY_LIMIT);
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
    isOpen:
      definition.openable && newData.isOpen !== undefined
        ? Boolean(newData.isOpen)
        : definition.openable
          ? Boolean(currentObject.isOpen)
          : undefined,
    swing:
      definition.id === 'door'
        ? newData.swing === 'right'
          ? 'right'
          : newData.swing === 'left'
            ? 'left'
            : currentObject.swing ?? 'left'
        : undefined,
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

function createPastedObject(clipboardObject) {
  return {
    id: uuidv4(),
    type: clipboardObject.type,
    position: clipboardObject.position.map(
      (value, index) => value + (PASTE_OFFSET[index] ?? 0),
    ),
    rotation: [...clipboardObject.rotation],
    dimensions: [...clipboardObject.dimensions],
    color: clipboardObject.color,
    isOpen: clipboardObject.isOpen,
    swing: clipboardObject.swing,
  };
}

function createPreparedObject(rawObject) {
  return {
    id: uuidv4(),
    ...normalizeObject(rawObject),
  };
}

const useStore = create((set, get) => ({
  objects: initialObjects,
  selectedId: null,
  unitSystem: initialScene?.unitSystem === 'cm' ? 'cm' : 'm',
  transformMode: 'translate',
  clipboardObject: null,
  historyPast: [],
  historyFuture: [],

  addObject: (type) =>
    set((state) => {
      const newObject = createSceneObject(type, state.objects.length);
      return {
        historyPast: pushHistoryEntry(state.historyPast, state),
        historyFuture: [],
        objects: [...state.objects, newObject],
        selectedId: newObject.id,
      };
    }),

  addObjects: (rawObjects) =>
    set((state) => {
      if (!Array.isArray(rawObjects) || rawObjects.length === 0) {
        return state;
      }

      const newObjects = rawObjects.map(createPreparedObject);
      const lastObject = newObjects[newObjects.length - 1];

      return {
        historyPast: pushHistoryEntry(state.historyPast, state),
        historyFuture: [],
        objects: [...state.objects, ...newObjects],
        selectedId: lastObject?.id ?? state.selectedId,
      };
    }),

  replaceObjects: (rawObjects) =>
    set((state) => {
      const nextObjects = Array.isArray(rawObjects)
        ? rawObjects.map(createPreparedObject)
        : [];
      const lastObject = nextObjects[nextObjects.length - 1];

      return {
        historyPast: pushHistoryEntry(state.historyPast, state),
        historyFuture: [],
        objects: nextObjects,
        selectedId: lastObject?.id ?? null,
      };
    }),

  removeObject: (id) =>
    set((state) => ({
      historyPast:
        state.objects.some((object) => object.id === id)
          ? pushHistoryEntry(state.historyPast, state)
          : state.historyPast,
      historyFuture:
        state.objects.some((object) => object.id === id) ? [] : state.historyFuture,
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
    set((state) => {
      const hasTarget = state.objects.some((object) => object.id === id);

      if (!hasTarget) {
        return state;
      }

      return {
        historyPast: pushHistoryEntry(state.historyPast, state),
        historyFuture: [],
        objects: state.objects.map((object) =>
          object.id === id ? patchObject(object, newData) : object,
        ),
      };
    }),

  copySelectedObject: () => {
    const state = get();
    const selectedObject = state.objects.find(
      (object) => object.id === state.selectedId,
    );

    if (!selectedObject) {
      return false;
    }

    set({ clipboardObject: cloneClipboardObject(selectedObject) });
    return true;
  },

  toggleObjectOpen: (id) =>
    set((state) => {
      const targetObject = state.objects.find((object) => object.id === id);

      if (!targetObject || targetObject.isOpen === undefined) {
        return state;
      }

      return {
        historyPast: pushHistoryEntry(state.historyPast, state),
        historyFuture: [],
        objects: state.objects.map((object) =>
          object.id === id
            ? { ...object, isOpen: !object.isOpen }
            : object,
        ),
      };
    }),

  pasteClipboardObject: () =>
    set((state) => {
      if (!state.clipboardObject) {
        return state;
      }

      const newObject = createPastedObject(state.clipboardObject);

      return {
        historyPast: pushHistoryEntry(state.historyPast, state),
        historyFuture: [],
        objects: [...state.objects, newObject],
        selectedId: newObject.id,
      };
    }),

  undo: () =>
    set((state) => {
      const previousEntry = state.historyPast[state.historyPast.length - 1];

      if (!previousEntry) {
        return state;
      }

      return {
        historyPast: state.historyPast.slice(0, -1),
        historyFuture: [createHistoryEntry(state), ...state.historyFuture].slice(
          0,
          HISTORY_LIMIT,
        ),
        objects: previousEntry.objects.map(cloneSceneObject),
        selectedId: previousEntry.selectedId,
      };
    }),

  redo: () =>
    set((state) => {
      const nextEntry = state.historyFuture[0];

      if (!nextEntry) {
        return state;
      }

      return {
        historyPast: pushHistoryEntry(state.historyPast, state),
        historyFuture: state.historyFuture.slice(1),
        objects: nextEntry.objects.map(cloneSceneObject),
        selectedId: nextEntry.selectedId,
      };
    }),
}));

export default useStore;
