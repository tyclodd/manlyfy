const bound=n=>Math.max(0,Math.min(1,Number.isFinite(n)?n:0));
export function videoPercent({time=0,total=0,phase='frames'}={}){
 if(phase==='ready')return 100;
 if(phase==='finishing')return 99;
 return Math.min(97,Math.floor(bound(total>0?time/total:0)*97));
}
// One presentation path for WebCodecs and compatibility recordings.
// A finished result is an actual video in the main preview, with its download
// directly underneath. It never depends on opening a second dialog.
export class VideoUI{
 constructor(document,{onPlayError=()=>{}}={}){
  this.$=id=>document.getElementById(id);this.video=this.$('resultVideo');this.percent=0;this.url=null;
  this.$('tapResultPlay').onclick=()=>this.video.play().catch(onPlayError);
  this.video.addEventListener('playing',()=>this.$('tapResultPlay').hidden=true);
  for(const event of ['pause','ended'])this.video.addEventListener(event,()=>{this.$('tapResultPlay').hidden=!this.url;});
 }
 begin(label='Opening your video…'){
  this.percent=0;this.$('videoProgress').max=100;this.$('videoProgress').value=0;
  this.$('videoPercent').textContent='0%';this.$('videoProgressText').textContent=label;this.$('videoProgressTime').textContent='';
 }
 progress(value={}){
  this.percent=Math.max(this.percent,videoPercent(value));
  this.$('videoProgress').value=this.percent;this.$('videoPercent').textContent=this.percent+'%';
  this.$('videoProgressText').textContent=value.phase==='ending'?'Adding your MANLYFY ending…':value.phase==='finishing'?'Preparing your download…':'Applying your Band-Aids…';
  if(value.total>0)this.$('videoProgressTime').textContent=Math.floor(Math.min(value.time,value.total))+' / '+Math.ceil(value.total)+' seconds of video';
 }
 ready({url,name,info,poster='',partial=false}){
  this.url=url;this.video.src=url;this.video.poster=poster;this.video.controls=true;this.video.playsInline=true;this.video.load();
  const link=this.$('quickSaveVideo');link.href=url;link.download=name;
  this.$('downloadVideoLabel').textContent=partial?'Download partial video':'DOWNLOAD VIDEO';
  this.$('videoReadyLabel').textContent=partial?'PARTIAL CLIP AVAILABLE':'100% · YOUR VIDEO IS READY';
  this.$('inlineResultInfo').textContent=info;this.$('tapResultPlay').hidden=false;
  if(!partial){this.percent=100;this.$('videoProgress').value=100;this.$('videoPercent').textContent='100%';}
 }
 sync({mode='video',exporting=false,sourceReady=false,imported=false,paused=true,working=false}={}){
  const ready=mode==='video'&&!!this.url&&!exporting;
  if(!ready&&!this.video.paused)this.video.pause();
  this.$('resultPlayer').hidden=!ready;this.$('videoSaveBar').hidden=!ready;
  this.$('viewfinder').classList.toggle('has-result',ready);
  this.$('stage').hidden=ready||!sourceReady;
  this.$('welcome').hidden=ready||sourceReady||exporting;
  this.$('videoProgressPanel').hidden=mode!=='video'||!exporting;
  this.$('clipPreviewPlay').hidden=ready||!imported||exporting||working||!paused;
  if(ready){for(const id of ['faceStatus','previewHead','recordingBadge','photoSaveBar','faceMarkers','patchSelection','busy'])this.$(id).hidden=true;}
  return ready;
 }
 clear(){
  this.url=null;this.video.pause();this.video.removeAttribute('src');this.video.removeAttribute('poster');this.video.load();
  this.$('quickSaveVideo').removeAttribute('href');this.$('quickSaveVideo').removeAttribute('download');
  this.$('videoSaveBar').hidden=true;this.$('resultPlayer').hidden=true;this.$('tapResultPlay').hidden=true;
  this.$('viewfinder').classList.remove('has-result');
 }
}
