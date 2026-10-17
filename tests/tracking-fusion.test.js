import test from 'node:test';
import assert from 'node:assert/strict';
import {fuseLandmarks} from '../src/tracking-fusion.js';
const points=(x=.5,y=.5)=>{const p=[];p[5]={x,y};p[33]={x:x-.15,y:y-.14};p[263]={x:x+.15,y:y-.14};return p;};
test('current-frame flow damps neural jitter while retaining fast movement without old-frame averaging',()=>{
 const truth=points(.7),observed=points(.703),fused=fuseLandmarks(observed,{points:truth,quality:.95},640,480);
 assert.ok(Math.abs(fused[5].x-.7)<Math.abs(observed[5].x-.7));assert.ok(fused[5].x>.7,'fresh movement is already present in the motion pose');assert.ok(Math.abs(fused[5].x-.7)<.002);
});
test('significant neural corrections and unreliable optical flow are applied immediately',()=>{
 const observed=points(.8);assert.equal(fuseLandmarks(observed,{points:points(.5),quality:1},640,480),observed);
 assert.equal(fuseLandmarks(observed,{points:points(.799),quality:.2},640,480),observed);
 assert.equal(fuseLandmarks(observed,null,640,480),observed);
});
