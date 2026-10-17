import {exportSize,videoBitrate} from './export-quality.js?v=1.7.0';
import {OUTRO_DURATION,drawOutro} from './video-outro.js?v=1.7.0';

export class ExportUnavailable extends Error{}
const cancelled=signal=>{if(signal?.aborted)throw new DOMException('Export cancelled.','AbortError');};
export function hasFrameExport(scope=globalThis){return !!(scope.VideoEncoder&&scope.VideoDecoder);}

// Decode, track, paint and encode EVERY source frame, using its original timestamp.
// Unlike captureStream this does not depend on inference keeping up with playback.
export async function exportFilteredVideo(file,{
 ratio='original',quality='source',audio=true,ending=true,logo,signal,
 paint,onProgress=()=>{},library,canvasFactory=()=>document.createElement('canvas')
}={}){
 const m=library||await import('../assets/mediabunny-1.61.6.min.mjs');
 const input=new m.Input({source:new m.BlobSource(file),formats:m.ALL_FORMATS});let output,started=false,finished=false,onAbort;
 try{
  cancelled(signal);
  const track=await input.getPrimaryVideoTrack();
  if(!track||!await track.canDecode())throw new ExportUnavailable('This video cannot use precise export in this browser.');
  const audioTrack=audio?await input.getPrimaryAudioTrack():null,audioCodec=audioTrack?await audioTrack.getCodec():null;
  const duration=await input.computeDuration(),stats=await track.computePacketStats(100);
  if(!Number.isFinite(duration)||duration<=0||duration>180.5)throw new ExportUnavailable('Choose a video up to 3 minutes long.');
  const fps=Math.max(1,Math.min(120,stats.averagePacketRate||30));
  const requested=exportSize(track.displayWidth,track.displayHeight,ratio,quality);
  let size,format,codec;
  // Prefer MP4/H.264 for phone galleries. Retain source audio without re-encoding.
  const sizes=[...new Map([requested,...['1080','720'].map(q=>exportSize(track.displayWidth,track.displayHeight,ratio,q))].filter(s=>s.width<=requested.width&&s.height<=requested.height).map(s=>[s.width+'x'+s.height,s])).values()];
  for(const candidate of sizes){
   for(const container of [new m.Mp4OutputFormat({fastStart:'in-memory'}),new m.WebMOutputFormat()]){
    if(audioTrack&&(!audioCodec||!container.getSupportedAudioCodecs().includes(audioCodec)))continue;
    const choices=container.getSupportedVideoCodecs(),checked=['avc','vp9','vp8','av1'].filter(c=>choices.includes(c));
    const supported=await m.getFirstEncodableVideoCodec(checked,{...candidate,frameRate:fps,bitrate:videoBitrate(candidate.width,candidate.height,fps)});
    if(supported){size=candidate;format=container;codec=supported;break;}
   }
   if(codec)break;
  }
  if(!codec)throw new ExportUnavailable('Precise export is unavailable for this video and audio format on this browser.');
  cancelled(signal);
  const canvas=canvasFactory();canvas.width=size.width;canvas.height=size.height;
  const target=new m.BufferTarget();output=new m.Output({format,target});
  let encodedBytes=0;
  const source=new m.CanvasSource(canvas,{codec,bitrate:videoBitrate(size.width,size.height,fps),keyFrameInterval:2,
   onEncodedPacket:packet=>{encodedBytes+=packet.data.byteLength;if(encodedBytes>384*1024*1024)throw new Error('This export reached the 384 MB memory limit. Choose 1080p or a shorter clip and create it again.');}});
  output.addVideoTrack(source,{frameRate:fps});
  let audioSource;
  if(audioTrack){audioSource=new m.EncodedAudioPacketSource(audioCodec);output.addAudioTrack(audioSource);}
  await output.start();started=true;onAbort=()=>{output.cancel().catch(()=>{});};signal?.addEventListener('abort',onAbort,{once:true});
  const sink=new m.CanvasSink(track,{poolSize:1});let frames=0,end=0,jobError;
  const check=()=>{cancelled(signal);if(jobError)throw jobError;};
  const videoJob=async()=>{
   for await(const frame of sink.canvases()){
    check();const frameDuration=frame.duration>0?frame.duration:1/fps;
    await paint(frame.canvas,canvas,frame.timestamp,frameDuration);check();
    await source.add(frame.timestamp,frameDuration);frames++;end=Math.max(end,frame.timestamp+frameDuration);
    onProgress({phase:'frames',time:end,total:duration+(ending?3:0),frames,...size,codec});
    // Allow controls, cancellation and progress paint between expensive scans.
    if(frames%2===0)await new Promise(resolve=>setTimeout(resolve,0));
   }
   if(!frames)throw new Error('No video frames could be decoded.');
   if(ending){
    const ctx=canvas.getContext('2d'),endingFps=Math.min(60,fps),count=Math.round(OUTRO_DURATION/1000*endingFps);
    for(let i=0;i<count;i++){
     check();const elapsed=(i+1)/count*OUTRO_DURATION;drawOutro(ctx,logo,elapsed);
     await source.add(end+i/endingFps,1/endingFps);
     onProgress({phase:'ending',time:end+(i+1)/endingFps,total:end+3,frames,...size,codec});
    }
   }
   source.close();
  };
  const audioJob=async()=>{
   if(!audioSource)return;const config=await audioTrack.getDecoderConfig(),packets=new m.EncodedPacketSink(audioTrack);let first=true;
   for await(const packet of packets.packets()){
    check();await audioSource.add(packet,first?{decoderConfig:config}:undefined);first=false;
   }
   audioSource.close();
  };
  // Both producers must settle before disposing their shared input/output.
  const guarded=job=>job.catch(error=>{jobError=error;output.cancel().catch(()=>{});throw error;});
  const jobs=await Promise.allSettled([guarded(videoJob()),guarded(audioJob())]);
  for(const job of jobs)if(job.status==='rejected')throw job.reason;
  cancelled(signal);onProgress({phase:'finishing',time:end+(ending?3:0),total:end+(ending?3:0),frames,...size,codec});
  await output.finalize();finished=true;
  if(!target.buffer?.byteLength)throw new Error('The video encoder produced an empty file.');
  return{blob:new Blob([target.buffer],{type:format.mimeType}),frames,duration:end+(ending?3:0),...size,codec,audio:!!audioSource,ending,downgraded:size.width!==requested.width||size.height!==requested.height};
 }catch(error){cancelled(signal);throw error;}finally{
  if(onAbort)signal?.removeEventListener('abort',onAbort);
  if(started&&!finished)try{await output.cancel();}catch{}
  input.dispose();
 }
}
