import test from 'node:test';
import assert from 'node:assert/strict';
import {FaceTracker} from '../src/tracker.js';
import {CameraClock} from '../src/camera-clock.js';
test('photo handoff waits for the actual live scan rather than a fixed delay',async()=>{
 const tracker=new FaceTracker();tracker.init=async()=>{};let release;
 tracker.cpuModel={detect:()=>new Promise(resolve=>release=resolve)};
 const scan=tracker.detect({},'VIDEO');await Promise.resolve();assert.equal(tracker.busy,true);
 let idle=false;const waiting=tracker.whenIdle().then(()=>idle=true);await Promise.resolve();assert.equal(idle,false);
 release([]);await scan;await waiting;assert.equal(idle,true);assert.equal(tracker.busy,false);
});
test('failed detection releases a pending photo handoff',async()=>{
 const tracker=new FaceTracker();tracker.init=async()=>{};let reject;
 tracker.cpuModel={detect:()=>new Promise((_,r)=>reject=r)};
 const scan=tracker.detect({},'VIDEO');await Promise.resolve();const waiting=tracker.whenIdle();reject(new Error('Test scan failed'));
 await assert.rejects(scan,/Test scan failed/);await waiting;assert.equal(tracker.busy,false);
});
test('camera frame callbacks and fallback ticks never process duplicate frames',()=>{
 const video={readyState:2,currentTime:0,cancelVideoFrameCallback:id=>video.cancelled=id},seen=[];
 const clock=new CameraClock(video,t=>seen.push(t));clock.active=true;
 assert.equal(clock.process(1),true);assert.equal(clock.process(2),false);video.currentTime=.033;assert.equal(clock.process(34),true);
 clock.videoHandle=7;clock.stop();video.currentTime=.066;assert.equal(clock.process(67),false);assert.equal(video.cancelled,7);assert.deepEqual(seen,[1,34]);
});
test('continuous media time does not trigger flow twice for one decoded frame',()=>{
 let frames=1;const video={readyState:2,currentTime:0,getVideoPlaybackQuality:()=>({totalVideoFrames:frames})},seen=[];
 const clock=new CameraClock(video,t=>seen.push(t));clock.active=true;
 assert.equal(clock.process(1),true);video.currentTime=.016;assert.equal(clock.process(17),false);
 frames++;video.currentTime=.033;assert.equal(clock.process(34),true);assert.deepEqual(seen,[1,34]);
});
