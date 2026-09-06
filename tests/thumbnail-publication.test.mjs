import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';

test('all 19 thumbnails omit export text metadata and match the sanitized release',()=>{
  const report=JSON.parse(fs.readFileSync(new URL('../docs/assets/thumbnail-metadata-cleanup.json',import.meta.url)));
  assert.equal(report.files.length,19);
  for(const entry of report.files){
    const bytes=fs.readFileSync(new URL(`../${entry.file}`,import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.afterSha256);
    assert.equal(bytes.readUInt32BE(16),512);assert.equal(bytes.readUInt32BE(20),512);
    for(let offset=8;offset<bytes.length;){
      const length=bytes.readUInt32BE(offset),type=bytes.toString('ascii',offset+4,offset+8);
      assert.ok(!['tEXt','zTXt','iTXt'].includes(type));offset+=length+12;
    }
    assert.equal(entry.pixelAndColorChunksByteIdentical,true);
  }
});
