// Some mobile browsers advertise a codec but reject it when recording starts.
// Try the next supported container before giving up; no media leaves the device.
export function startVideoRecorder(stream,{Recorder=globalThis.MediaRecorder,audio=false,videoBitsPerSecond=4500000}={}){
 if(!Recorder)throw new Error('Video recording is unavailable in this browser.');
 const types=audio?['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/webm;codecs=vp8,opus','video/webm;codecs=vp9,opus','video/webm','video/mp4']:['video/mp4;codecs=avc1.42E01E','video/webm;codecs=vp8','video/webm;codecs=vp9','video/webm','video/mp4'];
 let lastError;
 for(const mimeType of [...types.filter(t=>Recorder.isTypeSupported(t)),null]){
  let recorder;try{recorder=new Recorder(stream,{videoBitsPerSecond,...(mimeType?{mimeType}:{})});recorder.start(1000);return recorder;}
  catch(error){lastError=error;if(recorder&&recorder.state!=='inactive')try{recorder.stop();}catch{}}
 }
 throw lastError||new Error('This browser could not start a supported video recorder.');
}
