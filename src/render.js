// Curve the original artwork over the bridge; shortened side follows head yaw.
export function drawBandage(ctx,image,pose){
  const width=pose.width,height=width*100/320,yaw=pose.yaw||0,slices=24;
  const point=t=>{const u=t*2-1;return{x:u*width*.5*(1-yaw*.35*Math.sign(u)),y:Math.pow(Math.abs(u),1.45)*height*.64};};
  ctx.save();ctx.translate(pose.x,pose.y);ctx.rotate(pose.angle);ctx.globalAlpha=.97;
  for(let i=0;i<slices;i++){
    const a=point(i/slices),b=point((i+1)/slices),dw=b.x-a.x,slope=(b.y-a.y)/dw;
    ctx.save();ctx.transform(1,slope,0,1,a.x,a.y);ctx.drawImage(image,i*image.width/slices,0,image.width/slices,image.height,0,-height/2,dw+.35,height);ctx.restore();
  }
  ctx.restore();
}
