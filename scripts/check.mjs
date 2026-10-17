import {readdirSync,readFileSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
// Check all owned modules and local import references, including query versions.
for(const directory of ['src','scripts','qa','tests'])for(const name of readdirSync(directory).filter(p=>/\.(m?js)$/.test(p))){
 const path=directory+'/'+name,result=spawnSync(process.execPath,['--check',path],{stdio:'inherit'});if(result.status)process.exit(result.status);
 if(directory==='scripts')continue;
 for(const match of readFileSync(path,'utf8').matchAll(/(?:from\s*|import\s*\()\s*['"](\.\.?\/[^'"]+)['"]/g)){
  const url=new URL(match[1].split('?')[0],new URL(path,'file://'+process.cwd()+'/'));if(!existsSync(url))throw new Error('Missing import '+url.pathname);
 }
}
if(spawnSync(process.execPath,['--check','sw.js'],{stdio:'inherit'}).status)process.exit(1);
const html=readFileSync('index.html','utf8'),ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
if(new Set(ids).size!==ids.length)throw new Error('Duplicate HTML IDs');
const app=readFileSync('src/app.js','utf8');for(const m of app.matchAll(/\$\('([^']+)'\)/g))if(!ids.includes(m[1]))throw new Error('Missing UI control '+m[1]);
console.log('Module syntax, local imports and UI control references passed.');
