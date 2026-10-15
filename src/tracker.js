import {CpuFaceTracker} from './cpu-tracker.js?v=1.0.4';
// One in-flight frame; use a worker first, then a browser-canvas compatibility path.
export class FaceTracker {
  constructor({forceMain=false}={}) {this.worker=null;this.pending=new Map();this.serial=0;this.busy=false;this.ready=false;this.initPromise=null;this.mainModel=null;this.cpuModel=null;this.mainMode='IMAGE';this.mainCount=8;this.forceMain=forceMain;this.backend='not started';}
  init() {
    if(this.initPromise)return this.initPromise;
    this.initPromise=(async()=>{
      const probe=document.createElement('canvas');if(!probe.getContext('webgl2')){await this.startCpu();return;}
      if(this.forceMain){await this.startMain();return;}
      this.worker=new Worker(new URL('./face-worker.js?v=1.0.4',import.meta.url));
      this.worker.onmessage=({data})=>{const p=this.pending.get(data.id);if(!p)return;clearTimeout(p.timer);this.pending.delete(data.id);data.error?p.reject(new Error(data.error)):p.resolve(data.landmarks||[]);};
      this.worker.onerror=e=>this.fail(new Error(e.message||'The worker tracker could not load.'));
      try{await this.send({});this.backend='worker';this.ready=true;}catch(e){console.warn('Worker initialization failed; trying compatibility mode.',e.message);await this.startMain();}
    })().catch(e=>{this.dispose();throw e;});
    return this.initPromise;
  }
  send(data,transfer=[]) {return new Promise((resolve,reject)=>{const id=++this.serial,timer=setTimeout(()=>{this.pending.delete(id);reject(new Error('Face tracking took too long. Try a photo or Lite mode.'));},45000);this.pending.set(id,{resolve,reject,timer});try{this.worker.postMessage({...data,id},transfer);}catch(e){clearTimeout(timer);this.pending.delete(id);reject(e);}});}
  async startMain() {
    this.worker?.terminate();this.worker=null;
    const {FilesetResolver,FaceLandmarker}=await import('../assets/vision_bundle.mjs');
    const files=await FilesetResolver.forVisionTasks(new URL('../assets',import.meta.url).href);
    let lastError;
    for(const delegate of ['GPU','CPU']){
      try{this.mainModel=await FaceLandmarker.createFromOptions(files,{canvas:document.createElement('canvas'),baseOptions:{modelAssetPath:new URL('../assets/face_landmarker.task',import.meta.url).href,delegate},runningMode:'IMAGE',numFaces:8,minFaceDetectionConfidence:.45,minFacePresenceConfidence:.45,minTrackingConfidence:.45});this.mainMode='IMAGE';this.mainCount=8;this.backend='compatibility '+delegate;this.ready=true;return;}
      catch(e){lastError=e;}
    }
    console.warn('MediaPipe graphics unavailable; using the local CPU compatibility tracker.',lastError?.message);await this.startCpu();
  }
  async startCpu(){this.worker?.terminate();this.worker=null;try{this.mainModel?.close();}catch{}this.mainModel=null;this.cpuModel=new CpuFaceTracker();await this.cpuModel.init();this.backend='CPU compatibility';this.ready=true;}
  async detect(source,runningMode='IMAGE',numFaces=8,maxEdge=960) {
    await this.init();if(this.busy)return null;this.busy=true;
    let bitmap;
    try{
      if(this.cpuModel)return await this.cpuModel.detect(source,runningMode,numFaces,maxEdge);
      const sw=source.videoWidth||source.naturalWidth||source.width,sh=source.videoHeight||source.naturalHeight||source.height,s=Math.min(1,maxEdge/Math.max(sw,sh));
      bitmap=await createImageBitmap(source,{resizeWidth:Math.max(1,Math.round(sw*s)),resizeHeight:Math.max(1,Math.round(sh*s)),resizeQuality:'low'});
      if(this.worker){
        try{return await this.send({bitmap,runningMode,numFaces,time:performance.now()},[bitmap]);}
        catch(e){console.warn('Worker graphics unavailable; switching to browser-canvas compatibility mode.',e.message);await this.startMain();bitmap=await createImageBitmap(source,{resizeWidth:Math.max(1,Math.round(sw*s)),resizeHeight:Math.max(1,Math.round(sh*s)),resizeQuality:'low'});}
      }
      if(this.cpuModel)return await this.cpuModel.detect(source,runningMode,numFaces,maxEdge);
      if(this.mainMode!==runningMode||this.mainCount!==numFaces){await this.mainModel.setOptions({runningMode,numFaces});this.mainMode=runningMode;this.mainCount=numFaces;}
      try{const result=runningMode==='VIDEO'?this.mainModel.detectForVideo(bitmap,performance.now()):this.mainModel.detect(bitmap);return result.faceLandmarks;}catch(e){console.warn('MediaPipe detection unavailable; using local CPU compatibility.',e.message);await this.startCpu();return await this.cpuModel.detect(source,runningMode,numFaces,maxEdge);}
    }finally{bitmap?.close();this.busy=false;}
  }
  fail(e){for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(e);}this.pending.clear();}
  dispose(){this.fail(new Error('Tracker stopped.'));this.worker?.terminate();this.worker=null;try{this.mainModel?.close();}catch{}this.mainModel=null;this.cpuModel?.dispose();this.cpuModel=null;this.initPromise=null;this.ready=false;this.busy=false;this.backend='stopped';}
}
