# MANLYFY verification record

16 October 2026 · Public release 1.2.2 · https://tyclodd.github.io/manlyfy/

## 1.2.2 tracking and camera-wardrobe revision

The CPU neural tracker now runs in a worker. Sparse optical flow follows image features between scans; delayed scan results are advanced through buffered frames. A fixed capture clock drives preview rendering and recording independently of compositor refresh. The preview draws the current camera frame, with no frozen analyzed-frame substitution. Single-face live mode is now the default; Live group remains available and photos still detect up to 8 faces.

| Check | Observed result |
| --- | --- |
| Automated checks | All 12 Node tests pass. New tests use actual jsfeat optical flow on textured image sequences: translation, roll, scale, delayed anchors, occlusion and lost-frame recovery. |
| Balanced motion benchmark | CPU worker; 286 motion frames / 12.00 seconds = 23.8 updates/s; tracked coverage 90.2%; 10 neural scans; mean nose error 1.14 px, p95 2.49 px on a 512 px image; mean flow step 2.97 ms; UI heartbeat 232 / 240 expected. |
| Lite motion benchmark | CPU worker; 159 motion frames / 12.03 seconds = 13.2 updates/s; 100% tracked coverage; 18 neural scans; mean nose error 1.11 px, p95 2.71 px; mean flow step 2.29 ms; UI heartbeat 240 / 240 expected. |
| Actual app recording | Animated public-domain fixture, 20.41-second downloaded WebM, 720×960 VP8 + 48 kHz Opus; 328 encoded video frames, 16.0 fps, p95 frame interval 85 ms. The app reported 15.7 tracked motion fps. Six samples spanning the recording showed the curved blue plaster following the nose. Audio mean −21.4 dB, peak −18.3 dB. Browser playback advanced to the end. |
| Actual photo export | Final-app demo detected one face and exported a PNG. Demo export kept the real reward count at zero. |
| Locked carousel choice | Clicking Tiny T-Rex at zero photos displayed its 3-photo requirement and retained Plain Sky. |
| Photo regressions | CPU-worker inference found 1 NASA face, 2 composite faces, 1 White House face, 1 rotated face, and 1 face in each brightness simulation. Full-image inference took 1.58–3.27 seconds. |
| Artwork and exports | All 75 designs decoded. Filtered 512×512 PNG encoded/decoded. Diagnostic video with synthetic Opus audio decoded and played; 8/8 moving-frame neural detections. |
| Before-camera picker | Selecting Plain Sky / Plain Blush updated both selectors with the camera stream absent and preview hidden. Locked artwork remains gated by photo milestones. |
| Mobile layout | 320, 390 and 1024 px iframe checks show no document-level horizontal overflow. The patch carousel deliberately scrolls horizontally inside its container. |
| Branding | Neutral charcoal/cream/olive camera icon with dinosaur, gold star and plane. The same SVG is used on the generator's sister-app card. |

The motion benchmark uses the real worker and motion code, but only known 2D translation and roll of a public-domain photograph. Its updates/s measure capture and overlay computation, not display refresh or Android performance. Results are not a physical-device claim. Strong yaw, motion blur, featureless regions and occlusion can still lose the filter; failed flow hides the overlay while a neural scan reacquires it. A slow first scan still takes time.

## Earlier 1.1.2 release verification (historical baseline)

### Verified

| Area | Evidence |
| --- | --- |
| Source checks | `npm run check`: syntax checks and 9 Node tests passed. All 75 SVG designs also rasterized locally. |
| Automatic photo placement | Real local inference on a NASA portrait (1 face), two-person composite (2 faces), second public-domain portrait (1 face), 90° rotated fixture (1 face), dimmed fixture (1 face), and brightened fixture (1 face). |
| Artwork | 75/75 original plaster images decoded in the public browser lab. Three plain starters, 24 Playful, 24 Deluxe and 24 Legendary designs. Required themes are present. |
| Upload and PNG download | Native file chooser accepted a public test portrait. Final exported PNG decoded; no watermark was drawn. Photo modes preserve the entire source image. |
| Before/after | Downloading while Before was selected produced exactly the same filtered PNG as After. SHA-256: `7b5f4dace46b8d1acd0a286cf82399a7859090c29fb80f749a397c1570a8ce0f`. |
| Manual editing | Dragging, size adjustment and rotation were exercised and the changed output inspected. Geometry tests also cover mirror, angle and hit testing. |
| Smaller nose fit | Default width uses nose-wing landmarks, with an eye-span safety cap. The manual size slider also allows very small plasters (5%) for distant faces. The smaller curved placement was visually inspected in an exported photo and final video samples. |
| Photo game | Actual camera UI in the labeled simulation earned counts 1–5. Tiny T-Rex unlocked at 3; Unicorn Union unlocked at 5. Reload retained progress. Locked designs could not be selected. |
| Reward counting | Demo exports earned zero. An uploaded photo earned one on its first export. Repeated exports of that photo kept the count at one. Turning the camera off did not count a snapshot. Test-camera progress is stored separately. |
| Later rewards | Node tests cover every unlock boundary through 1,000 photos, increasing pack sizes, 75 total designs, invalid saved counts and the requested 100 → 150 → 175 → 200 → 230 sequence. These are logic tests, not 1,000 physical camera captures. |
| Roulette and categories | Category filtering, design switching and random selection were exercised. Roulette and group mixing use the earned collection only. |
| Actual app video | The final app recorded a 44-second animated public-domain image stream with a curved nose plaster and synthetic audio. Download was 540 × 960, VP8 WebM + 48 kHz Opus. Samples throughout the decoded recording showed the plaster permanently applied and aligned with the moving image. |
| Audio and playback | The downloaded clip decoded and played in the app. Its synthetic audio was non-silent (mean approximately −21.4 dB; peak −18.3 dB). This does not verify microphone hardware. |
| Continuous inference | Public browser lab detected a face in 14/14 moving/rolled frames, approximately 2.7 inference fps. The actual camera UI was closer to 1 inference fps in this graphics-disabled cloud browser. These are not phone benchmarks. |
| Share | On this desktop browser, Share correctly fell back to a PNG download. Native mobile sharing remains a device check. |
| Camera recovery | With no physical camera available, the app displayed “No camera found. You can still upload a photo and get MANLY.” Permission-denial messages have unit coverage; a real denial prompt was not exercised. |
| Layout | 320, 390 and 1024 px iframe widths had no document-level horizontal scrolling. Design/category carousels deliberately scroll inside their containers. Desktop and mobile layouts were visually inspected. |
| Creator links | PayPal, Interac, Cameo, merch, Instagram and YouTube destinations match the published Manly Curses Generator configuration. Copy-email success feedback was exercised. No payment or purchase was made. |
| Cross-app navigation | Followed MANLYFY → Manly Curses Generator → MANLYFY through the public links. The generator footer contains the new camera-logo promo. |
| Hosting | GitHub Pages deployed successfully. The public HTML, entry module, progression module, logo and manifest returned HTTP 200. |
| Reference-photo privacy | The user's private reference photos were used only for visual direction in the conversation. They were not copied into the app, test fixtures, screenshots or repository. |

### Earlier browser-lab limits

WebGL2 and OffscreenCanvas WebGL2 are disabled in this cloud browser. The verified automatic tracking path is the self-hosted CPU compatibility tracker. The primary MediaPipe Face Landmarker GPU worker and browser-canvas paths are implemented, with fallback, but could not be verified here. Their code must not be described as a completed real-device test.

In release 1.1.2, the CPU path paired each overlay with the frame analyzed, at a lower frame rate and effective image resolution. This frozen-frame behavior was replaced in 1.2.2. Full photo inference took approximately 2.2–4.3 seconds in this browser. Photo mode is preferable on devices where live tracking is choppy. The collection uses image previews to avoid thousands of SVG DOM nodes.

The lab's motion is translation and roll of a 2D image, not a person turning their head in 3D. Brightness changes do not establish performance across skin tones, real lighting or motion blur. Group verification used a composite of two faces, not a live crowd.

## Still needs physical-device verification

- Real front/rear camera selection, slight head yaw, stronger turns, occlusions, real-world lighting and face diversity.
- Microphone permissions, hardware capture and audio quality.
- Android Chrome and iPhone Safari hardware/codec behavior, native share targets and gallery import.
- PWA installation, actual offline restart, storage eviction and browser update behavior. Manifest, icons, service worker and caching are implemented; native installation was not performed.
- Low-powered-phone responsiveness, heat, battery use, and three-minute/100 MB recording limits under real memory pressure.

## Known practical limits

- Tracking is a playful 2D wrap, not a 3D skin simulation. Tiny faces, profiles, covered noses and very poor light can fail; manual photo placement remains available.
- Up to 8 photo faces and 4 live faces. A group photo counts as one photo for rewards.
- Output is capped at 2560 px for photos and 1280 for live video (960 in Lite mode). The CPU compatibility preview has lower effective detail. Social formats fit the full source with dark borders.
- MediaRecorder picks a supported codec. H.264/AAC MP4 is preferred when advertised; otherwise WebM is used. Some social apps need external WebM-to-MP4 conversion. WebM seek/duration metadata may remain incomplete until playback finishes.
- Record with the tab visible. Leaving the tab stops camera/mic and recording. Clips stop at 3 minutes or around 100 MB.
- Progress belongs to the current browser; clearing site storage or using another device starts a new game. No accounts or cloud sync. There is no anti-cheat server.
- Optional tips and purchases happen on external creator-support services and never change rewards or camera access.

Reproduce model/media checks at `/qa/`. The `/?test-camera=1` route is visibly labeled, uses only packaged public-domain media and synthetic audio, and does not use a real camera or microphone.
