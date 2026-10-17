// Fuse a fresh neural pose with independently validated CURRENT-frame flow.
// This damps detector jitter without averaging old frames into a moving face.
export function fuseLandmarks(observed,flowed,width,height){
 const old=flowed?.points,n=observed?.[5],p=old?.[5],a=observed?.[33],b=observed?.[263];
 if(!n||!p||!a||!b||!old?.[33]||!old?.[263]||(flowed.quality??1)<.5)return observed;
 const span=Math.hypot((a.x-b.x)*width,(a.y-b.y)*height),previous=Math.hypot((old[33].x-old[263].x)*width,(old[33].y-old[263].y)*height);
 if(span<5||!previous)return observed;
 const delta=Math.hypot((n.x-p.x)*width,(n.y-p.y)*height)/span;
 const angle=Math.atan2((b.y-a.y)*height,(b.x-a.x)*width)-Math.atan2((old[263].y-old[33].y)*height,(old[263].x-old[33].x)*width);
 if(delta>.18||Math.abs(Math.log(span/previous))>.15||Math.abs(Math.atan2(Math.sin(angle),Math.cos(angle)))>.15)return observed;
 const weight=delta<.07?.45:.8;
 return observed.map((point,i)=>point&&old[i]?{...point,x:point.x*weight+old[i].x*(1-weight),y:point.y*weight+old[i].y*(1-weight)}:point);
}
