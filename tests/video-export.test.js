import test from 'node:test';
import assert from 'node:assert/strict';
import {exportFilteredVideo,ExportUnavailable,hasFrameExport} from '../src/video-export.js';
function fixture({codec='avc',hasAudio=true,frames=[{timestamp:0,duration:.016},{timestamp:.016,duration:.034},{timestamp:.05,duration:.05}]}={}){
 const record={video:[],audio:[],cancelled:0,finalized:false,disposed:false,painted:[]};
 const track={displayWidth:3840,displayHeight:2160,canDecode:async()=>true,computePacketStats:async()=>({averagePacketRate:30})};
 const audioTrack={getCodec:async()=>'aac',getDecoderConfig:async()=>({codec:'mp4a.40.2',sampleRate:48000,numberOfChannels:2})};
 const gradient={addColorStop(){}};
 const ctx=new Proxy({canvas:null,measureText:()=>({width:20}),createRadialGradient:()=>gradient},{get:(o,k)=>o[k]||(()=>{})});
 const factory=()=>{const c={width:0,height:0,getContext:()=>{ctx.canvas=c;return ctx;}};return c;};
 const library={ALL_FORMATS:[],
  Input:class{getPrimaryVideoTrack=async()=>track;getPrimaryAudioTrack=async()=>hasAudio?audioTrack:null;computeDuration=async()=>.1;dispose(){record.disposed=true;}},
  BlobSource:class{},BufferTarget:class{buffer=new Uint8Array([1,2,3]).buffer;},
  Mp4OutputFormat:class{mimeType='video/mp4';getSupportedAudioCodecs=()=>['aac'];getSupportedVideoCodecs=()=>['avc'];},
  WebMOutputFormat:class{mimeType='video/webm';getSupportedAudioCodecs=()=>['opus'];getSupportedVideoCodecs=()=>['vp9'];},
  getFirstEncodableVideoCodec:async()=>codec,
  Output:class{addVideoTrack(){}addAudioTrack(){}async start(){}async finalize(){record.finalized=true;}async cancel(){record.cancelled++;}},
  CanvasSource:class{constructor(c){record.size={width:c.width,height:c.height};}async add(timestamp,duration){record.video.push({timestamp,duration});}close(){}},
  EncodedAudioPacketSource:class{async add(packet,meta){record.audio.push({packet,meta});}close(){}},
  CanvasSink:class{async *canvases(){for(const f of frames)yield{...f,canvas:{width:3840,height:2160}};}},
  EncodedPacketSink:class{async *packets(){yield{timestamp:0,data:new Uint8Array([42])};yield{timestamp:.05,data:new Uint8Array([43])};}}
 };
 return{record,options:{library,canvasFactory:factory,logo:{},paint:async(s,t,timestamp)=>{record.painted.push(timestamp);}}};
}
test('precise export awaits every source frame, preserves variable timestamps and audio packets, then appends three seconds',async()=>{
 const {record,options}=fixture(),result=await exportFilteredVideo(new Blob(),options);
 assert.deepEqual(record.painted,[0,.016,.05]);assert.deepEqual(record.video.slice(0,3),[{timestamp:0,duration:.016},{timestamp:.016,duration:.034},{timestamp:.05,duration:.05}]);
 assert.equal(record.video.length,93);assert.equal(result.frames,3);assert.equal(result.duration,3.1);assert.equal(result.width,3840);assert.equal(result.height,2160);
 assert.equal(record.audio.length,2);assert.equal(record.audio[0].packet.data[0],42);assert.equal(record.audio[0].meta.decoderConfig.codec,'mp4a.40.2');assert.equal(record.audio[1].meta,undefined);
 assert.ok(Math.abs(record.video.at(-1).timestamp+record.video.at(-1).duration-3.1)<.00001);assert.equal(record.finalized,true);assert.equal(record.disposed,true);
});
test('owner can make a silent ending-free file; normal source dimensions are preserved',async()=>{
 const {record,options}=fixture({hasAudio:false}),result=await exportFilteredVideo(new Blob(),{...options,ending:false,audio:false,quality:'1080'});
 assert.equal(record.video.length,3);assert.equal(record.audio.length,0);assert.equal(result.width,1920);assert.equal(result.height,1080);assert.equal(result.duration,.1);assert.equal(result.ending,false);
});
test('cancellation and tracking failures never finalize or expose a misleading complete download',async()=>{
 for(const kind of ['cancel','tracking']){
  const {record,options}=fixture(),controller=new AbortController();
  options.paint=async()=>{if(kind==='cancel')controller.abort();else throw new Error('Tracker failed');};
  await assert.rejects(exportFilteredVideo(new Blob(),{...options,signal:controller.signal}),kind==='cancel'?{name:'AbortError'}:/Tracker failed/);
  assert.equal(record.finalized,false);assert.equal(record.disposed,true);assert.ok(record.cancelled>0);
 }
});
test('unavailable codecs request the explicit compatibility path before encoding starts',async()=>{
 const {record,options}=fixture({codec:null});await assert.rejects(exportFilteredVideo(new Blob(),options),ExportUnavailable);
 assert.equal(record.finalized,false);assert.equal(record.disposed,true);assert.equal(hasFrameExport({}),false);assert.equal(hasFrameExport({VideoEncoder:class{},VideoDecoder:class{}}),true);
});
