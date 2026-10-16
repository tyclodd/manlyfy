# MANLYFY 💪🩹

**The Manliest Camera on Earth.** A free, browser-local photo and video nose-plaster camera.

App: https://tyclodd.github.io/manlyfy/

[Release screenshot](docs/screenshots/manlyfy-v1.1.2.jpg) · [Verification record](docs/TESTING.md) · [Name research](docs/NAME-RESEARCH.md)

## Features implemented

- Photo upload, camera capture, local MediaPipe nose detection and group photos (up to 8 faces).
- Drag, resize, rotate, add and remove individual plasters; before/after comparison.
- 75 designs: three plain starters and 72 original illustrated rewards, categorized and swipeable on mobile. Photo milestones unlock Playful, Deluxe and Legendary artwork; all rewards are free.
- Band-Aid Roulette, group outfit mixing, intentionally fictional manliness ratings.
- Live front/rear camera selection, nose tracking, filtered canvas video recording with optional microphone audio.
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
- `src/face-worker.js`, `src/tracker.js`: worker-first MediaPipe inference with automatic browser-canvas and CPU-only compatibility paths, bounded frame queue and timeouts. CPU compatibility mode keeps artwork aligned to the analyzed frame and can have much lower frame rates; low-powered phones should prefer photos.
- `src/progress.js`: local photo-count progression, reward packs and unlock thresholds.
- `src/render.js`: curved, yaw-aware artwork wrapping over the nose bridge.
- `src/core.js`: geometry, smoothing, output fitting, codec selection and permission errors.
- `src/designs.js`: original vector artwork, all 75 designs.
- `qa/`: browser verification lab; synthetic media tests, responsive iframe and an explicitly labeled `?test-camera=1` app route. The test route feeds an animated public-domain image and optional synthetic audio through the actual camera/recording UI. Not indexed; no real camera or mic is used by the lab.
- `sw.js`: app shell and same-origin asset caching. Increment `VERSION` whenever changing shipped assets.

GitHub Pages serves the `main` branch root. `.nojekyll` keeps this as plain static files. No build service, API keys or paid infrastructure is needed.

## Limits

- A 2D landmark-following effect; strong profiles, occlusions, motion blur, tiny faces and very poor light may fail. Manual photo editing remains available.
- Group tracking is capped at 4 live faces and 8 in photos. Lite mode reduces inference and output resolution.
- Exports up to 2560 pixels for photos and 1280 for live video (960 in Lite mode); source resolution can be smaller.
- Browser recording codecs vary. Some social apps require converting WebM to MP4 outside MANLYFY.
- Record with the tab visible. Leaving the tab turns off camera/mic and stops recording. Clips stop at 3 minutes or roughly 100 MB to limit phone memory usage.
- Offline use requires the app/model/WASM assets to have loaded successfully first, and retained browser storage.
- Real Android/iOS camera and microphone hardware, native sharing and install prompts require physical-device checks.

## Name research

See [the launch name screen](docs/NAME-RESEARCH.md). MANLYFY is a provisional launch name, not a representation of exclusive rights. The existing **Manly – AI Photo Editor** app is a similar-name concern. No domain was bought.

## Credits and licenses

MANLYFY code and original SVG artwork: MIT, see LICENSE. MediaPipe and its model: Google, Apache 2.0; see assets/MEDIAPIPE-LICENSE.txt and [upstream](https://github.com/google-ai-edge/mediapipe). Runtime assets are downloaded unchanged (except the CJS filename). The optional CPU fallback uses face-api.js 0.22.2 (MIT), with its tiny face detector and tiny 68-landmark models, self-hosted in assets/. Only face geometry is used; identity, recognition, demographic and expression models are never loaded. See assets/FACE-API-LICENSE.txt.

Demo photo: NASA astronaut Eileen Collins, public-domain US government photograph, distributed with scikit-image. QA portrait and rotated copy: official White House portrait of Barack Obama by Pete Souza, public-domain US government photograph, from MediaPipe's public test assets. They are only test fixtures, not endorsements.

BAND-AID is a third-party trademark; this project is unaffiliated and all decorative filter artwork is original.
