import {progressAt,unlockPhoto,cleanCount} from './progress.js?v=1.2.1';
import {DESIGNS,CATEGORIES,patchSVG,loadPatchImage} from './designs.js?v=1.2.1';
import {clamp,containRect,outputSize,landmarkToPatch,smoothPatches,patchPose,hitPatch,recordingMime,formatTime,cameraError} from './core.js?v=1.2.1';
import {drawBandage} from './render.js?v=1.2.1';
import {FaceTracker} from './tracker.js?v=1.2.1';
import {MotionTracker} from './motion.js?v=1.2.1';
const $=id=>document.getElementById(id);
const stage=$('stage'),ctx=stage.getContext('2d',{alpha:false}),video=$('sourceVideo');
const tracker=new FaceTracker(),motion=new MotionTracker(),images=new Map();
let design='classic',category='All patches',mode='photo',photo=null,live=false,stream=null,micStream=null,mirrored=false,facing='user';
let patches=[],selected=null,compare=false,epoch=0,lastInfer=0,lastTracked=0,trackingHold=650,lastDraw=0,raf=0,working=false;
let recorder=null,recordStream=null,recording=false,chunks=[],recordBytes=0,recordStarted=0,resultBlob=null,resultUrl=null,photoUrl=null;
const testCamera=new URLSearchParams(location.search).get('test-camera')==='1';
let testRaf=0,testAudio=null,micPending=false,micRequest=0,testMetricsAt=0,testFrames=0;
let lastMotion=0,motionReady=false,renderCount=0,flowCount=0,metricStart=0;
const progressKey=testCamera?'manlyfy-test-progress-v1':'manlyfy-progress-v1';
let photoCount=0,photoCredited=false,progressEligible=false,newestReward=null;
try{photoCount=cleanCount(JSON.parse(localStorage.getItem(progressKey)||'{}').photos);}catch{}
let drag=null,toastTimer=null,deferredInstall=null,recordTimer=null,recordFailed=false;
const ratings=['147% MANLY · May require a larger doorway.','208% MANLY · Dinosaurs are asking for tips.','112% MANLY · Officially too powerful for errands.','999% MANLY · The meter has resigned.','183% MANLY · Your nose has been promoted.','156% MANLY · Small plaster. Enormous authority.','301% MANLY · Approved by absolutely no scientists.','124% MANLY · Could open a slightly stubborn jar.','240% MANLY · Your reflection asked for a selfie.'];
function toast(message){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,4200);}
function notice(message=''){$('notice').textContent=message;$('notice').hidden=!message;}
function busy(on,message='Finding your inner MANLY…'){working=on;$('busy').hidden=!on;$('busyText').textContent=message;updateControls();}
function dims(){const source=live?video:photo;return {source,sw:source?.videoWidth||source?.width||1,sh:source?.videoHeight||source?.height||1};}
function rect(){const{sw,sh}=dims();return containRect(sw,sh,stage.width,stage.height);}
function resize(){const{source,sw,sh}=dims();if(!source)return;const size=outputSize(sw,sh,$('ratio').value,live?($('quality').value==='lite'?960:1280):2560);if(recording)return;stage.width=size.width;stage.height=size.height;render();}
function render(){
  const now=performance.now();
  const{source,sw,sh}=dims();if(!source||live&&video.readyState<2)return;
  const r=containRect(sw,sh,stage.width,stage.height);ctx.fillStyle='#15151e';ctx.fillRect(0,0,stage.width,stage.height);
  ctx.save();if(mirrored){ctx.translate(r.x*2+r.width,0);ctx.scale(-1,1);}ctx.drawImage(source,r.x,r.y,r.width,r.height);ctx.restore();
  if(compare&&!recording)return;
  if(live&&now-lastTracked>trackingHold)return;
  for(const p of patches){const img=images.get(p.design||design);if(img)drawBandage(ctx,img,patchPose(p, r,mirrored));}
}
function showMedia(){stage.hidden=false;$('welcome').hidden=true;$('viewfinder').classList.add('has-media');$('faceStatus').hidden=false;}
function faceStatus(text,lost=false){if($('faceStatusText').textContent!==text)$('faceStatusText').textContent=text;$('faceStatus').classList.toggle('lost',lost);}
function rate(){$('ratingText').textContent=ratings[Math.floor(Math.random()*ratings.length)];}
function updateControls(){
  $('photoMode').classList.toggle('active',mode==='photo');$('photoMode').setAttribute('aria-pressed',String(mode==='photo'));
  $('videoMode').classList.toggle('active',mode==='video');$('videoMode').setAttribute('aria-pressed',String(mode==='video'));
  $('audioOption').hidden=mode!=='video';$('previewHead').hidden=!live;$('recordingBadge').hidden=!recording;
  $('flipBtn').disabled=!live||working||recording;$('compareBtn').disabled=(!photo&&!live)||recording||working;
  $('editor').hidden=!photo||live||mode==='video';$('shutter').classList.toggle('video',mode==='video');$('shutter').classList.toggle('recording',recording);
  $('shutter').disabled=working||micPending||(live&&mode==='video'&&!tracker.ready);
  $('shutter').setAttribute('aria-label',recording?'Stop recording':!live?'Open camera':mode==='video'?'Start recording':'Take photo');
  $('shutterHint').textContent=recording?'TAP TO STOP':!live?'TAP TO GET MANLY':mode==='video'?'TAP TO RECORD':'TAP TO SNAP';
  for(const id of ['photoMode','videoMode','ratio','groupToggle','quality','uploadBtn','roulette','demoBtn'])$(id).disabled=recording||working;
  $('audioToggle').disabled=recording||working||micPending;
  $('savePhoto').disabled=working||!photo;$('sharePhoto').disabled=working||!photo;
  $('stopCamera').disabled=working; // Always available during recording.
  document.querySelectorAll('.patch-card,.quick-patch,.category').forEach(b=>b.disabled=recording);
}
function rebuildNoses(){
  const select=$('noseSelect');select.replaceChildren(...patches.map((p,i)=>{const o=document.createElement('option');o.value=p.id;o.textContent=`Nose ${i+1}${p.manual?' · manual':''}`;return o;}));
  if(!patches.some(p=>p.id===selected))selected=patches[0]?.id||null;
  if(selected)select.value=selected;select.disabled=!patches.length;
  $('removePatch').disabled=!selected;$('size').disabled=!selected;$('rotation').disabled=!selected;
  syncSliders();
}
function syncSliders(){const p=patches.find(p=>p.id===selected);$('size').value=Math.round((p?.scale||1)*100);$('rotation').value=Math.round((p?.rotation||0)*180/Math.PI);$('sizeValue').textContent=$('size').value+'%';$('rotationValue').textContent=$('rotation').value+'°';}
async function ensureDesign(id){if(!images.has(id))images.set(id,await loadPatchImage(id));}
function canUse(id){const index=DESIGNS.findIndex(d=>d.id===id);return index>=0&&index<progressAt(photoCount,DESIGNS.length).unlocked;}
async function selectDesign(id,announce=true){if(!canUse(id)){const at=unlockPhoto(DESIGNS.findIndex(d=>d.id===id));toast(`Unlocks at ${at} photos. ${Math.max(0,at-photoCount)} more to go. Your nose believes in you.`);return;}await ensureDesign(id);design=id;patches=patches.map(p=>({...p,design:id}));const d=DESIGNS.find(x=>x.id===id);$('selectedName').textContent=d.name;$('quickName').textContent=d.name;document.querySelectorAll('.patch-card,.quick-patch').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.id===id)));savePref();render();if(announce)toast(d.name+' has nose authority.');}
function buildCollection(){
  $('categories').replaceChildren(...CATEGORIES.map(name=>{const b=document.createElement('button');b.className='category'+(name===category?' active':'');b.textContent=name;b.setAttribute('aria-pressed',String(name===category));b.onclick=()=>{category=name;buildCollection();};return b;}));
  $('patchGrid').replaceChildren(...DESIGNS.filter(d=>category==='All patches'||d.category===category).map(d=>{const b=document.createElement('button');const index=DESIGNS.indexOf(d),locked=!canUse(d.id);b.className='patch-card'+(locked?' is-locked':'')+' tier-'+d.tier.toLowerCase();b.dataset.id=d.id;b.setAttribute('aria-label',d.name+' plaster'+(locked?` · locked · ${unlockPhoto(index)} photos`:''));b.setAttribute('aria-pressed',String(d.id===design));b.innerHTML=`<img class="patch-art" alt="" src="data:image/svg+xml,${encodeURIComponent(patchSVG(d))}">`+`<span class="patch-label">${d.name}</span><span class="patch-tier">${locked?'◈ '+unlockPhoto(index)+' photos':d.tier}</span>`;b.onclick=()=>selectDesign(d.id).catch(()=>notice('That plaster could not be loaded. Please try another.'));return b;}));
  buildQuickPick();updateProgress();
}

function buildQuickPick(){
  const scroll=$('quickPatches').scrollLeft;
  $('quickPatches').replaceChildren(...DESIGNS.map((d,index)=>{
    const b=document.createElement('button'),locked=!canUse(d.id);b.className='quick-patch'+(locked?' is-locked':'');b.dataset.id=d.id;
    b.setAttribute('aria-label',d.name+(locked?` · unlocks at ${unlockPhoto(index)} photos`:''));b.setAttribute('aria-pressed',String(d.id===design));
    b.innerHTML=`<img alt="" src="data:image/svg+xml,${encodeURIComponent(patchSVG(d))}"><span>${d.name}</span><small>${locked?'◈ '+unlockPhoto(index)+' photos':'Ready to wear'}</small>`;
    b.onclick=()=>selectDesign(d.id).catch(()=>notice('That plaster could not load. Try another.'));return b;
  }));
  $('quickPatches').scrollLeft=scroll;$('quickName').textContent=DESIGNS.find(d=>d.id===design).name;
}

function updateProgress(){
 const state=progressAt(photoCount,DESIGNS.length);$('collectionCount').textContent=`${state.unlocked}/${DESIGNS.length}`;
 $('photoTotal').textContent=photoCount.toLocaleString();$('unlockedTotal').textContent=state.unlocked;
 $('rewardProgress').value=state.fraction*100;
 $('rewardProgress').setAttribute('aria-label',state.next?`Progress to ${state.next.photos} photos`:'Collection complete');
 $('nextReward').textContent=state.next?`${state.next.photos-photoCount} more ${state.next.photos-photoCount===1?'photo':'photos'} → ${state.next.amount===1?DESIGNS[state.unlocked].name:state.next.amount+' new patches'}`:'Full collection unlocked. Legendary nose behaviour.';
 $('nextMilestone').textContent=state.next?`NEXT: ${state.next.photos} PHOTOS`:'COLLECTION COMPLETE';
}
function creditPhoto(){
 if(photoCredited||!progressEligible)return;photoCredited=true;
 const before=progressAt(photoCount,DESIGNS.length);photoCount++;const after=progressAt(photoCount,DESIGNS.length);
 try{localStorage.setItem(progressKey,JSON.stringify({version:1,photos:photoCount}));}catch{toast('Progress works for this visit. Browser storage is unavailable, so it cannot be saved.');}
 buildCollection();
 if(after.unlocked>before.unlocked){
  const earned=DESIGNS.slice(before.unlocked,after.unlocked);newestReward=earned[0].id;
  $('unlockTitle').textContent=earned.length===1?'Fresh patch. Fresh power.':`${earned.length} new patches. Big nose energy.`;
  $('unlockMessage').textContent=`${photoCount} photos. You earned this. Every design is free.`;
  $('unlockArt').replaceChildren(...earned.map(d=>{const item=document.createElement('div');item.innerHTML=`<img alt="" src="data:image/svg+xml,${encodeURIComponent(patchSVG(d))}">`+`<strong>${d.name}</strong><small>${d.tier}</small>`;return item;}));
  $('unlockDialog').showModal();
 }else toast(`Photo ${photoCount}. ${after.next?after.next.photos-photoCount+' to your next unlock.':'Legendary status maintained.'}`);
}
function savePref(){try{localStorage.setItem('manlyfy-prefs',JSON.stringify({design,ratio:$('ratio').value,quality:$('quality').value,groupLive:$('groupToggle').checked}));}catch{}}
async function waitIdle(){for(let i=0;tracker.busy&&i<100;i++)await new Promise(r=>setTimeout(r,30));}
async function detectPhoto(token=epoch){
  if(!photo)return;busy(true,'Finding every magnificent nose…');
  try{await waitIdle();const found=await tracker.detect(photo,'IMAGE',8,1280);if(token!==epoch)return;
    patches=(found||[]).map((lm,i)=>landmarkToPatch(lm,photo.width,photo.height,'nose-'+i)).filter(Boolean).map(p=>({...p,design}));
    faceStatus(patches.length?`${patches.length} ${patches.length===1?'nose':'noses'} MANLYFIED`:'No face found · add a plaster manually',!patches.length);
    if(!patches.length)notice('No nose found. Try a brighter, front-facing photo, or tap “Add plaster” and drag it into place.');
  }catch(e){if(token!==epoch)return;notice('Automatic tracking could not load. You can still add, drag, resize and rotate plasters manually. Reconnect and tap “Auto-detect again” to retry.');faceStatus('Manual mode · your nose, your rules',true);console.warn('Face tracking unavailable:',e.message);}
  finally{if(token===epoch){rebuildNoses();render();busy(false);}}
}
async function decodePhoto(file){
  if(!file.type.startsWith('image/'))throw new Error('Choose a photo, such as JPG, PNG or WebP.');
  if(file.size>35*1024*1024)throw new Error('That photo is over 35 MB. Please choose a smaller image.');
  let image,url;
  try{image=await createImageBitmap(file,{imageOrientation:'from-image'});}catch{url=URL.createObjectURL(file);image=new Image();image.src=url;try{await image.decode();}catch{URL.revokeObjectURL(url);throw new Error('This image format is not supported by your browser. Try JPG, PNG or WebP.');}}
  const sw=image.width||image.naturalWidth,sh=image.height||image.naturalHeight,s=Math.min(1,2560/Math.max(sw,sh));
  const c=document.createElement('canvas');c.width=Math.max(1,Math.round(sw*s));c.height=Math.max(1,Math.round(sh*s));c.getContext('2d').drawImage(image,0,0,c.width,c.height);image.close?.();if(url)URL.revokeObjectURL(url);return c;
}
async function openPhoto(file,isDemo=false){
  if(recording)return;const token=++epoch;busy(true,'Getting your photo ready…');notice();
  try{const c=await decodePhoto(file);if(token!==epoch)return;stopLive(false);photo=c;progressEligible=!isDemo;photoCredited=false;mirrored=false;mode='photo';patches=[];selected=null;compare=false;$('compareBtn').setAttribute('aria-pressed','false');showMedia();resize();rate();updateControls();if(isDemo)notice('Demo: NASA astronaut Eileen Collins, public-domain photograph. Your own uploads stay on your device.');await detectPhoto(epoch);}
  catch(e){busy(false);notice(e.message);}
}
function stopMic(){micRequest++;micPending=false;if(testAudio){testAudio.close().catch(()=>{});testAudio=null;}micStream?.getTracks().forEach(t=>t.stop());micStream=null;$('micState').textContent='off';}
async function enableMic(){
  if(!live||mode!=='video'){toast('The mic will ask for permission when the video camera opens.');return;}
  const request=++micRequest;micPending=true;updateControls();
  try{
    const candidate=testCamera?await testMicrophone():await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});
    if(request!==micRequest||!live||mode!=='video'||!$('audioToggle').checked){candidate.getTracks().forEach(t=>t.stop());return;}
    micStream=candidate;$('micState').textContent='on';toast(testCamera?'Test audio on: a synthetic tone.':'Mic on. Your voice stays in your recording.');
  }catch(e){if(request!==micRequest)return;$('audioToggle').checked=false;stopMic();notice('Microphone access was not available. You can record a silent video. Allow microphone access in browser site settings to add audio.');}
  finally{if(request===micRequest)micPending=false;updateControls();}
}
function frozenSource(){if(video.readyState<2||!video.videoWidth)return null;const c=document.createElement('canvas');const s=Math.min(1,2560/Math.max(video.videoWidth,video.videoHeight));c.width=Math.round(video.videoWidth*s);c.height=Math.round(video.videoHeight*s);c.getContext('2d').drawImage(video,0,0,c.width,c.height);return c;}
function stopLive(preserve=true){
  if(recording)stopRecording();if(live&&preserve){photo=frozenSource()||photo;progressEligible=false;photoCredited=false;}
  live=false;motion.reset();motionReady=false;epoch++;cancelAnimationFrame(testRaf);testRaf=0;cancelAnimationFrame(raf);raf=0;stream?.getTracks().forEach(t=>t.stop());stream=null;stopMic();video.srcObject=null;
  if(photo){showMedia();resize();rebuildNoses();render();faceStatus('Camera off · media stays on your device');}else{stage.hidden=true;$('welcome').hidden=false;$('viewfinder').classList.remove('has-media');$('faceStatus').hidden=true;}
  updateControls();
}
async function testCameraStream(){
  const image=new Image();image.src='assets/demo-astronaut.png';await image.decode();
  const c=document.createElement('canvas');c.width=720;c.height=960;const cx=c.getContext('2d');
  const start=performance.now();
  const tick=now=>{cx.fillStyle='#292638';cx.fillRect(0,0,720,960);cx.save();cx.translate(360+Math.sin((now-start)/1300)*35,475);cx.rotate(Math.sin((now-start)/950)*.10);cx.drawImage(image,-335,-335,670,670);cx.restore();testRaf=requestAnimationFrame(tick);};
  tick(start);return c.captureStream(30);
}
async function testMicrophone(){
  testAudio=new AudioContext();await testAudio.resume();const oscillator=testAudio.createOscillator(),gain=testAudio.createGain(),dest=testAudio.createMediaStreamDestination();
  oscillator.frequency.value=440;gain.gain.value=.12;oscillator.connect(gain);gain.connect(dest);oscillator.start();return dest.stream;
}
async function startCamera(nextFacing=facing){
  if(recording||working)return;
  if((!navigator.mediaDevices?.getUserMedia&&!testCamera)||!window.isSecureContext){notice('Camera access needs a supported HTTPS browser. Upload a photo to use the editor.');return;}
  stopLive(false);photo=null;patches=[];selected=null;facing=nextFacing;mirrored=facing==='user';compare=false;$('compareBtn').setAttribute('aria-pressed','false');notice();busy(true,'Opening your MANLY camera…');const token=++epoch;
  try{
    stream=testCamera?await testCameraStream():await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:facing},width:{ideal:$('quality').value==='lite'?640:1280},height:{ideal:$('quality').value==='lite'?480:960}},audio:false});
    if(token!==epoch){stream.getTracks().forEach(t=>t.stop());return;}
    video.srcObject=stream;await video.play();
    if(!video.videoWidth)await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('Camera did not return an image.')),10000);video.addEventListener('loadedmetadata',()=>{clearTimeout(timeout);resolve();},{once:true});});
    if(token!==epoch)return;if(testCamera)notice('TEST CAMERA: animated public-domain photo. Optional mic uses a synthetic tone. This does not test physical camera or microphone hardware.');live=true;lastInfer=0;lastTracked=0;lastMotion=0;testFrames=0;renderCount=0;flowCount=0;metricStart=performance.now();motion.reset();motion.maxEdge=$('quality').value==='lite'?256:320;motionReady=false;tracker.resetVideo();showMedia();resize();faceStatus('Loading face tracker…');busy(false);loop(performance.now());
    if(mode==='video'&&$('audioToggle').checked)enableMic();
    try{await Promise.all([tracker.init(),motion.init().then(()=>{if(token===epoch)motionReady=true;}).catch(e=>console.warn(e.message))]);if(token===epoch)faceStatus('Face forward. Let’s find that nose.');}
    catch(e){if(token===epoch){notice('Live face tracking could not load. Take a photo and add a plaster manually, or reconnect and try again.');faceStatus('Tracking unavailable · photo editor still available',true);}}
    updateControls();
    stream?.getVideoTracks()[0]?.addEventListener('ended',()=>{if(live){stopLive();notice('The camera disconnected. Your last frame is kept in the editor.');}});
  }catch(e){if(token===epoch){stream?.getTracks().forEach(t=>t.stop());stream=null;live=false;busy(false);stopLive(false);notice(cameraError(e));}}
}
function updateLivePatches(landmarks,time){
  const raw=landmarks.map(lm=>landmarkToPatch(lm,video.videoWidth,video.videoHeight)).filter(Boolean);
  // Keep identity association, but use the current flow pose without extra easing lag.
  patches=smoothPatches(patches,raw,time).map((p,i)=>({...raw[i],id:p.id,seen:time,design}));
  if(patches.length)lastTracked=time;
  faceStatus(patches.length?`${patches.length} ${patches.length===1?'nose':'noses'} locked · ${DESIGNS.find(d=>d.id===design).name}`:'No face found · face the camera',!patches.length);
}
function loop(time){
  if(!live)return;raf=requestAnimationFrame(loop);
  const flowInterval=1000/($('quality').value==='lite'?20:30);
  if(motionReady&&time-lastMotion>=flowInterval&&motion.tick(video,time)){
    lastMotion=time;updateLivePatches(motion.landmarks(),time);if(motion.hasFaces)flowCount++;
  }
  if(time-lastDraw>=1000/30){render();lastDraw=time;renderCount++;}
  const interval=tracker.backend.includes('CPU')?600:120;
  if(tracker.ready&&!tracker.busy&&video.readyState>=2&&(!motion.hasFaces||time-lastInfer>interval)){
    if(motionReady&&time-lastMotion>10&&motion.tick(video,time)){lastMotion=time;updateLivePatches(motion.landmarks(),time);}
    lastInfer=time;const token=epoch,frameId=motion.current?.id;
    // The flow canvas is exactly the frame in its history. Replay from this anchor
    // when the worker finishes, so a slow scan never pulls the nose into the past.
    const source=motionReady?motion.canvas:video;
    tracker.detect(source,'VIDEO',$('groupToggle').checked?4:1,$('quality').value==='lite'?480:720).then(found=>{
      if(!live||token!==epoch||found===null)return;testFrames++;
      if(motionReady){motion.seed(found,frameId);updateLivePatches(motion.landmarks(),performance.now());}
      else updateLivePatches(found,performance.now());
      trackingHold=motionReady?350:1000;render();
    }).catch(e=>{if(token!==epoch)return;patches=[];faceStatus('Tracking paused · try a photo or Lite mode',true);notice('Tracking paused. Turn the camera off and reopen it, or use a photo.');tracker.dispose();updateControls();});
  }
  if(testCamera&&time-testMetricsAt>1000){
    testMetricsAt=time;const seconds=(time-metricStart)/1000;
    $('notice').textContent=`TEST CAMERA · ${tracker.backend} · ${patches.length} patches · ${testFrames} model scans · ${(flowCount/seconds).toFixed(1)} tracked motion fps · ${(renderCount/seconds).toFixed(1)} preview fps · ${motion.cost.toFixed(1)} ms motion · ${motionReady?'flow on':'flow unavailable'} · synthetic media only`;
  }
  if(recording){const elapsed=performance.now()-recordStarted;$('timer').textContent=formatTime(elapsed);if(elapsed>=180000){toast('Three glorious minutes. Saving your clip.');stopRecording();}}
}

async function takePhoto(){
  if(!live){startCamera();return;}const snapshot=frozenSource();if(!snapshot)return;photo=snapshot;stopLive(false);photo=snapshot;progressEligible=true;photoCredited=false;mode='photo';rate();showMedia();resize();rebuildNoses();updateControls();$('flash').classList.remove('pop');void $('flash').offsetWidth;$('flash').classList.add('pop');await detectPhoto(epoch);creditPhoto();
}
async function startRecording(){
  if(!live){startCamera();return;}
  if(!tracker.ready){notice('Wait for the face tracker to load before recording.');return;}
  if(!window.MediaRecorder||!stage.captureStream){notice('Video recording is unavailable in this browser. Try current Android Chrome, or take a photo instead.');return;}
  compare=false;$('compareBtn').setAttribute('aria-pressed','false');render();chunks=[];recordBytes=0;recordFailed=false;
  try{
    const capture=stage.captureStream(30),audio=$('audioToggle').checked?micStream?.getAudioTracks().filter(t=>t.readyState==='live').map(t=>t.clone())||[]:[];
    recordStream=new MediaStream([...capture.getVideoTracks(),...audio]);
    const mime=recordingMime(MediaRecorder,!!audio.length),options={videoBitsPerSecond:$('quality').value==='lite'?2500000:4500000};if(mime)options.mimeType=mime;
    recorder=new MediaRecorder(recordStream,options);
    recorder.ondataavailable=e=>{if(e.data.size){chunks.push(e.data);recordBytes+=e.data.size;if(recordBytes>100*1024*1024){toast('Saving this mighty clip before phone memory fills up.');stopRecording();}}};
    recorder.onerror=e=>{recordFailed=true;notice('The browser interrupted recording. Any available clip will be shown. Try a shorter clip or Lite mode.');stopRecording();};
    recorder.onstop=()=>{
      const mimeType=recorder.mimeType||mime||'video/webm';const elapsed=performance.now()-recordStarted;recording=false;clearInterval(recordTimer);recordStream?.getTracks().forEach(t=>t.stop());recordStream=null;
      if(chunks.length){resultBlob=new Blob(chunks,{type:mimeType});chunks=[];if(resultUrl)URL.revokeObjectURL(resultUrl);resultUrl=URL.createObjectURL(resultBlob);$('resultVideo').src=resultUrl;$('resultInfo').textContent=`${formatTime(elapsed)} · ${(resultBlob.size/1048576).toFixed(1)} MB · ${mimeType.includes('mp4')?'MP4':'WebM'} · ${audio.length?'with audio':'silent'}${recordFailed?' · interrupted':''}`;stopLive(true);busy(false);$('resultDialog').showModal();}else{notice('No video frames were recorded. Keep the tab visible and try again.');updateControls();}
    };
    recorder.start(1000);recording=true;recordStarted=performance.now();$('timer').textContent='00:00';updateControls();recordTimer=setInterval(()=>{if(recording&&performance.now()-recordStarted>=180000)stopRecording();},1000);
    toast(audio.length?'Recording. Make some MANLY noise.':'Recording silently. Maximum MANLY, minimum noise.');
  }catch(e){recording=false;recordStream?.getTracks().forEach(t=>t.stop());recordStream=null;notice('This browser could not start the video recorder. Try another browser, or take a photo.');updateControls();}
}
function stopRecording(){if(recorder&&recorder.state!=='inactive'){recorder.stop();$('shutter').disabled=true;$('shutterHint').textContent='SAVING YOUR MANLY…';}}
async function photoBlob(){if(!photo)throw new Error('Take or upload a photo first.');const original=compare;compare=false;render();const blob=await new Promise(resolve=>stage.toBlob(resolve,'image/png'));compare=original;render();if(!blob)throw new Error('The photo could not be exported. Try a smaller image.');creditPhoto();return blob;}
function fileName(type){return`MANLYFY-${new Date().toISOString().replace(/[:.]/g,'-')}.${type}`;}
function downloadBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);toast('Saved with 100% MANLY. 0% watermark.');}
async function shareBlob(blob,name){const file=new File([blob],name,{type:blob.type});if(navigator.canShare?.({files:[file]})){try{await navigator.share({files:[file],title:'MANLYFY',text:'The Manliest Camera on Earth.'});}catch(e){if(e.name!=='AbortError')notice('Sharing was unavailable. Download your creation and share it from your gallery.');}}else{downloadBlob(blob,name);toast('Downloaded. Share it from your gallery.');}}
function setMode(value){if(recording||working)return;mode=value;compare=false;$('compareBtn').setAttribute('aria-pressed','false');if(mode==='photo')stopMic();else if(live&&$('audioToggle').checked&&!micStream)enableMic();updateControls();render();if(mode==='video'&&!window.MediaRecorder)notice('This browser does not support live video recording. Photo mode is available.');}
// Collection and UI events.
$('photoMode').onclick=()=>setMode('photo');$('videoMode').onclick=()=>setMode('video');
$('enableCamera').onclick=()=>startCamera();$('retake').onclick=()=>startCamera();$('stopCamera').onclick=()=>stopLive();
$('shutter').onclick=()=>recording?stopRecording():mode==='photo'?takePhoto():startRecording();
$('flipBtn').onclick=()=>startCamera(facing==='user'?'environment':'user');
for(const id of ['uploadBtn','welcomeUpload'])$(id).onclick=()=>$('fileInput').click();
$('fileInput').onchange=()=>{const file=$('fileInput').files[0];if(file)openPhoto(file);$('fileInput').value='';};
$('demoBtn').onclick=async()=>{try{const response=await fetch('assets/demo-astronaut.png');if(!response.ok)throw new Error();await openPhoto(new File([await response.blob()],'demo.png',{type:'image/png'}),true);}catch{notice('The demo could not load. Upload a photo or open your camera.');}};
$('quickPrev').onclick=()=>$('quickPatches').scrollBy({left:-260,behavior:'smooth'});
$('quickNext').onclick=()=>$('quickPatches').scrollBy({left:260,behavior:'smooth'});
$('roulette').onclick=async()=>{const candidates=DESIGNS.filter(d=>canUse(d.id)&&d.id!==design);const d=candidates[Math.floor(Math.random()*candidates.length)];$('roulette').classList.add('rolling');await selectDesign(d.id);setTimeout(()=>$('roulette').classList.remove('rolling'),500);document.querySelector(`.patch-card[data-id="${d.id}"]`)?.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});};
$('ratio').onchange=()=>{savePref();resize();};$('quality').onchange=()=>{savePref();resize();toast('Performance preference saved. Reopen the camera to change its capture resolution.');};
$('groupToggle').onchange=()=>{savePref();motion.reset();lastInfer=0;toast($('groupToggle').checked?'Live group on. More faces need more processing.':'Single nose. Maximum speed.');};
$('audioToggle').onchange=()=>{$('audioToggle').checked?enableMic():stopMic();};
$('compareBtn').onclick=()=>{compare=!compare;$('compareBtn').setAttribute('aria-pressed',String(compare));render();};
$('noseSelect').onchange=()=>{selected=$('noseSelect').value;syncSliders();};
for(const id of ['size','rotation'])$(id).oninput=()=>{const p=patches.find(p=>p.id===selected);if(!p)return;p.scale=Number($('size').value)/100;p.rotation=Number($('rotation').value)*Math.PI/180;syncSliders();render();};
$('addPatch').onclick=()=>{patches.push({id:crypto.randomUUID(),x:.5,y:.48,width:.25,angle:0,scale:1,rotation:0,design,manual:true});selected=patches.at(-1).id;rebuildNoses();render();faceStatus(`${patches.length} ${patches.length===1?'plaster':'plasters'} · drag to position`);};
$('removePatch').onclick=()=>{patches=patches.filter(p=>p.id!==selected);selected=null;rebuildNoses();render();};
$('redetect').onclick=()=>{notice();detectPhoto();};
$('mixGroup').onclick=async()=>{await Promise.all(patches.map(async p=>{const pool=DESIGNS.filter(d=>canUse(d.id));p.design=pool[Math.floor(Math.random()*pool.length)].id;await ensureDesign(p.design);}));render();toast('Nobody in this group has the same personality.');};
$('rerate').onclick=rate;
$('savePhoto').onclick=async()=>{try{downloadBlob(await photoBlob(),fileName('png'));}catch(e){notice(e.message);}};
$('sharePhoto').onclick=async()=>{try{await shareBlob(await photoBlob(),fileName('png'));}catch(e){notice(e.message);}};
$('saveVideo').onclick=()=>{if(resultBlob)downloadBlob(resultBlob,fileName(resultBlob.type.includes('mp4')?'mp4':'webm'));};
$('shareVideo').onclick=()=>{if(resultBlob)shareBlob(resultBlob,fileName(resultBlob.type.includes('mp4')?'mp4':'webm'));};
// Pointer positions are mapped through the output's letterboxing and selfie mirror.
stage.onpointerdown=e=>{if(live||!photo||working)return;const b=stage.getBoundingClientRect(),x=(e.clientX-b.left)*stage.width/b.width,y=(e.clientY-b.top)*stage.height/b.height,r=rect(),p=[...patches].reverse().find(p=>hitPatch(x,y,p,r,mirrored));if(!p)return;selected=p.id;rebuildNoses();drag={id:p.id,x,y,px:p.x,py:p.y};stage.setPointerCapture(e.pointerId);e.preventDefault();};
stage.onpointermove=e=>{if(!drag)return;const b=stage.getBoundingClientRect(),r=rect(),p=patches.find(p=>p.id===drag.id);if(!p)return;const dx=((e.clientX-b.left)*stage.width/b.width-drag.x)/r.width,dy=((e.clientY-b.top)*stage.height/b.height-drag.y)/r.height;p.x=clamp(drag.px+(mirrored?-dx:dx),0,1);p.y=clamp(drag.py+dy,0,1);render();};
stage.onpointerup=stage.onpointercancel=()=>drag=null;
stage.onkeydown=e=>{if(live||!photo||!selected)return;const p=patches.find(p=>p.id===selected),step=e.shiftKey?.015:.003;if(!p)return;const moves={ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,-step],ArrowDown:[0,step]};if(!moves[e.key])return;e.preventDefault();p.x=clamp(p.x+moves[e.key][0]*(mirrored?-1:1),0,1);p.y=clamp(p.y+moves[e.key][1],0,1);render();};
$('wearReward').onclick=()=>{if(newestReward)selectDesign(newestReward);$('unlockDialog').close();};
$('supportBtn').onclick=()=>$('supportDialog').showModal();
$('copyInterac').onclick=async()=>{try{await navigator.clipboard.writeText('bookclodd@gmail.com');$('copyInterac').textContent='Copied!';}catch{toast('Copy the email shown, then use your banking app.');}};
$('gameHelp').onclick=()=>$('gameDialog').showModal();
for(const id of ['helpBtn','privacyBtn'])$(id).onclick=()=>$('helpDialog').showModal();
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
$('resultDialog').addEventListener('close',()=>$('resultVideo').pause());
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e;});
$('installBtn').onclick=async()=>{if(deferredInstall){await deferredInstall.prompt();deferredInstall=null;}else{$('helpDialog').showModal();$('helpDialog').querySelectorAll('h3')[5]?.scrollIntoView({block:'start'});}};
window.addEventListener('appinstalled',()=>toast('Installed. Your nose has a home screen now.'));
document.addEventListener('visibilitychange',()=>{if(document.hidden&&live){stopLive(true);notice('Camera stopped because you left the tab. Your media stays here. Reopen the camera to continue.');}});
window.addEventListener('pagehide',()=>{stopLive(false);tracker.dispose();});
try{const p=JSON.parse(localStorage.getItem('manlyfy-prefs')||'{}');if(DESIGNS.some(d=>d.id===p.design))design=p.design;if(['original','square','vertical'].includes(p.ratio))$('ratio').value=p.ratio;if(['lite','balanced'].includes(p.quality))$('quality').value=p.quality;if(typeof p.groupLive==='boolean')$('groupToggle').checked=p.groupLive;}catch{}
if(!canUse(design))design='classic';
if(testCamera){const n=document.createElement('p');n.className='notice';n.textContent='VERIFICATION MODE · Simulated camera and audio only. Open the normal app URL for your real camera.';document.querySelector('main').prepend(n);}
buildCollection();ensureDesign(design).then(()=>selectDesign(design,false));updateControls();
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js?v=1.2.1',{updateViaCache:'none'}).catch(()=>{}));
