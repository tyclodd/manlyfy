// Disposable worker: heavy decoding cannot block the camera UI. The caller
// terminates this worker after completion, failure or a bounded timeout.
self.window=self;
const root='../assets/photo-codecs/';
function checkSize(width,height){if(!(width>0&&height>0)||width*height>32_000_000)throw new Error('Compatibility conversion supports pictures up to 32 megapixels. Try a smaller copy.');}
self.onmessage=async({data:{buffer,mime}})=>{
 try{
  let width,height,rgba,orientation=1;
  if(mime==='image/jpeg'){
   importScripts(root+'jpeg.js');const decoded=self['jpeg-js'].decode(new Uint8Array(buffer),{useTArray:true,formatAsRGBA:true,tolerantDecoding:true,maxResolutionInMP:32,maxMemoryUsageInMB:256});({width,height}=decoded);rgba=decoded.data;
  }else if(mime==='image/png'){
   const view=new DataView(buffer);checkSize(view.getUint32(16),view.getUint32(20));importScripts(root+'pako.min.js',root+'upng.js');const decoded=UPNG.decode(buffer);({width,height}=decoded);delete decoded.tabs.acTL;rgba=new Uint8Array(UPNG.toRGBA8(decoded)[0]);
  }else if(mime==='image/tiff'){
   importScripts(root+'pako.min.js',root+'utif.js');const ifds=UTIF.decode(buffer),first=ifds.find(x=>x.t256?.[0]&&x.t257?.[0]);if(!first)throw new Error('No displayable TIFF page.');checkSize(first.t256[0],first.t257[0]);UTIF.decodeImage(buffer,first);({width,height}=first);orientation=first.t274?.[0]||1;rgba=UTIF.toRGBA8(first);
  }else if(mime==='image/heic'){
   importScripts(root+'libheif.js');const lib=buildLibheif();let decoder,frames;
   try{decoder=new lib.HeifDecoder();frames=decoder.decode(buffer);if(!frames.length)throw new Error('No HEIC image.');const first=frames[0];width=first.get_width();height=first.get_height();checkSize(width,height);const image=new ImageData(width,height);for(let i=3;i<image.data.length;i+=4)image.data[i]=255;rgba=(await new Promise((resolve,reject)=>first.display(image,value=>value?resolve(value):reject(new Error('HEIC conversion failed.'))))).data;}
   finally{frames?.forEach(frame=>frame.free());if(decoder?.decoder)lib.heif_context_free(decoder.decoder);}
  }else throw new Error('No compatibility decoder for this format.');
  checkSize(width,height);if(!rgba||rgba.byteLength!==width*height*4)throw new Error('Incomplete picture pixels.');self.postMessage({width,height,rgba:rgba.buffer,orientation},[rgba.buffer]);
 }catch(error){self.postMessage({error:error?.message||String(error)});}
};
