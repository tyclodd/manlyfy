import {decodePhoto} from '../src/photos.js?v=1.6.1';
import {fingerprint,ratingFamily,manlinessScore} from '../src/manliness.js?v=1.6.1';
const $=id=>document.getElementById(id);
const cases=[
 ['Screenshot PNG','screenshot.png'],['JPEG','portrait.jpg'],['Progressive JPEG','progressive.jpg'],['CMYK JPEG','cmyk.jpg'],['WebP','portrait.webp'],['AVIF','portrait.avif'],['GIF still','portrait.gif'],['BMP','portrait.bmp'],['ICO','shapes.ico'],['SVG','shapes.svg'],['TIFF','portrait.tiff'],['HEIC','shapes.heic'],['PDF first page','photo.pdf'],
 ['Missing MIME / extension','portrait.jpg',{},''],['Incorrect MIME / extension','screenshot.png',{},'video/mp4'],['FileReader data URL','screenshot.png',{preferDataURL:true}],['JPEG recovery worker','portrait.jpg',{forceCompatibility:true}],['PNG recovery worker','screenshot.png',{forceCompatibility:true}],['Rotated EXIF recovery','orientation.jpg',{forceCompatibility:true}]
];
$('run').onclick=async()=>{
 $('run').disabled=true;$('results').replaceChildren();let passed=0;
 for(const [name,path,options={},type] of cases){
  const row=document.createElement('tr');$('results').append(row);const start=performance.now();
  try{const response=await fetch('fixtures/'+path);if(!response.ok)throw new Error('Fixture unavailable');const blob=await response.blob(),file=new File([blob],type===undefined?path:'picture.bin',{type:type??blob.type});const canvas=await decodePhoto(file,{...options,onProgress:text=>$('status').textContent=name+' · '+text});
   const small=document.createElement('canvas');small.width=small.height=32;const cx=small.getContext('2d',{willReadFrequently:true});cx.drawImage(canvas,0,0,32,32);const mark={...fingerprint(cx.getImageData(0,0,32,32).data),aspect:canvas.width/canvas.height},family=ratingFamily(mark),score=manlinessScore(family.entry.seed,0);if(!Number.isFinite(score))throw new Error('Rating failed');
   row.className='pass';row.innerHTML='<td></td><td>PASS</td><td></td><td></td>';row.cells[0].textContent=name;row.cells[2].textContent=canvas.width+'×'+canvas.height+(canvas.dataset.importNote?' · '+canvas.dataset.importNote:'');row.cells[3].textContent=((performance.now()-start)/1000).toFixed(2)+' s';canvas.style.maxWidth='180px';canvas.style.maxHeight='180px';$('preview').replaceChildren(canvas);passed++;
  }catch(error){row.className='fail';row.textContent=name+' · FAIL · '+error.message;}
 }
 $('status').textContent=`${passed}/${cases.length} picture checks passed.`;$('run').disabled=false;
};
