import test from 'node:test';
import assert from 'node:assert/strict';
import {openVideoFile} from '../src/video-import.js';
class MediaSurface extends EventTarget{
 constructor(){super();this.duration=2;this.videoWidth=640;this.videoHeight=480;this.paused=false;}
 load(){}
 pause(){this.paused=true;}
 removeAttribute(name){delete this[name];}
}
const file=()=>new File(['local fixture bytes'],'clip.mp4',{type:'video/mp4'});
test('cancelling an opening upload releases it without clearing the next selected video',async()=>{
 const video=new MediaSurface(),controller=new AbortController(),old=openVideoFile(video,file(),{signal:controller.signal});
 controller.abort();const next=openVideoFile(video,file()),nextUrl=video.src;
 await assert.rejects(old,{name:'AbortError'});assert.equal(video.src,nextUrl);
 video.dispatchEvent(new Event('loadeddata'));const clip=await next;assert.equal(clip.url,nextUrl);assert.equal(clip.duration,2);assert.equal(video.paused,true);URL.revokeObjectURL(clip.url);
});
test('cancelled and unreadable video inputs fail before a result can be presented',async()=>{
 const video=new MediaSurface(),controller=new AbortController();controller.abort();
 await assert.rejects(openVideoFile(video,file(),{signal:controller.signal}),{name:'AbortError'});assert.equal(video.src,undefined);
 const opening=openVideoFile(video,file());video.dispatchEvent(new Event('error'));await assert.rejects(opening,/cannot decode/);assert.equal(video.src,undefined);
});
