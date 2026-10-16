import {FaceTracker} from '../src/tracker.js?v=1.2.2';
import {MotionTracker,transform} from '../src/motion.js?v=1.2.2';
import {landmarkToPatch,patchPose} from '../src/core.js?v=1.2.2';
import {drawBandage} from '../src/render.js?v=1.2.2';
import {loadPatchImage} from '../src/designs.js?v=1.2.2';
const $=id=>document.getElementById(id);
$('run').onclick=async()=>{
 $('run').disabled=true;$('results').textContent='Loading local models…';const tracker=new FaceTracker(),motion=new MotionTracker({maxEdge:$('lite').checked?256:320}),c=$('preview'),cx=c.getContext('2d'),source=document.createElement('canvas');source.width=512;source.height=512;const sx=source.getContext('2d',{willReadFrequently:true});
 let finished=false;
 try{
  const image=new Image();image.src='../assets/demo-astronaut.png';await image.decode();const patch=await loadPatchImage('dino');await Promise.all([tracker.init(),motion.init()]);
  const matrix=t=>{const angle=Math.sin(t/950)*.10,scale=.94;return{a:Math.cos(angle)*scale,b:Math.sin(angle)*scale,x:256-Math.cos(angle)*scale*256+Math.sin(angle)*scale*256+Math.sin(t/1300)*25,y:256-Math.sin(angle)*scale*256-Math.cos(angle)*scale*256};};
  const draw=t=>{sx.fillStyle='#27302a';sx.fillRect(0,0,512,512);const m=matrix(t);sx.save();sx.transform(m.a,m.b,-m.b,m.a,m.x,m.y);sx.drawImage(image,0,0);sx.restore();return m;};
  draw(0);const initial=await tracker.detect(source,'VIDEO',1,$('lite').checked?480:720);if(!initial.length)throw new Error('Initial NASA face not found.');
  const n=initial[0][5],base={x:(n.x*512-256)/.94+256,y:(n.y*512-256)/.94+256};
  const start=performance.now(),errors=[],costs=[];let lastFlow=0,lastScan=-1000,frames=0,covered=0,scans=0,inflight=null,heartbeats=0;
  const heartbeat=setInterval(()=>heartbeats++,50);
  const capture=now=>motion.capture(source,now);
  capture(start);motion.seed(initial,motion.current.id);
  await new Promise((resolve,reject)=>{
   const tick=now=>{if(finished)return;try{
    const t=now-start,m=draw(t);
    if(now-lastFlow>=1000/($('lite').checked?20:30)){
      lastFlow=now;capture(now);frames++;costs.push(motion.cost);const lm=motion.landmarks()[0];if(lm){covered++;const expected=transform(base,m);errors.push(Math.hypot(lm[5].x*512-expected.x,lm[5].y*512-expected.y));}
    }
    cx.drawImage(source,0,0);for(const lm of motion.landmarks()){const p=landmarkToPatch(lm,512,512);if(p)drawBandage(cx,patch,patchPose(p,{x:0,y:0,width:512,height:512}));}
    if(!tracker.busy&&now-lastScan>600){lastScan=now;const id=motion.current.id;inflight=tracker.detect(motion.canvas,'VIDEO',1,$('lite').checked?480:720).then(found=>{if(!finished){scans++;motion.seed(found,id);}}).catch(reject);}
    $('results').textContent=`RUNNING · ${document.visibilityState} · ${tracker.backend} · ${frames} motion frames · ${scans} neural scans · ${heartbeats} UI heartbeats`;
    if(t>=12000){finished=true;clearInterval(heartbeat);const sorted=errors.sort((a,b)=>a-b),mean=errors.reduce((a,b)=>a+b,0)/errors.length,p95=sorted[Math.floor(sorted.length*.95)],fps=frames/t*1000,coverage=covered/frames,meanCost=costs.reduce((a,b)=>a+b,0)/costs.length;
     $('results').textContent=`${coverage>.9&&mean<7&&p95<12&&fps>=12?'PASS':'FAIL'} · ${$('lite').checked?'Lite':'Balanced'} motion benchmark\nBackend: ${tracker.backend}\nCapture clock: 30 Hz timer (not display refresh rate); page ${document.visibilityState}\nMotion updates: ${frames} / ${(t/1000).toFixed(2)} s = ${fps.toFixed(1)} fps\nTracked coverage: ${(coverage*100).toFixed(1)}%\nNeural scans during motion: ${scans}\nNose error vs known transform: mean ${mean.toFixed(2)} px, p95 ${p95.toFixed(2)} px (512 px source)\nMean flow cost: ${meanCost.toFixed(2)} ms\nUI heartbeat: ${heartbeats} / expected ${Math.floor(t/50)}\nNOT VERIFIED: real Android hardware, actual head yaw or physical camera.\nFINISHED`;resolve();
    }else setTimeout(()=>tick(performance.now()),1000/30);
   }catch(e){clearInterval(heartbeat);reject(e);}};setTimeout(()=>tick(performance.now()),1000/30);
  });
  await inflight;
 }catch(e){finished=true;$('results').textContent='FAIL · '+e.stack;console.error(e);}finally{tracker.dispose();$('run').disabled=false;}
};
