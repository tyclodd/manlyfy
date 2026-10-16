import {drawBandage} from '../src/render.js?v=1.3.0';
import {detectPhotoFaces} from '../src/photo-tracker.js?v=1.3.0';
import {FaceTracker} from '../src/tracker.js?v=1.3.0';
import {DESIGNS,loadPatchImage} from '../src/designs.js?v=1.3.0';
import {landmarkToPatch,containRect,patchPose,recordingMime} from '../src/core.js?v=1.3.0';
const $=id=>document.getElementById(id),tracker=new FaceTracker();let blob,ac;
const report=(text,pass=true)=>{$('results').textContent+=`\n${pass?'PASS':'FAIL'} · ${text}`;};
async function load(url){const i=new Image();i.src=url;await i.decode();return i;}
function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function render(source,c,patches,img){const ctx=c.getContext('2d'),r=containRect(source.width,source.height,c.width,c.height);ctx.fillStyle='#15151e';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(source,r.x,r.y,r.width,r.height);for(const p of patches){const q=patchPose(p,r);drawBandage(ctx,img,q);}}
function sample(name,c){const div=document.createElement('div');div.className='sample';const title=document.createElement('p');title.textContent=name;div.append(title,c);$('samples').append(div);}
$('run').onclick=async()=>{
 ac=new AudioContext();await ac.resume();$('run').disabled=true;$('results').textContent='Running local face models and browser codec checks…';$('samples').replaceChildren();
 try{
 const diagnostic=document.createElement('canvas');report(`Graphics check · WebGL2 available: ${!!diagnostic.getContext('webgl2')}`);const offscreen=new OffscreenCanvas(16,16);report(`Graphics check · OffscreenCanvas WebGL2 available: ${!!offscreen.getContext('webgl2')}`);const t=performance.now();await tracker.init();report(`Face tracker initialized in ${Math.round(performance.now()-t)} ms`);
 const original=await load('../assets/demo-astronaut.png'),portrait=await load('../assets/qa-portrait.jpg'),turned=await load('../assets/qa-portrait-rotated.jpg'),grace=await load('../assets/qa-grace-hopper.jpg'),patch=await loadPatchImage('dino');
 const cases=[['Single face · NASA portrait',original,1]];
 const distant=canvas(720,1600),dc=distant.getContext('2d');dc.fillStyle='#c8c5be';dc.fillRect(0,0,720,1600);dc.drawImage(original,160,500,400,400);cases.push(['Small face · tall full-body-style fixture',distant,1]);
 const group=canvas(1024,512);group.getContext('2d').drawImage(original,0,0,512,512);group.getContext('2d').drawImage(grace,512,0,512,512);cases.push(['Multiple faces · two-person composite',group,2]);
 cases.push(['Second portrait · White House fixture',portrait,1]);cases.push(['Glasses · Grace Hopper fixture',grace,1]);
 // The second fixture contains a pronounced image rotation, a separate stress case.
 cases.push(['Rotated-image fixture',turned,1]);
 for(const [label,factor]of [['Dim light simulation',.48],['Bright light simulation',1.3]]){const c=canvas(original.width,original.height),cx=c.getContext('2d');cx.filter=`brightness(${factor})`;cx.drawImage(original,0,0);cases.push([label,c,1]);}
 let single;
 for(const[name,input,expected]of cases){const started=performance.now(),landmarks=await detectPhotoFaces(tracker,input,{onProgress:text=>{document.getElementById('run').textContent=text;}}),patches=landmarks.map((lm,i)=>landmarkToPatch(lm,input.width,input.height,'nose-'+i)).filter(Boolean),c=canvas(input.width,input.height);render(input,c,patches,patch);sample(name,c);report(`${name}: ${patches.length} face(s), ${Math.round(performance.now()-started)} ms · ${tracker.backend}`,patches.length>=expected);if(input===original)single=patches;}
 let artwork=0;for(const d of DESIGNS){await loadPatchImage(d.id);artwork++;}report(`${artwork} / ${DESIGNS.length} plaster SVGs decode successfully`,artwork===DESIGNS.length);
 const pngCanvas=canvas(512,512);render(original,pngCanvas,single,patch);const png=await new Promise(r=>pngCanvas.toBlob(r,'image/png'));const decoded=await createImageBitmap(png);report(`Filtered PNG encodes and decodes: ${decoded.width} × ${decoded.height}, ${png.size} bytes`,decoded.width===512&&png.size>1000);decoded.close();
 if(!window.MediaRecorder||!pngCanvas.captureStream){report('Canvas recording API unavailable',false);return;}
 const osc=ac.createOscillator(),dest=ac.createMediaStreamDestination();osc.frequency.value=440;osc.connect(dest);osc.start();const stream=pngCanvas.captureStream(20);for(const t of dest.stream.getAudioTracks())stream.addTrack(t);
 const mime=recordingMime(MediaRecorder,true),parts=[],rec=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);rec.ondataavailable=e=>{if(e.data.size)parts.push(e.data);};
 const done=new Promise(resolve=>rec.onstop=resolve);rec.start(500);let ticks=0,tracked=0,elapsed=0;const start=performance.now();
 while(performance.now()-start<5000){const now=performance.now(),c=canvas(512,512),cx=c.getContext('2d'),angle=Math.sin((now-start)/600)*.13;cx.translate(256,256);cx.rotate(angle);cx.drawImage(original,-238,-238,476,476);const lms=await tracker.detect(c,'VIDEO',1,480);const ps=(lms||[]).map(lm=>landmarkToPatch(lm,512,512)).filter(Boolean);if(ps.length)tracked++;render(c,pngCanvas,ps,patch);ticks++;await new Promise(r=>setTimeout(r,40));}
 elapsed=performance.now()-start;rec.stop();await done;stream.getTracks().forEach(t=>t.stop());osc.stop();await ac.close();blob=new Blob(parts,{type:rec.mimeType});$('playback').muted=true;$('playback').src=URL.createObjectURL(blob);$('save').hidden=false;
 await new Promise((resolve,reject)=>{$('playback').onloadeddata=resolve;$('playback').onerror=()=>reject(new Error('Recorded clip would not decode'));});
 report(`Continuous VIDEO-mode tracking: ${tracked}/${ticks} frames detected (${(ticks/elapsed*1000).toFixed(1)} inference fps on this desktop browser)`,tracked>=4&&tracked>=ticks*.8);
 report(`Filtered video with synthetic audio records & decodes: ${blob.size} bytes, ${rec.mimeType}`,blob.size>5000&&$('playback').videoWidth===512);
 try{await $('playback').play();await new Promise(r=>setTimeout(r,450));report('Recorded video plays and advances',!$('playback').paused&&$('playback').currentTime>0);$('playback').pause();}catch{report('Autoplay unavailable; test manual playback',false);}
 $('results').textContent+='\nNOT VERIFIED · Physical front/rear cameras, microphone input, Android install and low-powered phones.';
 }catch(e){report(e.message,false);console.error(e);}finally{if(ac&&ac.state!=='closed')ac.close();$('run').disabled=false;$('run').textContent='Run image & recording checks';tracker.dispose();$('results').textContent+='\nFINISHED';}
};
$('save').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='MANLYFY-qa-filtered-audio.'+(blob.type.includes('mp4')?'mp4':'webm');a.click();};
for(const w of [320,390,1024])$('w'+w).onclick=()=>{const f=$('frame');f.width=w;setTimeout(()=>{const d=f.contentDocument;const over=[...d.querySelectorAll('body *')].filter(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();if(s.display==='none'||s.position==='absolute'||s.position==='fixed'||r.right<=w+2||r.width<=0)return false;for(let a=e.parentElement;a&&a!==d.body;a=a.parentElement){if(/auto|scroll|hidden|clip/.test(getComputedStyle(a).overflowX))return false;}return true;}).map(e=>e.id||e.className).slice(0,12);$('layout').textContent=JSON.stringify({width:w,documentWidth:d.documentElement.scrollWidth,bodyWidth:d.body.scrollWidth,overflow:over},null,2);},500);};
