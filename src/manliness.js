// A fictional, repeatable game score. No gender, identity, attractiveness or
// personality is inferred. Only an image fingerprint and known plaster count.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function hashSeed(text){let h=2166136261;for(const c of text){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
const COS=Array.from({length:8},(_,u)=>Array.from({length:32},(_,x)=>Math.cos((2*x+1)*u*Math.PI/64)));
export function fingerprint(rgba,width=32,height=32){
 const gray=new Float64Array(1024);let red=0,green=0,blue=0;
 for(let y=0;y<32;y++)for(let x=0;x<32;x++){const p=(Math.min(height-1,Math.floor(y*height/32))*width+Math.min(width-1,Math.floor(x*width/32)))*4,r=rgba[p],g=rgba[p+1],b=rgba[p+2];gray[y*32+x]=r*.299+g*.587+b*.114;red+=r;green+=g;blue+=b;}
 const dct=[];for(let v=0;v<8;v++)for(let u=0;u<8;u++){if(!u&&!v)continue;let value=0;for(let y=0;y<32;y++)for(let x=0;x<32;x++)value+=gray[y*32+x]*COS[u][x]*COS[v][y];dct.push(value);}
 const sorted=[...dct].sort((a,b)=>a-b),median=sorted[31];let bits=0n;for(let i=0;i<dct.length;i++)if(dct[i]>median)bits|=1n<<BigInt(i);
 const luma=[];for(let by=0;by<8;by++)for(let bx=0;bx<8;bx++){let value=0;for(let y=by*4;y<by*4+4;y++)for(let x=bx*4;x<bx*4+4;x++)value+=gray[y*32+x];luma.push(Math.round(value/16/8));}
 return{hash:bits.toString(16).padStart(16,'0'),palette:[red,green,blue].map(v=>Math.round(v/1024/16)),luma};
}
export function hashDistance(a,b){let n=BigInt('0x'+a)^BigInt('0x'+b),count=0;while(n){n&=n-1n;count++;}return count;}
export function ratingFamily(mark,history=[]){
 const valid=history.filter(v=>/^[0-9a-f]{16}$/.test(v.hash)&&Array.isArray(v.palette)&&v.palette.length===3&&Number.isInteger(v.seed)&&Number.isFinite(v.aspect));
 const exact=valid.find(v=>v.hash===mark.hash&&v.palette.every((n,i)=>n===mark.palette[i])&&Math.abs(v.aspect-mark.aspect)<.01);if(exact)return{entry:exact,history:valid,near:false};
 const lightDistance=v=>{if(!Array.isArray(v.luma)||v.luma.length!==64||!mark.luma)return Infinity;const offsets=v.luma.map((n,i)=>n-mark.luma[i]),mean=offsets.reduce((a,b)=>a+b,0)/64;return offsets.reduce((sum,n)=>sum+Math.abs(n-mean),0)/64;};
 const nearest=valid.map(v=>({v,d:hashDistance(v.hash,mark.hash),light:lightDistance(v),color:v.palette.reduce((n,c,i)=>n+Math.abs(c-mark.palette[i]),0)})).filter(v=>(v.d<=9||v.light<.65)&&v.color<=5&&Math.abs(v.v.aspect-mark.aspect)<.12).sort((a,b)=>a.d-b.d)[0];
 const seed=nearest?nearest.v.seed:hashSeed(mark.hash+':'+mark.palette.join(',')+':'+mark.aspect.toFixed(2)),entry={...mark,seed};
 return{entry,history:[...valid,entry].slice(-200),near:!!nearest};
}
export function manlinessScore(seed,plasters=0){const base=1+hashSeed(seed+':base')%499;if(plasters<=0)return base;return Math.min(999,500+hashSeed(seed+':plastered')%500+Math.min(4,Math.max(0,plasters-1))*25);}
const LEGACY=['May require a larger doorway.','Dinosaurs are asking for tips.','Officially too powerful for errands.','The meter has resigned.','Your nose has been promoted.','Small plaster. Enormous authority.','Approved by absolutely no scientists.','Could open a slightly stubborn jar.','Your reflection asked for a selfie.'];
const SUBJECTS=['Your nose','This photograph','Your reflection','The tiny-patch committee','Your selfie','The camera','The local dinosaur council','A very serious robot','Your imaginary bodyguard','The neighbourhood doorframe','A suspiciously confident hamster','The department of dramatic entrances','Three capybaras in a trench coat','The emergency snack committee','The council of mildly heavy things','A goose with a clipboard','The professional sticker inspector','The miniature forklift union','Your official tiny crown','The nearby gym equipment','A committee of plastic dinosaurs','The invisible trophy cabinet','The Manly Lab intern','A very small but determined shark'];
const ACTIONS=['has been promoted to','has accidentally become','now outranks','just defeated','has been appointed','is negotiating with','has declared itself','is now supervised by','has challenged','is demanding a meeting with','has confused itself with','is applying to become','is being interviewed by','has hired','is receiving tips from','has alarmed','has received a letter from','is wearing the hat of','has requested backup from','has formally intimidated','has been adopted by','now has the authority of','has politely overpowered','is training to become'];
const TITLES=['Chief Dinosaur Officer','the Minister of Slightly Stubborn Jars','a forklift with feelings','the Supreme Snack Commander','a very dramatic mountain','the Head of Tiny Victories','three angry marshmallows','the Director of Loud Footsteps','a professional doorway inspector','the Admiral of Bath Toys','the CEO of Mild Inconvenience','a dragon with a juice box','the Grand Duke of Elbow Space','a robot who skipped leg day','the Captain of Excessive Confidence','the mayor of a blanket fort','a suspiciously powerful rubber duck','the Emperor of Emergency Biscuits','the Lord of Borrowed Dumbbells','a tank made from cardboard','the Senior Vice President of Roaring','an emotionally unavailable boulder','the Chief Velociraptor Wrangler','a toaster with leadership potential'];
const ENDINGS=['May require a larger doorway.','No dinosaurs were consulted.','The paperwork is covered in crayons.','The meter would like a nap.','A juice box has been issued.','Please alert the imaginary authorities.','Your certificate arrives by paper airplane.','All witnesses have requested stickers.','Science has left the group chat.','A tiny parade is being arranged.','The goose refuses to comment.','The gym is asking for an autograph.','Your cape is still in the wash.','Your badge is made of cereal.','This exceeds the recommended daily MANLINESS.','A professional adult has been informed.','Please use these powers for snack retrieval.','The emergency biscuits are on standby.','The doorway has filed a complaint.','The board meeting is in a treehouse.','A larger toy box may be necessary.','Approval was granted by a stuffed shark.','The trophy is a very shiny spoon.','No refunds on imaginary authority.'];
export const JOKE_COMBINATIONS=LEGACY.length+SUBJECTS.length*ACTIONS.length*TITLES.length*ENDINGS.length;
export function manlinessJoke(score,seed,variant=0){
 if(!variant)return `${score}% MANLY · ${LEGACY[hashSeed(seed+':legacy')%LEGACY.length]}`;
 let n=hashSeed(seed+':joke:'+variant),take=list=>{const value=list[n%list.length];n=Math.floor(n/list.length);return value;};
 return `${score}% MANLY · ${take(SUBJECTS)} ${take(ACTIONS)} ${take(TITLES)}. ${take(ENDINGS)}`;
}
