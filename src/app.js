import {progressAt,unlockPhoto,cleanCount} from './progress.js?v=1.7.0';
import {DESIGNS,CATEGORIES,patchSVG,loadPatchImage} from './designs.js?v=1.7.0';
import {clamp,containRect,outputSize,landmarkToPatch,patchPose,hitPatch,formatTime,cameraError} from './core.js?v=1.7.0';
import {drawBandage} from './render.js?v=1.7.0';
import {FaceTracker} from './tracker.js?v=1.7.0';
import {MotionTracker} from './motion.js?v=1.7.0';
import {CameraClock} from './camera-clock.js?v=1.7.0';
import {decodePhoto,photoSelection} from './photos.js?v=1.7.0';
import {detectPhotoFaces} from './photo-tracker.js?v=1.7.0';
import {startGesture,moveGesture} from './gestures.js?v=1.7.0';
import {fingerprint,ratingFamily,manlinessScore,manlinessJoke} from './manliness.js?v=1.7.0';
import {openVideoFile,seekVideo,originalAudio,suspendOriginalAudio} from './video-import.js?v=1.7.0';
import {playOutro,OUTRO_DURATION} from './video-outro.js?v=1.7.0';
import {startVideoRecorder} from './video-recorder.js?v=1.7.0';
import {masterAccess,leaveMaster} from './access.js?v=1.7.0';
import {associateFaces} from './face-identity.js?v=1.7.0';
import {MAX_FACES,exportSize,videoBitrate,trackingProfile} from './export-quality.js?v=1.7.0';
import {hasFrameExport,exportFilteredVideo,ExportUnavailable} from './video-export.js?v=1.7.0';
import {VideoUI} from './video-ui.js?v=1.7.0';
const $=id=>document.getElementById(id);
const stage=$('stage'),ctx=stage.getContext('2d',{alpha:false}),video=$('sourceVideo');
const tracker=new FaceTracker(),motion=new MotionTracker(),images=new Map(),cameraClock=new CameraClock(video,time=>loop(time));
const inferenceCanvas=document.createElement('canvas'),inferenceContext=inferenceCanvas.getContext('2d');
const videoUI=new VideoUI(document,{onPlayError:()=>notice('Tap the play control on your video to start playback.')});
let preparingVideo=false,lastVideoFile=null,videoOpening=null;
let master=await masterAccess(),designTarget='all',facePickerSignature='',clipAnchors=[],frameExport=null,exportProgress=null;
let faceDesigns=new Map(),faceLabels=new Map(),fallbackTracks=[],fallbackSerial=0;
let importedClip=null,processingClip=false,outroActive=false,outroAdded=false,outroAbort=null,outroLogo=null,logoPromise=null;
let design='classic',category='All patches',mode='photo',photo=null,live=false,stream=null,micStream=null,mirrored=false,facing='user';
let patches=[],selected=null,compare=false,epoch=0,lastInfer=0,lastTracked=0,trackingHold=650,lastDraw=0,working=false;
let recorder=null,recordStream=null,recording=false,chunks=[],recordBytes=0,recordStarted=0,resultBlob=null,resultUrl=null,photoUrl=null;
const testCamera=new URLSearchParams(location.search).get('test-camera')==='1';
let testRaf=0,testAudio=null,micPending=false,micRequest=0,testMetricsAt=0,testFrames=0;
let lastMotion=0,motionReady=false,renderCount=0,flowCount=0,metricStart=0,nextMotion=0,designRequest=0;
const progressKey=testCamera?'manlyfy-test-progress-v1':'manlyfy-progress-v1';
let photoCount=0,photoCredited=false,progressEligible=false,newestReward=null;
let photoQueue=[],queueIndex=-1,rating=null,jokeVariant=0,lastRatingSignature='',ratingHistory=[];
let photoIntent='filter';
try{const saved=JSON.parse(localStorage.getItem('manlyfy-rating-history-v1')||'[]');if(Array.isArray(saved))ratingHistory=saved.slice(-200);}catch{}
try{photoCount=cleanCount(JSON.parse(localStorage.getItem(progressKey)||'{}').photos);}catch{}
const touches=new Map();let drag=null,toastTimer=null,deferredInstall=null,recordTimer=null,recordFailed=false;

function toast(message){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,4200);}
function notice(message=''){$('notice').textContent=message;$('notice').hidden=!message;}
function busy(on,message='Finding your inner MANLY…'){working=on;$('busy').hidden=!on;$('busyText').textContent=message;updateControls();}
function dims(){const source=live?video:photo;return {source,sw:source?.videoWidth||source?.width||1,sh:source?.videoHeight||source?.height||1};}
function rect(){const{sw,sh}=dims();return containRect(sw,sh,stage.width,stage.height);}
function resize(){const{source,sw,sh}=dims();if(!source)return;const size=live?exportSize(sw,sh,$('ratio').value,$('exportQuality').value):outputSize(sw,sh,$('ratio').value,8192);if(recording||frameExport)return;stage.width=size.width;stage.height=size.height;render();}
function resetFaceStyles(){faceDesigns.clear();faceLabels.clear();clipAnchors=[];fallbackTracks=[];designTarget='all';facePickerSignature='';}
function labelFace(id){if(!faceLabels.has(id))faceLabels.set(id,faceLabels.size+1);return faceLabels.get(id);}
function rebuildFacePicker(){
 const active=!stage.hidden&&!!(photo||live)&&patches.length>0;$('faceStyling').hidden=!active;
 const signature=patches.map(p=>p.id+':'+p.design).join('|')+':'+designTarget+':'+recording+':'+!!frameExport+':'+working+':'+!!importedClip+':'+(video.currentTime<.05);if(signature===facePickerSignature)return;facePickerSignature=signature;
 const all=document.createElement('option');all.value='all';all.textContent='Everyone · same design';
 const options=patches.map(p=>{const o=document.createElement('option');o.value=p.id;o.textContent='Face '+labelFace(p.id)+' · '+DESIGNS.find(d=>d.id===p.design)?.name;return o;});
 $('designTarget').replaceChildren(all,...options);
 if(designTarget!=='all'&&!patches.some(p=>p.id===designTarget))designTarget='all';$('designTarget').value=designTarget;$('designTarget').disabled=recording||!!frameExport||working;
 $('faceStyleHint').textContent=designTarget==='all'?'Choose a face to give it its own design. Choose Everyone to change the whole group.':'The carousel changes only Face '+labelFace(designTarget)+'. Its design follows its track.';
 if(importedClip)$('faceStyleHint').textContent='Set individual designs at the start, then they follow their tracks through the clip. Everyone changes the whole group.';
 $('styleFromStart').hidden=!importedClip||video.currentTime<.05;$('styleFromStart').disabled=working||recording||!!frameExport;
 $('mixFaces').disabled=working||recording||!!frameExport||!!importedClip&&video.currentTime>=.05;
}
function inferenceFrame(source,edge){
 const w=source.videoWidth||source.width,h=source.videoHeight||source.height,s=Math.min(1,edge/Math.max(w,h));
 const width=Math.round(w*s),height=Math.round(h*s);if(inferenceCanvas.width!==width||inferenceCanvas.height!==height){inferenceCanvas.width=width;inferenceCanvas.height=height;}
 inferenceContext.drawImage(source,0,0,width,height);return inferenceCanvas;
}
function faceCount(){return importedClip?MAX_FACES:$('groupToggle').checked?MAX_FACES:1;}
function render(){
  if(outroActive)return;
  const now=performance.now();
  const{source,sw,sh}=dims();if(!source||live&&video.readyState<2)return;
  const r=containRect(sw,sh,stage.width,stage.height);ctx.fillStyle='#15151e';ctx.fillRect(0,0,stage.width,stage.height);
  ctx.save();if(mirrored){ctx.translate(r.x*2+r.width,0);ctx.scale(-1,1);}ctx.drawImage(source,r.x,r.y,r.width,r.height);ctx.restore();
  renderSelection();renderFaceMarkers();rebuildFacePicker();if(!live)updateManliness();if(compare&&!recording)return;
  if(live&&!(importedClip&&video.paused)&&now-lastTracked>trackingHold)return;
  for(const p of patches){const img=images.get(p.design||design);if(img)drawBandage(ctx,img,patchPose(p, r,mirrored),live);}
}
function showMedia(){stage.hidden=false;$('welcome').hidden=true;$('viewfinder').classList.add('has-media');$('faceStatus').hidden=false;}
function faceStatus(text,lost=false){if($('faceStatusText').textContent!==text)$('faceStatusText').textContent=text;$('faceStatus').classList.toggle('lost',lost);}
function rate(){
 if(!photo){rating=null;return;}const c=document.createElement('canvas');c.width=32;c.height=32;const cx=c.getContext('2d',{willReadFrequently:true});cx.drawImage(photo,0,0,32,32);const mark={...fingerprint(cx.getImageData(0,0,32,32).data),aspect:Math.round(photo.width/photo.height*100)/100};
 const family=ratingFamily(mark,ratingHistory);ratingHistory=family.history;rating=family.entry;jokeVariant=0;lastRatingSignature='';
 try{localStorage.setItem('manlyfy-rating-history-v1',JSON.stringify(ratingHistory));}catch{}updateManliness();
}
function updateManliness(){
 const active=!!photo&&!live&&!!rating;$('manlinessResults').hidden=!active;$('manlinessWelcome').hidden=active;$('rankAddPatch').disabled=!active||working;
 if(!active)return;const physical=$('realBandage').checked?1:0,before=manlinessScore(rating.seed,physical),after=manlinessScore(rating.seed,physical+patches.length),shown=compare?before:after,signature=[rating.seed,physical,patches.length,compare,jokeVariant].join(':');
 if(signature===lastRatingSignature)return;lastRatingSignature=signature;
 $('beforeManliness').textContent=before+'%';$('afterManliness').textContent=after+'%';$('manlinessBoost').textContent=after>before?'+'+(after-before)+'% tiny-patch authority':physical?'Already plaster-powered.':'Add a plaster to unlock the MANLY bonus.';
 $('ratingText').textContent=manlinessJoke(shown,rating.seed,jokeVariant);$('rankJoke').textContent=manlinessJoke(after,rating.seed,jokeVariant);$('rankAddPatch').textContent=patches.length?'View your MANLY upgrade ↑':'Add a plaster · boost my score';
}
function newPunchline(){if(!rating)return;jokeVariant++;updateManliness();}
function updateControls(){
  const exporting=recording||!!frameExport||preparingVideo,resultReady=mode==='video'&&!!resultBlob&&!exporting;
  $('photoMode').classList.toggle('active',mode==='photo');$('photoMode').setAttribute('aria-pressed',String(mode==='photo'));
  $('videoMode').classList.toggle('active',mode==='video');$('videoMode').setAttribute('aria-pressed',String(mode==='video'));
  $('audioOption').hidden=mode!=='video'||!!importedClip;$('clipControls').hidden=!importedClip;$('previewHead').hidden=!live;$('recordingBadge').hidden=!recording;
  $('flipBtn').disabled=!live||working||recording||!!importedClip;$('compareBtn').disabled=(!photo&&!live)||recording||working;
  $('editor').hidden=!photo||live||mode==='video';$('shutter').classList.toggle('video',mode==='video');$('shutter').classList.toggle('recording',recording);
  $('shutter').disabled=!!frameExport||outroActive||working||micPending||(!recording&&live&&mode==='video'&&!tracker.ready);
  $('shutter').setAttribute('aria-label',recording?(processingClip?'Stop processing and save':'Stop recording'):!live?'Open camera':mode==='video'?(importedClip?'Apply filter to video':'Start recording'):'Take photo');
  $('shutterHint').textContent=recording?'TAP TO STOP & SAVE':!live?'TAP TO GET MANLY':mode==='video'?(importedClip?'TAP TO FILTER CLIP':'TAP TO RECORD'):'TAP TO SNAP';
  $('uploadBtn').setAttribute('aria-label',mode==='video'?'Upload video':'Upload photos');$('welcomeUpload').textContent=mode==='video'?'or choose a video ↗':'or choose photos ↗';
  $('stopCamera').textContent=importedClip?'Close clip':'Camera off';$('liveBadge').innerHTML='<i></i>'+(importedClip?'IMPORTED CLIP':'LIVE');
  for(const id of ['clipSeek','keepClipAudio'])$(id).disabled=working||exporting;
  $('videoOptions').hidden=mode!=='video';$('includeOutro').disabled=working||exporting||!!importedClip&&!master;
  $('editVideo').hidden=!lastVideoFile;
  $('exportQuality').disabled=working||exporting;$('exportMethod').disabled=working||exporting;
  $('clipExportBar').hidden=!importedClip||exporting;
  $('createVideo').disabled=working||!tracker.ready;
  $('cancelExport').hidden=!exporting;
  if(recording)updateVideoProgress();
  for(const id of ['photoMode','videoMode','ratio','groupToggle','quality','uploadBtn','roulette','demoBtn'])$(id).disabled=exporting||working;
  $('audioToggle').disabled=exporting||working||micPending;
  for(const id of ['savePhoto','quickSavePhoto','sharePhoto'])$(id).disabled=working||!photo;
  $('photoSaveBar').hidden=!photo||live||mode!=='photo';$('cancelDetection').hidden=!working||!photo||live;
  $('photoPrev').disabled=working||queueIndex<=0;$('photoNext').disabled=working||queueIndex>=photoQueue.length-1;
  $('chooseMorePhotos').disabled=working||exporting;
  for(const id of ['galleryPhotos','choosePhotoFiles','rankChoosePhoto','rankChooseFile'])$(id).disabled=working||exporting;
  $('photoImportBar').hidden=mode==='video';
  $('stopCamera').disabled=working||outroActive||!!frameExport;
  document.querySelectorAll('.patch-card,.quick-patch,.category').forEach(b=>b.disabled=exporting||working||resultReady);
  if(resultReady)$('roulette').disabled=true;
  for(const id of ['redetect','addPatch','mixGroup'])$(id).disabled=working||recording||!photo;
  $('noseSelect').disabled=working||!patches.length;
  for(const id of ['removePatch','size','rotation'])$(id).disabled=working||!selected;renderSelection();renderFaceMarkers();updateManliness();rebuildFacePicker();
  const ready=videoUI.sync({mode,exporting,sourceReady:!!photo||live&&video.readyState>=2,imported:!!importedClip,paused:video.paused,working});
  if(ready){$('faceStyling').hidden=true;$('photoSaveBar').hidden=true;}
}
function rebuildNoses(){
  const select=$('noseSelect');select.replaceChildren(...patches.map((p,i)=>{const o=document.createElement('option');o.value=p.id;o.textContent=`Nose ${i+1}${p.manual?' · manual':''}`;return o;}));
  if(!patches.some(p=>p.id===selected))selected=patches[0]?.id||null;
  if(selected)select.value=selected;select.disabled=!patches.length;
  $('removePatch').disabled=!selected;$('size').disabled=!selected;$('rotation').disabled=!selected;
  syncSliders();
}
function syncSliders(){const p=patches.find(p=>p.id===selected);$('size').value=Math.round((p?.scale||1)*100);$('rotation').value=Math.round((p?.rotation||0)*180/Math.PI);$('sizeValue').textContent=$('size').value+'%';$('rotationValue').textContent=$('rotation').value+'°';renderSelection();}
async function ensureDesign(id){if(!images.has(id))images.set(id,await loadPatchImage(id));}
function canUse(id){const index=DESIGNS.findIndex(d=>d.id===id);return index>=0&&(master||index<progressAt(photoCount,DESIGNS.length).unlocked);}
async function selectDesign(id,announce=true){
 if(recording||frameExport||preparingVideo||mode==='video'&&resultBlob)return;if(!canUse(id)){const at=unlockPhoto(DESIGNS.findIndex(d=>d.id===id));toast(`Unlocks at ${at} photos. ${Math.max(0,at-photoCount)} more to go. Your nose believes in you.`);return;}
 if(importedClip&&designTarget!=='all'&&video.currentTime>=.05){notice('For individual video designs, tap Style from start, choose a numbered face, then choose its plaster. Everyone can be changed from any preview position.');return;}
 const request=++designRequest,target=designTarget;await ensureDesign(id);if(request!==designRequest)return;
 if(target==='all'){design=id;faceDesigns.clear();patches=patches.map(p=>({...p,design:id}));}
 else{faceDesigns.set(target,id);patches=patches.map(p=>p.id===target?{...p,design:id}:p);}
 reflectDesign(id);savePref();render();stashPhoto();if(announce)toast(DESIGNS.find(x=>x.id===id).name+' · '+(target==='all'?'everyone':'Face '+labelFace(target))+'.');
}
function reflectDesign(id=faceDesigns.get(designTarget)||design){const d=DESIGNS.find(x=>x.id===id);$('selectedName').textContent=d.name;$('quickName').textContent=d.name;document.querySelectorAll('.patch-card,.quick-patch').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.id===id)));}

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
 const state=progressAt(photoCount,DESIGNS.length);if(master){state.unlocked=DESIGNS.length;state.next=null;state.fraction=1;}$('collectionCount').textContent=`${state.unlocked}/${DESIGNS.length}`;
 $('photoTotal').textContent=photoCount.toLocaleString();$('unlockedTotal').textContent=state.unlocked;
 $('rewardProgress').value=state.fraction*100;
 $('rewardProgress').setAttribute('aria-label',state.next?`Progress to ${state.next.photos} photos`:'Collection complete');
 $('nextReward').textContent=state.next?`${state.next.photos-photoCount} more ${state.next.photos-photoCount===1?'photo':'photos'} → ${state.next.amount===1?DESIGNS[state.unlocked].name:state.next.amount+' new patches'}`:'Full collection unlocked. Legendary nose behaviour.';
 $('nextMilestone').textContent=master?'CREATOR ACCESS · EVERYTHING UNLOCKED':state.next?`NEXT: ${state.next.photos} PHOTOS`:'COLLECTION COMPLETE';
 $('masterBanner').hidden=!master;
}
function creditPhoto(){
 if(photoCredited||!progressEligible)return;photoCredited=true;if(photoQueue[queueIndex])photoQueue[queueIndex].credited=true;
 const before=progressAt(photoCount,DESIGNS.length);photoCount++;const after=progressAt(photoCount,DESIGNS.length);
 try{localStorage.setItem(progressKey,JSON.stringify({version:1,photos:photoCount}));}catch{toast('Progress works for this visit. Browser storage is unavailable, so it cannot be saved.');}
 buildCollection();
 if(master){toast('Creator photo saved. All 75 designs are ready.');return;}
 if(after.unlocked>before.unlocked){
  const earned=DESIGNS.slice(before.unlocked,after.unlocked);newestReward=earned[0].id;
  $('unlockTitle').textContent=earned.length===1?'Fresh patch. Fresh power.':`${earned.length} new patches. Big nose energy.`;
  $('unlockMessage').textContent=`${photoCount} photos. You earned this. Every design is free.`;
  $('unlockArt').replaceChildren(...earned.map(d=>{const item=document.createElement('div');item.innerHTML=`<img alt="" src="data:image/svg+xml,${encodeURIComponent(patchSVG(d))}">`+`<strong>${d.name}</strong><small>${d.tier}</small>`;return item;}));
  $('rewardDetails').hidden=false;$('rewardDetails').textContent=earned.length===1?'New: '+earned[0].name+' ↗':earned.length+' new patches ↗';toast('Unlocked! '+earned.map(d=>d.name).join(', ')+'.');
 }else toast(`Photo ${photoCount}. ${after.next?after.next.photos-photoCount+' to your next unlock.':'Legendary status maintained.'}`);
}
function savePref(){try{localStorage.setItem('manlyfy-prefs',JSON.stringify({version:'1.7.0',design,ratio:$('ratio').value,quality:$('quality').value,exportQuality:$('exportQuality').value,groupLive:$('groupToggle').checked,videoEnding:$('includeOutro').checked}));}catch{}}
async function waitIdle(){await tracker.whenIdle();}
async function detectPhoto(token=epoch){
  if(!photo)return;busy(true,'Finding every magnificent nose…');
  try{await waitIdle();if(token!==epoch)return;const found=await detectPhotoFaces(tracker,photo,{onProgress:text=>$('busyText').textContent=text,cancelled:()=>token!==epoch});if(token!==epoch)return;
    patches=(found||[]).map((lm,i)=>landmarkToPatch(lm,photo.width,photo.height,'nose-'+i)).filter(Boolean).map(p=>({...p,design}));
    faceStatus(patches.length?`${patches.length} ${patches.length===1?'nose':'noses'} MANLYFIED`:'No face found · add a plaster manually',!patches.length);
    if(!patches.length)notice('No face found after a closer scan. A covered or strongly sideways face may still be missed. Crop closer to the face, or use Add plaster and drag it into place.');
  }catch(e){if(token!==epoch)return;notice('Automatic tracking could not load. You can still add, drag, resize and rotate plasters manually. Reconnect and tap “Auto-detect again” to retry.');faceStatus('Manual mode · your nose, your rules',true);console.warn('Face tracking unavailable:',e.message);}
  finally{if(token===epoch){rebuildNoses();render();busy(false);stashPhoto();}}
}
function stashPhoto(){
 const item=photoQueue[queueIndex];if(!item||!photo||live)return;
 item.patches=patches.map(p=>({...p}));item.selected=selected;item.credited=photoCredited;item.design=design;item.realBandage=$('realBandage').checked;
}
function updatePhotoQueue(){
 $('photoQueue').hidden=!photoQueue.length;
 const item=photoQueue[queueIndex];$('photoFileLabel').textContent=item?`${queueIndex+1} / ${photoQueue.length} · ${item.file.name}`:'';
 $('photoQueueHint').textContent=(item?.importNote?item.importNote+' · ':'')+'Up to 8 faces per photo · edits stay on this device';updateControls();
}
function clearPhotoQueue(){photoQueue=[];queueIndex=-1;updatePhotoQueue();}
async function loadQueuedPhoto(index){
 if(recording||working||!photoQueue[index])return;
 stashPhoto();stopLive(false);resetFaceStyles();const token=++epoch,item=photoQueue[index];queueIndex=index;photo=null;patches=[];selected=null;compare=false;mirrored=false;mode='photo';
 $('compareBtn').setAttribute('aria-pressed','false');notice();busy(true,'Opening '+item.file.name+'…');updatePhotoQueue();if(!item.rankOnly)$('viewfinder').scrollIntoView({block:'center',behavior:'smooth'});
 try{
  const c=await decodePhoto(item.file,{onProgress:text=>$('busyText').textContent=text});if(token!==epoch)return;photo=c;item.importNote=c.dataset.importNote||'';progressEligible=item.eligible;photoCredited=item.credited;$('realBandage').checked=!!item.realBandage;showMedia();rate();resize();updatePhotoQueue();
  if(item.patches){
   patches=item.patches.map(p=>({...p}));selected=item.selected;for(const p of patches)faceDesigns.set(p.id,p.design);await Promise.all(patches.map(p=>ensureDesign(p.design)));
   design=item.design||design;reflectDesign();rebuildNoses();render();busy(false);faceStatus(`${patches.length} ${patches.length===1?'nose':'noses'} · edits restored`);
  }else if(item.rankOnly){rebuildNoses();render();busy(false);faceStatus('Photo ready · no face required to rank');stashPhoto();}
  else await detectPhoto(token);
  if(item.rankOnly)$('manlinessLab').scrollIntoView({block:'start',behavior:'smooth'});
  if(item.demo)notice('Demo: NASA astronaut Eileen Collins, public-domain photograph. Your own uploads stay on your device.');
 }catch(e){
  if(token!==epoch)return;photo=null;patches=[];stage.hidden=true;$('welcome').hidden=false;$('viewfinder').classList.remove('has-media');notice(item.file.name+': '+e.message);toast(e.message);busy(false);faceStatus('Photo could not open · choose another',true);
 }
}
async function openPhotos(files,isDemo=false,rankOnly=false){
 if(recording||working)return;const choice=photoSelection(files);if(!choice.selected.length){notice(choice.message||'Choose at least one photo.');toast(choice.message||'Choose a photo.');return;}
 photoQueue=choice.selected.map(file=>({file,patches:null,credited:false,eligible:!isDemo,demo:isDemo,rankOnly}));queueIndex=-1;await loadQueuedPhoto(0);if(choice.message){notice(choice.message);toast(choice.message);}
}
async function openPhoto(file,isDemo=false){await openPhotos([file],isDemo);}
$('cancelDetection').onclick=()=>{epoch++;busy(false);rebuildNoses();render();faceStatus('Search stopped · add a plaster manually',true);stashPhoto();};

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
function sourcePhoto(source){const w=source.videoWidth||source.width,h=source.videoHeight||source.height;if(!w||!h)return null;const c=document.createElement('canvas'),s=Math.min(1,8192/Math.max(w,h),Math.sqrt(32_000_000/(w*h)));c.width=Math.round(w*s);c.height=Math.round(h*s);c.getContext('2d').drawImage(source,0,0,c.width,c.height);return c;}
function frozenSource(){return video.readyState>=2?sourcePhoto(video):null;}
function stopLive(preserve=true){
  videoOpening?.abort();videoOpening=null;preparingVideo=false;
  if(recording)stopRecording({immediate:true});if(live&&preserve){photo=frozenSource()||photo;progressEligible=false;photoCredited=false;}
  live=false;touches.clear();drag=null;motion.reset();motionReady=false;epoch++;clearTimeout(testRaf);testRaf=0;cameraClock.stop();stream?.getTracks().forEach(t=>t.stop());stream=null;stopMic();video.pause();video.srcObject=null;if(importedClip){URL.revokeObjectURL(importedClip.url);importedClip=null;video.removeAttribute('src');video.load();suspendOriginalAudio(video);}video.muted=true;video.autoplay=true;processingClip=false;
  if(photo){if(!rating)rate();showMedia();resize();rebuildNoses();render();faceStatus('Camera off · media stays on your device');}else{stage.hidden=true;$('welcome').hidden=false;$('viewfinder').classList.remove('has-media');$('faceStatus').hidden=true;}
  updateControls();
}
async function testCameraStream(){
  const image=new Image();image.src='assets/demo-astronaut.png';await image.decode();
  const c=document.createElement('canvas');c.width=720;c.height=960;const cx=c.getContext('2d');
  const start=performance.now();
  const tick=now=>{cx.fillStyle='#292638';cx.fillRect(0,0,720,960);cx.save();cx.translate(360+Math.sin((now-start)/1300)*35,475);cx.rotate(Math.sin((now-start)/950)*.10);cx.drawImage(image,-335,-335,670,670);cx.restore();testRaf=setTimeout(()=>tick(performance.now()),1000/30);};
  tick(start);return c.captureStream(30);
}
async function testMicrophone(){
  testAudio=new AudioContext();await testAudio.resume();const oscillator=testAudio.createOscillator(),gain=testAudio.createGain(),dest=testAudio.createMediaStreamDestination();
  oscillator.frequency.value=440;gain.gain.value=.12;oscillator.connect(gain);gain.connect(dest);oscillator.start();return dest.stream;
}
async function startCamera(nextFacing=facing){
  if(recording||working)return;
  preparingVideo=false;
  if((!navigator.mediaDevices?.getUserMedia&&!testCamera)||!window.isSecureContext){notice('Camera access needs a supported HTTPS browser. Upload a photo to use the editor.');return;}
  clearPhotoQueue();stopLive(false);clearVideoResult();lastVideoFile=null;resetFaceStyles();photo=null;rating=null;patches=[];selected=null;facing=nextFacing;mirrored=facing==='user';compare=false;$('compareBtn').setAttribute('aria-pressed','false');notice();busy(true,'Opening your MANLY camera…');const token=++epoch;
  try{
    const profile=trackingProfile($('quality').value,$('groupToggle').checked);
    stream=testCamera?await testCameraStream():await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:facing},width:{ideal:$('quality').value==='lite'?640:1920},height:{ideal:$('quality').value==='lite'?480:1080},frameRate:{ideal:profile.fps,max:60}},audio:false});
    if(token!==epoch){stream.getTracks().forEach(t=>t.stop());return;}
    video.srcObject=stream;await video.play();
    if(!video.videoWidth)await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('Camera did not return an image.')),10000);video.addEventListener('loadedmetadata',()=>{clearTimeout(timeout);resolve();},{once:true});});
    if(token!==epoch)return;if(testCamera)notice('TEST CAMERA: animated public-domain photo. Optional mic uses a synthetic tone. This does not test physical camera or microphone hardware.');live=true;lastInfer=0;lastTracked=0;lastMotion=0;nextMotion=0;testFrames=0;renderCount=0;flowCount=0;metricStart=performance.now();motion.reset();motion.maxEdge=profile.flowEdge;motionReady=false;tracker.resetVideo();showMedia();resize();faceStatus('Loading face tracker…');busy(false);cameraClock.start();
    if(mode==='video'&&$('audioToggle').checked)enableMic();
    try{await Promise.all([tracker.init(),motion.init().then(()=>{if(token===epoch)motionReady=true;}).catch(e=>console.warn(e.message))]);if(token===epoch)faceStatus('Face forward. Let’s find that nose.');}
    catch(e){if(token===epoch){notice('Live face tracking could not load. Take a photo and add a plaster manually, or reconnect and try again.');faceStatus('Tracking unavailable · photo editor still available',true);}}
    updateControls();
    stream?.getVideoTracks()[0]?.addEventListener('ended',()=>{if(live){stopLive();notice('The camera disconnected. Your last frame is kept in the editor.');}});
  }catch(e){if(token===epoch){stream?.getTracks().forEach(t=>t.stop());stream=null;live=false;busy(false);stopLive(false);notice(cameraError(e));}}
}
async function importVideo(file,{autoProcess=true,preserveStyles=false}={}){
 if(recording||working||frameExport)return;clearPhotoQueue();stopLive(false);if(!preserveStyles)resetFaceStyles();photo=null;rating=null;patches=[];selected=null;mode='video';mirrored=false;clearVideoResult();lastVideoFile=file;preparingVideo=true;videoUI.begin();notice();busy(true,'Opening your video…');const token=++epoch;
 try{
  const opening=new AbortController();videoOpening=opening;const clip=await openVideoFile(video,file,{signal:opening.signal});if(videoOpening===opening)videoOpening=null;if(token!==epoch){URL.revokeObjectURL(clip.url);return;}importedClip={...clip,file};if(!master)$('includeOutro').checked=true;live=true;motion.reset();motionReady=false;motion.maxEdge=trackingProfile($('quality').value,true).flowEdge;lastInfer=0;lastMotion=0;nextMotion=0;lastTracked=0;testFrames=0;flowCount=0;renderCount=0;metricStart=performance.now();tracker.resetVideo();showMedia();resize();$('clipName').textContent=clip.name;$('clipSeek').max=clip.duration;$('clipSeek').value=0;$('clipDuration').textContent='00:00 / '+formatTime(clip.duration*1000);
  busy(true,'Finding your faces…');await Promise.all([tracker.init(),motion.init()]);await tracker.whenIdle();if(token!==epoch)return;motionReady=true;await prepareClipFrame(token);if(token!==epoch)return;preparingVideo=false;busy(false);
  $('viewfinder').scrollIntoView({block:'start',behavior:'smooth'});
  if(autoProcess)await processImportedClip();else notice('Choose each face’s design, then tap Process video & get download directly below the preview.');
 }catch(e){if(token!==epoch)return;preparingVideo=false;live=false;busy(false);stopLive(false);notice(e.message);toast(e.message);}
}
async function prepareClipFrame(token){
 motion.reset({anchors:video.currentTime<.05?clipAnchors:[]});tracker.resetVideo();motion.capture(video,performance.now());const found=await tracker.detect(inferenceFrame(video,1280),'IMAGE',MAX_FACES,1280);if(token!==epoch)return;
 motion.seed(found||[],motion.current.id);motion.resumePaused(performance.now());updateLivePatches(motion.landmarks(),performance.now());trackingHold=1000;lastInfer=performance.now();render();
 if(video.currentTime<.05)clipAnchors=motion.faces.map(f=>({...f}));
}
async function processImportedClip(){
 if(!importedClip||recording||working||frameExport)return;preparingVideo=true;videoUI.begin('Preparing your filtered video…');busy(true,'Preparing your filtered video…');const token=epoch;
 try{
  if($('exportMethod').value==='precise'&&hasFrameExport()){
   try{await processFrameExport(token);return;}catch(e){if(!(e instanceof ExportUnavailable))throw e;notice(e.message+' Using compatibility export; keep the tab open.');}
  }else if($('exportMethod').value==='precise')notice('This browser uses compatibility export. Precise frame-by-frame export needs WebCodecs support.');
  preparingVideo=true;busy(true,'Preparing compatible video export…');
  if($('keepClipAudio').checked){const tracks=await originalAudio(video);tracks.forEach(t=>t.stop());}if(token!==epoch)return;
  cameraClock.stop();video.pause();await tracker.whenIdle();if(token!==epoch)return;await seekVideo(video,0);if(token!==epoch)return;await prepareClipFrame(token);if(token!==epoch)return;processingClip=true;busy(false);await startRecording();
 }catch(e){if(token!==epoch)return;processingClip=false;preparingVideo=false;busy(false);if(e.needsGesture)$('exportMethod').value='realtime';notice(e.name==='AbortError'?'Export cancelled. Your source clip and face designs are still here.':e.message);toast(e.name==='AbortError'?'Export cancelled.':e.message);}
}
async function processFrameExport(token){
 const clip=importedClip,controller=new AbortController(),styles=new Map(faceDesigns),defaultDesign=design;
 cameraClock.stop();video.pause();await tracker.whenIdle();if(token!==epoch)return;
 const ending=!master||$('includeOutro').checked;
 if(ending)await ensureOutroLogo();await Promise.all([...new Set([defaultDesign,...styles.values()])].map(ensureDesign));if(token!==epoch)return;
 const exportMotion=new MotionTracker({maxEdge:640});await exportMotion.init();if(token!==epoch)return;exportMotion.reset({anchors:clipAnchors});exportMotion.trackSerial=Math.max(0,...clipAnchors.map(f=>Number(f.trackId)||0));let lastSource;
 frameExport=controller;processingClip=true;exportProgress=null;busy(false);
 try{
  const result=await exportFilteredVideo(clip.file,{ratio:$('ratio').value,quality:$('exportQuality').value,audio:$('keepClipAudio').checked,ending,logo:outroLogo,signal:controller.signal,
   paint:async(source,target,timestamp)=>{
    if(controller.signal.aborted)return;lastSource=source;
    exportMotion.capture(source,timestamp*1000);
    const found=await tracker.detect(source,'IMAGE',MAX_FACES,1280,{rotationSearch:false,inputSize:608});
    exportMotion.seed(found||[],exportMotion.current.id,{stabilize:true,bridgeMs:120});const active=exportMotion.faces;
    const r=containRect(source.width,source.height,target.width,target.height),cx=target.getContext('2d',{alpha:false});
    cx.fillStyle='#15151e';cx.fillRect(0,0,target.width,target.height);cx.drawImage(source,r.x,r.y,r.width,r.height);
    patches=active.map(f=>landmarkToPatch(f.points,source.width,source.height,'face-'+f.trackId)).filter(Boolean).map(p=>({...p,design:styles.get(p.id)||defaultDesign}));
    for(const p of patches)drawBandage(cx,images.get(p.design),patchPose(p,r,false),false);
    const s=Math.min(1,1280/Math.max(target.width,target.height)),w=Math.round(target.width*s),h=Math.round(target.height*s);
    if(stage.width!==w||stage.height!==h){stage.width=w;stage.height=h;}ctx.drawImage(target,0,0,w,h);
    faceStatus(`${patches.length} ${patches.length===1?'face':'faces'} · checking every source frame`,!patches.length);
   },
   onProgress:p=>{
    exportProgress=p;videoUI.progress(p);
    $('timer').textContent=formatTime(p.time*1000);
   }
  });
  if(token!==epoch)return;frameExport=null;processingClip=false;
  const info=`${result.width} × ${result.height} · ${result.codec==='avc'?'MP4 / H.264':result.blob.type.includes('mp4')?'MP4':'WebM'} · ${result.frames} source frames · ${result.audio?'original audio':'silent'}${result.ending?' · 3s MANLYFY ending':''} · ${(result.blob.size/1048576).toFixed(1)} MB`;
  finishVideo(result.blob,info,lastSource?sourcePhoto(lastSource):null);notice(result.downgraded?'Your filtered video is ready at the highest supported encoder size available on this browser. Download it below.':'Your filtered video is ready. Every source frame was processed. Download it below.');
 }finally{exportMotion.reset();const current=frameExport===controller;if(current)frameExport=null;if(current||token===epoch){processingClip=false;preparingVideo=false;busy(false);updateControls();}}
}
function finishVideo(blob,info,snapshot=null,partial=false){
 if(resultUrl)URL.revokeObjectURL(resultUrl);resultBlob=blob;resultUrl=URL.createObjectURL(blob);
 const name=fileName(blob.type.includes('mp4')?'mp4':'webm');preparingVideo=false;
 if(snapshot){photo=snapshot;progressEligible=false;photoCredited=false;}stopLive(!snapshot);
 let poster='';try{poster=stage.toDataURL('image/jpeg',.85);}catch{}
 videoUI.ready({url:resultUrl,name,info,poster,partial});busy(false);toast('Your video is ready. Tap it to play or DOWNLOAD VIDEO underneath.');$('viewfinder').scrollIntoView({block:'start',behavior:'smooth'});
}
function updateLivePatches(landmarks,time){
  let tracked=landmarks;
  if(landmarks.some(lm=>!lm.trackId)){fallbackTracks=associateFaces(fallbackTracks,landmarks,time,()=>++fallbackSerial);tracked=fallbackTracks.map(f=>Object.assign(f.points,{trackId:'fallback-'+f.trackId}));}
  patches=tracked.map(lm=>landmarkToPatch(lm,video.videoWidth,video.videoHeight,'face-'+lm.trackId)).filter(Boolean).map(p=>({...p,design:faceDesigns.get(p.id)||design,seen:time}));
  if(patches.length)lastTracked=time;
  faceStatus(patches.length?`${patches.length} ${patches.length===1?'nose':'noses'} tracked · choose designs below`:'Looking for faces…',!patches.length);
  rebuildFacePicker();
}
function loop(time){
  if(!live||outroActive)return;
  const profile=trackingProfile($('quality').value,faceCount()>1),flowInterval=1000/profile.fps;
  if(motionReady&&($('quality').value!=='lite'||time>=nextMotion)&&motion.tick(video,time)){
    nextMotion=nextMotion?nextMotion+flowInterval:time+flowInterval;if(nextMotion<time-flowInterval)nextMotion=time+flowInterval;lastMotion=time;updateLivePatches(motion.landmarks(),time);if(motion.hasFaces)flowCount++;
  }
  render();lastDraw=time;renderCount++;
  const interval=tracker.backend.includes('CPU')?profile.cpuInterval:profile.interval;
  if(tracker.ready&&!tracker.busy&&video.readyState>=2&&(!motion.hasFaces||time-lastInfer>interval)){
    if(motionReady&&time-lastMotion>10&&motion.tick(video,time)){lastMotion=time;updateLivePatches(motion.landmarks(),time);}
    lastInfer=time;const token=epoch,frameId=motion.current?.id;
    // The flow canvas is exactly the frame in its history. Replay from this anchor
    // when the worker finishes, so a slow scan never pulls the nose into the past.
    const source=inferenceFrame(video,profile.scanEdge);
    tracker.detect(source,'VIDEO',faceCount(),profile.scanEdge).then(found=>{
      if(!live||outroActive||token!==epoch||found===null)return;testFrames++;
      if(motionReady){motion.seed(found,frameId,{stabilize:true,bridgeMs:100});updateLivePatches(motion.landmarks(),performance.now());}
      else updateLivePatches(found,performance.now());
      trackingHold=motionReady?350:1000;render();
    }).catch(e=>{if(token!==epoch)return;patches=[];faceStatus('Tracking paused · try a photo or Lite mode',true);notice('Tracking paused. Turn the camera off and reopen it, or use a photo.');tracker.dispose();updateControls();});
  }
  if(testCamera&&time-testMetricsAt>1000){
    testMetricsAt=time;const seconds=(time-metricStart)/1000;
    $('notice').textContent=`TEST CAMERA · ${tracker.backend} · ${patches.length} patches · ${testFrames} model scans · ${(flowCount/seconds).toFixed(1)} tracked motion fps · ${(renderCount/seconds).toFixed(1)} preview fps · ${motion.cost.toFixed(1)} ms motion · ${motionReady?'flow on':'flow unavailable'} · synthetic media only`;
  }
  if(importedClip){$('clipSeek').value=video.currentTime;$('clipDuration').textContent=formatTime(video.currentTime*1000)+' / '+formatTime(importedClip.duration*1000);}
  if(recording){updateVideoProgress();const elapsed=performance.now()-recordStarted;$('timer').textContent=formatTime(elapsed);if(elapsed>=180000){toast('Three glorious minutes. Saving your clip.');stopRecording();}}
}

async function takePhoto(){
  if(!live){startCamera();return;}const snapshot=frozenSource();if(!snapshot)return;photo=snapshot;stopLive(false);photo=snapshot;progressEligible=true;photoCredited=false;mode='photo';$('realBandage').checked=false;rate();showMedia();resize();rebuildNoses();updateControls();$('flash').classList.remove('pop');void $('flash').offsetWidth;$('flash').classList.add('pop');await detectPhoto(epoch);creditPhoto();
}
async function ensureOutroLogo(){
 if(outroLogo)return outroLogo;
 if(!logoPromise){const img=new Image();img.src='assets/icons/manlyfy-star-plane-star.svg?v=1.7.0';logoPromise=img.decode().then(()=>outroLogo=img).catch(error=>{logoPromise=null;throw error;});}return logoPromise;
}
function clearVideoResult(){
 videoUI.clear();
 if(resultUrl)URL.revokeObjectURL(resultUrl);resultUrl=null;resultBlob=null;
}
function updateVideoProgress(endingElapsed=0){
 const ending=$('includeOutro').checked?OUTRO_DURATION:0,total=(importedClip?.duration||0)*1000+ending;
 if(importedClip)videoUI.progress({phase:outroActive?'ending':'frames',time:(outroActive?importedClip.duration*1000+endingElapsed:video.currentTime*1000)/1000,total:total/1000});
 else{$('videoProgressText').textContent=outroActive?'Adding your MANLYFY ending…':'Recording your video…';$('videoProgressTime').textContent=formatTime(performance.now()-recordStarted);}
}
async function startRecording(){
 if(!live){startCamera();return;}
 if(recording||outroActive)return;
 if(!tracker.ready){preparingVideo=false;busy(false);notice('Wait for the face tracker to load before recording.');return;}
 if(!window.MediaRecorder||!stage.captureStream){preparingVideo=false;busy(false);notice('Video export is unavailable in this browser. Open this page directly in current Chrome or Safari and try again.');return;}
 const token=epoch;let capture,audio=[];preparingVideo=true;if(!importedClip)videoUI.begin('Starting your recording…');busy(true,'Starting your video export…');compare=false;$('compareBtn').setAttribute('aria-pressed','false');render();chunks=[];recordBytes=0;recordFailed=false;outroAdded=false;
 try{
  if($('includeOutro').checked)await ensureOutroLogo();
  if(token!==epoch||!live)return;
  const fps=importedClip?60:(stream?.getVideoTracks()[0]?.getSettings?.().frameRate||30);capture=stage.captureStream(Math.min(60,fps));if(importedClip&&$('keepClipAudio').checked)audio=await originalAudio(video);else if(!importedClip&&$('audioToggle').checked)audio=micStream?.getAudioTracks().filter(t=>t.readyState==='live').map(t=>t.clone())||[];
  if(token!==epoch||!live){capture.getTracks().forEach(t=>t.stop());audio.forEach(t=>t.stop());return;}
  recordStream=new MediaStream([...capture.getVideoTracks(),...audio]);
  const activeRecorder=startVideoRecorder(recordStream,{audio:!!audio.length,videoBitsPerSecond:videoBitrate(stage.width,stage.height,fps)});recorder=activeRecorder;
  recorder.ondataavailable=e=>{if(e.data.size){chunks.push(e.data);recordBytes+=e.data.size;if(recordBytes>384*1024*1024){recordFailed=true;notice('Memory limit reached. This download contains only the processed portion; choose 1080p or a shorter clip for the full video.');stopRecording({immediate:true});}}};
  recorder.onerror=()=>{recordFailed=true;notice('The browser interrupted export. Any available clip will be kept below. Try a shorter clip or Lite mode.');stopRecording({immediate:true});};
  recorder.onstop=()=>{
   const mimeType=activeRecorder.mimeType||'video/webm',elapsed=performance.now()-recordStarted;outroAbort?.abort();outroAbort=null;outroActive=false;recording=false;clearInterval(recordTimer);recordStream?.getTracks().forEach(t=>t.stop());recordStream=null;
   if(chunks.length){
    const blob=new Blob(chunks,{type:mimeType});chunks=[];
    const info=`${stage.width} × ${stage.height} · ${formatTime(elapsed)} · ${(blob.size/1048576).toFixed(1)} MB · ${mimeType.includes('mp4')?'MP4':'WebM'} · ${audio.length?'with audio':'silent'}${outroAdded?' · 3s MANLYFY ending':''}${recordFailed?' · interrupted / partial clip':''}`;
    finishVideo(blob,info,null,recordFailed);notice('Tap your finished video to play it. DOWNLOAD VIDEO is directly underneath.');
   }else{preparingVideo=false;notice('No video frames were recorded. Keep the tab visible and try again.');updateControls();}
  };
  recording=true;preparingVideo=false;recordStarted=performance.now();if(importedClip){motion.resumePaused(performance.now());lastTracked=performance.now();await video.play();cameraClock.start();}
  $('timer').textContent='00:00';busy(false);recordTimer=setInterval(()=>{if(recording&&!outroActive&&performance.now()-recordStarted>=180000)stopRecording();},1000);
  toast(processingClip?'Creating your video. Download appears as soon as it is ready.':audio.length?'Recording. Make some MANLY noise.':'Recording silently. Maximum MANLY, minimum noise.');
 }catch(e){
  capture?.getTracks().forEach(t=>t.stop());audio.forEach(t=>t.stop());if(token!==epoch)return;
  if(recorder&&recorder.state!=='inactive'){recorder.onstop=null;recorder.stop();}recording=false;preparingVideo=false;processingClip=false;clearInterval(recordTimer);recordStream?.getTracks().forEach(t=>t.stop());recordStream=null;video.pause();
  if(e.needsGesture)$('exportMethod').value='realtime';notice('Video export could not start. '+(e.message||'Try a shorter clip in the full Chrome or Safari browser.'));busy(false);
 }
}
function stopRecorderNow(){
 outroAbort?.abort();outroAbort=null;outroActive=false;
 if(recorder&&recorder.state!=='inactive'){if(importedClip)videoUI.progress({phase:'finishing'});recorder.stop();$('shutter').disabled=true;$('shutterHint').textContent='SAVING YOUR MANLY…';}
}
async function stopRecording({immediate=false}={}){
 if(!recorder||recorder.state==='inactive')return;
 if(immediate){recordFailed=true;stopRecorderNow();return;}if(outroActive)return;
 if($('includeOutro').checked&&outroLogo&&!recordFailed&&!document.hidden){
  outroActive=true;cameraClock.stop();video.pause();clearInterval(recordTimer);recordStream?.getAudioTracks().forEach(track=>track.enabled=false);const controller=new AbortController();outroAbort=controller;updateControls();$('shutterHint').textContent='ADDING YOUR MANLY ENDING…';
  const complete=await playOutro(ctx,outroLogo,{signal:controller.signal,onProgress:elapsed=>{updateVideoProgress(elapsed);recordStream?.getVideoTracks()[0]?.requestFrame?.();}});
  if(!complete){if(!controller.signal.aborted)notice('The ending was interrupted. Your processed video can still be downloaded.');stopRecorderNow();return;}outroAdded=true;outroActive=false;outroAbort=null;
 }
 stopRecorderNow();
}
async function photoBlob(){if(!photo)throw new Error('Take or upload a photo first.');const original=compare;compare=false;render();const blob=await new Promise(resolve=>stage.toBlob(resolve,'image/png'));compare=original;render();if(!blob)throw new Error('The photo could not be exported. Try a smaller image.');creditPhoto();return blob;}
function fileName(type){return`MANLYFY-${new Date().toISOString().replace(/[:.]/g,'-')}.${type}`;}
function downloadBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);toast('Saved with 100% MANLY. 0% watermark.');}
async function shareBlob(blob,name){const file=new File([blob],name,{type:blob.type});if(navigator.canShare?.({files:[file]})){try{await navigator.share({files:[file],title:'MANLYFY',text:'The Manliest Camera on Earth.'});}catch(e){if(e.name!=='AbortError')notice('Sharing was unavailable. Download your creation and share it from your gallery.');}}else{downloadBlob(blob,name);toast('Downloaded. Share it from your gallery.');}}
function setMode(value){if(recording||working)return;if(value==='photo'&&importedClip)stopLive(true);mode=value;compare=false;$('compareBtn').setAttribute('aria-pressed','false');if(mode==='photo')stopMic();else if(live&&$('audioToggle').checked&&!micStream)enableMic();updateControls();render();if(mode==='video'&&!window.MediaRecorder)notice('This browser does not support live video recording. Photo mode is available.');}
// Collection and UI events.
$('photoMode').onclick=()=>setMode('photo');$('videoMode').onclick=()=>setMode('video');
$('enableCamera').onclick=()=>startCamera();$('retake').onclick=()=>startCamera();$('stopCamera').onclick=()=>recording?stopRecording():stopLive();
$('createVideo').onclick=()=>processImportedClip();
$('cancelExport').onclick=()=>{if(frameExport)frameExport.abort();else if(recording)stopRecording({immediate:true});else{preparingVideo=false;stopLive(false);busy(false);notice('Video processing cancelled. Upload a video to try again.');}$('videoProgressText').textContent='Cancelling export…';};
$('exportQuality').onchange=()=>{resize();savePref();};
$('leaveMaster').onclick=()=>{if(working||recording||frameExport)return;leaveMaster();master=false;resetFaceStyles();if(!canUse(design))design='classic';patches=patches.map(p=>({...p,design}));buildCollection();ensureDesign(design).then(()=>{reflectDesign();render();});updateControls();toast('Regular edition. Your earned progress is kept.');};
$('designTarget').onchange=()=>{designTarget=$('designTarget').value;if(designTarget!=='all')selected=designTarget;facePickerSignature='';reflectDesign();rebuildFacePicker();render();};
$('styleFromStart').onclick=async()=>{if(!importedClip||working||recording||frameExport)return;$('clipSeek').value=0;await $('clipSeek').onchange();if(importedClip)toast('At the start. Choose a numbered face, then its design.');};
$('mixFaces').onclick=async()=>{if(working||recording||frameExport)return;const pool=DESIGNS.filter(d=>canUse(d.id));for(const p of patches){p.design=pool[Math.floor(Math.random()*pool.length)].id;faceDesigns.set(p.id,p.design);await ensureDesign(p.design);}render();stashPhoto();};
$('includeOutro').onchange=savePref;
$('editVideo').onclick=()=>{if(lastVideoFile)importVideo(lastVideoFile,{autoProcess:false,preserveStyles:true});};
$('shareVideoInline').onclick=()=>resultBlob&&shareBlob(resultBlob,fileName(resultBlob.type.includes('mp4')?'mp4':'webm'));
$('quickSaveVideo').onclick=()=>toast('Your video download is starting. Look in Downloads.');
$('shutter').onclick=()=>recording?stopRecording():mode==='photo'?takePhoto():importedClip?processImportedClip():startRecording();
$('flipBtn').onclick=()=>startCamera(facing==='user'?'environment':'user');
function choosePictures(fromFiles=false,forRanking=false){if(working||recording)return;photoIntent=forRanking?'rank':'filter';$(fromFiles?'photoFilesInput':'fileInput').click();}
for(const id of ['uploadBtn','welcomeUpload'])$(id).onclick=()=>mode==='video'?$('videoFileInput').click():choosePictures();$('chooseMorePhotos').onclick=()=>choosePictures();
$('galleryPhotos').onclick=()=>choosePictures();$('choosePhotoFiles').onclick=()=>choosePictures(true);
$('videoFileInput').onchange=()=>{const file=$('videoFileInput').files[0];$('videoFileInput').value='';if(file)importVideo(file);};
async function toggleClipPreview(){if(!importedClip||recording||working||frameExport||preparingVideo)return;const token=epoch;try{if(video.paused){busy(true,'Resuming your clip…');await tracker.whenIdle();if(token!==epoch)return;motion.resumePaused(performance.now());lastTracked=performance.now();lastInfer=lastTracked;await video.play();cameraClock.start();}else video.pause();}catch{if(token===epoch)notice('This browser could not play the clip. Try a compatible MP4 or WebM.');}finally{if(token===epoch)busy(false);}}
$('clipPreviewPlay').onclick=toggleClipPreview;stage.onclick=()=>{if(importedClip)toggleClipPreview();};
stage.addEventListener('keydown',e=>{if(importedClip&&(e.key===' '||e.key==='Enter')){e.preventDefault();toggleClipPreview();}});
for(const event of ['play','pause'])video.addEventListener(event,updateControls);
$('clipSeek').onchange=async()=>{if(!importedClip||recording||working)return;const token=epoch,time=+$('clipSeek').value;cameraClock.stop();video.pause();busy(true,'Finding your nose at this moment…');try{await tracker.whenIdle();await seekVideo(video,time);if(token!==epoch)return;await prepareClipFrame(token);}catch(e){if(token===epoch)notice(e.message);}finally{if(token===epoch)busy(false);}};
video.addEventListener('ended',()=>{if(!importedClip)return;if(recording)stopRecording();else updateControls();});
for(const id of ['fileInput','photoFilesInput'])$(id).onchange=()=>{const files=Array.from($(id).files),rankOnly=photoIntent==='rank';$(id).value='';if(files.length)openPhotos(files,false,rankOnly);};
$('photoPrev').onclick=()=>loadQueuedPhoto(queueIndex-1);$('photoNext').onclick=()=>loadQueuedPhoto(queueIndex+1);
$('demoBtn').onclick=async()=>{try{const response=await fetch('assets/demo-astronaut.png');if(!response.ok)throw new Error();await openPhoto(new File([await response.blob()],'demo.png',{type:'image/png'}),true);}catch{notice('The demo could not load. Upload a photo or open your camera.');}};
$('quickPrev').onclick=()=>$('quickPatches').scrollBy({left:-260,behavior:'smooth'});
$('quickNext').onclick=()=>$('quickPatches').scrollBy({left:260,behavior:'smooth'});
$('roulette').onclick=async()=>{const candidates=DESIGNS.filter(d=>canUse(d.id)&&d.id!==design);const d=candidates[Math.floor(Math.random()*candidates.length)];$('roulette').classList.add('rolling');await selectDesign(d.id);setTimeout(()=>$('roulette').classList.remove('rolling'),500);document.querySelector(`.patch-card[data-id="${d.id}"]`)?.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});};
$('ratio').onchange=()=>{savePref();resize();};$('quality').onchange=()=>{savePref();motion.maxEdge=trackingProfile($('quality').value,faceCount()>1).flowEdge;motion.reset({anchors:motion.faces});lastInfer=0;resize();toast('Tracking preference applied. Reopen the camera to request a different capture frame rate.');};
$('groupToggle').onchange=()=>{savePref();motion.reset({anchors:motion.faces});lastInfer=0;toast(importedClip?'Uploaded videos always track up to 8 faces.':$('groupToggle').checked?'Group camera on · up to 8 faces.':'Single-face camera on.');};
$('audioToggle').onchange=()=>{$('audioToggle').checked?enableMic():stopMic();};
$('compareBtn').onclick=()=>{compare=!compare;$('compareBtn').setAttribute('aria-pressed',String(compare));render();};
$('noseSelect').onchange=()=>{selected=$('noseSelect').value;designTarget=selected;facePickerSignature='';reflectDesign();syncSliders();rebuildFacePicker();};
for(const id of ['size','rotation'])$(id).oninput=()=>{const p=patches.find(p=>p.id===selected);if(!p)return;p.scale=Number($('size').value)/100;p.rotation=Number($('rotation').value)*Math.PI/180;syncSliders();render();};
$('addPatch').onclick=()=>{patches.push({id:crypto.randomUUID(),x:.5,y:.48,width:.25,angle:0,scale:1,rotation:0,design,manual:true});selected=patches.at(-1).id;rebuildNoses();render();faceStatus(`${patches.length} ${patches.length===1?'plaster':'plasters'} · drag to position`);};
$('removePatch').onclick=()=>{patches=patches.filter(p=>p.id!==selected);selected=null;rebuildNoses();render();};
$('redetect').onclick=()=>{if(working)return;notice();detectPhoto();};
$('mixGroup').onclick=()=>$('mixFaces').click();
$('rerate').onclick=newPunchline;$('rankNewJoke').onclick=newPunchline;$('realBandage').onchange=()=>{lastRatingSignature='';updateManliness();stashPhoto();};
$('rankChoosePhoto').onclick=()=>choosePictures(false,true);$('rankChooseFile').onclick=()=>choosePictures(true,true);$('rankAddPatch').onclick=()=>{if(!photo)return;if(!patches.length)$('addPatch').click();$('viewfinder').scrollIntoView({block:'center',behavior:'smooth'});};
for(const id of ['savePhoto','quickSavePhoto'])$(id).onclick=async()=>{try{downloadBlob(await photoBlob(),fileName('png'));}catch(e){notice(e.message);toast(e.message);}};
$('sharePhoto').onclick=async()=>{try{await shareBlob(await photoBlob(),fileName('png'));}catch(e){notice(e.message);}};
// Drag, pinch and twist use source coordinates; the editing outline is DOM-only
// and is never painted into photo/video exports.
function stageDisplay(){const b=stage.getBoundingClientRect(),inside=containRect(stage.width,stage.height,b.width,b.height);return{x:b.left+inside.x,y:b.top+inside.y,width:inside.width,height:inside.height};}
function renderFaceMarkers(){
 const layer=$('faceMarkers');layer.hidden=working||recording||!!frameExport||compare||stage.hidden||!patches.length;if(layer.hidden)return;
 const ids=patches.map(p=>p.id).join('|');
 if(layer.dataset.faces!==ids){layer.dataset.faces=ids;layer.replaceChildren(...patches.map(p=>{
  const b=document.createElement('button');b.dataset.face=p.id;b.textContent='Face '+labelFace(p.id);b.setAttribute('aria-label','Choose design for Face '+labelFace(p.id));
  b.onclick=()=>{designTarget=p.id;selected=p.id;facePickerSignature='';reflectDesign();rebuildFacePicker();syncSliders();render();};return b;
 }));}
 const display=stageDisplay(),parent=$('viewfinder').getBoundingClientRect(),r=rect(),scale=display.width/stage.width;
 if(!scale)return;
 for(let i=0;i<patches.length;i++){
  const p=patches[i],q=patchPose(p,r,mirrored),b=layer.children[i];b.style.left=clamp(display.x-parent.left+q.x*scale,32,parent.width-32)+'px';b.style.top=clamp(display.y-parent.top+q.y*scale-30,30,parent.height-80)+'px';
  b.setAttribute('aria-pressed',String(designTarget===p.id));
 }
}
function pointerPoint(e){const b=stageDisplay();return{x:(e.clientX-b.x)*stage.width/b.width,y:(e.clientY-b.y)*stage.height/b.height};}
function renderSelection(){
 const outline=$('patchSelection'),p=patches.find(p=>p.id===selected);outline.hidden=stage.hidden||live||!photo||working||compare||!p;
 if(outline.hidden)return;const b=stageDisplay(),parent=$('viewfinder').getBoundingClientRect(),q=patchPose(p,rect(),mirrored),scale=b.width/stage.width;
 outline.style.left=(b.x-parent.left+q.x*scale)+'px';outline.style.top=(b.y-parent.top+q.y*scale)+'px';outline.style.width=Math.max(38,q.width*scale+18)+'px';outline.style.height=Math.max(30,q.width*.48*scale+14)+'px';outline.style.transform=`translate(-50%,-35%) rotate(${q.angle}rad)`;
}
function beginEditGesture(){const p=patches.find(p=>p.id===selected);if(!p||!touches.size){drag=null;return;}drag={id:p.id,start:startGesture(p,[...touches.values()].slice(0,2),rect(),mirrored)};}
stage.onpointerdown=e=>{
 if(live||!photo||working)return;const point=pointerPoint(e),r=rect(),display=stageDisplay();
 if(!touches.size){
  const nearest=patches.map(p=>({p,pose:patchPose(p,r,mirrored)})).map(v=>({...v,d:Math.hypot(v.pose.x-point.x,v.pose.y-point.y)*display.width/stage.width})).sort((a,b)=>a.d-b.d);
  const hit=[...patches].reverse().find(p=>hitPatch(point.x,point.y,p,r,mirrored))||nearest.find(v=>v.d<36)?.p;
  if(hit){selected=hit.id;designTarget=hit.id;facePickerSignature='';reflectDesign();rebuildNoses();rebuildFacePicker();}else drag=null;
  touches.set(e.pointerId,point);if(hit)beginEditGesture();
 }else{touches.set(e.pointerId,point);beginEditGesture();}
 try{stage.setPointerCapture(e.pointerId);}catch{}e.preventDefault();
};
stage.onpointermove=e=>{
 if(!touches.has(e.pointerId)||live||working)return;touches.set(e.pointerId,pointerPoint(e));if(!drag)return;
 const p=patches.find(p=>p.id===drag.id);if(!p)return;Object.assign(p,moveGesture(drag.start,[...touches.values()].slice(0,2),rect(),mirrored));syncSliders();render();e.preventDefault();
};
function endEditGesture(e){if(!touches.has(e.pointerId))return;touches.delete(e.pointerId);if(touches.size)beginEditGesture();else{drag=null;stashPhoto();}}
stage.onpointerup=stage.onpointercancel=stage.onlostpointercapture=endEditGesture;
window.addEventListener('resize',renderSelection);
stage.onkeydown=e=>{if(live||!photo||!selected)return;const p=patches.find(p=>p.id===selected),step=e.shiftKey?.015:.003;if(!p)return;const moves={ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,-step],ArrowDown:[0,step]};if(!moves[e.key])return;e.preventDefault();p.x=clamp(p.x+moves[e.key][0]*(mirrored?-1:1),0,1);p.y=clamp(p.y+moves[e.key][1],0,1);render();};
$('wearReward').onclick=()=>{if(newestReward)selectDesign(newestReward);$('unlockDialog').close();};
$('supportBtn').onclick=()=>$('supportDialog').showModal();
$('copyInterac').onclick=async()=>{try{await navigator.clipboard.writeText('bookclodd@gmail.com');$('copyInterac').textContent='Copied!';}catch{toast('Copy the email shown, then use your banking app.');}};
$('gameHelp').onclick=()=>$('gameDialog').showModal();$('rewardDetails').onclick=()=>$('unlockDialog').showModal();
for(const id of ['helpBtn','privacyBtn'])$(id).onclick=()=>$('helpDialog').showModal();
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e;});
$('installBtn').onclick=async()=>{if(deferredInstall){await deferredInstall.prompt();deferredInstall=null;}else{$('helpDialog').showModal();$('installHelp').scrollIntoView({block:'start'});}};
window.addEventListener('appinstalled',()=>toast('Installed. Your nose has a home screen now.'));
document.addEventListener('visibilitychange',()=>{if(document.hidden&&(live||preparingVideo)){frameExport?.abort();stopLive(true);notice('Processing stopped because you left the tab. Keep MANLYFY visible while creating a video.');}});
window.addEventListener('pagehide',()=>{frameExport?.abort();stopLive(false);tracker.dispose();});
try{const p=JSON.parse(localStorage.getItem('manlyfy-prefs')||'{}');if(DESIGNS.some(d=>d.id===p.design))design=p.design;if(['original','square','vertical'].includes(p.ratio))$('ratio').value=p.ratio;if(p.quality==='lite'||p.version&&['balanced','precision'].includes(p.quality))$('quality').value=p.quality;if(['source','1080','720'].includes(p.exportQuality))$('exportQuality').value=p.exportQuality;if(typeof p.groupLive==='boolean')$('groupToggle').checked=p.groupLive;if(master&&typeof p.videoEnding==='boolean')$('includeOutro').checked=p.videoEnding;}catch{}
if(!canUse(design))design='classic';
if(testCamera){const n=document.createElement('p');n.className='notice';n.textContent='VERIFICATION MODE · Simulated camera and audio only. Open the normal app URL for your real camera.';document.querySelector('main').prepend(n);}
buildCollection();ensureDesign(design).then(()=>selectDesign(design,false));updateControls();
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js?v=1.7.0',{updateViaCache:'none'}).catch(()=>{}));
