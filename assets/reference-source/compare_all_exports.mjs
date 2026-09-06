// Actual byte comparison of all 19 saved-master exports against the release.
// Read-only: prints JSON; the orchestrator saves reports using apply_patch.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';

const [releaseDirectory,exportDirectory]=process.argv.slice(2);
if(!releaseDirectory||!exportDirectory)throw Error('Usage: node compare_all_exports.mjs RELEASE EXPORTS');
const catalog=JSON.parse(fs.readFileSync(path.join(releaseDirectory,'catalog.json'),'utf8'));
const types=catalog.assets.map(asset=>asset.type);
assert.equal(types.length,19);
assert.equal(new Set(types).size,19);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const sorted=value=>[...value].sort((a,b)=>String(a).localeCompare(String(b)));

function readGlb(filename) {
  const bytes=fs.readFileSync(filename);let doc,bin;
  assert.equal(bytes.readUInt32LE(0),0x46546c67,'GLB magic');
  assert.equal(bytes.readUInt32LE(4),2,'GLB version');
  assert.equal(bytes.readUInt32LE(8),bytes.length,'GLB length');
  for(let at=12;at<bytes.length;) {
    const length=bytes.readUInt32LE(at),kind=bytes.readUInt32LE(at+4);
    assert(at+8+length<=bytes.length,'GLB chunk bounds');
    const chunk=bytes.subarray(at+8,at+8+length);
    if(kind===0x4e4f534a){assert.equal(doc,undefined);doc=JSON.parse(chunk);}
    else if(kind===0x004e4942){assert.equal(bin,undefined);bin=chunk;}
    else throw Error('Unexamined GLB chunk');
    at+=8+length;
  }
  assert(doc&&bin,'JSON and binary chunks');
  const knownSections=new Set(['asset','scene','scenes','nodes','materials','meshes','textures','images','accessors',
    'bufferViews','samplers','buffers','extensionsUsed','extensionsRequired','extensions','animations','skins']);
  for(const key of Object.keys(doc))assert(knownSections.has(key),'Unexamined top-level section: '+key);
  assert.equal(doc.buffers.length,1);assert.equal(doc.buffers[0].uri,undefined);
  assert.equal((doc.animations??[]).length,0,'Saved assets should not contain animation clips');
  assert.equal((doc.skins??[]).length,0,'No unexamined skin bindings');
  const accessorCache=new Map();
  function accessor(index) {
    if(accessorCache.has(index))return accessorCache.get(index);
    const value=doc.accessors[index],view=doc.bufferViews[value.bufferView];
    assert(value&&view,'Accessor/view exists');assert(!value.sparse,'No unexamined sparse accessor');
    assert.equal(view.buffer,0);assert.equal(value.extensions,undefined);
    const components={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[value.type];
    const componentBytes={5126:4,5125:4,5123:2,5122:2,5121:1,5120:1}[value.componentType];
    assert(components&&componentBytes,'Supported packed component layout');
    const size=componentBytes*components,stride=view.byteStride??size;
    assert(stride>=size);
    const packed=Buffer.alloc(value.count*size);
    for(let row=0;row<value.count;row++) {
      const within=(value.byteOffset??0)+row*stride,start=(view.byteOffset??0)+within;
      assert(within+size<=view.byteLength&&start+size<=bin.length,'Accessor bounds');
      bin.copy(packed,row*size,start,start+size);
    }
    const result={meta:{componentType:value.componentType,type:value.type,count:value.count,
      normalized:value.normalized??false,min:value.min??null,max:value.max??null,extras:value.extras??{}},packed};
    accessorCache.set(index,result);return result;
  }
  function image(index) {
    const item=doc.images[index];assert(item,'Image exists');assert.equal(item.uri,undefined,'Embedded image only');
    const view=doc.bufferViews[item.bufferView];assert.equal(view.buffer,0);
    const start=view.byteOffset??0;assert(start+view.byteLength<=bin.length,'Image bounds');
    return {mimeType:item.mimeType,bytes:bin.subarray(start,start+view.byteLength)};
  }
  function texture(index) {
    const value=doc.textures[index],img=image(value.source);
    assert.equal(value.extensions,undefined,'No unexamined alternative image extension');
    const sampler=value.sampler===undefined?{}:doc.samplers[value.sampler];
    return {imageMimeType:img.mimeType,imageBytesSha256:sha(img.bytes),
      sampler:{wrapS:10497,wrapT:10497,...sampler},extras:value.extras??{}};
  }
  function material(index) {
    if(index===undefined)return null;
    function resolve(value) {
      if(!value||typeof value!=='object')return value;
      if(Array.isArray(value))return value.map(resolve);
      return Object.fromEntries(Object.entries(value).map(([key,item])=>[
        key,key.endsWith('Texture')?{...item,index:texture(item.index)}:resolve(item)]));
    }
    return resolve(doc.materials[index]);
  }
  return {bytes,doc,accessor,image,material,accessorCache};
}

function compare(type) {
  const release=readGlb(path.join(releaseDirectory,type+'.glb'));
  const exported=readGlb(path.join(exportDirectory,type+'.glb'));
  const differences=[],metadataDifferences=[];
  const categories={geometryAccessorBytes:true,hierarchy:true,transforms:true,motionAndNodeExtras:true,
    materialPropertiesAndTextureBindings:true,embeddedImageBytes:true,meshMetadata:true};
  const stats={nodes:exported.doc.nodes.length,meshes:exported.doc.meshes.length,
    primitives:0,accessorReferencesCompared:0,accessorPayloadBytesCompared:0,
    embeddedImages:(exported.doc.images??[]).length,embeddedImageBytesCompared:0};
  const normalize=name=>(name??'').replace(new RegExp('^'+type+'__'),'');
  function eq(category,at,actual,expected) {
    if(isDeepStrictEqual(actual,expected))return;
    categories[category]=false;
    differences.push({category,path:at,release:expected,reexport:actual});
  }
  function byteEqual(category,at,actual,expected) {
    if(actual.equals(expected))return;
    categories[category]=false;
    let first=0;while(first<actual.length&&first<expected.length&&actual[first]===expected[first])first++;
    differences.push({category,path:at,releaseBytes:expected.length,reexportBytes:actual.length,
      firstDifferentByte:first,releaseByte:expected[first]??null,reexportByte:actual[first]??null,
      releaseSha256:sha(expected),reexportSha256:sha(actual)});
  }
  function nodeMap(gltf) {
    const pairs=gltf.doc.nodes.map(node=>[normalize(node.name),node]);
    const map=new Map(pairs);assert.equal(map.size,pairs.length,'Unique normalized node names');return map;
  }
  const oldNodes=nodeMap(release),newNodes=nodeMap(exported);
  for(const gltf of [release,exported]) {
    const usedMeshes=new Set(gltf.doc.nodes.filter(node=>node.mesh!==undefined).map(node=>node.mesh));
    assert.equal(usedMeshes.size,gltf.doc.meshes.length,'Every mesh is node-referenced and compared');
  }
  eq('hierarchy','nodes.names',sorted(newNodes.keys()),sorted(oldNodes.keys()));
  function roots(gltf) {
    return (gltf.doc.scenes??[]).map(scene=>sorted((scene.nodes??[]).map(i=>normalize(gltf.doc.nodes[i].name))));
  }
  eq('hierarchy','scenes.rootNodes',roots(exported),roots(release));
  eq('hierarchy','defaultScene',exported.doc.scene??0,release.doc.scene??0);
  for(const [name,node]of newNodes) {
    const old=oldNodes.get(name);if(!old)continue;
    const at='nodes.'+name;
    for(const key of ['translation','rotation','scale','matrix']) {
      const fallback={translation:[0,0,0],rotation:[0,0,0,1],scale:[1,1,1],matrix:null}[key];
      eq('transforms',at+'.'+key,node[key]??fallback,old[key]??fallback);
    }
    eq('motionAndNodeExtras',at+'.extras',node.extras??{},old.extras??{});
    eq('hierarchy',at+'.children',sorted((node.children??[]).map(i=>normalize(exported.doc.nodes[i].name))),
      sorted((old.children??[]).map(i=>normalize(release.doc.nodes[i].name))));
    const known=new Set(['name','translation','rotation','scale','matrix','extras','children','mesh']);
    const other=n=>Object.fromEntries(Object.entries(n).filter(([key])=>!known.has(key)));
    eq('hierarchy',at+'.otherNodeProperties',other(node),other(old));
    eq('hierarchy',at+'.hasMesh',node.mesh!==undefined,old.mesh!==undefined);
    if(node.mesh===undefined||old.mesh===undefined)continue;
    const mesh=exported.doc.meshes[node.mesh],oldMesh=release.doc.meshes[old.mesh];
    const meshOther=m=>Object.fromEntries(Object.entries(m).filter(([key])=>!['name','primitives'].includes(key)));
    eq('meshMetadata',at+'.mesh.properties',meshOther(mesh),meshOther(oldMesh));
    eq('geometryAccessorBytes',at+'.primitives.length',mesh.primitives.length,oldMesh.primitives.length);
    for(let i=0;i<mesh.primitives.length;i++) {
      const prim=mesh.primitives[i],prior=oldMesh.primitives[i];if(!prior)continue;stats.primitives++;
      const base=at+'.primitives['+i+']';
      const properties=p=>({mode:p.mode??4,...Object.fromEntries(Object.entries(p).filter(([k])=>!['attributes','indices','material','mode'].includes(k)))});
      eq('geometryAccessorBytes',base+'.properties',properties(prim),properties(prior));
      eq('geometryAccessorBytes',base+'.attributeNames',sorted(Object.keys(prim.attributes)),sorted(Object.keys(prior.attributes)));
      const attrs={...prim.attributes,INDICES:prim.indices},previous={...prior.attributes,INDICES:prior.indices};
      for(const key of Object.keys(attrs)) {
        const index=attrs[key],oldIndex=previous[key];
        if(index===undefined||oldIndex===undefined) {
          eq('geometryAccessorBytes',base+'.'+key+'.present',index!==undefined,oldIndex!==undefined);continue;
        }
        const a=exported.accessor(index),b=release.accessor(oldIndex);
        stats.accessorReferencesCompared++;stats.accessorPayloadBytesCompared+=a.packed.length;
        eq('geometryAccessorBytes',base+'.'+key+'.metadata',a.meta,b.meta);
        byteEqual('geometryAccessorBytes',base+'.'+key+'.packedBytes',a.packed,b.packed);
      }
      eq('materialPropertiesAndTextureBindings',base+'.material',exported.material(prim.material),release.material(prior.material));
    }
  }
  const allMaterials=g=>sorted((g.doc.materials??[]).map((_,i)=>JSON.stringify(g.material(i))));
  eq('materialPropertiesAndTextureBindings','materials.all',allMaterials(exported),allMaterials(release));
  const images=g=>(g.doc.images??[]).map((_,i)=>g.image(i)).sort((a,b)=>(a.mimeType+sha(a.bytes)).localeCompare(b.mimeType+sha(b.bytes)));
  const newImages=images(exported),oldImages=images(release);
  eq('embeddedImageBytes','images.length',newImages.length,oldImages.length);
  for(let i=0;i<Math.min(newImages.length,oldImages.length);i++) {
    stats.embeddedImageBytesCompared+=newImages[i].bytes.length;
    eq('embeddedImageBytes','images['+i+'].mimeType',newImages[i].mimeType,oldImages[i].mimeType);
    byteEqual('embeddedImageBytes','images['+i+'].bytes',newImages[i].bytes,oldImages[i].bytes);
  }
  for(const key of ['extensionsUsed','extensionsRequired','extensions'])
    eq('materialPropertiesAndTextureBindings',key,exported.doc[key]??null,release.doc[key]??null);
  for(const gltf of [release,exported])
    assert.equal(gltf.accessorCache.size,gltf.doc.accessors.length,'Every accessor was byte-compared');
  stats.uniqueAccessorsCompared=exported.accessorCache.size;
  stats.uniqueAccessorPayloadBytesCompared=[...exported.accessorCache.values()].reduce((sum,value)=>sum+value.packed.length,0);
  const operational=g=>({asset:g.doc.asset,scenes:(g.doc.scenes??[]).map(({nodes,...rest})=>rest)});
  if(!isDeepStrictEqual(operational(exported),operational(release)))
    metadataDifferences.push({path:'assetAndSceneMetadata',release:operational(release),reexport:operational(exported)});
  const prefixChanges=exported.doc.nodes.filter(n=>normalize(n.name)!==n.name).length;
  return {type,passed:Object.values(categories).every(Boolean),...categories,...stats,
    fileBytesIdentical:exported.bytes.equals(release.bytes),releaseFileBytes:release.bytes.length,
    reexportFileBytes:exported.bytes.length,normalizedNodePrefixChanges:prefixChanges,
    differences,operationalMetadataDifferences:metadataDifferences};
}
const results=types.map(type=>{try{return compare(type);}catch(error){return {type,passed:false,error:error.stack};}});
const passed=results.every(result=>result.passed);
console.log(JSON.stringify({passed,assetCount:results.length,passedCount:results.filter(r=>r.passed).length,
  comparison:'Direct Buffer.equals for unpacked geometry/index accessor payloads and embedded images; semantic node/hierarchy/motion/material/sampler equality after type__ node-prefix normalization.',
  totalAccessorPayloadBytesCompared:results.reduce((n,r)=>n+(r.accessorPayloadBytesCompared??0),0),
  totalEmbeddedImageBytesCompared:results.reduce((n,r)=>n+(r.embeddedImageBytesCompared??0),0),
  results,limitations:['Saved-master re-export, not fresh procedural regeneration.','No browser or new render check.',
    'Whole-file identity not required: node names have collection prefixes, exporter ordering may differ, and operational scene extras are reported separately.']},null,2));
process.exitCode=passed?0:1;
