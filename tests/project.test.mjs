import test from 'node:test';
import assert from 'node:assert/strict';
import useStore from '../src/store/useStore.js';
import { normalizeObject } from '../src/lib/objectCatalog.js';
import { serializeScene } from '../src/lib/sceneUrl.js';
import { MAX_PROJECT_BYTES, MAX_PROJECT_OBJECTS, parseProject, readProjectFile, serializeProject } from '../src/lib/projectFiles.js';
import { createDraftAutosave, DRAFT_STORAGE_KEY, loadInitialProject, readDraft, saveDraft } from '../src/lib/draftStorage.js';

function scene(type = 'door', unitSystem = 'cm') {
  return { unitSystem, objects: [normalizeObject({
    type, position: [2.125, 0, -3.75], dimensions: [1.3, 2.4, 0.12],
    rotation: [0, 1.2345, 0], color: '#d0c0b0', isOpen: true, swing: 'right',
  })] };
}

function memoryStorage() {
  const data = new Map();
  return {
    writes: 0,
    getItem(key) { return data.get(key) ?? null; },
    setItem(key, value) { this.writes++; data.set(key, value); },
  };
}

function resetStore() {
  useStore.setState({ objects: [], unitSystem: 'm', selectedId: null, clipboardObject: null, historyPast: [], historyFuture: [] });
}

function scheduler() {
  let next = 0;
  const tasks = new Map();
  return {
    schedule(callback) { const id = ++next; tasks.set(id, callback); return id; },
    cancel(id) { tasks.delete(id); },
    run() { const callbacks = [...tasks.values()]; tasks.clear(); callbacks.forEach((callback) => callback()); },
    count() { return tasks.size; },
  };
}

const errorCode = (code) => (error) => error.code === code;

test('portable projects preserve full scene precision, open state and units without editor IDs', () => {
  const original = scene();
  original.objects[0].id = 'session-only-id';
  const text = serializeProject(original);
  assert.ok(!text.includes('session-only-id'));
  const expected = scene();
  assert.deepEqual(parseProject(text), expected);
  assert.deepEqual(parseProject('\uFEFF' + text), expected);
  assert.deepEqual(parseProject(serializeProject({ objects: [], unitSystem: 'ft' })), { objects: [], unitSystem: 'ft' });
});

test('invalid, unknown and future project content is rejected instead of normalized to an empty/default room', () => {
  const valid = JSON.parse(serializeProject(scene()));
  for (const text of ['bad JSON', 'null', '[]', '{}', JSON.stringify({ ...valid, format: 'another-app' })]) {
    assert.throws(() => parseProject(text), errorCode('invalid'));
  }
  assert.throws(() => parseProject(JSON.stringify({ ...valid, version: 2 })), errorCode('version'));
  for (const patch of [
    { objects: [null] }, { objects: [{}] }, { objects: 'room' }, { unitSystem: '__proto__' },
    { unitSystem: ['m'] }, { unitSystem: { toString: 'm' } },
    { objects: [{ ...valid.objects[0], color: ['#aabbcc'] }] },
    { objects: [{ ...valid.objects[0], type: 'future-chair' }] },
    { objects: [{ ...valid.objects[0], position: [0, '1', 0] }] },
    { objects: [{ ...valid.objects[0], dimensions: [-1, 2, 3] }] },
    { objects: [{ ...valid.objects[0], rotation: [0, 1] }] },
    { objects: [{ ...valid.objects[0], isOpen: 'false' }] },
    { objects: [{ ...valid.objects[0], swing: 'up' }] },
  ]) assert.throws(() => parseProject(JSON.stringify({ ...valid, ...patch })), errorCode('invalid'));
  assert.throws(() => parseProject(JSON.stringify(valid).replace('1.2345', '1e999')), errorCode('invalid'));
});

test('project size and object limits are checked before reading or replacing a scene', async () => {
  let read = false;
  await assert.rejects(() => readProjectFile({ size: MAX_PROJECT_BYTES + 1, text() { read = true; return ''; } }), errorCode('too_large'));
  assert.equal(read, false);
  assert.throws(() => parseProject(' '.repeat(MAX_PROJECT_BYTES + 1)), errorCode('too_large'));
  const excess = { objects: Array(MAX_PROJECT_OBJECTS + 1).fill(scene().objects[0]), unitSystem: 'm' };
  assert.throws(() => serializeProject(excess), errorCode('too_large'));
  assert.throws(() => parseProject(JSON.stringify({ format: 'interior3d-project', version: 1, ...excess })), errorCode('too_large'));
  assert.deepEqual(await readProjectFile({ size: 100, text: async () => serializeProject(scene()) }), scene());
});

test('project import restores objects, selected object and units in one undo/redo step', () => {
  resetStore();
  useStore.getState().addObject('chair');
  useStore.getState().copySelectedObject();
  useStore.getState().setUnitSystem('ft');
  const before = useStore.getState();
  useStore.getState().loadProject(scene());
  const imported = useStore.getState();
  assert.equal(imported.unitSystem, 'cm');
  assert.equal(imported.selectedId, null);
  assert.equal(imported.historyPast.length, before.historyPast.length + 1);
  assert.equal(imported.clipboardObject, before.clipboardObject);
  assert.notEqual(imported.objects[0].id, before.objects[0].id);
  useStore.getState().undo();
  assert.deepEqual(useStore.getState().objects, before.objects);
  assert.equal(useStore.getState().selectedId, before.selectedId);
  assert.equal(useStore.getState().unitSystem, 'ft');
  useStore.getState().redo();
  assert.deepEqual(useStore.getState().objects, imported.objects);
  assert.equal(useStore.getState().unitSystem, 'cm');
  assert.equal(useStore.getState().selectedId, null);
});

test('rejected imports leave scene, clipboard and both history stacks exactly untouched', () => {
  resetStore();
  useStore.getState().addObject('chair');
  useStore.getState().undo();
  const before = useStore.getState();
  assert.throws(() => useStore.getState().loadProject({ objects: [null], unitSystem: 'cm' }), errorCode('invalid'));
  assert.equal(useStore.getState(), before);
  useStore.getState().redo();
  assert.equal(useStore.getState().objects[0].type, 'chair');
});

test('importing an intentionally empty scene is undoable and edits branch away from import redo', () => {
  resetStore();
  useStore.getState().addObject('chair');
  useStore.getState().loadProject({ objects: [], unitSystem: 'ft' });
  assert.equal(useStore.getState().objects.length, 0);
  useStore.getState().undo();
  assert.equal(useStore.getState().objects.length, 1);
  assert.equal(useStore.getState().unitSystem, 'm');
  useStore.getState().setUnitSystem('cm');
  assert.equal(useStore.getState().historyFuture.length, 0);
  useStore.getState().undo();
  assert.equal(useStore.getState().unitSystem, 'm');
  const before = useStore.getState();
  useStore.getState().setUnitSystem('m');
  assert.equal(useStore.getState(), before);
});

test('bare links restore local drafts; explicit shared scenes including empty scenes take priority', () => {
  const storage = memoryStorage();
  saveDraft(scene(), storage);
  const bare = loadInitialProject({ href: 'https://example.com/interior3d/', storage });
  assert.deepEqual(bare.scene, scene());
  assert.equal(bare.source, 'draft');
  for (const shared of [scene('chair', 'm'), { objects: [], unitSystem: 'ft' }]) {
    const startup = loadInitialProject({ href: `https://example.com/interior3d/?scene=${serializeScene(shared)}`, storage });
    assert.equal(startup.source, 'shared');
    assert.equal(startup.scene.unitSystem, shared.unitSystem);
    assert.equal(startup.scene.objects.length, shared.objects.length);
    assert.deepEqual(readDraft(storage).scene, scene());
  }
  assert.equal(storage.writes, 1, 'opening shared links never saves them over an existing draft');
});

test('an empty saved draft stays empty after returning through a bare link', () => {
  const storage = memoryStorage();
  saveDraft({ objects: [], unitSystem: 'cm' }, storage);
  assert.deepEqual(loadInitialProject({ href: 'https://example.com/', storage }).scene, { objects: [], unitSystem: 'cm' });
});

test('blocked or corrupt local storage cannot prevent startup, and failed saves preserve the previous draft', () => {
  const blocked = { getItem() { throw new Error('SecurityError'); }, setItem() { throw new Error('QuotaExceededError'); } };
  assert.equal(readDraft(blocked).status, 'unavailable');
  assert.equal(saveDraft(scene(), blocked).status, 'unavailable');
  assert.equal(loadInitialProject({ href: 'https://example.com/', storage: blocked }).source, 'default');
  const storage = memoryStorage();
  for (const raw of ['bad JSON', 'null', '{}', JSON.stringify({ savedAt: 'not-a-date', project: '{}' })]) {
    storage.setItem(DRAFT_STORAGE_KEY, raw);
    assert.equal(readDraft(storage).status, 'invalid');
  }
  saveDraft(scene(), storage);
  const previous = storage.getItem(DRAFT_STORAGE_KEY);
  const quota = { getItem: storage.getItem, setItem() { throw new Error('full'); } };
  assert.equal(saveDraft({ objects: [], unitSystem: 'ft' }, quota).status, 'unavailable');
  assert.equal(storage.getItem(DRAFT_STORAGE_KEY), previous);
  assert.equal(saveDraft({ objects: [null], unitSystem: 'm' }, storage).status, 'unavailable');
  assert.equal(storage.getItem(DRAFT_STORAGE_KEY), previous);
});

test('autosave ignores startup, selection and camera changes, then coalesces edits and flushes the newest state', () => {
  resetStore();
  const storage = memoryStorage();
  saveDraft(scene(), storage);
  const clock = scheduler();
  const statuses = [];
  const autosave = createDraftAutosave(useStore, { storage, ...clock, onStatus: (value) => statuses.push(value.status) });
  assert.equal(storage.writes, 1);
  useStore.getState().selectObject('missing');
  useStore.getState().setCameraMode('pan');
  assert.equal(clock.count(), 0);
  useStore.getState().addObject('chair');
  useStore.getState().setUnitSystem('ft');
  assert.equal(clock.count(), 1);
  assert.equal(storage.writes, 1);
  clock.run();
  assert.equal(storage.writes, 2);
  assert.equal(readDraft(storage).scene.unitSystem, 'ft');
  assert.equal(readDraft(storage).scene.objects[0].type, 'chair');
  assert.equal(statuses.at(-1), 'saved');
  useStore.getState().loadProject({ objects: [], unitSystem: 'cm' });
  autosave.flush(); // pagehide/visibilitychange: do not lose the final edit.
  assert.deepEqual(readDraft(storage).scene, { objects: [], unitSystem: 'cm' });
  assert.equal(clock.count(), 0);
  autosave.stop();
  useStore.getState().addObject('sofa');
  assert.equal(clock.count(), 0);
});

test('autosave can recover from a quota error on the next edit without dropping editor history', () => {
  resetStore();
  const storage = memoryStorage();
  const write = storage.setItem;
  let full = true;
  storage.setItem = function(key, value) { if (full) throw new Error('full'); write.call(this, key, value); };
  const statuses = [];
  const clock = scheduler();
  const autosave = createDraftAutosave(useStore, { storage, ...clock, onStatus: (value) => statuses.push(value.status) });
  useStore.getState().loadProject(scene());
  clock.run();
  assert.equal(statuses.at(-1), 'unavailable');
  assert.equal(useStore.getState().historyPast.length, 1);
  full = false;
  useStore.getState().undo();
  autosave.stop(); // cleanup also flushes a pending change.
  assert.equal(statuses.at(-1), 'saved');
  assert.deepEqual(readDraft(storage).scene, { objects: [], unitSystem: 'm' });
  assert.equal(clock.count(), 0);
});
