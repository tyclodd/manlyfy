import test from 'node:test';
import assert from 'node:assert/strict';
import {imageMime,photoMime,photoSelection,readPhotoBytes,jpegOrientation,decodePhoto} from '../src/photos.js';
import {photoCrops} from '../src/photo-tracker.js';
test('photo decoding recognizes real image bytes despite missing or wrong file types',()=>{
 assert.equal(imageMime(Uint8Array.from([255,216,255,225,0,0])),'image/jpeg');assert.equal(imageMime(Uint8Array.from([137,80,78,71,13,10])),'image/png');
 assert.equal(imageMime(new TextEncoder().encode('RIFFxxxxWEBPdata')),'image/webp');assert.equal(imageMime(new TextEncoder().encode('not a photograph')),null);
});
test('batch photo selection bounds count and memory without discarding smaller valid choices',()=>{
 const files=Array.from({length:12},(_,i)=>({name:'photo'+i+'.jpg',size:1024}));assert.equal(photoSelection(files).selected.length,10);
 assert.match(photoSelection(files).message,/10/);const big={name:'huge.jpg',size:36*1024*1024};const selected=photoSelection([big,files[0]]);assert.equal(selected.selected.length,1);assert.match(selected.message,/35 MB/);
});
test('overlapping photo crops cover tall images without stretching face coordinates',()=>{
 const crops=photoCrops(720,1600);assert(crops.bands.length>=3);assert.equal(crops.bands[0].y,0);const last=crops.bands.at(-1);assert.equal(last.y+last.height,1600);
 for(const c of [...crops.bands,...crops.zoom]){assert(c.x>=0&&c.y>=0);assert(c.x+c.width<=720.01&&c.y+c.height<=1600.01);}
});
test('file contents override an incorrect extension or phone-provider MIME',()=>{
 const png=Uint8Array.from([137,80,78,71,13,10]);assert.equal(photoMime(png,{name:'video.mp4',type:'video/mp4'}),'image/png');
 assert.equal(photoMime(new Uint8Array(),{name:'PHOTO.JFIF',type:'application/octet-stream'}),'image/jpeg');
 assert.equal(photoMime(new Uint8Array(),{name:'picture',type:'image/webp'}),'image/webp');
 assert.equal(imageMime(new TextEncoder().encode('II*\0xxxx')),'image/tiff');assert.equal(imageMime(new TextEncoder().encode('MM\0*xxxx')),'image/tiff');
 assert.equal(imageMime(new TextEncoder().encode('%PDF-1.4\n')),'application/pdf');assert.equal(imageMime(new TextEncoder().encode('<?xml version="1.0"?><svg width="20"/>')),'image/svg+xml');
 assert.equal(imageMime(new TextEncoder().encode('xxxxftypheicxxxx')),'image/heic');assert.equal(imageMime(new TextEncoder().encode('xxxxftypavifxxxx')),'image/avif');
 assert.equal(photoMime(new TextEncoder().encode('a document'),{name:'letter.docx',type:'application/msword'}),null);
});
test('EXIF orientation is recovered without trusting malformed metadata',()=>{
 const b=new Uint8Array(40),v=new DataView(b.buffer);b.set([255,216,255,225]);v.setUint16(4,34);b.set(new TextEncoder().encode('Exif\0\0'),6);b.set([73,73,42,0],12);v.setUint32(16,8,true);v.setUint16(20,1,true);v.setUint16(22,274,true);v.setUint16(24,3,true);v.setUint32(26,1,true);
 for(let orientation=1;orientation<=8;orientation++){v.setUint16(30,orientation,true);assert.equal(jpegOrientation(b),orientation);}assert.equal(jpegOrientation(b.subarray(0,15)),1);
});
test('failed Blob arrayBuffer reading falls back to FileReader for file providers',async()=>{
 const prior=globalThis.FileReader,expected=Uint8Array.from([1,2,3]).buffer;let read=false;
 globalThis.FileReader=class{readAsArrayBuffer(){read=true;this.result=expected;queueMicrotask(()=>this.onload());}};
 try{const bytes=await readPhotoBytes({arrayBuffer:()=>Promise.reject(new Error('Provider unavailable'))});assert.equal(bytes,expected);assert.equal(read,true);}finally{if(prior===undefined)delete globalThis.FileReader;else globalThis.FileReader=prior;}
});
test('image onload succeeds even when Image.decode and createImageBitmap are unavailable',async()=>{
 const priorImage=globalThis.Image,priorDocument=globalThis.document;let painted=false;
 globalThis.Image=class{naturalWidth=690;naturalHeight=1536;set src(value){if(value)queueMicrotask(()=>this.onload?.());}decode(){throw new Error('Broken native decode');}};
 globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},drawImage(){painted=true;}})})};
 try{const image=await decodePhoto(new File([Uint8Array.from([255,216,255,217])],'screenshot.jpg',{type:'application/octet-stream'}));assert.equal(image.width,690);assert.equal(image.height,1536);assert.equal(painted,true);}finally{if(priorImage===undefined)delete globalThis.Image;else globalThis.Image=priorImage;if(priorDocument===undefined)delete globalThis.document;else globalThis.document=priorDocument;}
});
