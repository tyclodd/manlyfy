// Browser-local compatibility path for environments without WebGL2.
// Only detection + landmarks are loaded. No recognition, demographic or identity models.
let libraryPromise;
function library(){
  if(globalThis.faceapi)return Promise.resolve(globalThis.faceapi);
  if(!libraryPromise)libraryPromise=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=new URL('../assets/face-api.min.js',import.meta.url).href;script.onload=()=>resolve(globalThis.faceapi);script.onerror=()=>{libraryPromise=null;script.remove();reject(new Error('The CPU face tracker could not load.'));};document.head.append(script);});
  return libraryPromise;
}
export class CpuFaceTracker {
  async init(){this.api=await library();await this.api.tf.setBackend('cpu');await this.api.tf.ready();const root=new URL('../assets',import.meta.url).href;await Promise.all([this.api.nets.tinyFaceDetector.isLoaded?null:this.api.nets.tinyFaceDetector.loadFromUri(root),this.api.nets.faceLandmark68TinyNet.isLoaded?null:this.api.nets.faceLandmark68TinyNet.loadFromUri(root)]);this.canvas=document.createElement('canvas');this.context=this.canvas.getContext('2d',{willReadFrequently:true});}
  async detect(source,mode,count,maxEdge){
    const sw=source.videoWidth||source.naturalWidth||source.width,sh=source.videoHeight||source.naturalHeight||source.height;
    const edge=mode==='VIDEO'?Math.min(maxEdge,480):Math.min(maxEdge,960),s=Math.min(1,edge/Math.max(sw,sh));
    this.canvas.width=Math.max(1,Math.round(sw*s));this.canvas.height=Math.max(1,Math.round(sh*s));this.context.drawImage(source,0,0,this.canvas.width,this.canvas.height);
    const options=new this.api.TinyFaceDetectorOptions({inputSize:mode==='VIDEO'?320:416,scoreThreshold:.30});
    const orientations=mode==='VIDEO'?[0]:[0,90,270,180];
    for(const rotation of orientations){
      let c=this.canvas;
      if(rotation){c=document.createElement('canvas');const side=rotation===90||rotation===270;c.width=side?this.canvas.height:this.canvas.width;c.height=side?this.canvas.width:this.canvas.height;const cx=c.getContext('2d');cx.translate(c.width/2,c.height/2);cx.rotate(rotation*Math.PI/180);cx.drawImage(this.canvas,-this.canvas.width/2,-this.canvas.height/2);}
      const results=await this.api.detectAllFaces(c,options).withFaceLandmarks(true);
      if(!results.length)continue;
      return results.slice(0,count).map(result=>{
        const p=result.landmarks.positions,points=[];
        const convert=point=>{let x=point.x/c.width,y=point.y/c.height;if(rotation===90)return{x:y,y:1-x};if(rotation===270)return{x:1-y,y:x};if(rotation===180)return{x:1-x,y:1-y};return{x,y};};
        points[33]=convert(p[36]);points[263]=convert(p[45]);points[5]=convert(p[29]);return points;
      });
    }
    return [];
  }
  dispose(){this.canvas=null;this.context=null;}
}
