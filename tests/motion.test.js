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
