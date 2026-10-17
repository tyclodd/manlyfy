# MANLYFY verification record

17 October 2026 · Current release 1.7.0 · https://tyclodd.github.io/manlyfy/

## 1.7.0 current validation

- `npm run check`: all owned JavaScript syntax, local import and HTML control checks pass; **63 tests pass**.
- Uploaded videos now start processing automatically. The progress indicator begins at 0%, uses a monotonic timeline percentage capped at 97% while encoding, moves to 99% for finalization, and shows 100% only when the final Blob exists. It measures completed video time, not an estimated time remaining. A clearly labelled partial recording never claims 100% completion.
- Presentation tests use the actual HTML control IDs and a lightweight media/DOM test surface. They verify that the finished Blob URL feeds both the inline video and the download immediately beneath it, tapping the overlay calls playback, pausing restores the tap target, changing modes pauses hidden playback, and a new upload removes stale downloads. These tests do **not** establish native browser playback or responsive layout.
- File-opening lifecycle checks verify cancellation, rejection before a result is exposed, and that cancelling an old import cannot clear a newly selected video. Real codecs and browser file decoding remain covered only by their separately stated evidence below.
- Actual bundled jsfeat optical flow passes rapid-reversal, delayed-anchor, roll/scale and occlusion tests. The added moving textured-image sequence injects alternating neural-placement noise while reversing rapidly; current-frame fusion reduces total nose error by more than 20% compared with unfiltered detections, with less than 1.5 px instantaneous error on the 240×240 fixture. This is a deterministic synthetic test, not a human-head or phone benchmark.
- A missed neural observation can remain visible for at most 100 ms live / 120 ms precise export, only if enough image features still track reliably. Tests verify movement, expiry and rejection of full visual occlusion. Large neural corrections and unreliable flow bypass blending.
- The offline precise exporter now combines a fresh scan of every source frame with 640-pixel motion tracking, instead of assigning each scan independently. Source timestamps, encoder selection, original-audio transfer, 4K constraints, cancellation and three-second endings retain their pipeline checks.

No current browser or physical-device QA is claimed. The supported Browser control skill is unavailable in this session, so no alternative browser automation or preview server was started. Current WebCodecs encoding/decoding, real camera/microphone behavior, native downloads/sharing, GPU inference, mobile layout and installation remain unverified. Historical screenshots and browser checks below apply to their named releases.

## 1.6.1 validation (previous release)

A final source review added an explicit Style from start action after seeking. Individual video styles are configured on the initial frame, so preview-only track IDs cannot silently replace initial export IDs. Global Everyone changes still work from any preview position.

- `npm run check`: all owned JavaScript syntax, local imports, unique HTML IDs and referenced controls pass; **51 tests pass**.
- Real jsfeat optical flow on deterministic textured frames: translation, rotation, scale, delayed neural anchors, rapid reversals, occlusion, paused-media resumption, short missed detections and identity preservation pass.
- Eight reordered face observations retain IDs. Crossing trajectories keep their design IDs. Expired/distant tracks get fresh IDs. These are spatial-geometry tests, not face recognition or real crowd footage.
- Master access tests verify correct/incorrect tokens, persistence, disabled storage, leaving creator edition, and preservation of earned counts. No private master token is committed.
- Real photo recovery decoders open JPEG, screenshot PNG, TIFF and HEIC fixtures into nonempty pixels. Corrupt data fails visibly. Gallery/Files provider fallback and EXIF handling pass.
- Precise-export pipeline tests use injected codecs to verify every variable-timestamp source frame is awaited, 4K dimensions, 1080p option, original audio packet transfer, exactly three additional seconds, ending-free owner output, cancellation, tracker failure, encoder absence and resource cleanup. **They do not exercise a browser's real VideoEncoder/VideoDecoder.**
- Actual bundled CPU face model on public NASA fixtures: 1 face in the portrait and 2 in a two-person composite. This used Node TensorFlow CPU tensors at 608-pixel detector input, about 10.2 s / 9.6 s in this container. It verifies weights and detection, not worker integration, GPU or phone performance.
- Actual Mediabunny 1.61.6 demux/remux: locally generated 1-second H.264/AAC MP4, 12 video frames, 320×320; all 48 AAC packets copied through the same audio source/sink APIs. ffprobe decoded the resulting 9,846-byte M4A as AAC, 48 kHz mono, exactly 1 second. This verifies the real container/audio path, not browser video encoding.

### Fast-motion comparison

Run `node scripts/benchmark-motion.mjs`. Baseline is commit `4bd841119361142bc95c098b48cd2ec72f8ed20e` (1.5.0). The sequence is a **240×240 generated textured image**, not a person, with normalized known nose landmarks. It runs 36 source frames at timestamps 60 fps; motion is `x=44 sin(i f)`, `y=18 sin(0.6 i f)`. No neural anchors refresh during the sequence. This isolates the optical-flow/reacquisition change. CPU timings in this container are diagnostic and not phone frame rates.

| Frequency f | Prior coverage | New coverage | New mean / p95 nose error |
| --- | --- | --- | --- |
| 0.1 | 36 / 36 | 36 / 36 | about 0.008 / 0.016 px |
| 0.3 | 36 / 36 | 36 / 36 | about 0.008 / 0.014 px |
| 0.6, rapid reversal | 0 / 36 | 36 / 36 | about 0.008 / 0.014 px |

The rapid sequence moves up to about 26 pixels between frames. The new tracker uses coarse normalized correlation when ordinary LK loses too many features, then refines and checks the match backwards. The regression test requires all 36 frames present and less than 1 pixel nose error. It still hides overlays when no reliable match exists. This does not establish zero mistakes with motion blur, head yaw, covered noses or physical cameras.

### Verification limits

The supported Browser control skill is unavailable in this session, so no preview server or alternative browser automation was started. Current release browser rendering, WebCodecs encoding/decoding, hardware GPU inference, 60 fps camera capture, microphone permissions, native sharing, installation and Android/iOS behavior remain unverified. Prior browser screenshots and media below are **historical evidence for their named release**, not proof of current behavior. No zero-error or instantaneous-export claim is made.

## 1.4.1 video downloads and shared logo (historical)

The latest conversation review found two presentation gaps: video upload needed an explicit export action and persistent download, and the generator's MANLYFY card needed a single shared, readable logo. Both are published. The logo is a purple camera with a lens plaster carrying **star → airplane → star**; its airplane was redrawn for clarity at small sizes.

| Check | Observed result |
| --- | --- |
| Source checks | `npm run check`: syntax checks and all 32 Node tests passed. Added codec-start fallback tests and branding checks for motif order, purple palette, matching legacy aliases, manifest icons and the shared header/ending source. |
| Explicit upload-to-export flow | Public Video mode accepted a local H.264/AAC fixture. Create filtered video showed processing progress, then a persistent Download video link beside the preview. Clicking it downloaded the encoded file with no app confirmation or automatic result dialog. Preview and Share remain separate actions. |
| Full clip plus three-second ending | Release 1.4.0 processed the 6-second public NASA motion fixture and generated a 3,811,008-byte, 540×960 VP8/48 kHz Opus WebM. Its 219 frames continued through 9.012 s. Decoded source frames showed the curved plaster; ending samples showed the animated logo, confetti and “IT’S MANLY NOW.” Original tone remained audible; the ending was silent for about 3.02 s. |
| Final logo and audio in actual export | Release 1.4.1 processed the 2-second version with audio and the ending enabled. One-click download produced a 1,596,319-byte, 540×960 VP8/48 kHz Opus WebM, 123 frames through 5.138 s. The decoded ending visibly contained the final star–airplane–star artwork. Source audio was non-silent (mean −25.1 dB, peak −16.2 dB); silence began at 2.077 s and lasted about 3.08 s. |
| Ending-free and silent export | With ending and original audio disabled, the same short input downloaded as a 403,777-byte, 720×960 H.264 MP4, 1.967 s, with no audio track. This verifies both options can be disabled. |
| Persistent ready state | The final result bar displayed “00:05 · 1.5 MB · WebM · with audio · 3s MANLYFY ending”; the optional preview dialog was closed. The native Download video link remained available after export. |
| Photo save regression | Switching back to Photo retained one detected nose. One Save photo click downloaded a valid 540×960 PNG. |
| Shared logo on both live apps | Followed the public footer link to Manly Curses Generator. Scrolled to its MANLYFY promo and visually verified the loaded 96×96 purple camera, gold stars and blue airplane. Its image URL exactly matches the app header's canonical `manlyfy-star-plane-star.svg?v=1.4.1`; followed the promo back to MANLYFY. |
| Browser and install artwork | Header, browser icon, Apple/Android image URLs, video ending and reusable kit reference the canonical art or matching raster exports. New PNG filenames and network-first manifest fetching avoid the earlier icon URLs. This is source/asset verification, not an OS install test or a guarantee that an existing home-screen shortcut updates immediately. |
| Responsive layout | Public app iframe checked at 320, 390 and 1024 px: document widths 305, 375 and 1009 px, respectively (scrollbar allowance); no document-level overflow. |
| Reusable kit | Rebuilt ZIP contains 75 SVG designs and 75 transparent PNGs; its logo SVG is byte-identical to the canonical app logo. It contains no private user media. |

[Live generator logo](screenshots/manlyfy-generator-logo-v1.4.1.jpg) · [Persistent video download](screenshots/manlyfy-video-download-v1.4.1.jpg) · [Full conversation audit](REQUIREMENTS-AUDIT.md)

The export files were inspected with ffprobe/ffmpeg and decoded frames were viewed. Native playback of this release was not completed after a cloud-browser automation timeout; earlier 1.3.2 playback below is historical evidence. Tests used only public fixtures and generated tones. Physical phones, native camera/microphone permissions, multi-touch, install behavior and native mobile sharing remain unverified. Processing runs in real time with the tab visible. The optional ending may be omitted if the tab is hidden or an output-memory limit stops recording.

## Earlier 1.3.2 uploads, editing, rating and branding revision (historical baseline)

The public app now accepts existing videos as well as multiple photos. A mode-specific local file picker replaces the photo-only upload flow. Imported clips can be previewed, paused and scrubbed before processing; audio uses a reusable local Web Audio graph. A paused clip retains its plaster. Processing restarts at the beginning with a fresh motion history and saves the filtered result automatically at the end.

| Check | Observed result |
| --- | --- |
| Source checks | `npm run check`: syntax checks and all 28 Node tests passed. Tests cover real optical-flow sequences, delayed anchors, lifecycle handoffs, decoded-frame de-duplication, paused-clip anchor resumption, geometry, pinch/twist, image byte sniffing, crop mapping, score determinism, near-image grouping and progression through all 75 rewards. |
| Multiple-photo native picker | Accepted three public fixtures in one selection. Tall/small-face image detected 1 face; two-person NASA/Grace composite detected 2; White House portrait detected 1. Previous/next restored the group image's 3 edited plasters after adding a manual one. |
| Public photo lab | NASA portrait 1 face (3.89 s), tall/small-face fixture 1 (8.16 s), two-person composite 2 (8.66 s), White House portrait 1 (3.38 s), Grace Hopper with glasses 1 (3.46 s), 90-degree rotated fixture 1 (21.36 s), dim-light simulation 1 (3.46 s), bright-light simulation 1 (3.65 s). Verified CPU-worker fallback; these controlled fixtures do not establish accuracy on the user's private screenshot or actual head yaw. |
| Artwork and codec regressions | All 75 SVG designs decoded; filtered PNG encoded/decoded at 512×512; 8/8 moving-frame neural detections. Diagnostic VP8/Opus video decoded and played. |
| Mislabelled photo recovery | Native picker opened the public NASA PNG saved with a `.bin` extension and non-image MIME type. Byte sniffing recovered it; one face was detected and Save was enabled. |
| Immediate photo save | One click on Save photo downloaded a PNG with no app confirmation or reward dialog. Repeated save kept the count at 4. The 3-photo unlock also announced without opening a modal. |
| Real editor gesture handlers | Public editor lab: two synthetic touch pointers pinched to about 167%, twisted about 90 degrees, and a one-pointer drag moved the selected plaster. Selection outline remains a DOM element outside the export canvas. Physical multi-touch hardware is not tested. |
| Rating UI | NASA fixture scored 10% before / 528% with plaster. Another punchline kept the percent; removing the plaster restored 10%; indicating a physical plaster produced 528%. Re-importing the identical source retained the 10% base. |
| Existing video upload, audio and download | Native Video-mode picker accepted a 6-second, 720×960 H.264/AAC MP4 built from the public NASA fixture and a synthetic tone. The first frame found 1 nose. Processing completed locally and downloaded a 3,190,020-byte VP8/48 kHz Opus WebM, with 134 video frames through 5.856 s (22.71 encoded fps). Original audio decoded non-silently: mean −21.1 dB, peak −16.6 dB. All six one-second samples and the exact first encoded frame showed the plaster following the moving nose. This retest verifies the fix for an opening-frame tracking gap discovered during the initial upload test; paused anchors are now rebased to playback time. App playback advanced beyond 4 seconds. |
| Imported-video controls and silent vertical output | Play preview advanced; scrubber paused and sought to 0.05 s, reacquiring 1 nose. Switched to Tiny T-Rex before processing. With original audio unchecked and 9:16 selected, downloaded a 540×960 H.264 MP4, 5.909 s / 1,231,296 bytes, with no audio track. |
| Actual live camera UI | Labeled animated public-domain fixture plus optional synthetic mic tone through the real app controls. The final camera clock reported 27.5 tracked-motion updates/s, 28.3 preview fps. Downloaded 32.3-second 720×960 VP8/Opus clip contained 812 frames (25.1 encoded fps; p95 frame interval 70 ms), with non-silent audio (mean −21.4 dB, peak −18.3 dB). Five samples across the clip showed the curved plaster following the nose. This is a cloud-browser simulation, not phone hardware. |
| Responsive layout | Actual app iframe at 320, 390 and 1024 px: document widths 305, 375 and 1009 px (scrollbar allowance), with no document-level overflow. |
| Latest branding and support | Purple camera/lens plaster uses star → plane → star, matching the sister-app promo. App copy says Support the MANLINESS; no silly/silliness text remains. |
| Cross-app navigation | Followed the public MANLYFY footer link to Manly Curses Generator, then its MANLYFY promo back to the canonical app URL. The returned app loaded 1.3.2. |
| Reusable kit | ZIP contains all 75 original SVGs and PNGs, tier/milestone manifest, icons, geometry/renderer modules and an interactive example. No private reference photo or test portrait is in the kit. |

Photo scans can take several seconds on the CPU fallback, especially rotated images and small-face crop searches. Progress is visible and Stop search opens manual editing. Video processing runs in real time with the tab visible, up to 3 minutes / 150 MB input; recording still stops near 100 MB output. Original audio and final codecs depend on browser support. All test media above are public fixtures or generated tones; no private user media was uploaded or published.

The camera frame loop now uses decoded-frame callbacks with a timer fallback, decoder frame counters to suppress duplicates, current optical-flow poses without extra easing, and cached curved artwork. These changes reduce repeated work and avoid queued stale frames; they do not establish real-phone latency. Physical Android Chrome, front/rear camera, microphone permission/input, actual head turns, lower-powered hardware and touch gestures still need device testing.

The public motion lab uses the same optical-flow and canvas renderer with a known 2D transform. Its timer accounts for non-integral frame intervals so Lite sampling does not accidentally halve its update rate. Final 1.3.2 checks both passed:

| Mode | Updates/s | Tracked coverage | Nose error, mean / p95 | Mean flow step | UI heartbeat |
| --- | --- | --- | --- | --- | --- |
| Balanced | 23.6 (284 / 12.02 s) | 100% | 0.98 / 2.11 px | 3.24 ms | 235 / 240 |
| Lite | 20.1 (241 / 12.02 s) | 100% | 1.22 / 2.63 px | 2.22 ms | 240 / 240 |

Both used the real CPU worker and a 512 px public fixture under known translation/roll. They are controlled image benchmarks, not measurements of physical camera latency or real head turns.

## Earlier 1.2.2 release verification (historical baseline)


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
- Output is capped at 2560 px for photos and 1280 for live video (960 in Lite mode). Social formats fit the full source with dark borders.
- MediaRecorder picks a supported codec. H.264/AAC MP4 is preferred when advertised; otherwise WebM is used. Some social apps need external WebM-to-MP4 conversion. WebM seek/duration metadata may remain incomplete until playback finishes.
- Record with the tab visible. Leaving the tab stops camera/mic and recording. Clips stop at 3 minutes or around 100 MB.
- Progress belongs to the current browser; clearing site storage or using another device starts a new game. No accounts or cloud sync. There is no anti-cheat server.
- Optional tips and purchases happen on external creator-support services and never change rewards or camera access.

Reproduce model/media checks at `/qa/`. The `/?test-camera=1` route is visibly labeled, uses only packaged public-domain media and synthetic audio, and does not use a real camera or microphone.
