import test from 'node:test';
import assert from 'node:assert/strict';
import {startGesture,moveGesture} from '../src/gestures.js';
const r={x:0,y:100,width:1000,height:1000},patch={x:.5,y:.5,width:.2,angle:0,scale:1,rotation:0};
const near=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} near ${b}`);
test('a centered two-finger pinch scales the plaster without moving the nose anchor',()=>{
 const start=startGesture(patch,[{x:450,y:600},{x:550,y:600}],r),p=moveGesture(start,[{x:420,y:600},{x:580,y:600}],r);near(p.scale,1.6);near(p.x,.5);near(p.y,.5);
 const small=moveGesture(start,[{x:490,y:600},{x:510,y:600}],r);near(small.scale,.2);
});
test('two-finger twist and translated centroid rotate and move the selected plaster',()=>{
 const start=startGesture(patch,[{x:450,y:600},{x:550,y:600}],r),p=moveGesture(start,[{x:550,y:550},{x:550,y:650}],r);near(p.rotation,Math.PI/2);near(p.x,.55);near(p.scale,1);
});
test('mirrored dragging stays attached and pinches respect practical scale limits',()=>{
 const p={...patch,x:.3},start=startGesture(p,[{x:700,y:600}],r,true),moved=moveGesture(start,[{x:800,y:600}],r,true);near(moved.x,.2);
 const pinch=startGesture(patch,[{x:499,y:600},{x:501,y:600}],r);near(moveGesture(pinch,[{x:0,y:600},{x:1000,y:600}],r).scale,2.2);
});
