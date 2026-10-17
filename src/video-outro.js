export const OUTRO_DURATION=3000;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function text(ctx,label,x,y,size,maxWidth,color='#49345f'){
 ctx.fillStyle=color;ctx.font=`900 ${size}px Arial, sans-serif`;
 const measured=ctx.measureText(label).width;if(measured>maxWidth)ctx.font=`900 ${size*maxWidth/measured}px Arial, sans-serif`;
 ctx.fillText(label,x,y);
}
export function drawOutro(ctx,logo,elapsed){
 const w=ctx.canvas.width,h=ctx.canvas.height,s=Math.min(w,h),t=clamp(elapsed/OUTRO_DURATION,0,1),pop=1-Math.pow(1-clamp(t*3,0,1),3);
 ctx.save();ctx.globalAlpha=1;ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#fff9ed';ctx.fillRect(0,0,w,h);
 const wash=ctx.createRadialGradient(w*.5,h*.43,0,w*.5,h*.43,Math.max(w,h)*.7);wash.addColorStop(0,'#dfc8ff');wash.addColorStop(1,'#fff9ed');ctx.fillStyle=wash;ctx.fillRect(0,0,w,h);
 ctx.strokeStyle='#b4a0c2';ctx.globalAlpha=.25;ctx.lineWidth=Math.max(1,s/600);const grid=s/12;
 for(let x=grid/2;x<w;x+=grid)for(let y=grid/2;y<h;y+=grid){ctx.beginPath();ctx.arc(x,y,Math.max(1,s/350),0,Math.PI*2);ctx.stroke();}ctx.globalAlpha=1;
 for(let i=0;i<14;i++){
  const a=i*Math.PI*2/14+t*.8,r=s*(.28+.12*pop),x=w/2+Math.cos(a)*r,y=h*.43+Math.sin(a)*r*.85;
  ctx.save();ctx.translate(x,y);ctx.rotate(a+t*2);ctx.fillStyle=['#bfea84','#f5c665','#a986ca','#94d1e4'][i%4];ctx.fillRect(-s*.006,-s*.018,s*.012,s*.036);ctx.restore();
 }
 const size=s*(.27+.1*pop)*(1+Math.sin(t*Math.PI*5)*.025),cy=h*.40;
 ctx.save();ctx.translate(w/2,cy);ctx.rotate(Math.sin(t*Math.PI*4)*.06*(1-t));ctx.shadowColor='#72508b44';ctx.shadowBlur=s*.03;ctx.shadowOffsetY=s*.012;ctx.drawImage(logo,-size/2,-size/2,size,size);ctx.restore();
 ctx.textAlign='center';ctx.textBaseline='middle';
 const titleY=cy+s*.29;ctx.globalAlpha=clamp((t-.12)*5,0,1);
 text(ctx,"IT’S MANLY NOW.",w/2,titleY,s*.07,w*.86);
 text(ctx,'MANLYFY',w/2,titleY+s*.085,s*.045,w*.8,'#8157a7');
 ctx.globalAlpha=clamp((t-.25)*4,0,1);text(ctx,'The Manliest Camera on Earth.',w/2,titleY+s*.15,s*.023,w*.84);
 text(ctx,'tyclodd.github.io/manlyfy',w/2,h-s*.065,s*.021,w*.84,'#715c80');ctx.restore();
}
export function playOutro(ctx,logo,{signal,onProgress=()=>{}}={}){
 return new Promise(resolve=>{let timer,finished=false;const start=performance.now();
  const finish=complete=>{if(finished)return;finished=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);resolve(complete);},abort=()=>finish(false);
  const tick=()=>{if(signal?.aborted)return finish(false);try{const elapsed=Math.min(OUTRO_DURATION,performance.now()-start);drawOutro(ctx,logo,elapsed);onProgress(elapsed);if(elapsed>=OUTRO_DURATION)finish(true);else timer=setTimeout(tick,1000/30);}catch{finish(false);}};
  signal?.addEventListener('abort',abort,{once:true});tick();
 });
}
