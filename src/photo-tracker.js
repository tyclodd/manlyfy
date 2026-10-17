// Still photos can contain much smaller faces than a live selfie. Scan at a
// higher detector resolution, then rescan overlapping crops in source space.
function mapped(points,crop,width,height){return points.map(p=>p?{x:(crop.x+p.x*crop.width)/width,y:(crop.y+p.y*crop.height)/height}:p);}
function distinct(all,next,width,height){
 for(const points of next){if(all.length>=8)break;const n=points[5],a=points[33],b=points[263];if(!n||!a||!b)continue;const span=Math.hypot((b.x-a.x)*width,(b.y-a.y)*height);if(span<5)continue;
  const duplicate=all.some(p=>{const q=p[5],eye=Math.hypot((p[263].x-p[33].x)*width,(p[263].y-p[33].y)*height);return Math.hypot((n.x-q.x)*width,(n.y-q.y)*height)<Math.max(span,eye)*.5;});if(!duplicate)all.push(points);
 }
 return all.slice(0,8);
}
export function photoCrops(width,height){
 const short=Math.min(width,height),long=Math.max(width,height),crops=[];
 if(long/short>1.25){const steps=Math.min(5,Math.ceil((long-short)/(short*.65))+1);for(let i=0;i<steps;i++){const offset=(long-short)*i/(steps-1);crops.push(width<height?{x:0,y:offset,width,height:short}:{x:offset,y:0,width:short,height});}}
 const center={x:width*.18,y:height*.18,width:width*.64,height:height*.64};
 return{bands:crops,zoom:[center,...[[0,0],[.36,0],[0,.36],[.36,.36]].map(([x,y])=>({x:width*x,y:height*y,width:width*.64,height:height*.64}))]};
}
export async function detectPhotoFaces(tracker,source,{onProgress=()=>{},cancelled=()=>false}={}){
 const width=source.width,height=source.height,all=[];onProgress('Finding faces · full photo…');
 const first=await tracker.detect(source,'IMAGE',8,1280,{rotationSearch:false,inputSize:608,scoreThreshold:.35});if(cancelled())return null;distinct(all,first||[],width,height);
 const small=all.some(p=>Math.hypot((p[263].x-p[33].x)*width,(p[263].y-p[33].y)*height)/Math.max(width,height)<.09);
 const crops=photoCrops(width,height),canvas=document.createElement('canvas'),context=canvas.getContext('2d');
 async function scan(crop,label){
  if(cancelled())return;onProgress(label);const scale=Math.min(1,1280/Math.max(crop.width,crop.height));canvas.width=Math.round(crop.width*scale);canvas.height=Math.round(crop.height*scale);context.drawImage(source,crop.x,crop.y,crop.width,crop.height,0,0,canvas.width,canvas.height);
  const found=await tracker.detect(canvas,'IMAGE',8,1280,{rotationSearch:false,inputSize:416,scoreThreshold:.4});if(!cancelled())distinct(all,(found||[]).map(p=>mapped(p,crop,width,height)),width,height);
 }
 if(!all.length||small)for(let i=0;i<crops.bands.length&&all.length<8&&!cancelled();i++)await scan(crops.bands[i],`Checking smaller faces · section ${i+1}/${crops.bands.length}…`);
 if(!all.length)for(let i=0;i<crops.zoom.length&&!cancelled();i++)await scan(crops.zoom[i],`Looking closer · section ${i+1}/${crops.zoom.length}…`);
 // Rotation fallback runs once on the whole photo, not on every empty crop.
 if(!all.length&&!cancelled()){onProgress('Checking rotated faces…');const rotated=await tracker.detect(source,'IMAGE',8,1280,{rotationSearch:true,inputSize:608,scoreThreshold:.35});distinct(all,rotated||[],width,height);}
 if(!all.length&&!cancelled()&&!tracker.backend.startsWith('CPU')){
  onProgress('Trying another local face detector…');const {FaceTracker}=await import('./tracker.js?v=1.6.1');const fallback=new FaceTracker({forceCpu:true});
  try{return await detectPhotoFaces(fallback,source,{onProgress,cancelled});}finally{fallback.dispose();}
 }
 return cancelled()?null:all;
}
