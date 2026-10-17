import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {VideoUI,videoPercent} from '../src/video-ui.js';
function surface(){
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8'),elements=new Map();
 for(const match of html.matchAll(/\bid="([^"]+)"/g)){
  const events=new Map(),classes=new Set();
  const e={hidden:true,paused:true,textContent:'',played:0,loaded:0,classList:{toggle:(c,on)=>on?classes.add(c):classes.delete(c),remove:c=>classes.delete(c),contains:c=>classes.has(c)},
   addEventListener:(name,fn)=>events.set(name,fn),emit:name=>events.get(name)?.(),
   removeAttribute(name){delete this[name];},load(){this.loaded++;},play(){this.played++;this.paused=false;this.emit('playing');return Promise.resolve();},pause(){this.paused=true;this.emit('pause');}};
  elements.set(match[1],e);
 }
 const document={getElementById:id=>{assert.ok(elements.has(id),'actual HTML contains '+id);return elements.get(id);}};
 return{html,ui:new VideoUI(document),get:id=>document.getElementById(id)};
}
test('processing visibly starts at 0, advances numerically, and never reaches 100 before the file is ready',()=>{
 const {ui,get}=surface();ui.begin();ui.sync({exporting:true});assert.equal(get('videoProgressPanel').hidden,false);assert.equal(get('videoPercent').textContent,'0%');assert.equal(get('videoSaveBar').hidden,true);
 ui.progress({time:5,total:10});assert.equal(get('videoPercent').textContent,'48%');
 ui.progress({time:2,total:10});assert.equal(get('videoPercent').textContent,'48%','a slower progress update cannot rewind the meter');
 ui.progress({time:10,total:10});assert.equal(get('videoPercent').textContent,'97%');ui.progress({phase:'finishing'});assert.equal(get('videoPercent').textContent,'99%');
});
test('a complete encoded video is playable in the main preview with its download immediately beneath it',async()=>{
 const {ui,get,html}=surface();ui.begin();ui.ready({url:'blob:completed-file',name:'MANLYFY.mp4',info:'1080p',poster:'data:image/jpeg;base64,test'});
 assert.equal(ui.sync({mode:'video',sourceReady:true}),true);assert.equal(get('resultPlayer').hidden,false);assert.equal(get('stage').hidden,true);assert.equal(get('videoSaveBar').hidden,false);assert.equal(get('videoProgressPanel').hidden,true);
 assert.equal(get('videoReadyLabel').textContent,'100% · YOUR VIDEO IS READY');assert.equal(get('videoPercent').textContent,'100%');
 assert.equal(get('resultVideo').src,get('quickSaveVideo').href);assert.equal(get('quickSaveVideo').download,'MANLYFY.mp4');assert.equal(get('downloadVideoLabel').textContent,'DOWNLOAD VIDEO');
 assert.equal(get('resultVideo').controls,true);await get('tapResultPlay').onclick();assert.equal(get('resultVideo').played,1);assert.equal(get('tapResultPlay').hidden,true);
 get('resultVideo').pause();assert.equal(get('tapResultPlay').hidden,false);assert.ok(!html.includes('id="resultDialog"'));
 assert.ok(html.indexOf('id="resultPlayer"')<html.indexOf('id="videoSaveBar"'));assert.ok(html.indexOf('id="videoSaveBar"')<html.indexOf('id="clipExportBar"'));
});
test('finished playback does not depend on the source camera or photo remaining available',()=>{
 const {ui,get}=surface();ui.ready({url:'blob:ready',name:'clip.webm',info:''});ui.sync({mode:'video',sourceReady:false,imported:false});
 assert.equal(get('videoSaveBar').hidden,false);assert.equal(get('resultPlayer').hidden,false);assert.equal(get('welcome').hidden,true);
 get('resultVideo').play();ui.sync({mode:'photo',sourceReady:true});assert.equal(get('videoSaveBar').hidden,true);assert.equal(get('resultPlayer').hidden,true);assert.equal(get('stage').hidden,false);assert.equal(get('resultVideo').paused,true,'hidden results must stop playing');
});
test('new uploads clear stale downloads; partial recordings are never labelled 100% complete',()=>{
 const {ui,get}=surface();ui.begin();ui.progress({time:3,total:10});ui.ready({url:'blob:partial',name:'partial.webm',info:'Interrupted',partial:true});ui.sync({mode:'video'});
 assert.equal(get('videoReadyLabel').textContent,'PARTIAL CLIP AVAILABLE');assert.equal(get('downloadVideoLabel').textContent,'Download partial video');assert.notEqual(get('videoPercent').textContent,'100%');
 ui.clear();ui.begin();ui.sync({mode:'video',exporting:true});assert.equal(get('quickSaveVideo').href,undefined);assert.equal(get('videoSaveBar').hidden,true);assert.equal(get('resultPlayer').hidden,true);assert.equal(get('videoPercent').textContent,'0%');
});
test('progress handles invalid durations without NaN, negative numbers or a premature completion',()=>{
 for(const value of [{},{time:Infinity,total:5},{time:-5,total:10},{time:5,total:0}])assert.equal(videoPercent(value),0);
 assert.equal(videoPercent({time:100,total:1}),97);assert.equal(videoPercent({phase:'ready'}),100);
});
