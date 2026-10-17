import {associateFaces} from './face-identity.js?v=1.6.1';
// Sparse Lucas–Kanade flow keeps the overlay current between neural face scans.
// Frames and their pyramids live only in memory; nothing leaves the device.
let enginePromise;
function engine(){
  if(globalThis.jsfeat)return Promise.resolve(globalThis.jsfeat);
  return enginePromise ||= new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=new URL('../assets/jsfeat.min.js',import.meta.url).href;s.onload=()=>resolve(globalThis.jsfeat);s.onerror=()=>{enginePromise=null;reject(new Error('Motion tracking could not load.'));};document.head.append(s);});
}
const median=values=>{const a=[...values].sort((a,b)=>a-b);return a[Math.floor(a.length/2)];};
const identities=(active,previous,time)=>{const ids=new Set(active.map(f=>f.trackId));return [...active,...(previous||[]).filter(f=>!ids.has(f.trackId)&&time-f.lastSeen<=450)].slice(0,8);};
function displacement(previous,current,points){
 const a=points[33],b=points[263];if(!a||!b)return null;
 const eye=Math.hypot((a.x-b.x)*previous.width,(a.y-b.y)*previous.height),level=eye>140?3:2,factor=2**level;
 const p=previous.pyramid.data[level],q=current.pyramid.data[level],w=p.cols,h=p.rows;
 const cx=(a.x+b.x)*previous.width/(2*factor),cy=((a.y+b.y)*previous.height/2+eye*.3)/factor;
 const rx=Math.max(3,Math.round(eye*.55/factor)),ry=Math.max(3,Math.round(eye*.5/factor)),samples=[];
 let sum=0,square=0;
 for(let y=-ry;y<=ry;y+=2)for(let x=-rx;x<=rx;x+=2){const ix=Math.round(cx+x),iy=Math.round(cy+y);if(ix<1||iy<1||ix>=w-1||iy>=h-1)continue;const v=p.data[iy*w+ix];samples.push({x:ix,y:iy,v});sum+=v;square+=v*v;}
 const n=samples.length,variance=square-sum*sum/n;if(n<12||variance/n<12)return null;
 const radius=Math.min(28,Math.ceil(Math.max(eye*.95,previous.width*.12)/factor));let best=-1,move=null;
 for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){
  let s=0,ss=0,cross=0,valid=true;
  for(const v of samples){const x=v.x+dx,y=v.y+dy;if(x<0||y<0||x>=w||y>=h){valid=false;break;}const value=q.data[y*w+x];s+=value;ss+=value*value;cross+=v.v*value;}
  if(!valid)continue;const denom=Math.sqrt(variance*(ss-s*s/n));if(denom<1e-6)continue;const score=(cross-sum*s/n)/denom;
  if(score>best){best=score;move={x:dx*factor,y:dy*factor};}
 }
 return best>.86?move:null;
}
export function similarity(from,to){
  const n=from.length;if(n<4)return null;
  let x=0,y=0,u=0,v=0;for(let i=0;i<n;i++){x+=from[i].x;y+=from[i].y;u+=to[i].x;v+=to[i].y;}x/=n;y/=n;u/=n;v/=n;
  let den=0,a=0,b=0;for(let i=0;i<n;i++){const px=from[i].x-x,py=from[i].y-y,qx=to[i].x-u,qy=to[i].y-v;den+=px*px+py*py;a+=px*qx+py*qy;b+=px*qy-py*qx;}
  if(den<1e-6)return null;a/=den;b/=den;return {a,b,x:u-a*x+b*y,y:v-b*x-a*y};
}
export const transform=(p,m)=>({x:m.a*p.x-m.b*p.y+m.x,y:m.b*p.x+m.a*p.y+m.y});
export class MotionTracker{
  constructor({library=null,maxEdge=480}={}){this.lib=library;this.maxEdge=maxEdge;this.serial=0;this.trackSerial=0;this.reset();}
  async init(){this.lib ||= await engine();this.canvas=document.createElement('canvas');this.ctx=this.canvas.getContext('2d',{willReadFrequently:true});}
  reset({anchors=[]}={}){this.history=[];this.faces=[];this.anchors=anchors;this.lastVideoTime=-1;this.updates=0;this.cost=0;this.recoveries=0;this.current=null;}
  get hasFaces(){return this.faces.length>0;}
  resumePaused(time){
    // An imported clip does not move while inference or the user pauses it.
    // Preserve that valid anchor instead of treating the pause as lost frames.
    if(!this.current)return;const delta=time-this.current.time;if(delta<=0)return;
    const seen=new Set();
    for(const frame of this.history){frame.time+=delta;for(const face of [...(frame.faces||[]),...(frame.identities||[])])if(!seen.has(face)){seen.add(face);for(const key of ['seeded','modelTime','lastSeen'])if(Number.isFinite(face[key]))face[key]+=delta;}}
  }
  tick(source,time){
    if(!this.lib||!this.ctx||source.readyState<2||source.currentTime===this.lastVideoTime)return false;
    this.lastVideoTime=source.currentTime;this.capture(source,time);return true;
  }
  capture(source,time){
    const w=source.videoWidth||source.width,h=source.videoHeight||source.height,s=Math.min(1,this.maxEdge/Math.max(w,h)),cw=Math.round(w*s),ch=Math.round(h*s);
    if(this.canvas.width!==cw||this.canvas.height!==ch){this.canvas.width=cw;this.canvas.height=ch;this.history=[];this.faces=[];}
    this.ctx.drawImage(source,0,0,cw,ch);const rgba=this.ctx.getImageData(0,0,cw,ch).data;
    if(!this.gray||this.gray.cols!==cw||this.gray.rows!==ch)this.gray=new this.lib.matrix_t(cw,ch,this.lib.U8_t|this.lib.C1_t);
    this.lib.imgproc.grayscale(rgba,cw,ch,this.gray);return this.push(this.gray.data,cw,ch,time);
  }

  push(gray,width,height,time){
    const started=performance.now(),lib=this.lib,pyramid=new lib.pyramid_t(4);pyramid.allocate(width,height,lib.U8_t|lib.C1_t);pyramid.data[0].data.set(gray);pyramid.build(pyramid.data[0],true);
    const frame={id:++this.serial,time,width,height,pyramid};
    if(this.current&&this.current.width===width&&this.current.height===height&&time-this.current.time<300){this.faces=this.follow(this.faces,this.current,frame);}else this.faces=[];
    frame.faces=this.faces;frame.identities=identities(this.faces,this.current?.identities,time);this.current=frame;this.history.push(frame);while(this.history.length>240||this.history[0]?.time<time-4000)this.history.shift();
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
      const run=(next,offset={x:0,y:0})=>{
       ok.fill(0);backOk.fill(0);lib.optical_flow_lk.track(previous.pyramid,next,before,after,count,13,18,ok,.015,.0001);
       lib.optical_flow_lk.track(next,previous.pyramid,after,back,count,13,15,backOk,.02,.0001);
       const pairs=[];for(let i=0;i<count;i++)if(ok[i]&&backOk[i]&&Math.hypot(back[i*2]-before[i*2],back[i*2+1]-before[i*2+1])<1.25)pairs.push({p:{x:before[i*2],y:before[i*2+1]},q:{x:after[i*2]+offset.x,y:after[i*2+1]+offset.y}});return pairs;
      };
      let pairs=run(current.pyramid);
      if(pairs.length<Math.max(6,count*.45)){
       // Coarse normalized correlation reacquires a fast translation, then LK
       // refines roll/scale at subpixel resolution and verifies it backwards.
       const move=displacement(previous,current,face.points);
       if(move&&(move.x||move.y)){
        const aligned=new lib.pyramid_t(4);aligned.allocate(current.width,current.height,lib.U8_t|lib.C1_t);const dst=aligned.data[0].data,src=current.pyramid.data[0].data,w=current.width,h=current.height;
        for(let y=0;y<h;y++)for(let x=0;x<w;x++){const sx=x+move.x,sy=y+move.y;dst[y*w+x]=sx>=0&&sy>=0&&sx<w&&sy<h?src[sy*w+sx]:0;}
        aligned.build(aligned.data[0],true);const recovered=run(aligned,move);if(recovered.length>pairs.length){pairs=recovered;this.recoveries++;}
       }
      }
      if(pairs.length<6)continue;
      const dx=median(pairs.map(v=>v.q.x-v.p.x)),dy=median(pairs.map(v=>v.q.y-v.p.y));
      let good=pairs.filter(v=>Math.hypot(v.q.x-v.p.x-dx,v.q.y-v.p.y-dy)<5),m=similarity(good.map(v=>v.p),good.map(v=>v.q));if(!m)continue;
      good=good.filter(v=>{const p=transform(v.p,m);return Math.hypot(p.x-v.q.x,p.y-v.q.y)<1.8;});
      if(good.length<6)continue;m=similarity(good.map(v=>v.p),good.map(v=>v.q));const scale=Math.hypot(m.a,m.b);if(scale<.8||scale>1.25||Math.abs(Math.atan2(m.b,m.a))>.3)continue;
      const points=face.points.map(p=>p?(()=>{const q=transform({x:p.x*current.width,y:p.y*current.height},m);return{x:q.x/current.width,y:q.y/current.height};})():p);
      const nose=points[5];if(!nose||nose.x<0||nose.y<0||nose.x>1||nose.y>1)continue;
      let features=good.map(v=>v.q);const reseed=features.length<12||current.time-face.seeded>700;if(reseed)features=this.features(points,current);
      const dt=(current.time-previous.time)/1000,n=points[5],old=face.points[5];
      output.push({...face,points,features,samples:(face.samples||0)+1,vx:dt>0?((n.x-old.x)/dt)*.75+(face.vx||0)*.25:0,vy:dt>0?((n.y-old.y)/dt)*.75+(face.vy||0)*.25:0,lastSeen:current.time,seeded:reseed?current.time:face.seeded,modelTime:face.modelTime});
    }
    return output.filter(face=>current.time-face.modelTime<1500);
  }
  seed(landmarks,frameId){
    const index=this.history.findIndex(f=>f.id===frameId);if(index<0)return false;
    const start=this.history[index],references=start.identities?.length?start.identities:this.anchors.map(f=>({...f,lastSeen:start.time}));
    let faces=associateFaces(references,landmarks,start.time,()=>++this.trackSerial).map(f=>({...f,features:this.features(f.points,start),seeded:start.time,modelTime:start.time}));
    start.faces=faces;start.identities=identities(faces,references,start.time);this.anchors=[];
    for(let i=index+1;i<this.history.length;i++){faces=this.follow(faces,this.history[i-1],this.history[i]);this.history[i].faces=faces;this.history[i].identities=identities(faces,this.history[i-1].identities,this.history[i].time);}
    this.faces=faces;return true;
  }
  landmarks(){return this.faces.map(face=>Object.assign(face.points,{trackId:face.trackId}));}
}
