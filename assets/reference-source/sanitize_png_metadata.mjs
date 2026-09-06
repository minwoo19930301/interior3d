// Publication hygiene only: never decode/re-encode or alter rendered pixels.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../../',import.meta.url));
const folder=path.join(root,'public/thumbnails');
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function parse(bytes){
  if(!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw new Error('Not PNG');
  const chunks=[];let offset=8;
  while(offset<bytes.length){
    const length=bytes.readUInt32BE(offset),end=offset+length+12;
    if(end>bytes.length)throw new Error('Truncated PNG');
    chunks.push({type:bytes.toString('ascii',offset+4,offset+8),bytes:bytes.subarray(offset,end)});offset=end;
  }
  if(chunks[0]?.type!=='IHDR'||chunks.at(-1)?.type!=='IEND')throw new Error('Invalid PNG structure');
  return chunks;
}
const results=[];
for(const name of fs.readdirSync(folder).filter(name=>name.endsWith('.png')).sort()){
  const file=path.join(folder,name),before=fs.readFileSync(file),chunks=parse(before);
  const retained=chunks.filter(chunk=>!['tEXt','zTXt','iTXt'].includes(chunk.type));
  const after=Buffer.concat([before.subarray(0,8),...retained.map(chunk=>chunk.bytes)]);
  const pixelBytes=parts=>Buffer.concat(parts.filter(c=>['IHDR','PLTE','tRNS','IDAT','gAMA','cHRM','sRGB','iCCP'].includes(c.type)).map(c=>c.bytes));
  if(!pixelBytes(chunks).equals(pixelBytes(parse(after))))throw new Error('Pixel/color data changed');
  fs.writeFileSync(file,after);
  results.push({file:`public/thumbnails/${name}`,removedTextChunks:chunks.length-retained.length,beforeSha256:sha(before),afterSha256:sha(after),pixelAndColorChunksSha256:sha(pixelBytes(chunks)),pixelAndColorChunksByteIdentical:true});
}
const report={scope:'Remove PNG textual export metadata only; no image-content edit, resampling, re-encoding or Blender/GLB changes',files:results};
fs.writeFileSync(path.join(root,'docs/assets/thumbnail-metadata-cleanup.json'),JSON.stringify(report,null,2)+'\n');
console.log(`PASS: ${results.length} PNGs; pixel and color-management chunks byte-identical`);
