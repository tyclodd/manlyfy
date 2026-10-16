import {CpuFaceTracker} from './cpu-tracker.js?v=1.3.2';
// One in-flight scan. Both neural backends prefer a worker, leaving UI and motion free.
export class FaceTracker {
  constructor({forceMain=false,forceCpu=false}={}) {this.worker=null;this.workerKind=null;this.pending=new Map();this.serial=0;this.busy=false;this.ready=false;this.initPromise=null;this.mainModel=null;this.cpuModel=null;this.mainMode='IMAGE';this.mainCount=1;this.forceMain=forceMain;this.forceCpu=forceCpu;this.backend='not started';this.idlePromise=null;this.resolveIdle=null;}
  init() {
    if(this.initPromise)return this.initPromise;
    this.initPromise=(async()=>{
      if(this.forceCpu){await this.startCpu();return;}
      const probe=document.createElement('canvas');if(!probe.getContext('webgl2')){await this.startCpu();return;}
      if(this.forceMain){await this.startMain();return;}
      this.makeWorker('face-worker.js','GPU');
      try{await this.send({});this.backend='GPU worker';this.ready=true;}catch(e){console.warn('Worker initialization failed; trying compatibility mode.',e.message);await this.startMain();}
    })().catch(e=>{this.dispose();throw e;});
    return this.initPromise;
  }
  makeWorker(file,kind){
    this.worker?.terminate();this.workerKind=kind;
    this.worker=new Worker(new URL('./'+file+'?v=1.3.2',import.meta.url));
    this.worker.onmessage=({data})=>{const p=this.pending.get(data.id);if(!p)return;clearTimeout(p.timer);this.pending.delete(data.id);data.error?p.reject(new Error(data.error)):p.resolve(data.landmarks||[]);};
    this.worker.onerror=e=>this.fail(new Error(e.message||'The worker tracker could not load.'));
  }
  send(data,transfer=[]) {return new Promise((resolve,reject)=>{const id=++this.serial,timer=setTimeout(()=>{this.pending.delete(id);reject(new Error('Face tracking took too long. Try a photo or Lite mode.'));},45000);this.pending.set(id,{resolve,reject,timer});try{this.worker.postMessage({...data,id},transfer);}catch(e){clearTimeout(timer);this.pending.delete(id);reject(e);}});}
  async startMain() {
    this.worker?.terminate();this.worker=null;this.workerKind=null;
    const {FilesetResolver,FaceLandmarker}=await import('../assets/vision_bundle.mjs');
    const files=await FilesetResolver.forVisionTasks(new URL('../assets',import.meta.url).href);
    let lastError;
    for(const delegate of ['GPU','CPU']){
      try{this.mainModel=await FaceLandmarker.createFromOptions(files,{canvas:document.createElement('canvas'),baseOptions:{modelAssetPath:new URL('../assets/face_landmarker.task',import.meta.url).href,delegate},runningMode:'IMAGE',numFaces:1,minFaceDetectionConfidence:.45,minFacePresenceConfidence:.45,minTrackingConfidence:.45});this.mainMode='IMAGE';this.mainCount=1;this.backend='compatibility '+delegate;this.ready=true;return;}
      catch(e){lastError=e;}
    }
    console.warn('MediaPipe graphics unavailable; using the local CPU tracker.',lastError?.message);await this.startCpu();
  }
  async startCpu(preferWorker=true){
    this.worker?.terminate();this.worker=null;this.workerKind=null;try{this.mainModel?.close();}catch{}this.mainModel=null;
    if(preferWorker&&globalThis.Worker&&globalThis.OffscreenCanvas){
      try{this.makeWorker('cpu-worker.js','CPU');await this.send({});this.backend='CPU worker';this.ready=true;return;}
      catch(e){console.warn('CPU worker unavailable; using browser compatibility.',e.message);this.worker?.terminate();this.worker=null;this.workerKind=null;}
    }
    this.cpuModel=new CpuFaceTracker();await this.cpuModel.init();this.backend='CPU compatibility';this.ready=true;
  }
  async detect(source,runningMode='IMAGE',numFaces=1,maxEdge=960,options={}) {
    await this.init();if(this.busy)return null;this.busy=true;this.idlePromise=new Promise(resolve=>this.resolveIdle=resolve);
    let bitmap;
    try{
      if(this.cpuModel)return await this.cpuModel.detect(source,runningMode,numFaces,maxEdge,options);
      const sw=source.videoWidth||source.naturalWidth||source.width,sh=source.videoHeight||source.naturalHeight||source.height,s=Math.min(1,maxEdge/Math.max(sw,sh));
      const snapshot=()=>createImageBitmap(source,{resizeWidth:Math.max(1,Math.round(sw*s)),resizeHeight:Math.max(1,Math.round(sh*s)),resizeQuality:'low'});
      bitmap=await snapshot();
      if(this.worker){
        try{return await this.send({bitmap,runningMode,numFaces,maxEdge,options,time:performance.now()},[bitmap]);}
        catch(e){const kind=this.workerKind;console.warn(kind+' worker detection unavailable; switching compatibility path.',e.message);if(kind==='CPU')await this.startCpu(false);else await this.startMain();if(this.worker){bitmap=await snapshot();return await this.send({bitmap,runningMode,numFaces,maxEdge,options,time:performance.now()},[bitmap]);}bitmap=await snapshot();}
      }
      if(this.cpuModel)return await this.cpuModel.detect(source,runningMode,numFaces,maxEdge,options);
      if(this.mainMode!==runningMode||this.mainCount!==numFaces){await this.mainModel.setOptions({runningMode,numFaces,minFaceDetectionConfidence:runningMode==='IMAGE'?.35:.45,minFacePresenceConfidence:runningMode==='IMAGE'?.35:.45});this.mainMode=runningMode;this.mainCount=numFaces;}
      try{const result=runningMode==='VIDEO'?this.mainModel.detectForVideo(bitmap,performance.now()):this.mainModel.detect(bitmap);return result.faceLandmarks;}
      catch(e){console.warn('MediaPipe detection unavailable; using local CPU compatibility.',e.message);await this.startCpu();if(this.worker){bitmap=await snapshot();return await this.send({bitmap,runningMode,numFaces,maxEdge,options,time:performance.now()},[bitmap]);}return await this.cpuModel.detect(source,runningMode,numFaces,maxEdge,options);}
    }finally{bitmap?.close();this.busy=false;this.resolveIdle?.();this.resolveIdle=null;this.idlePromise=null;}
  }
  whenIdle(){return this.idlePromise||Promise.resolve();}
  resetVideo(){if(this.cpuModel){this.cpuModel.boxes=[];this.cpuModel.videoSignature=null;}}
  fail(e){for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(e);}this.pending.clear();}
  dispose(){this.fail(new Error('Tracker stopped.'));this.worker?.terminate();this.worker=null;this.workerKind=null;try{this.mainModel?.close();}catch{}this.mainModel=null;this.cpuModel?.dispose();this.cpuModel=null;this.initPromise=null;this.ready=false;this.busy=false;this.backend='stopped';}
}
