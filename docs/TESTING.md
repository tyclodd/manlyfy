# MANLYFY verification record

16 October 2026 · Public release 1.1.2 · https://tyclodd.github.io/manlyfy/

## Verified

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

## Browser-lab limits

WebGL2 and OffscreenCanvas WebGL2 are disabled in this cloud browser. The verified automatic tracking path is the self-hosted CPU compatibility tracker. The primary MediaPipe Face Landmarker GPU worker and browser-canvas paths are implemented, with fallback, but could not be verified here. Their code must not be described as a completed real-device test.

The CPU path pairs each overlay with the frame analyzed, at a lower frame rate and effective image resolution. Full photo inference took approximately 2.2–4.3 seconds in this browser. Photo mode is preferable on devices where live tracking is choppy. The collection uses image previews to avoid thousands of SVG DOM nodes.

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
