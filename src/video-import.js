const audioPipelines=new WeakMap();
export async function openVideoFile(video,file){
 if(!file?.size)throw new Error('Choose a video file.');
 if(file.size>150*1024*1024)throw new Error('Choose a clip under 150 MB. Shorter videos work better on phones.');
 if(!file.type?.startsWith('video/')&&!/\.(mp4|m4v|webm|mov|ogv|ogg)$/i.test(file.name||''))throw new Error('Choose an MP4, WebM or another video supported by your browser.');
 const url=URL.createObjectURL(file);video.srcObject=null;video.autoplay=false;video.preload='auto';video.muted=true;video.src=url;
 try{
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>done(new Error('The video took too long to open. Try a smaller MP4 or WebM.')),20000);const loaded=()=>done(),failed=()=>done(new Error('This browser cannot decode this video. Try an H.264 MP4 or a WebM copy.'));function done(error){clearTimeout(timer);video.removeEventListener('loadeddata',loaded);video.removeEventListener('error',failed);error?reject(error):resolve();}video.addEventListener('loadeddata',loaded,{once:true});video.addEventListener('error',failed,{once:true});video.load();});
  video.pause();if(!Number.isFinite(video.duration)||video.duration<=0)throw new Error('This clip has no readable duration. Try an MP4 or WebM copy.');
  if(video.duration>180.5)throw new Error('Choose a video up to 3 minutes long. Trim a shorter copy in your gallery first.');
  return{url,name:file.name,duration:video.duration,width:video.videoWidth,height:video.videoHeight};
 }catch(e){URL.revokeObjectURL(url);video.removeAttribute('src');video.load();throw e;}
}
export async function seekVideo(video,time){if(Math.abs(video.currentTime-time)<.025)return;await new Promise((resolve,reject)=>{const timer=setTimeout(()=>finish(new Error('The video could not seek. Try another clip.')),10000),done=()=>finish();function finish(error){clearTimeout(timer);video.removeEventListener('seeked',done);error?reject(error):resolve();}video.addEventListener('seeked',done,{once:true});video.currentTime=time;});}
export async function originalAudio(video){
 let pipeline=audioPipelines.get(video);
 if(!pipeline){const Context=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Context)throw new Error('Original video audio is unavailable in this browser.');const context=new Context(),source=context.createMediaElementSource(video),destination=context.createMediaStreamDestination();source.connect(destination);pipeline={context,source,destination};audioPipelines.set(video,pipeline);}
 await pipeline.context.resume();video.muted=false;return pipeline.destination.stream.getAudioTracks().map(track=>track.clone());
}
export function suspendOriginalAudio(video){audioPipelines.get(video)?.context.suspend().catch(()=>{});}
