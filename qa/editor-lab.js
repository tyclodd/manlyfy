const $=id=>document.getElementById(id),pause=ms=>new Promise(r=>setTimeout(r,ms));
async function ready(d){for(let i=0;i<900;i++){if(d.getElementById('busy').hidden&&!d.getElementById('stage').hidden)return;await pause(100);}throw new Error('Editor did not finish opening the test image.');}
$('editorRun').onclick=async()=>{
 $('editorRun').disabled=true;$('editorResults').textContent='Running real editor handlers with public fixture and synthetic touch events…';const report=(s,ok=true)=>$('editorResults').textContent+=`\n${ok?'PASS':'FAIL'} · ${s}`;
 try{
  const d=$('frame').contentDocument,file=new File([await(await fetch('../assets/demo-astronaut.png')).blob()],'editor-qa.png',{type:'image/png'}),transfer=new DataTransfer();transfer.items.add(file);const input=d.getElementById('fileInput');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));await ready(d);
  const base=d.getElementById('beforeManliness').textContent;report('Uploaded fixture detected at least one face',d.getElementById('noseSelect').options.length>=1);
  d.getElementById('addPatch').click();const stage=d.getElementById('stage'),b=stage.getBoundingClientRect(),send=(type,id,x,y)=>stage.dispatchEvent(new PointerEvent(type,{pointerId:id,pointerType:'touch',isPrimary:id===11,bubbles:true,cancelable:true,clientX:b.left+x*b.width,clientY:b.top+y*b.height}));
  send('pointerdown',11,.44,.48);send('pointerdown',12,.56,.48);send('pointermove',11,.4,.48);send('pointermove',12,.6,.48);send('pointerup',11,.4,.48);send('pointerup',12,.6,.48);
  report('Two-pointer pinch changed selected plaster to about 167%',Math.abs(+d.getElementById('size').value-167)<=2);
  send('pointerdown',11,.44,.48);send('pointerdown',12,.56,.48);send('pointermove',11,.5,.42);send('pointermove',12,.5,.54);send('pointerup',11,.5,.42);send('pointerup',12,.5,.54);
  report('Two-pointer twist changed rotation',Math.abs(+d.getElementById('rotation').value)>75);
  const left=parseFloat(d.getElementById('patchSelection').style.left);send('pointerdown',11,.5,.48);send('pointermove',11,.55,.51);send('pointerup',11,.55,.51);report('One-pointer drag moved the selected plaster',parseFloat(d.getElementById('patchSelection').style.left)>left+3);
  report('One-tap Save is enabled beside the preview',!d.getElementById('quickSavePhoto').disabled&&!d.getElementById('photoSaveBar').hidden);
  const score=d.getElementById('afterManliness').textContent,oldJoke=d.getElementById('ratingText').textContent;d.getElementById('rerate').click();report('Another punchline keeps the percent stable',d.getElementById('afterManliness').textContent===score&&d.getElementById('ratingText').textContent!==oldJoke);
  report('Plaster bonus is above the before score',parseInt(score)>parseInt(base));
  report('Editing outline is a separate DOM element, not part of export canvas',d.getElementById('patchSelection').tagName==='DIV');
  $('editorResults').textContent+='\nNOT VERIFIED · Physical multi-touch hardware. Synthetic pointer events validate the app handlers only.\nFINISHED';
 }catch(e){report(e.stack,false);}finally{$('editorRun').disabled=false;}
};
