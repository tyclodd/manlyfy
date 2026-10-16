// Curve original artwork over the bridge; the shorter side follows head yaw.
function paintCurve(ctx,image,width,yaw){
  const height=width*100/320,slices=24;
  const point=t=>{const u=t*2-1;return{x:u*width*.5*(1-yaw*.35*Math.sign(u)),y:Math.pow(Math.abs(u),1.45)*height*.64};};
  for(let i=0;i<slices;i++){
    const a=point(i/slices),b=point((i+1)/slices),dw=b.x-a.x,slope=(b.y-a.y)/dw;
    ctx.save();ctx.transform(1,slope,0,1,a.x,a.y);ctx.drawImage(image,i*image.width/slices,0,image.width/slices,image.height,0,-height/2,dw+.35,height);ctx.restore();
  }
}
const sprites=[];
function liveSprite(image,yaw){
  const bucket=Math.round(yaw*20)/20,index=sprites.findIndex(s=>s.image===image&&s.yaw===bucket);
  if(index>=0){const [entry]=sprites.splice(index,1);sprites.push(entry);return entry.canvas;}
  const canvas=document.createElement('canvas');canvas.width=384;canvas.height=192;const c=canvas.getContext('2d');c.translate(192,64);paintCurve(c,image,256,bucket);
  sprites.push({image,yaw:bucket,canvas});if(sprites.length>16)sprites.shift();return canvas;
}
export function drawBandage(ctx,image,pose,live=false){
  const yaw=pose.yaw||0;ctx.save();ctx.translate(pose.x,pose.y);ctx.rotate(pose.angle);ctx.globalAlpha=.97;
  if(live&&pose.width<=300){const sprite=liveSprite(image,yaw),s=pose.width/256;ctx.drawImage(sprite,-192*s,-64*s,384*s,192*s);}
  else paintCurve(ctx,image,pose.width,yaw);
  ctx.restore();
}
