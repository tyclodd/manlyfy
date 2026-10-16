// Sparse Lucas–Kanade flow keeps the overlay current between neural face scans.
// Frames and their pyramids live only in memory; nothing leaves the device.
let enginePromise;
function engine(){
  if(globalThis.jsfeat)return Promise.resolve(globalThis.jsfeat);
  return enginePromise ||= new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=new URL('../assets/jsfeat.min.js',import.meta.url).href;s.onload=()=>resolve(globalThis.jsfeat);s.onerror=()=>{enginePromise=null;reject(new Error('Motion tracking could not load.'));};document.head.append(s);});
}
const median=values=>{const a=[...values].sort((a,b)=>a-b);return a[Math.floor(a.length/2)];};
export function similarity(from,to){
  const n=from.length;if(n<4)return null;
  let x=0,y=0,u=0,v=0;for(let i=0;i<n;i++){x+=from[i].x;y+=from[i].y;u+=to[i].x;v+=to[i].y;}x/=n;y/=n;u/=n;v/=n;
  let den=0,a=0,b=0;for(let i=0;i<n;i++){const px=from[i].x-x,py=from[i].y-y,qx=to[i].x-u,qy=to[i].y-v;den+=px*px+py*py;a+=px*qx+py*qy;b+=px*qy-py*qx;}
  if(den<1e-6)return null;a/=den;b/=den;return {a,b,x:u-a*x+b*y,y:v-b*x-a*y};
}
export const transform=(p,m)=>({x:m.a*p.x-m.b*p.y+m.x,y:m.b*p.x+m.a*p.y+m.y});
export class MotionTracker{
  constructor({library=null,maxEdge=320}={}){this.lib=library;this.maxEdge=maxEdge;this.reset();}
  async init(){this.lib ||= await engine();this.canvas=document.createElement('canvas');this.ctx=this.canvas.getContext('2d',{willReadFrequently:true});}
  reset(){this.history=[];this.faces=[];this.serial=0;this.lastVideoTime=-1;this.updates=0;this.cost=0;this.current=null;}
  get hasFaces(){return this.faces.length>0;}
  tick(source,time){
    if(!this.lib||!this.ctx||source.readyState<2||source.currentTime===this.lastVideoTime)return false;
    this.lastVideoTime=source.currentTime;const w=source.videoWidth,h=source.videoHeight,s=Math.min(1,this.maxEdge/Math.max(w,h)),cw=Math.round(w*s),ch=Math.round(h*s);
    if(this.canvas.width!==cw||this.canvas.height!==ch){this.canvas.width=cw;this.canvas.height=ch;this.history=[];this.faces=[];}
    this.ctx.drawImage(source,0,0,cw,ch);const rgba=this.ctx.getImageData(0,0,cw,ch).data,gray=new Uint8Array(cw*ch);this.lib.imgproc.grayscale(rgba,cw,ch,gray);this.push(gray,cw,ch,time);return true;
  }
  push(gray,width,height,time){
    const started=performance.now(),lib=this.lib,pyramid=new lib.pyramid_t(3);pyramid.allocate(width,height,lib.U8_t|lib.C1_t);pyramid.data[0].data.set(gray);pyramid.build(pyramid.data[0],true);
    const frame={id:++this.serial,time,width,height,pyramid};
    if(this.current&&this.current.width===width&&this.current.height===height&&time-this.current.time<300){this.faces=this.follow(this.faces,this.current,frame);}else this.faces=[];
    this.current=frame;this.history.push(frame);while(this.history.length>100||this.history[0]?.time<time-4000)this.history.shift();
    this.updates++;this.cost=performance.now()-started;return frame;
  }
  features(points,frame){
    const w=frame.width,h=frame.height,a=points[33],b=points[263],n=points[5];if(!a||!b||!n)return [];
    const eye=Math.hypot((a.x-b.x)*w,(a.y-b.y)*h),cx=(a.x+b.x)*w/2,cy=(a.y+b.y)*h/2,data=frame.pyramid.data[0].data,candidates=[];
    const step=Math.max(2,eye/8);
    for(let y=cy-eye*.35;y<cy+eye*.95;y+=step)for(let x=cx-eye*.65;x<cx+eye*.65;x+=step){
      const ix=Math.round(x),iy=Math.round(y);if(ix<8||iy<8||ix>=w-8||iy>=h-8)continue;
      let xx=0,yy=0,xy=0;for(let j=-2;j<=2;j++)for(let i=-2;i<=2;i++){const p=(iy+j)*w+ix+i,dx=data[p+1]-data[p-1],dy=data[p+w]-data[p-w];xx+=dx*dx;yy+=dy*dy;xy+=dx*dy;}
      const score=(xx+yy-Math.sqrt((xx-yy)**2+4*xy*xy))/2;if(score>30)candidates.push({x:ix,y:iy,score});
    }
    candidates.sort((a,b)=>b.score-a.score);const chosen=[];for(const p of candidates){if(chosen.every(q=>Math.hypot(q.x-p.x,q.y-p.y)>Math.max(2,eye*.07)))chosen.push(p);if(chosen.length===28)break;}return chosen;
  }
  follow(faces,previous,current){
    const output=[],lib=this.lib;
    for(const face of faces){
      const count=face.features.length;if(count<6)continue;
      const before=new Float32Array(count*2),after=new Float32Array(count*2),back=new Float32Array(count*2),ok=new Uint8Array(count),backOk=new Uint8Array(count);
      face.features.forEach((p,i)=>{before[i*2]=p.x;before[i*2+1]=p.y;});
      lib.optical_flow_lk.track(previous.pyramid,current.pyramid,before,after,count,13,15,ok,.015,.0001);
      lib.optical_flow_lk.track(current.pyramid,previous.pyramid,after,back,count,13,12,backOk,.02,.0001);
      const pairs=[];for(let i=0;i<count;i++){if(ok[i]&&backOk[i]&&Math.hypot(back[i*2]-before[i*2],back[i*2+1]-before[i*2+1])<1.25)pairs.push({p:{x:before[i*2],y:before[i*2+1]},q:{x:after[i*2],y:after[i*2+1]}});}
      if(pairs.length<6)continue;
      const dx=median(pairs.map(v=>v.q.x-v.p.x)),dy=median(pairs.map(v=>v.q.y-v.p.y));
      let good=pairs.filter(v=>Math.hypot(v.q.x-v.p.x-dx,v.q.y-v.p.y-dy)<5),m=similarity(good.map(v=>v.p),good.map(v=>v.q));if(!m)continue;
      good=good.filter(v=>{const p=transform(v.p,m);return Math.hypot(p.x-v.q.x,p.y-v.q.y)<1.8;});
      if(good.length<6)continue;m=similarity(good.map(v=>v.p),good.map(v=>v.q));const scale=Math.hypot(m.a,m.b);if(scale<.8||scale>1.25||Math.abs(Math.atan2(m.b,m.a))>.3)continue;
      const points=face.points.map(p=>p?(()=>{const q=transform({x:p.x*current.width,y:p.y*current.height},m);return{x:q.x/current.width,y:q.y/current.height};})():p);
      const nose=points[5];if(!nose||nose.x<0||nose.y<0||nose.x>1||nose.y>1)continue;
      let features=good.map(v=>v.q);const reseed=features.length<12||current.time-face.seeded>700;if(reseed)features=this.features(points,current);
      output.push({points,features,seeded:reseed?current.time:face.seeded,modelTime:face.modelTime});
    }
    return output.filter(face=>current.time-face.modelTime<4000);
  }
  seed(landmarks,frameId){
    const index=this.history.findIndex(f=>f.id===frameId);if(index<0)return false;
    const start=this.history[index];let faces=landmarks.map(points=>({points,features:this.features(points,start),seeded:start.time,modelTime:start.time}));
    for(let i=index+1;i<this.history.length&&faces.length;i++)faces=this.follow(faces,this.history[i-1],this.history[i]);
    this.faces=faces;return true;
  }
  landmarks(){return this.faces.map(face=>face.points);}
}
