import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=new URL('../',import.meta.url),read=path=>fs.readFileSync(new URL(path,root));
test('the canonical purple camera has star, airplane, star and legacy SVG uses identical artwork',()=>{
 const svg=read('assets/icons/manlyfy-star-plane-star.svg').toString();
 assert.deepEqual([...svg.matchAll(/data-motif="([^"]+)"/g)].map(m=>m[1]),['star-left','airplane','star-right']);
 assert.match(svg,/#c8b0ef/);assert.deepEqual(read('assets/icons/icon.svg'),Buffer.from(svg));
});
test('home-screen icons, header, favicon and video ending use the same named logo release',()=>{
 const manifest=JSON.parse(read('manifest.webmanifest')),html=read('index.html').toString(),app=read('src/app.js').toString();
 assert.equal(manifest.id,'./');
 for(const icon of manifest.icons){assert.match(icon.src,/manlyfy-star-plane-star/);assert.ok(read(icon.src.split('?')[0]).length>100);}
 for(const size of [192,512])assert.deepEqual(read(`assets/icon-${size}.png`),read(`assets/manlyfy-star-plane-star-${size}.png`));
 assert.match(html,/class="brand"[^\n]+assets\/icons\/manlyfy-star-plane-star\.svg/);
 assert.match(app,/img\.src='assets\/icons\/manlyfy-star-plane-star\.svg/);
});
