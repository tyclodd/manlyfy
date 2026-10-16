# MANLYFY 💪🩹

**The Manliest Camera on Earth.** A free, browser-local photo and video nose-plaster camera.

App: https://tyclodd.github.io/manlyfy/

[Camera screenshot](docs/screenshots/manlyfy-v1.3.2-camera.jpg) · [Rating screenshot](docs/screenshots/manlyfy-v1.3.2.jpg) · [Verification record](docs/TESTING.md) · [Name research](docs/NAME-RESEARCH.md) · [Full request audit](docs/REQUIREMENTS-AUDIT.md)

## Features implemented

- Existing video uploads: preview, seek and apply the filter locally in real time, with optional original audio (one clip, up to 3 minutes / 150 MB).
- Local photo upload (up to 10 selected photos), camera capture, higher-resolution/crop scans for smaller faces, and group photos (up to 8 faces). Navigation retains per-photo edits without decoding the entire batch into memory.
- Drag, pinch to resize, twist to rotate, add and remove individual plasters; before/after comparison. One-tap Save photo sits beside the preview, with no reward modal interrupting the download.
- 75 designs: three plain starters and 72 original illustrated rewards, categorized and swipeable on mobile. Photo milestones unlock Playful, Deluxe and Legendary artwork; all rewards are free.
- Band-Aid Roulette, group outfit mixing, repeatable fictional manliness ratings and a separate before/after scoring section. Over 331,000 punchlines can be combined per percent; another joke never changes the score.
- Live front/rear camera selection, nose tracking, filtered canvas video recording with optional microphone audio. A horizontal patch carousel above the camera works before requesting camera permission.
- PNG photos without watermarks; WebM or MP4 video according to browser codecs; native file sharing where supported, download fallback elsewhere.
- Original, 1:1 square, and 9:16 vertical outputs. The complete image is fitted into the output; dark borders preserve faces.
- Installable PWA, same-origin application assets and face model, offline reuse of previously loaded files.
- No accounts, required payments, subscriptions, server media processing, analytics or user-media uploads. Optional creator-support and social links reuse Tye Clodd’s public Manly Curses Generator destinations.

Implementation does not imply every device has been verified. See [test results and limitations](docs/TESTING.md).

## Photo rewards

Start with The Original, Plain Sky and Plain Blush. A camera snapshot counts once. An uploaded photo counts when first saved/shared; repeating an export does not add points. Demos and videos do not count. Progress is stored locally under `manlyfy-progress-v1`; the synthetic-camera lab uses a separate test key. Clearing browser data resets progress; there is no account or cross-device sync.

Single rewards: 3, 5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90, 100 photos. Three-design packs: 150, 175, 200, 230, 260, 300, 350, 400, 450, 500. Five-design packs: 600, 700, 800, 900. Final eight: 1,000. All 75 designs are then unlocked. Tips do not alter progression.

## Run and maintain

This is a static, buildless app. Serve this directory over HTTPS or localhost with any static web server. Camera APIs require a secure context. `npm run check` checks JavaScript syntax and runs the geometry/collection/codec tests, with no npm install required.

Third-party runtime assets are pinned to `@mediapipe/tasks-vision` **0.10.32** and the float16 Face Landmarker model, version **1**. `python scripts/vendor.py` reproduces their download from official Google storage and the NPM CDN. The CJS bundle is renamed to `.js`, with an `exports` shim inside a classic worker so MediaPipe's WASM loader can use `importScripts`.

- `src/app.js`: UI, camera lifecycle, editing, rendering, exports and MediaRecorder.
- `src/face-worker.js`, `src/tracker.js`: worker-first MediaPipe inference with automatic browser-canvas and CPU-only compatibility paths, one in-flight scan and timeouts. Single-face live mode is the default; photos always support up to 8 faces.
- `src/cpu-worker.js`, `src/cpu-tracker.js`: CPU-only face-api inference in an OffscreenCanvas worker using RGB tensors, with a main-thread fallback for older browsers. No identity models.
- `src/motion.js`: sparse Lucas–Kanade optical flow follows image features between neural scans at up to 30 updates/s (20 in Lite). It buffers up to 4 seconds of small grayscale frames and replays a delayed neural anchor to the current frame. The preview is never frozen to an old CPU scan. Confidence failures hide the overlay and await reacquisition. All frame buffers stay in memory; motion history is cleared when the camera stops.
- `src/video-import.js`: local clip decoding, bounded duration/file size, seeking and reusable original-audio routing.
- `src/progress.js`: local photo-count progression, reward packs and unlock thresholds.
- `src/render.js`: curved, yaw-aware artwork wrapping over the nose bridge.
- `src/core.js`: geometry, smoothing, output fitting, codec selection and permission errors.
- `src/camera-clock.js`: reacts to decoded video frames, with a timer fallback and duplicate-frame suppression.
- `src/photo-tracker.js`, `src/photos.js`: small-face crop scans, CPU fallback, MIME sniffing and bounded batch selection.
- `src/gestures.js`: pinch/twist/drag geometry with mirrored-source mapping.
- `src/manliness.js`: deterministic image fingerprints, device-local similar-shot grouping, plaster bonuses and procedural jokes. No identity, gender, attractiveness or personality model is used.
- `src/designs.js`: original vector artwork, all 75 designs.
- `qa/`: browser verification lab and known-transform motion benchmark; synthetic media tests, responsive iframe and an explicitly labeled `?test-camera=1` app route. The test route feeds an animated public-domain image and optional synthetic audio through the actual camera/recording UI. Not indexed; no real camera or mic is used by the lab.
- `sw.js`: app shell and same-origin asset caching. Increment `VERSION` whenever changing shipped assets.

GitHub Pages serves the `main` branch root. `.nojekyll` keeps this as plain static files. No build service, API keys or paid infrastructure is needed.

## Limits

- A 2D landmark-following effect; strong profiles, occlusions, motion blur, tiny faces and very poor light may fail. Manual photo editing remains available.
- Group tracking is capped at 4 live faces and 8 in photos. Live group is opt-in for performance. Lite mode reduces flow, inference and output resolution.
- Exports up to 2560 pixels for photos and 1280 for live video (960 in Lite mode); source resolution can be smaller.
- Browser recording codecs vary. Some social apps require converting WebM to MP4 outside MANLYFY.
- Uploaded clips must decode in the browser. Original audio uses Web Audio where supported; unsupported codecs require an H.264 MP4 or WebM copy. Processing takes roughly the clip duration.
- Record with the tab visible. Leaving the tab turns off camera/mic and stops recording. Clips stop at 3 minutes or roughly 100 MB to limit phone memory usage.
- Offline use requires the app/model/WASM assets to have loaded successfully first, and retained browser storage.
- Real Android/iOS camera and microphone hardware, native sharing and install prompts require physical-device checks.

## Name research

See [the launch name screen](docs/NAME-RESEARCH.md). MANLYFY is a provisional launch name, not a representation of exclusive rights. The existing **Manly – AI Photo Editor** app is a similar-name concern. No domain was bought.

## Credits and licenses

MANLYFY code and original SVG artwork: MIT, see LICENSE. MediaPipe and its model: Google, Apache 2.0; see assets/MEDIAPIPE-LICENSE.txt and [upstream](https://github.com/google-ai-edge/mediapipe). Runtime assets are downloaded unchanged (except the CJS filename). The optional CPU fallback uses face-api.js 0.22.2 (MIT), with its tiny face detector and tiny 68-landmark models, self-hosted in assets/. Only face geometry is used; identity, recognition, demographic and expression models are never loaded. See assets/FACE-API-LICENSE.txt. Sparse optical flow uses self-hosted jsfeat 0.0.8 (MIT, Eugene Zatepyakin); see assets/JSFEAT-LICENSE.txt. The CDN version and license commit are pinned in scripts/vendor.py.

Demo photo: NASA astronaut Eileen Collins, public-domain US government photograph, distributed with scikit-image. Additional glasses fixture: US Navy portrait of Grace Hopper distributed by TensorFlow example_images. QA portrait and rotated copy: official White House portrait of Barack Obama by Pete Souza, public-domain US government photograph, from MediaPipe's public test assets. They are only test fixtures, not endorsements.

BAND-AID is a third-party trademark; this project is unaffiliated and all decorative filter artwork is original.

## Reusable filter preparation

[integrations/README.md](integrations/README.md) documents the reusable asset kit and current Instagram publication limits. `npm run filter-kit` builds the ZIP from original SVG art and source modules, using optional sharp for PNG rendering. No private face image is in the kit.
