// Phone file providers sometimes omit or mislabel MIME types. Inspect bytes and
// let the browser decoder decide; no selected media leaves this browser.
export function imageMime(bytes){
 const b=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes),ascii=(a,z)=>String.fromCharCode(...b.slice(a,z));
 if(b[0]===255&&b[1]===216&&b[2]===255)return'image/jpeg';
 if(b[0]===137&&ascii(1,4)==='PNG')return'image/png';
 if(ascii(0,4)==='RIFF'&&ascii(8,12)==='WEBP')return'image/webp';
 if(ascii(0,3)==='GIF')return'image/gif';
 if(ascii(0,2)==='BM')return'image/bmp';
 if(ascii(4,8)==='ftyp'){const brands=ascii(8,64);if(/avif|avis/.test(brands))return'image/avif';if(/heic|heix|hevc|hevx|mif1|msf1/.test(brands))return'image/heic';}
 return null;
}
export function photoSelection(files){
 const selected=[],skipped=[];let bytes=0;
 for(const file of files){if(selected.length===10){skipped.push('Choose up to 10 photos at a time.');break;}if(file.size>35*1024*1024){skipped.push(file.name+' is over 35 MB.');continue;}if(bytes+file.size>100*1024*1024){skipped.push('This set is over 100 MB. Choose fewer photos.');continue;}selected.push(file);bytes+=file.size;}
 return{selected,message:[...new Set(skipped)].join(' ')};
}
function bounded(promise,milliseconds=20000){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Opening this photo took too long. Try a smaller JPG or PNG.')),milliseconds);promise.then(value=>{clearTimeout(timer);resolve(value);},error=>{clearTimeout(timer);reject(error);});});}
export async function decodePhoto(file){
 if(!file?.size)throw new Error('This file is empty. Choose a JPG, PNG, WebP or another photo.');
 if(file.size>35*1024*1024)throw new Error('That photo is over 35 MB. Choose a smaller copy.');
 const mime=imageMime(await file.slice(0,64).arrayBuffer()),blob=mime&&file.type!==mime?new Blob([file],{type:mime}):file;
 if(!mime&&!file.type?.startsWith('image/')&&!/\.(jpe?g|png|webp|gif|avif|bmp|heic|heif|svg)$/i.test(file.name||''))throw new Error('That file is not a recognized photo. Choose JPG, PNG, WebP or AVIF.');
 let image,url;
 try{
  try{image=await bounded(createImageBitmap(blob,{imageOrientation:'from-image'}));}
  catch{url=URL.createObjectURL(blob);image=new Image();image.src=url;await bounded(image.decode());}
  const sw=image.width||image.naturalWidth,sh=image.height||image.naturalHeight;if(!sw||!sh)throw new Error('The image has no readable dimensions.');
  const scale=Math.min(1,2560/Math.max(sw,sh)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(sw*scale));c.height=Math.max(1,Math.round(sh*scale));c.getContext('2d').drawImage(image,0,0,c.width,c.height);return c;
 }catch{
  if(mime==='image/heic'||/\.hei[cf]$/i.test(file.name||''))throw new Error('This browser cannot open this HEIC/HEIF photo. Save or export a JPG/PNG copy in your gallery, then choose it here.');
  throw new Error('This photo could not be opened. Try a JPG, PNG or WebP copy, or choose a smaller photo.');
 }finally{image?.close?.();if(url)URL.revokeObjectURL(url);}
}
