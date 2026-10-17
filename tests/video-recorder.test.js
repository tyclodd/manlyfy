import test from 'node:test';
import assert from 'node:assert/strict';
import {startVideoRecorder} from '../src/video-recorder.js';
test('mobile export falls back when an advertised MP4 encoder refuses to start',()=>{
 const tried=[];
 class Recorder{static isTypeSupported(t){return t.includes('avc1')||t.includes('vp8');}constructor(stream,options){this.mimeType=options.mimeType;this.state='inactive';tried.push(this.mimeType);}start(){if(this.mimeType.includes('avc1'))throw new Error('Encoder unavailable');this.state='recording';}}
 const rec=startVideoRecorder({},{Recorder,audio:true});assert.match(rec.mimeType,/vp8,opus/);assert.equal(rec.state,'recording');assert.equal(tried.length,2);
});
test('browser default recorder is tried when explicit types fail, and unavailable recording reports failure',()=>{
 class Recorder{static isTypeSupported(){return false;}constructor(stream,options){assert.equal(options.mimeType,undefined);this.state='inactive';}start(){this.state='recording';}}
 assert.equal(startVideoRecorder({},{Recorder}).state,'recording');assert.throws(()=>startVideoRecorder({},{Recorder:null}),/unavailable/);
});
