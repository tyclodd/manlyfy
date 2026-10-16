import test from 'node:test';
import assert from 'node:assert/strict';
import {fingerprint,ratingFamily,manlinessScore,manlinessJoke,JOKE_COMBINATIONS} from '../src/manliness.js';
const image=Array.from({length:32*32*4},(_,i)=>i%4===3?255:Math.floor(80+60*Math.sin(Math.floor(i/4)%32*.14)+30*Math.cos(Math.floor(i/128)*.3)));
test('identical images have deterministic fingerprints and repeatable scores',()=>{
 const mark={...fingerprint(image),aspect:.75},one=ratingFamily(mark),two=ratingFamily(mark,one.history);
 assert.deepEqual(fingerprint(image),fingerprint(image));assert.equal(one.entry.seed,two.entry.seed);assert.equal(manlinessScore(one.entry.seed),manlinessScore(two.entry.seed));
});
test('near-identical selfies reuse their local base score rather than re-rolling',()=>{
 const original={...fingerprint(image),aspect:.75},first=ratingFamily(original),changed=image.map((v,i)=>i%4===3?v:Math.max(0,Math.min(255,v+(i%3-1))));
 const next=ratingFamily({...fingerprint(changed),aspect:.75},first.history);assert.equal(next.entry.seed,first.entry.seed);
});
test('a photo without a plaster never reaches 999, every plaster gets a higher tier, and 999 is possible but rare',()=>{
 let top=0;for(let seed=0;seed<20000;seed++){const plain=manlinessScore(seed,0),patched=manlinessScore(seed,1);assert(plain>=1&&plain<500);assert(patched>=500&&patched<=999);assert(patched>plain);if(patched===999)top++;assert(manlinessScore(seed,2)>=patched);}assert(top>0&&top<100);
});
test('new punchlines vary while preserving the exact percent',()=>{
 assert(JOKE_COMBINATIONS>300000);const jokes=new Set(Array.from({length:1000},(_,i)=>manlinessJoke(147,82,i)));assert(jokes.size>980);for(const text of jokes)assert(text.startsWith('147% MANLY · '));
});
