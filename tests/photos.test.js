import test from 'node:test';
import assert from 'node:assert/strict';
import {imageMime,photoSelection} from '../src/photos.js';
import {photoCrops} from '../src/photo-tracker.js';
test('photo decoding recognizes real image bytes despite missing or wrong file types',()=>{
 assert.equal(imageMime(Uint8Array.from([255,216,255,225,0,0])),'image/jpeg');assert.equal(imageMime(Uint8Array.from([137,80,78,71,13,10])),'image/png');
 assert.equal(imageMime(new TextEncoder().encode('RIFFxxxxWEBPdata')),'image/webp');assert.equal(imageMime(new TextEncoder().encode('not a photograph')),null);
});
test('batch photo selection bounds count and memory without discarding smaller valid choices',()=>{
 const files=Array.from({length:12},(_,i)=>({name:'photo'+i+'.jpg',size:1024}));assert.equal(photoSelection(files).selected.length,10);
 assert.match(photoSelection(files).message,/10/);const big={name:'huge.jpg',size:36*1024*1024};const selected=photoSelection([big,files[0]]);assert.equal(selected.selected.length,1);assert.match(selected.message,/35 MB/);
});
test('overlapping photo crops cover tall images without stretching face coordinates',()=>{
 const crops=photoCrops(720,1600);assert(crops.bands.length>=3);assert.equal(crops.bands[0].y,0);const last=crops.bands.at(-1);assert.equal(last.y+last.height,1600);
 for(const c of [...crops.bands,...crops.zoom]){assert(c.x>=0&&c.y>=0);assert(c.x+c.width<=720.01&&c.y+c.height<=1600.01);}
});
