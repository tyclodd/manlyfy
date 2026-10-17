import test from 'node:test';
import assert from 'node:assert/strict';
import {associateFaces} from '../src/face-identity.js';
const face=(x,y=.5,size=.18)=>{const p=[];p[5]={x,y};p[33]={x:x-size/2,y:y-size*.3};p[263]={x:x+size/2,y:y-size*.3};return p;};
test('eight faces retain their design keys when detector order reverses',()=>{
 let serial=0;const start=Array.from({length:8},(_,i)=>face(.12+i*.1,i%2?.4:.6,.07));
 const first=associateFaces([],start,0,()=>++serial),second=associateFaces(first,[...start].reverse(),34,()=>++serial);
 assert.deepEqual(second.map(f=>f.trackId),[8,7,6,5,4,3,2,1]);
});
test('prediction preserves two face tracks through crossing instead of swapping their designs',()=>{
 let serial=0,tracks=associateFaces([],[face(.3),face(.7)],0,()=>++serial);
 tracks=associateFaces(tracks,[face(.42),face(.58)],100,()=>++serial);
 tracks=associateFaces(tracks,[face(.54),face(.46)],200,()=>++serial);
 assert.deepEqual(tracks.map(f=>f.trackId),[1,2]);
 tracks=associateFaces(tracks,[face(.34),face(.66)],300,()=>++serial);assert.deepEqual(tracks.map(f=>f.trackId),[2,1]);
});
test('short missed detections can recover a track, while expired or distant people get new keys',()=>{
 let serial=0;const first=associateFaces([],[face(.3)],0,()=>++serial);
 assert.equal(associateFaces(first,[face(.32)],150,()=>++serial)[0].trackId,1);
 assert.notEqual(associateFaces(first,[face(.32)],600,()=>++serial)[0].trackId,1);
 assert.notEqual(associateFaces(first,[face(.9)],100,()=>++serial)[0].trackId,1);
});
