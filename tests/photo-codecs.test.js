import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const root=new URL('../',import.meta.url);
async function decode(path,mime){
 const bytes=fs.readFileSync(new URL('qa/fixtures/'+path,root)),buffer=Uint8Array.from(bytes).buffer;
 return new Promise((resolve,reject)=>{
  const sandbox={console,Uint8Array,Uint8ClampedArray,DataView,ArrayBuffer,TextDecoder,TextEncoder,setTimeout,clearTimeout,WebAssembly,ImageData:class{constructor(width,height){this.width=width;this.height=height;this.data=new Uint8ClampedArray(width*height*4);}},postMessage:message=>message.error?reject(new Error(message.error)):resolve(message)};
  sandbox.self=sandbox;const context=vm.createContext(sandbox);sandbox.importScripts=(...paths)=>{for(const p of paths)vm.runInContext(fs.readFileSync(new URL(p,new URL('src/photo-worker.js',root)),'utf8'),context,{filename:p});};
  try{vm.runInContext(fs.readFileSync(new URL('src/photo-worker.js',root),'utf8'),context);sandbox.onmessage({data:{buffer,mime}}).catch(reject);}catch(e){reject(e);}
 });
}
test('real JPEG, screenshot PNG, TIFF and HEIC compatibility decoders produce nonempty RGBA pixels',async()=>{
 for(const [path,mime,w,h] of [['portrait.jpg','image/jpeg',384,384],['screenshot.png','image/png',690,1536],['portrait.tiff','image/tiff',384,384],['shapes.heic','image/heic',320,240]]){
  const image=await decode(path,mime);assert.equal(image.width,w,path);assert.equal(image.height,h,path);assert.equal(image.rgba.byteLength,w*h*4,path);assert(new Uint8Array(image.rgba).some(x=>x>0),path);
 }
});
test('corrupt compatibility inputs fail rather than producing a ranked blank image',async()=>{
 await assert.rejects(decode('not-a-picture.txt','image/jpeg'));await assert.rejects(decode('not-a-picture.txt','image/tiff'));
});
