// Independent CPU-only geometry/state QA. No DOM, browser, WebGL or image decoding.
// JSON material texture references are removed solely in memory; original BIN chunks
// (including all geometry) and checked-out files remain byte-for-byte unchanged.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { Box3, Color, Group, Vector3, Quaternion } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshBVH } from 'three-mesh-bvh';
import { createModelInstance, styleModel, openModel, disposeModelInstance } from '../src/lib/modelInstance.js';
import { getObjectDefinition, normalizeObject } from '../src/lib/objectCatalog.js';
import { buildDesignRoom, DESIGN_ROOMS } from '../src/lib/designRooms.js';
import { serializeScene, parseSceneParam } from '../src/lib/sceneUrl.js';
import useStore from '../src/store/useStore.js';

const root = new URL('../', import.meta.url);
const catalog = JSON.parse(await readFile(new URL('public/models/catalog.json', root), 'utf8'));
const EPS = 2e-5;
const hash = value => createHash('sha256').update(value).digest('hex');
function close(actual, expected, label, tolerance = EPS) {
  assert.equal(actual.length, expected.length, label);
  actual.forEach((value, index) => assert.ok(Math.abs(value - expected[index]) <= tolerance,
    `${label}[${index}]: ${value} != ${expected[index]} (tolerance ${tolerance})`));
}
const box = object => new Box3().setFromObject(object, true);
const size = object => box(object).getSize(new Vector3()).toArray();
function center(object) {
  // The producer's manifest reports the mean of raw POSITION vertices (not AABB centre).
  object.updateWorldMatrix(true,true);
  const sum=new Vector3(), point=new Vector3(); let count=0;
  object.traverse(node=>{
    if(!node.isMesh)return;
    const positions=node.geometry.getAttribute('position');
    for(let index=0;index<positions.count;index++) {
      point.fromBufferAttribute(positions,index).applyMatrix4(node.matrixWorld);
      sum.add(point); count++;
    }
  });
  return sum.divideScalar(count).toArray();
}
const materialsOf = mesh => Array.isArray(mesh.material) ? mesh.material : [mesh.material];
function nodes(scene) { const result = []; scene.traverse(node => result.push(node)); return result; }
function snapshot(scene) {
  scene.updateMatrixWorld(true);
  return nodes(scene).map(node => ({ name:node.name, matrix:[...node.matrixWorld.elements],
    colors:node.isMesh ? materialsOf(node).map(material => material.color.toArray()) : [] }));
}
function stripTextureReferences(value) {
  if (!value || typeof value !== 'object') return;
  for (const key of Object.keys(value)) {
    if (key.endsWith('Texture')) delete value[key];
    else stripTextureReferences(value[key]);
  }
}
function geometryOnlyGlb(original) {
  assert.equal(original.readUInt32LE(0), 0x46546c67, 'GLB magic');
  assert.equal(original.readUInt32LE(4), 2, 'GLB version');
  assert.equal(original.readUInt32LE(8), original.byteLength, 'GLB length');
  const chunks = [];
  for (let offset = 12; offset < original.byteLength;) {
    const length = original.readUInt32LE(offset);
    const kind = original.readUInt32LE(offset + 4);
    const bytes = original.subarray(offset + 8, offset + 8 + length);
    chunks.push({ kind, bytes });
    offset += 8 + length;
  }
  const json = JSON.parse(chunks.find(chunk => chunk.kind === 0x4e4f534a).bytes.toString());
  const originalGeometry = hash(JSON.stringify({ accessors:json.accessors, bufferViews:json.bufferViews,
    buffers:json.buffers, meshes:json.meshes, nodes:json.nodes, scenes:json.scenes }));
  (json.materials ?? []).forEach(stripTextureReferences);
  delete json.images;
  delete json.textures;
  delete json.samplers;
  assert.equal(hash(JSON.stringify({ accessors:json.accessors, bufferViews:json.bufferViews,
    buffers:json.buffers, meshes:json.meshes, nodes:json.nodes, scenes:json.scenes })), originalGeometry);
  const replacement = Buffer.from(JSON.stringify(json));
  const padded = Buffer.alloc(Math.ceil(replacement.length / 4) * 4, 0x20);
  replacement.copy(padded);
  const outputChunks = chunks.map(chunk => {
    const bytes = chunk.kind === 0x4e4f534a ? padded : chunk.bytes;
    const header = Buffer.alloc(8);
    header.writeUInt32LE(bytes.length, 0);
    header.writeUInt32LE(chunk.kind, 4);
    if (chunk.kind === 0x004e4942) assert.equal(hash(bytes), hash(chunk.bytes), 'BIN unchanged');
    return Buffer.concat([header, bytes]);
  });
  const header = Buffer.from(original.subarray(0, 12));
  header.writeUInt32LE(12 + outputChunks.reduce((sum, chunk) => sum + chunk.length, 0), 8);
  return { buffer:Buffer.concat([header, ...outputChunks]), originalGeometry };
}
const loaded = new Map();
for (const asset of catalog.assets) {
  const filename = new URL(`public/models/${asset.model}`, root);
  const original = await readFile(filename);
  const { buffer, originalGeometry } = geometryOnlyGlb(original);
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  const gltf = await new GLTFLoader().parseAsync(arrayBuffer, '');
  loaded.set(asset.type, { asset, scene:gltf.scene, originalHash:hash(original), originalGeometry, filename });
}

for (const { asset, scene, originalHash, filename } of loaded.values()) {
  test(`${asset.type}: authored geometry, origin, manifest, immutable source GLB`, async () => {
    assert.equal(hash(await readFile(filename)), originalHash);
    close(size(scene), asset.dimensions, 'authored W,H,D');
    const bounds = box(scene);
    close([bounds.min.y, bounds.getCenter(new Vector3()).x, bounds.getCenter(new Vector3()).z], [0,0,0], 'floor-centre origin');
    assert.ok(nodes(scene).some(node => node.isMesh), 'contains geometry');
    for (const node of nodes(scene).filter(node => node.isMesh)) {
      assert.ok(node.geometry.getAttribute('position').count > 0);
      assert.ok([...node.geometry.getAttribute('position').array].every(Number.isFinite), `${node.name} finite vertices`);
    }
    const definition = getObjectDefinition(asset.type);
    assert.deepEqual(definition.dimensions, asset.dimensions);
    assert.deepEqual(normalizeObject({type:asset.type}).dimensions, asset.dimensions, 'normalization preserves physical precision');
    assert.equal(definition.color, asset.defaultColor);
    assert.equal(definition.openable, asset.pivots.some(pivot => ['rotation','translation'].includes(pivot.motion)));
    const sourceTints = [...new Set(nodes(scene).filter(node => node.isMesh).flatMap(materialsOf).map(material => material.name).filter(name => name.startsWith('TINT_')))];
    assert.deepEqual(sourceTints.sort(), [...asset.tintMaterials].sort(), 'tint manifest matches GLB');
  });

  test(`${asset.type}: object/material clone isolation, scoped tint and authored-colour restore`, () => {
    const before = snapshot(scene);
    const a = createModelInstance(scene), b = createModelInstance(scene);
    const sourceNodes = nodes(scene), aNodes = nodes(a.scene), bNodes = nodes(b.scene);
    assert.equal(sourceNodes.length, aNodes.length);
    sourceNodes.forEach((source, index) => {
      assert.notEqual(aNodes[index], source);
      assert.notEqual(aNodes[index], bNodes[index]);
      assert.equal(aNodes[index].name, source.name);
      if (!source.isMesh) return;
      assert.equal(aNodes[index].geometry, source.geometry, 'shared immutable geometry');
      materialsOf(source).forEach((material, materialIndex) => {
        assert.equal(materialsOf(aNodes[index])[materialIndex], a.materials.get(material), 'one clone per original material');
        assert.notEqual(materialsOf(aNodes[index])[materialIndex], materialsOf(bNodes[index])[materialIndex]);
      });
    });
    const bBefore = snapshot(b.scene);
    styleModel(a, '#d83a7f', asset.defaultColor);
    for (const [source, material] of a.materials) {
      assert.notEqual(source, material);
      const expected = source.name.startsWith('TINT_') ? new Color('#d83a7f') : source.color;
      close(material.color.toArray(), expected.toArray(), `${material.name} tint`, 1e-12);
      assert.equal(material.roughness, source.roughness);
      assert.equal(material.metalness, source.metalness);
    }
    assert.deepEqual(snapshot(scene), before, 'source not recoloured');
    assert.deepEqual(snapshot(b.scene), bBefore, 'second instance not recoloured');
    styleModel(a, asset.defaultColor, asset.defaultColor);
    for (const [source, material] of a.materials) close(material.color.toArray(), source.color.toArray(), 'authored colour restored', 1e-12);
    assert.deepEqual(snapshot(a.scene), before, 'complete closed appearance restored');
    disposeModelInstance(a); disposeModelInstance(b);
  });

  test(`${asset.type}: actual pivot motion, open idempotency, close restore, other-instance isolation`, () => {
    const a = createModelInstance(scene), b = createModelInstance(scene);
    const original = snapshot(scene), closed = snapshot(a.scene), bBefore = snapshot(b.scene);
    const expectedPivots = asset.pivots.filter(pivot => ['rotation','translation'].includes(pivot.motion));
    assert.deepEqual(a.pivots.map(pivot => pivot.node.name).sort(), expectedPivots.map(pivot => pivot.node).sort());
    const centres = new Map(a.pivots.map(pivot => [pivot.node.name, center(pivot.node)]));
    openModel(a, true);
    const opened = snapshot(a.scene);
    for (const expected of expectedPivots) {
      const pivot = a.pivots.find(value => value.node.name === expected.node);
      close(pivot.position.toArray(), expected.restTranslation, 'rest translation');
      const axis = expected.axis.toLowerCase();
      if (expected.motion === 'translation') {
        const expectedPosition = pivot.position.clone(); expectedPosition[axis] += expected.openAmount;
        close(pivot.node.position.toArray(), expectedPosition.toArray(), 'open translation', 1e-12);
      } else {
        const vector = new Vector3(); vector[axis] = 1;
        const expectedQuaternion = pivot.quaternion.clone().multiply(new Quaternion().setFromAxisAngle(vector, expected.openAmount));
        close(pivot.node.quaternion.toArray(), expectedQuaternion.toArray(), 'open quaternion', 1e-12);
      }
      const delta = center(pivot.node).map((value,index) => value - centres.get(pivot.node.name)[index]);
      close(delta, expected.verifiedOpenCentreDelta, 'actual geometry centre movement');
      assert.ok(Math.hypot(...delta) > .01, 'movable geometry really moves');
      if (asset.type === 'toilet') assert.ok(delta[1] > 0, 'lid opens upward');
      else assert.ok(delta[2] > 0, 'door/drawer opens out the model front');
    }
    openModel(a, true);
    assert.deepEqual(snapshot(a.scene), opened, 'open is idempotent');
    assert.deepEqual(snapshot(b.scene), bBefore, 'other instance stays closed');
    assert.deepEqual(snapshot(scene), original, 'loader cache stays closed');
    openModel(a, false);
    assert.deepEqual(snapshot(a.scene), closed, 'every node restores exact closed matrix');
    openModel(a, false);
    assert.deepEqual(snapshot(a.scene), closed, 'close is idempotent');
    disposeModelInstance(a); disposeModelInstance(b);
  });

  test(`${asset.type}: nonuniform resizing uses W,H,D and restores exact dimensions`, () => {
    const instance = createModelInstance(scene);
    const group = new Group(); group.add(instance.scene);
    for (const multipliers of [[1,1,1],[1.25,.75,1.5],[.6,1.4,.8],[1,1,1]]) {
      const dimensions = asset.dimensions.map((value,index) => value*multipliers[index]);
      group.scale.fromArray(dimensions.map((value,index) => value/asset.dimensions[index]));
      close(size(group), dimensions, 'scaled physical dimensions');
      assert.ok(Math.abs(box(group).min.y) <= EPS, 'resize retains floor origin');
      const before = snapshot(group);
      openModel(instance, true); openModel(instance, false);
      assert.deepEqual(snapshot(group), before, 'open-close works with scaled parents');
    }
    disposeModelInstance(instance);
  });

  test(`${asset.type}: disposing one instance preserves cache/geometry/second instance`, () => {
    const a=createModelInstance(scene), b=createModelInstance(scene);
    const bBefore=snapshot(b.scene);
    let cloneDisposed=0, forbiddenDisposed=0;
    const ownHandler=()=>cloneDisposed++;
    const sharedHandler=()=>forbiddenDisposed++;
    const shared=new Set([...a.materials.keys(), ...nodes(scene).filter(node=>node.isMesh).map(node=>node.geometry), ...b.materials.values()]);
    a.materials.forEach(material=>material.addEventListener('dispose',ownHandler));
    shared.forEach(resource=>resource.addEventListener('dispose',sharedHandler));
    disposeModelInstance(a);
    assert.equal(cloneDisposed,a.materials.size);
    assert.equal(forbiddenDisposed,0);
    assert.deepEqual(snapshot(b.scene),bBefore);
    shared.forEach(resource=>resource.removeEventListener('dispose',sharedHandler));
    disposeModelInstance(b);
  });
}

test('every reference design survives share round-trip at physical precision and open state', () => {
  const objects=catalog.assets.map(asset=>normalizeObject({type:asset.type,position:[.1234,.816,.5678],isOpen:true}));
  const restored=parseSceneParam(serializeScene({objects,unitSystem:'cm'}));
  assert.equal(restored.unitSystem,'cm');
  assert.deepEqual(restored.objects,objects);
});

function stagedGroup(object) {
  const asset=loaded.get(object.type);
  const group=new Group(); group.position.fromArray(object.position); group.rotation.fromArray([...object.rotation,'XYZ']);
  if (asset) {
    const instance=createModelInstance(asset.scene);
    instance.scene.scale.fromArray(object.dimensions.map((value,index)=>value/asset.asset.dimensions[index]));
    group.add(instance.scene); group.updateMatrixWorld(true);
    return {group,instance};
  }
  return {group};
}
function stagedBounds(object) {
  const {group,instance}=stagedGroup(object);
  if(instance) {const result=box(group);disposeModelInstance(instance);return result;}
  const [w,h,d]=object.dimensions;
  // Procedural wall/cube envelope; floor surface is checked separately from source.
  const local=new Box3(new Vector3(-w/2,0,-d/2),new Vector3(w/2,h,d/2));
  group.updateMatrixWorld(true); return local.applyMatrix4(group.matrixWorld);
}
function actualSurfaceIntersections(a,b) {
  const left=stagedGroup(a),right=stagedGroup(b);
  assert.ok(left.instance&&right.instance,'mesh narrow phase only for GLB pairs');
  const hits=[];
  const rightNodes=nodes(right.group).filter(node=>node.isMesh);
  for(const mesh of nodes(left.group).filter(node=>node.isMesh)) {
    const bounds=box(mesh);
    const candidates=rightNodes.filter(other=>bounds.intersectsBox(box(other)));
    if(!candidates.length)continue;
    const geometry=mesh.geometry.clone();
    const bvh=new MeshBVH(geometry,{indirect:true});
    for(const other of candidates) {
      const transform=mesh.matrixWorld.clone().invert().multiply(other.matrixWorld);
      if(bvh.intersectsGeometry(other.geometry,transform))hits.push([mesh.name,other.name]);
    }
    geometry.dispose();
  }
  disposeModelInstance(left.instance);disposeModelInstance(right.instance);
  return hits;
}
function overlap(a,b) {
  return ['x','y','z'].map(axis=>Math.min(a.max[axis],b.max[axis])-Math.max(a.min[axis],b.min[axis]));
}
for(const room of DESIGN_ROOMS) {
  test(`${room.id}: presets retain base dimensions/elevation, exact mesh bounds stay in room`, () => {
    const objects=buildDesignRoom(room.id).map(normalizeObject);
    for(const object of objects) {
      if(!loaded.has(object.type))continue;
      assert.deepEqual(object.dimensions,loaded.get(object.type).asset.dimensions, `${object.type} uses product dimensions`);
      const bounds=stagedBounds(object);
      assert.ok(bounds.min.x>=-3.45-EPS && bounds.max.x<=3.5+EPS, `${object.type} within room X`);
      assert.ok(bounds.min.z>=-2.95-EPS && bounds.max.z<=3+EPS, `${object.type} within room Z`);
      assert.ok(bounds.min.y>=-EPS && bounds.max.y<=2.65+EPS, `${object.type} within room Y`);
    }
    const aabbCandidates=[];
    for(let i=1;i<objects.length;i++)for(let j=i+1;j<objects.length;j++) {
      if(objects[i].type==='wall' && objects[j].type==='wall')continue;
      const intersection=overlap(stagedBounds(objects[i]),stagedBounds(objects[j]));
      if(intersection.every(value=>value>EPS)) aabbCandidates.push({a:objects[i],b:objects[j],depth:intersection});
    }
    // The hob body is intentionally inserted into the custom counter in this preset.
    const unexpected=aabbCandidates.filter(candidate=>!(room.id==='utility' && [candidate.a.type,candidate.b.type].sort().join(',')==='cooktop,cube'));
    for(const candidate of unexpected) {
      const hits=actualSurfaceIntersections(candidate.a,candidate.b);
      assert.deepEqual(hits,[],`no CLOSED triangle surface crossings for ${candidate.a.type}/${candidate.b.type}; AABB depth ${candidate.depth}`);
    }
    assert.equal(objects.find(object=>object.type==='cooktop')?.position[1],room.id==='utility'?.816:undefined);
  });
}

test('19 assets and all 15 legacy furniture/appliance/bath types have actual GLBs', () => {
  assert.equal(loaded.size,19);
  for(const type of ['sofa','bed','chair','table','desk','tv','cabinet','wardrobe','refrigerator','washingMachine','sink','cooktop','bathtub','toilet','shower'])assert.ok(loaded.has(type));
});

test('all reference types: store resize/finish restore/open and undo/redo preserve model state', () => {
  for(const asset of catalog.assets) {
    useStore.setState({objects:[],selectedId:null,historyPast:[],historyFuture:[],clipboardObject:null});
    useStore.getState().addObject(asset.type);
    const id=useStore.getState().selectedId;
    const original=structuredClone(useStore.getState().objects[0]);
    useStore.getState().updateObject(id,{dimensions:asset.dimensions.map(value=>value*1.2),color:'#d83a7f'});
    const changed=structuredClone(useStore.getState().objects[0]);
    assert.notDeepEqual(changed.dimensions,original.dimensions);
    useStore.getState().updateObject(id,{dimensions:[...asset.dimensions],color:asset.defaultColor});
    assert.deepEqual(useStore.getState().objects[0],original,'PropertiesPanel restore contract');
    useStore.getState().undo();
    assert.deepEqual(useStore.getState().objects[0],changed,'undo restore recovers custom values');
    useStore.getState().redo();
    assert.deepEqual(useStore.getState().objects[0],original,'redo restore recovers base dimensions');
    if(getObjectDefinition(asset.type).openable) {
      useStore.getState().toggleObjectOpen(id);
      assert.equal(useStore.getState().objects[0].isOpen,true);
      useStore.getState().undo();
      assert.equal(useStore.getState().objects[0].isOpen,false);
      useStore.getState().redo();
      assert.equal(useStore.getState().objects[0].isOpen,true);
    }
  }
});

test('copy/paste isolates state arrays and preserves tint, dimensions, open state and elevated Y', () => {
  for(const type of ['cabinet','tv','cooktop','tableLamp','pendantLamp']) {
    useStore.setState({objects:[],selectedId:null,historyPast:[],historyFuture:[],clipboardObject:null});
    useStore.getState().addObject(type);
    const id=useStore.getState().selectedId;
    useStore.getState().updateObject(id,{position:[0,1.2345,0],color:'#d83a7f',isOpen:true});
    const source=useStore.getState().objects[0];
    assert.ok(useStore.getState().copySelectedObject());
    useStore.getState().pasteClipboardObject();
    const pasted=useStore.getState().objects[1];
    assert.notEqual(source.id,pasted.id);
    assert.notEqual(source.dimensions,pasted.dimensions);
    assert.notEqual(source.position,pasted.position);
    assert.notEqual(source.rotation,pasted.rotation);
    assert.deepEqual(source.dimensions,pasted.dimensions);
    assert.equal(source.color,pasted.color);
    assert.equal(source.isOpen,pasted.isOpen);
    assert.equal(source.position[1],pasted.position[1]);
    useStore.getState().updateObject(pasted.id,{color:'#123456',dimensions:pasted.dimensions.map(value=>value*1.25)});
    assert.deepEqual(useStore.getState().objects[0],source,'editing duplicate leaves original untouched');
  }
});

test('replacing a room is undoable and redone rooms retain all physical dimensions', () => {
  useStore.setState({objects:[],selectedId:null,historyPast:[],historyFuture:[]});
  useStore.getState().replaceObjects(buildDesignRoom('living'));
  const original=structuredClone(useStore.getState().objects);
  useStore.getState().replaceObjects(buildDesignRoom('utility'));
  const replacement=structuredClone(useStore.getState().objects);
  useStore.getState().undo();
  assert.deepEqual(useStore.getState().objects,original);
  useStore.getState().redo();
  assert.deepEqual(useStore.getState().objects,replacement);
  const restored=parseSceneParam(serializeScene({objects:replacement,unitSystem:'m'}));
  for(let index=0;index<replacement.length;index++) {
    assert.deepEqual(restored.objects[index].dimensions,replacement[index].dimensions);
    assert.deepEqual(restored.objects[index].position,replacement[index].position);
  }
});

test('regression proof: old lamp placement intersects sofa mesh, corrected placement clears it', () => {
  const living=buildDesignRoom('living');
  const sofa=living.find(object=>object.type==='sofa');
  const lamp=living.find(object=>object.type==='floorLamp');
  const oldLamp={...lamp,position:[-.1,0,-2.6]};
  assert.ok(actualSurfaceIntersections(sofa,oldLamp).some(([a,b])=>a==='Wide_low_armrest001'&&b==='Ash_tripod_leg001'),
    'narrow phase actually detects original intersecting triangles');
  assert.deepEqual(actualSurfaceIntersections(sofa,lamp),[],'corrected placement has no triangle surface crossings');
});

test('procedural floor finish aligns at Y=0 with the authored GLB floor origin', async () => {
  const source=await readFile(new URL('src/components/Furniture.jsx',root),'utf8');
  const block=source.slice(source.indexOf("if (type === 'floorPanel')"),source.indexOf("if (type === 'ceilingPanel')"));
  const height=block.match(/size=\{\[width \* 0\.98,\s*([\d.]+),/);
  const position=block.match(/size=\{\[width \* 0\.98[^\n]+\n\s*position=\{\[0,\s*(-?[\d.]+),\s*0\]\}/);
  assert.ok(height&&position,'locate the actual JSX finish thickness/position');
  assert.equal(Number(position[1])+Number(height[1])/2,0,'finish top does not bury model feet');
});

console.log(`CPU QA loaded ${loaded.size} original-BIN GLBs; texture/image rendering intentionally NOT tested.`);
