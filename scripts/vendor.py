import urllib.request,concurrent.futures,pathlib
root=pathlib.Path(__file__).resolve().parents[1]
urls={
'assets/jsfeat.min.js':'https://cdn.jsdelivr.net/npm/jsfeat@0.0.8/build/jsfeat-min.js',
'assets/JSFEAT-LICENSE.txt':'https://raw.githubusercontent.com/inspirit/jsfeat/59cc92848281ac75965d7c4f3f5e673467dd4d6e/LICENSE',
'assets/demo-astronaut.png':'https://raw.githubusercontent.com/scikit-image/scikit-image/v0.21.0/skimage/data/astronaut.png',
'assets/qa-portrait.jpg':'https://storage.googleapis.com/mediapipe-assets/portrait.jpg',
'assets/qa-portrait-rotated.jpg':'https://storage.googleapis.com/mediapipe-assets/portrait_rotated.jpg',
'assets/face_landmarker.task':'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
}
for name in ['vision_bundle.js','vision_bundle.mjs','wasm/vision_wasm_internal.js','wasm/vision_wasm_internal.wasm','wasm/vision_wasm_nosimd_internal.js','wasm/vision_wasm_nosimd_internal.wasm']:
 urls['assets/'+name.split('/')[-1]]='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/'+('vision_bundle.cjs' if name=='vision_bundle.js' else name)
urls['assets/MEDIAPIPE-LICENSE.txt']='https://raw.githubusercontent.com/google-ai-edge/mediapipe/master/LICENSE'
urls['assets/face-api.min.js']='https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js'
urls['assets/FACE-API-LICENSE.txt']='https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/LICENSE'
for name in ['tiny_face_detector_model-weights_manifest.json','tiny_face_detector_model-shard1','face_landmark_68_tiny_model-weights_manifest.json','face_landmark_68_tiny_model-shard1']:
 urls['assets/'+name]='https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/'+name
def get(item):
 name,url=item;p=root/name
 if p.exists():return name,'exists'
 try:
  b=urllib.request.urlopen(url,timeout=45).read();p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(b);return name,len(b)
 except Exception as e:return name,str(e)
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
 for result in pool.map(get,urls.items()):print(result,flush=True)
