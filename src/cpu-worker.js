// CPU inference stays away from the camera/rendering thread.
importScripts('../assets/face-api.min.js');
const api=self.faceapi;
api.env.setEnv({Canvas:OffscreenCanvas,CanvasRenderingContext2D:new OffscreenCanvas(1,1).getContext('2d').constructor,Image:class{},Video:class{},ImageData,createCanvasElement:()=>new OffscreenCanvas(1,1),createImageElement:()=>{throw new Error('Images are supplied as tensors.');},fetch:self.fetch.bind(self),readFile:()=>{throw new Error('No filesystem access.');}});
let model;
self.onmessage=async({data})=>{const{id,bitmap,runningMode='IMAGE',numFaces=1,maxEdge=960,options={}}=data;try{
  if(!model){const {CpuFaceTracker}=await import('./cpu-tracker.js?v=1.6.1');model=new CpuFaceTracker();await model.init();model.allowFollow=false;}
  const landmarks=bitmap?await model.detect(bitmap,runningMode,numFaces,maxEdge,options):[];self.postMessage({id,landmarks});
}catch(e){self.postMessage({id,error:e.stack||e.message||String(e)});}finally{bitmap?.close();}};
