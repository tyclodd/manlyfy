// The link is an unguessable local unlock, not a server authentication system.
// Only its SHA-256 digest is shipped. The private token is never sent in HTTP.
const KEY='manlyfy-master-access-v1';
export const MASTER_DIGEST='17a27965286f414c969f56fec7462b5c7fe99f822c820bdb7d220ec55f6e6530';
export async function masterAccess({hash=globalThis.location?.hash||'',storage,digest=MASTER_DIGEST}={}){
 try{storage ||= globalThis.localStorage;}catch{}
 const params=new URLSearchParams(hash.replace(/^#/,'')),token=params.get('master');
 let saved;try{saved=storage?.getItem(KEY);}catch{}
 const candidate=token||saved;if(!candidate)return false;
 try{
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(candidate));
  const actual=Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
  if(actual!==digest)return false;
  try{storage?.setItem(KEY,candidate);}catch{}
  if(token&&globalThis.history&&globalThis.location){params.delete('master');const rest=params.toString();history.replaceState(null,'',location.pathname+location.search+(rest?'#'+rest:''));}
  return true;
 }catch{return false;}
}
export function leaveMaster(storage){try{(storage||globalThis.localStorage)?.removeItem(KEY);}catch{}}
