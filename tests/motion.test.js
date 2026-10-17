import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {MotionTracker,transform} from '../src/motion.js';
const sandbox={module:{exports:{}}};vm.runInNewContext(fs.readFileSync(new URL('../assets/jsfeat.min.js',import.meta.url),'utf8'),sandbox);const library=sandbox.module.exports;
const width=240,height=240;
let seed=82;const noise=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/2**32;};
const dots=Array.from({length:80},()=>({x:noise()*width,y:noise()*height,r:2+noise()*7,a:noise()*110-55}));
const base=Float32Array.from({length:width*height},(_,i)=>{const x=i%width,y=Math.floor(i/width);return Math.max(0,Math.min(255,125+35*Math.sin(x*.13)*Math.cos(y*.11)+dots.reduce((a,d)=>a+d.a*Math.exp(-((x-d.x)**2+(y-d.y)**2)/(d.r*d.r)),0)));});
function image(m={a:1,b:0,x:0,y:0}){const den=m.a*m.a+m.b*m.b;return Uint8Array.from({length:width*height},(_,i)=>{const dx=i%width-m.x,dy=Math.floor(i/width)-m.y,x=(m.a*dx+m.b*dy)/den,y=(-m.b*dx+m.a*dy)/den,ix=Math.floor(x),iy=Math.floor(y),u=x-ix,v=y-iy;if(ix<0||iy<0||ix>=width-1||iy>=height-1)return 0;const p=iy*width+ix;return base[p]*(1-u)*(1-v)+base[p+1]*u*(1-v)+base[p+width]*(1-u)*v+base[p+width+1]*u*v;});}
function points(){const p=[];for(const [i,x,y]of [[33,.35,.32],[263,.65,.32],[5,.5,.46],[98,.46,.48],[327,.54,.48]])p[i]={x,y};return p;}
const error=(got,m)=>{const expected=transform({x:120,y:.46*height},m);return Math.hypot(got[5].x*width-expected.x,got[5].y*height-expected.y);};
test('motion follows translation, rotation and scale between neural results',()=>{
 const tracker=new MotionTracker({library});tracker.push(image(),width,height,0);assert.ok(tracker.seed([points()],1));
 for(let i=1;i<=24;i++){const angle=i*.006,scale=1+i*.001,m={a:Math.cos(angle)*scale,b:Math.sin(angle)*scale,x:i*.75,y:i*.24};tracker.push(image(m),width,height,i*34);assert.equal(tracker.landmarks().length,1);assert.ok(error(tracker.landmarks()[0],m)<2.5,'nose follows current frame within 2.5 pixels');}
});
test('late neural anchor is advanced through buffered motion instead of snapping backward',()=>{
 const tracker=new MotionTracker({library});tracker.push(image(),width,height,0);
 let m;for(let i=1;i<=25;i++){m={a:1,b:0,x:i*.8,y:i*.3};tracker.push(image(m),width,height,i*34);}
 assert.ok(tracker.seed([points()],1));assert.equal(tracker.landmarks().length,1);assert.ok(error(tracker.landmarks()[0],m)<2.5);
});
test('occlusion, long frame gaps and empty detections drop the overlay',()=>{
 for(const missing of ['occlusion','gap','empty']){const tracker=new MotionTracker({library});tracker.push(image(),width,height,0);tracker.seed([points()],1);
 if(missing==='occlusion')tracker.push(new Uint8Array(width*height),width,height,34);
 if(missing==='gap')tracker.push(image(),width,height,600);
 if(missing==='empty')tracker.seed([],1);
 assert.equal(tracker.landmarks().length,0,missing);}
});
test('switching live modes rejects a neural result from the previous motion history',()=>{
 const tracker=new MotionTracker({library});const old=tracker.push(image(),width,height,0);tracker.seed([points()],old.id);
 tracker.reset();const next=tracker.push(image(),width,height,34);assert.notEqual(old.id,next.id);
 assert.equal(tracker.seed([points()],old.id),false);assert.equal(tracker.landmarks().length,0);
 assert.equal(tracker.seed([points()],next.id),true);assert.equal(tracker.landmarks().length,1);
});
test('a paused imported frame keeps its anchor after slow initial inference and resumes following immediately',()=>{
 const tracker=new MotionTracker({library});const frame=tracker.push(image(),width,height,0);tracker.seed([points()],frame.id);
 tracker.resumePaused(10000);assert.equal(tracker.current.id,frame.id);
 const m={a:1,b:0,x:1.5,y:.5};tracker.push(image(m),width,height,10034);
 assert.equal(tracker.landmarks().length,1);assert.ok(error(tracker.landmarks()[0],m)<2.5);
 tracker.resumePaused(30000);tracker.push(image(m),width,height,30034);assert.equal(tracker.landmarks().length,1);
});
test('coarse reacquisition follows rapid reversals instead of losing a fast-moving nose',()=>{
 const tracker=new MotionTracker({library});tracker.push(image(),width,height,0);tracker.seed([points()],tracker.current.id);let recovered=0;
 for(let i=1;i<=36;i++){
  const m={a:1,b:0,x:Math.sin(i*.6)*44,y:Math.sin(i*.36)*18};tracker.push(image(m),width,height,i*1000/60);
  assert.equal(tracker.landmarks().length,1,'face stays tracked through the fast reversal');assert.ok(error(tracker.landmarks()[0],m)<1,'current-frame nose stays within one pixel');recovered+=tracker.recoveries;
 }
 assert.ok(recovered>0,'the fast-motion recovery path was actually used');
});
test('a briefly missed neural detection hides the overlay then recovers its original face design key',()=>{
 const tracker=new MotionTracker({library});let frame=tracker.push(image(),width,height,0);tracker.seed([points()],frame.id);const id=tracker.landmarks()[0].trackId;
 frame=tracker.push(image(),width,height,34);tracker.seed([],frame.id);assert.equal(tracker.landmarks().length,0);
 frame=tracker.push(image(),width,height,68);tracker.seed([points()],frame.id);assert.equal(tracker.landmarks()[0].trackId,id);
 tracker.resumePaused(10000);frame=tracker.push(image(),width,height,10034);tracker.seed([points()],frame.id);assert.equal(tracker.landmarks()[0].trackId,id);
});
test('enhanced tracking bridges a brief model miss only while validated image motion remains reliable',()=>{
 const tracker=new MotionTracker({library});let frame=tracker.push(image(),width,height,0);tracker.seed([points()],frame.id);const id=tracker.landmarks()[0].trackId;
 const m={a:1,b:0,x:2,y:1};frame=tracker.push(image(m),width,height,34);tracker.seed([],frame.id,{stabilize:true,bridgeMs:120});assert.equal(tracker.landmarks().length,1);assert.equal(tracker.landmarks()[0].trackId,id);assert.ok(error(tracker.landmarks()[0],m)<1);
 tracker.push(image(m),width,height,100);assert.equal(tracker.landmarks().length,1);tracker.push(image(m),width,height,133);assert.equal(tracker.landmarks().length,0,'a bridged detection must expire on time');
});
test('a full visual occlusion cannot be hidden by the short neural-dropout bridge',()=>{
 const tracker=new MotionTracker({library});let frame=tracker.push(image(),width,height,0);tracker.seed([points()],frame.id);frame=tracker.push(new Uint8Array(width*height),width,height,34);tracker.seed([],frame.id,{stabilize:true,bridgeMs:120});assert.equal(tracker.landmarks().length,0);
});
test('fusion reduces noisy model placement through rapid reversals without delaying the actual image motion',()=>{
 const strict=new MotionTracker({library}),fused=new MotionTracker({library});
 for(const tracker of [strict,fused]){const frame=tracker.push(image(),width,height,0);tracker.seed([points()],frame.id);}
 let rawError=0,fusedError=0;
 for(let i=1;i<=36;i++){
  const m={a:1,b:0,x:Math.sin(i*.6)*44,y:Math.sin(i*.36)*18},pixels=image(m),jitter=(i%2?1:-1)*.004;
  const observed=points().map(p=>{if(!p)return p;const q=transform({x:p.x*width,y:p.y*height},m);return{x:q.x/width+jitter,y:q.y/height+jitter*.5};});
  for(const tracker of [strict,fused]){const frame=tracker.push(pixels,width,height,i*1000/60);tracker.seed([observed],frame.id,{stabilize:tracker===fused});assert.equal(tracker.faces.length,1);}
  rawError+=error(strict.landmarks()[0],m);fusedError+=error(fused.landmarks()[0],m);assert.ok(error(fused.landmarks()[0],m)<1.5,'placement stays on the current fast-moving image');
 }
 assert.ok(fusedError<rawError*.8,'motion fusion reduces model jitter across the whole moving sequence');
});
