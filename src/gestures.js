import {clamp,patchPose} from './core.js?v=1.3.1';
const center=points=>({x:points.reduce((s,p)=>s+p.x,0)/points.length,y:points.reduce((s,p)=>s+p.y,0)/points.length});
const distance=points=>points.length>1?Math.hypot(points[1].x-points[0].x,points[1].y-points[0].y):0;
const angle=points=>points.length>1?Math.atan2(points[1].y-points[0].y,points[1].x-points[0].x):0;
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
export function startGesture(patch,points,rect,mirrored=false){return{patch:{...patch},center:center(points),distance:distance(points),angle:angle(points),pose:patchPose(patch,rect,mirrored),count:points.length};}
export function moveGesture(start,points,rect,mirrored=false){
 const c=center(points),two=start.count>1&&points.length>1&&start.distance>1,raw=two?distance(points)/start.distance:1;
 const scale=clamp((start.patch.scale||1)*raw,.05,2.2),ratio=scale/(start.patch.scale||1),turn=two?wrap(angle(points)-start.angle):0;
 const dx=start.pose.x-start.center.x,dy=start.pose.y-start.center.y;
 const x=c.x+(dx*Math.cos(turn)-dy*Math.sin(turn))*ratio,y=c.y+(dx*Math.sin(turn)+dy*Math.cos(turn))*ratio;
 return{x:clamp(mirrored?1-(x-rect.x)/rect.width:(x-rect.x)/rect.width,0,1),y:clamp((y-rect.y)/rect.height,0,1),scale,rotation:wrap((start.patch.rotation||0)+turn)};
}
