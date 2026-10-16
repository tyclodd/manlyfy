// No account or server: lifetime photo progress belongs to this browser.
export const REWARDS = [
  ...[3,5,10,15,20,25,30,40,50,60,70,80,90,100].map(photos=>({photos,amount:1})),
  ...[150,175,200,230,260,300,350,400,450,500].map(photos=>({photos,amount:3})),
  ...[600,700,800,900].map(photos=>({photos,amount:5})),
  {photos:1000,amount:8}
];
export function cleanCount(value){return Number.isSafeInteger(value)&&value>=0?Math.min(value,1000000):0;}
export function progressAt(value,total=75){
  const photos=cleanCount(value);let unlocked=3,previous=0,next=null;
  for(const reward of REWARDS){if(photos>=reward.photos){unlocked+=reward.amount;previous=reward.photos;}else{next=reward;break;}}
  unlocked=Math.min(total,unlocked);
  return {photos,unlocked,next,previous,fraction:next?(photos-previous)/(next.photos-previous):1};
}
export function unlockPhoto(index){if(index<3)return 0;let count=3;for(const reward of REWARDS){count+=reward.amount;if(index<count)return reward.photos;}return 1000;}
