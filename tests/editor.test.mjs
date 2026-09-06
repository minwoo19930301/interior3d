import test from 'node:test';
import assert from 'node:assert/strict';
import { getObjectDefinition, normalizeObject, roundNumber } from '../src/lib/objectCatalog.js';
import { parseSceneParam, serializeScene, syncSceneToUrl } from '../src/lib/sceneUrl.js';
import useStore from '../src/store/useStore.js';
import { buildHouseObjects, getDefaultHouseSize } from '../src/lib/roomBuilder.js';

const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');

test('all apartment templates keep their 8cm wall thickness after store normalization', () => {
  for (const templateId of ['korean-59a','korean-84a','korean-84b']) {
    const objects = buildHouseObjects({templateId,...getDefaultHouseSize(templateId),wallThickness:0.08});
    const walls = objects.filter(object=>object.type==='wall');
    assert.ok(walls.length>5);
    for(const wall of walls) {
      const prepared = normalizeObject(wall);
      assert.equal(Math.min(prepared.dimensions[0],prepared.dimensions[2]),0.08);
      assert.deepEqual(prepared.dimensions,wall.dimensions);
    }
  }
});

test('narrow custom floor and ceiling tiles preserve their footprint', () => {
  for(const type of ['floorPanel','ceilingPanel']) {
    assert.deepEqual(normalizeObject({type,dimensions:[0.45,0.08,0.8]}).dimensions,[0.45,0.08,0.8]);
  }
});

test('shared scene roundtrip preserves door state, dimensions, units and rotation', () => {
  const door = normalizeObject({ type: 'door', dimensions: [1.2, 2.4, 0.1], position: [2.25, 0, -4], rotation: [0, 1.57, 0], isOpen: true, swing: 'right' });
  assert.deepEqual(parseSceneParam(serializeScene({objects: [door], unitSystem: 'cm'})), {objects: [door], unitSystem: 'cm'});
});

test('inherited object and unit names cannot escape catalog normalization', () => {
  for (const name of ['__proto__', 'constructor', 'toString']) {
    assert.equal(getObjectDefinition(name).id, 'cube');
    const scene = parseSceneParam(encode({v: 1, u: name, o: [{t: name}]}));
    assert.equal(scene.unitSystem, 'm');
    assert.equal(scene.objects[0].type, 'cube');
    assert.ok(scene.objects[0].dimensions.every(Number.isFinite));
  }
});

test('malformed, unsupported and non-object scene payloads are rejected', () => {
  for (const payload of [null, [], {}, {v:2,o:[]}, {v:1,o:[null]}, {v:1,o:[[]]}, {v:1,o:['chair']}]) {
    assert.equal(parseSceneParam(encode(payload)), null);
  }
  assert.equal(parseSceneParam('not a scene!'), null);
});

test('rounding a finite large number never overflows to Infinity', () => {
  assert.equal(roundNumber(1e308), 1e308);
});

test('browser history failure does not throw or discard the current scene', () => {
  const originalWindow = globalThis.window;
  const state = { tab: 'editor' };
  globalThis.window = { location: { href: 'https://example.com/interior3d/' }, history: { state, replaceState(received) { assert.equal(received, state); throw new Error('rate limited'); } } };
  try {
    assert.equal(syncSceneToUrl({objects: [normalizeObject({type:'sofa'})], unitSystem:'m'}), false);
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  }
});

test('unchanged transforms preserve redo and do not consume undo history', () => {
  useStore.setState({objects: [], selectedId:null, historyPast:[], historyFuture:[]});
  useStore.getState().addObject('sofa');
  const original = useStore.getState().objects[0];
  useStore.getState().updateObject(original.id, {position: [5, 0, 5]});
  useStore.getState().undo();
  const before = useStore.getState();
  useStore.getState().updateObject(original.id, {position: [...original.position], rotation: [...original.rotation]});
  assert.equal(useStore.getState(), before);
  useStore.getState().redo();
  assert.deepEqual(useStore.getState().objects[0].position, [5, 0, 5]);
  useStore.getState().undo();
  assert.deepEqual(useStore.getState().objects[0].position, original.position);
});

test('undo and redo restore copies and deletions with stable selection', () => {
  useStore.setState({objects: [], selectedId:null, historyPast:[], historyFuture:[]});
  useStore.getState().addObject('chair');
  useStore.getState().copySelectedObject();
  useStore.getState().pasteClipboardObject();
  const pasted = useStore.getState().selectedId;
  assert.equal(useStore.getState().objects.length, 2);
  useStore.getState().removeObject(pasted);
  useStore.getState().undo();
  assert.equal(useStore.getState().selectedId, pasted);
  useStore.getState().redo();
  assert.equal(useStore.getState().objects.length, 1);
  assert.equal(useStore.getState().selectedId, null);
});
