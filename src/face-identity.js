// Short-lived spatial tracks, not face recognition. No photos or embeddings stored.
const nose=p=>p?.[5]||p?.[1];
const span=p=>p?.[33]&&p?.[263]?Math.hypot(p[33].x-p[263].x,p[33].y-p[263].y):.12;
export function associateFaces(previous,landmarks,time,nextId){
 const candidates=previous.filter(f=>time-f.lastSeen<=450&&nose(f.points)).slice(0,8);
 const observations=landmarks.filter(p=>nose(p)).slice(0,8);
 const costs=observations.map(points=>candidates.map(old=>{
  const n=nose(points),p=nose(old.points),dt=Math.max(0,Math.min(.2,(time-old.lastSeen)/1000));
  const x=p.x+(old.vx||0)*dt,y=p.y+(old.vy||0)*dt;
  const scale=Math.max(.045,span(points),span(old.points)),distance=Math.hypot(n.x-x,n.y-y),ratio=span(points)/span(old.points);
  if(distance>Math.max(.1,scale*1.65)||ratio<.42||ratio>2.4)return Infinity;
  return distance/scale+Math.abs(Math.log(ratio))*.45;
 }));
 // Minimum-cost one-to-one assignment avoids order-dependent greedy face swaps.
 const memo=new Map();
 function solve(index,mask){
  if(index===observations.length)return{cost:0,ids:[]};
  const key=index+':'+mask;if(memo.has(key))return memo.get(key);
  const fresh=solve(index+1,mask);let best={cost:2.5+fresh.cost,ids:[-1,...fresh.ids]};
  for(let j=0;j<candidates.length;j++)if(!(mask&(1<<j))&&Number.isFinite(costs[index][j])){
   const rest=solve(index+1,mask|(1<<j)),cost=costs[index][j]+rest.cost;
   if(cost<best.cost)best={cost,ids:[j,...rest.ids]};
  }
  memo.set(key,best);return best;
 }
 const matches=solve(0,0).ids;
 return observations.map((points,i)=>{
  const old=candidates[matches[i]],p=nose(old?.points),n=nose(points),dt=old?(time-old.lastSeen)/1000:0;
  const weight=old?.samples>1?.75:1;
  const vx=dt>.008?((n.x-p.x)/dt)*weight+(old.vx||0)*(1-weight):(old?.vx||0),vy=dt>.008?((n.y-p.y)/dt)*weight+(old.vy||0)*(1-weight):(old?.vy||0);
  return{points,trackId:old?.trackId||nextId(),lastSeen:time,vx,vy,samples:(old?.samples||0)+1};
 });
}
