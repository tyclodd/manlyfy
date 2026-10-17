// Materialize file-provider bytes before decoding. No selected media is sent
// over the network; compatibility decoders are disposable local workers.
export const PHOTO_LIMIT=35*1024*1024;
const MAX_EDGE=2560;
const EXT={jpg:'image/jpeg',jpeg:'image/jpeg',jpe:'image/jpeg',jfif:'image/jpeg',png:'image/png',apng:'image/png',webp:'image/webp',gif:'image/gif',bmp:'image/bmp',avif:'image/avif',heic:'image/heic',heif:'image/heic',tif:'image/tiff',tiff:'image/tiff',svg:'image/svg+xml',ico:'image/x-icon',pdf:'application/pdf'};
export function imageMime(bytes){
 const b=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes),ascii=(a,z)=>String.fromCharCode(...b.slice(a,z));
 if(b[0]===255&&b[1]===216)return'image/jpeg';
 if(b[0]===137&&ascii(1,4)==='PNG')return'image/png';
 if(ascii(0,4)==='RIFF'&&ascii(8,12)==='WEBP')return'image/webp';
 if(ascii(0,3)==='GIF')return'image/gif';
 if(ascii(0,2)==='BM')return'image/bmp';
 if(ascii(0,4)==='II*\0'||ascii(0,4)==='MM\0*')return'image/tiff';
 if(b[0]===0&&b[1]===0&&b[2]===1&&b[3]===0)return'image/x-icon';
 if(ascii(0,1024).includes('%PDF-'))return'application/pdf';
 if(ascii(4,8)==='ftyp'){const brands=ascii(8,256);if(/avif|avis/.test(brands))return'image/avif';if(/heic|heix|hevc|hevx|mif1|msf1/.test(brands))return'image/heic';}
 if(/<svg[\s>]/i.test(ascii(0,2048)))return'image/svg+xml';return null;
}
export function photoMime(bytes,file={}){return imageMime(bytes)||EXT[(file.name||'').split('.').pop().toLowerCase()]||(file.type?.startsWith('image/')?file.type:null);}
export function jpegOrientation(bytes){
 const b=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes),v=new DataView(b.buffer,b.byteOffset,b.byteLength);
 try{for(let i=2;i+4<b.length;){if(b[i]!==255)break;const marker=b[i+1],length=v.getUint16(i+2);if(marker===218||marker===217||length<2)break;
  if(marker===225&&String.fromCharCode(...b.slice(i+4,i+10))==='Exif\0\0'){
   const start=i+10,little=v.getUint16(start)===0x4949,at=start+v.getUint32(start+4,little),n=v.getUint16(at,little);
   for(let j=0;j<Math.min(n,256);j++){const p=at+2+j*12;if(v.getUint16(p,little)===274){const o=v.getUint16(p+8,little);return o>=1&&o<=8?o:1;}}
  }i+=length+2;
 }}catch{}return 1;
}
export function photoSelection(files){
 const selected=[],skipped=[];let bytes=0;
 for(const file of files){if(selected.length===10){skipped.push('Choose up to 10 pictures or PDFs at a time.');break;}if(file.size>PHOTO_LIMIT){skipped.push(file.name+' is over 35 MB.');continue;}if(bytes+file.size>100*1024*1024){skipped.push('This set is over 100 MB. Choose fewer files.');continue;}selected.push(file);bytes+=file.size;}
 return{selected,message:[...new Set(skipped)].join(' ')};
}
function failure(message,code){return Object.assign(new Error(message),{code});}
function bounded(promise,milliseconds=15000,cleanup=()=>{}){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{cleanup();reject(failure('Opening this picture took too long. Try a smaller copy.','TIMEOUT'));},milliseconds);promise.then(value=>{clearTimeout(timer);resolve(value);},error=>{clearTimeout(timer);reject(error);});});}
function fileReader(blob,method){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.onabort=()=>reject(new Error('File reading was cancelled.'));reader[method](blob);});}
export async function readPhotoBytes(file){
 try{if(typeof file.arrayBuffer==='function')return await bounded(file.arrayBuffer());}catch{}
 try{return await bounded(fileReader(file,'readAsArrayBuffer'));}catch{throw failure('This file could not be read from your gallery. Download it to this device, then use Choose files.','FILE_ACCESS');}
}
function sizeCanvas(width,height){
 if(!(width>0&&height>0)||!Number.isFinite(width*height))throw new Error('The image has no readable dimensions.');
 if(width*height>80_000_000)throw failure('This picture is too large for phone editing. Choose a copy under 80 megapixels.','PIXEL_LIMIT');
 const scale=Math.min(1,MAX_EDGE/Math.max(width,height)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(width*scale));c.height=Math.max(1,Math.round(height*scale));
 if(!c.getContext('2d'))throw failure('Your browser could not make space for this picture. Close other tabs and try a smaller copy.','MEMORY');return c;
}
function paintImage(image){const c=sizeCanvas(image.naturalWidth||image.width,image.naturalHeight||image.height),cx=c.getContext('2d');cx.fillStyle='#fff';cx.fillRect(0,0,c.width,c.height);cx.drawImage(image,0,0,c.width,c.height);return c;}
async function imageElement(source){
 let image;const ready=new Promise((resolve,reject)=>{image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('Native image load failed.'));image.src=source;});
 try{return paintImage(await bounded(ready,12000,()=>{image.src='';}));}finally{image.onload=image.onerror=null;image.src='';}
}
async function nativePhoto(blob,{dataURL=false}={}){
 if(dataURL)return imageElement(await bounded(fileReader(blob,'readAsDataURL')));
 const url=URL.createObjectURL(blob);try{return await imageElement(url);}finally{URL.revokeObjectURL(url);}
}
async function bitmapPhoto(blob){
 if(typeof createImageBitmap!=='function')throw new Error('Bitmap decoder unavailable.');let expired=false,image;
 const request=createImageBitmap(blob,{imageOrientation:'from-image'}).then(value=>{if(expired){value.close();throw new Error('Bitmap load expired.');}return value;});
 try{image=await bounded(request,12000,()=>{expired=true;});return paintImage(image);}finally{image?.close();}
}
function compatibilityPixels(buffer,mime){return new Promise((resolve,reject)=>{
 let worker,timer;const finish=(error,result)=>{clearTimeout(timer);worker?.terminate();error?reject(error):resolve(result);};
 try{worker=new Worker(new URL('./photo-worker.js?v=1.5.0',import.meta.url));worker.onmessage=e=>e.data.error?finish(new Error(e.data.error)):finish(null,e.data);worker.onerror=()=>finish(new Error('The local picture converter could not load. Reconnect and try again.'));timer=setTimeout(()=>finish(new Error('Local picture conversion took too long. Try a smaller copy.')),45000);worker.postMessage({buffer,mime},[buffer]);}catch(error){finish(error);}
});}
function pixelsCanvas({width,height,rgba,orientation=1}){
 const data=new Uint8ClampedArray(rgba),swap=orientation>=5,c=sizeCanvas(swap?height:width,swap?width:height),raw=document.createElement('canvas');raw.width=width;raw.height=height;
 const cx=raw.getContext('2d');if(!cx)throw new Error('No image memory available.');cx.putImageData(new ImageData(data,width,height),0,0);
 const target=c.getContext('2d');target.fillStyle='#fff';target.fillRect(0,0,c.width,c.height);target.scale(c.width/(swap?height:width),c.height/(swap?width:height));
 const matrices={1:[1,0,0,1,0,0],2:[-1,0,0,1,width,0],3:[-1,0,0,-1,width,height],4:[1,0,0,-1,0,height],5:[0,1,1,0,0,0],6:[0,1,-1,0,height,0],7:[0,-1,-1,0,height,width],8:[0,-1,1,0,0,width]};target.transform(...(matrices[orientation]||matrices[1]));target.drawImage(raw,0,0);raw.width=raw.height=1;return c;
}
async function pdfPhoto(buffer){
 const pdf=await import('../assets/photo-codecs/pdf.min.mjs');pdf.GlobalWorkerOptions.workerSrc=new URL('../assets/photo-codecs/pdf.worker.min.mjs',import.meta.url).href;
 const task=pdf.getDocument({data:new Uint8Array(buffer),isEvalSupported:false,useWorkerFetch:false,useWasm:false,disableFontFace:true,useSystemFonts:true,enableXfa:false});task.onPassword=()=>{task.destroy();};
 try{const doc=await bounded(task.promise,30000,()=>task.destroy()),page=await doc.getPage(1),initial=page.getViewport({scale:1}),c=sizeCanvas(initial.width,initial.height),viewport=page.getViewport({scale:Math.min(2,MAX_EDGE/Math.max(initial.width,initial.height))});c.width=Math.max(1,Math.round(viewport.width));c.height=Math.max(1,Math.round(viewport.height));await bounded(page.render({canvasContext:c.getContext('2d'),viewport,background:'rgb(255,255,255)'}).promise,30000,()=>task.destroy());c.dataset.importNote=`PDF page 1 of ${doc.numPages}`;return c;}
 catch{throw failure('This PDF could not be opened. Choose an unlocked PDF or a screenshot of the page.','PDF_DECODE');}finally{await task.destroy().catch(()=>{});}
}
export async function decodePhoto(file,{onProgress=()=>{},forceCompatibility=false,preferDataURL=false}={}){
 if(!file?.size)throw failure('This file is empty. Choose a picture or a PDF.','EMPTY');if(file.size>PHOTO_LIMIT)throw failure('That file is over 35 MB. Choose a smaller copy.','FILE_LIMIT');
 onProgress('Opening your picture…');const buffer=await readPhotoBytes(file),bytes=new Uint8Array(buffer),mime=photoMime(bytes.subarray(0,2048),file),blob=new Blob([buffer],{type:mime||file.type||'application/octet-stream'});
 if(mime==='application/pdf'){onProgress('Opening page 1 of your PDF…');return pdfPhoto(buffer);}
 const canConvert=['image/jpeg','image/png','image/tiff','image/heic'].includes(mime),orientation=mime==='image/jpeg'?jpegOrientation(bytes):1;let last;
 if(!forceCompatibility)for(const open of preferDataURL?[()=>nativePhoto(blob,{dataURL:true}),()=>nativePhoto(blob),()=>bitmapPhoto(blob)]:[()=>nativePhoto(blob),()=>bitmapPhoto(blob)]){try{return await open();}catch(e){if(['PIXEL_LIMIT','MEMORY'].includes(e.code))throw e;last=e;}}
 if(canConvert){onProgress('Opening your picture another way…');try{const result=await compatibilityPixels(buffer.slice(0),mime);if(mime==='image/jpeg')result.orientation=orientation;return pixelsCanvas(result);}catch(e){last=e;}}
 if(!forceCompatibility&&!preferDataURL)try{return await nativePhoto(blob,{dataURL:true});}catch(e){last=e;}
 if(last)console.warn('Local picture opening failed:',mime||'unknown',last.message);
 if(!mime)throw failure('This file does not contain a supported picture. Choose an image or a PDF; documents, ZIP files and camera RAW files cannot be ranked.','NOT_IMAGE');
 if(mime==='image/heic'||mime==='image/tiff')throw failure('This '+(mime==='image/heic'?'HEIC/HEIF':'TIFF')+' picture could not be converted on this device. Try a smaller copy or a screenshot.','CONVERT_FAILED');
 throw failure('This picture could not be opened. Use Choose files and pick a downloaded copy, or try a screenshot. Your other selected pictures are still available.','DECODE_FAILED');
}
