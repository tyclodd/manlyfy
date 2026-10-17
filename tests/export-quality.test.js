import test from 'node:test';
import assert from 'node:assert/strict';
import {exportSize,videoBitrate,trackingProfile} from '../src/export-quality.js';
test('source exports preserve 4K, portrait orientation and lower-resolution sources without upscaling',()=>{
 assert.deepEqual(exportSize(3840,2160),{width:3840,height:2160});assert.deepEqual(exportSize(2160,3840),{width:2160,height:3840});
 assert.deepEqual(exportSize(640,480),{width:640,height:480});assert.deepEqual(exportSize(7680,4320),{width:3840,height:2160});
 assert.deepEqual(exportSize(3840,2160,'original','1080'),{width:1920,height:1080});
 assert.deepEqual(exportSize(1920,1080,'vertical'),{width:1080,height:1920});
});
test('bitrate scales with resolution and frame rate; precision inference never uses the small flow canvas',()=>{
 assert.ok(videoBitrate(3840,2160,60)>videoBitrate(1920,1080,30));
 assert.ok(videoBitrate(1920,1080,30)>4500000);assert.ok(videoBitrate(10000,10000,120)<=80000000);
 const p=trackingProfile('precision',true);assert.equal(p.interval,0);assert.equal(p.fps,60);assert.equal(p.scanEdge,1280);assert.ok(p.scanEdge>p.flowEdge*2);
});
