import {mkdtemp,mkdir,writeFile,readFile,copyFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {DESIGNS,patchSVG} from '../src/designs.js';
import {unlockPhoto,REWARDS} from '../src/progress.js';
const root=fileURLToPath(new URL('../',import.meta.url)),require=createRequire(import.meta.url);
let sharp;try{sharp=require('sharp');}catch{if(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES)sharp=require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'sharp'));else throw new Error('Optional exporter requires sharp. Run npm install --no-save sharp.');}
const temp=await mkdtemp(path.join(tmpdir(),'manlyfy-kit-')),kit=path.join(temp,'manlyfy-filter-kit');
try{
 for(const dir of ['svg','png','web','icons'])await mkdir(path.join(kit,dir),{recursive:true});
 for(const [i,d]of DESIGNS.entries()){
  const svg=patchSVG(d);await writeFile(path.join(kit,'svg',d.id+'.svg'),svg);await sharp(Buffer.from(svg)).png().toFile(path.join(kit,'png',d.id+'.png'));
 }
 for(const name of ['core.js','render.js'])await copyFile(path.join(root,'src',name),path.join(kit,'web',name));
 await copyFile(path.join(root,'assets/icons/icon.svg'),path.join(kit,'icons','manlyfy.svg'));
 for(const size of [192,512])await copyFile(path.join(root,`assets/icon-${size}.png`),path.join(kit,`icons/icon-${size}.png`));
 await copyFile(path.join(root,'LICENSE'),path.join(kit,'LICENSE'));
 await copyFile(path.join(root,'integrations/README.md'),path.join(kit,'README.md'));
 await writeFile(path.join(kit,'manifest.json'),JSON.stringify({formatVersion:1,name:'MANLYFY',slogan:'The Manliest Camera on Earth.',webApp:'https://tyclodd.github.io/manlyfy/',nativeInstagramPublished:false,texture:{width:640,height:200,transparent:true},coordinates:'normalized unmirrored source; roll in radians',landmarks:{leftOuterEye:33,rightOuterEye:263,noseBridge:5,leftNoseWing:98,rightNoseWing:327},rewards:REWARDS,designs:DESIGNS.map((d,i)=>({id:d.id,name:d.name,category:d.category,tier:d.tier,unlockAtPhotos:unlockPhoto(i),svg:`svg/${d.id}.svg`,png:`png/${d.id}.png`}))},null,2)+'\n');
 const options=DESIGNS.map(d=>`<option value="${d.id}">${d.name}</option>`).join('');
 await writeFile(path.join(kit,'example.html'),`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MANLYFY filter renderer kit</title><style>body{font:16px system-ui;background:#201832;color:#fff4dc;padding:24px}canvas{background:#fff4dc;border-radius:20px;max-width:100%}label{display:inline-block;margin:12px}select{max-width:100%;padding:12px}</style><h1>MANLYFY filter renderer</h1><p>Reusable artwork preview. This is not a native Instagram filter. No camera or photos.</p><select id="design">${options}</select><label>Roll <input id="roll" type="range" min="-60" max="60" value="0"></label><label>Yaw <input id="yaw" type="range" min="-.7" max=".7" step=".05" value="0"></label><br><canvas id="preview" width="640" height="420"></canvas><script type="module">import {drawBandage} from './web/render.js';const c=document.getElementById('preview'),x=c.getContext('2d');let image;async function load(){image=new Image();image.src='png/'+document.getElementById('design').value+'.png';await image.decode();draw()}function draw(){x.clearRect(0,0,c.width,c.height);drawBandage(x,image,{x:320,y:190,width:330,angle:+document.getElementById('roll').value*Math.PI/180,yaw:+document.getElementById('yaw').value})}document.getElementById('design').onchange=load;for(const id of ['roll','yaw'])document.getElementById(id).oninput=draw;load();</script></html>`);
 const output=path.join(root,'integrations/manlyfy-filter-kit.zip');
 execFileSync('python',['-c',`import pathlib,sys,zipfile
root=pathlib.Path(sys.argv[1]);out=sys.argv[2]
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for p in sorted(root.rglob('*')):
  if p.is_file():
   info=zipfile.ZipInfo('manlyfy-filter-kit/'+str(p.relative_to(root)),(2026,10,16,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o644<<16;z.writestr(info,p.read_bytes())
`,kit,output]);
 console.log('Exported 75 SVG + PNG textures, icons, geometry, renderer and preview to '+output);
}finally{await rm(temp,{recursive:true,force:true});}
