# MANLYFY — full conversation audit

16 October 2026 · Release 1.3.2. This checklist includes the original build request and every later change. The most recent instruction controls when a design preference changed. Implementation is distinguished from verified browser behavior and physical-device checks.

| Request | Implementation / evidence | Limit |
| --- | --- | --- |
| Research MANLYFY before branding | Exact-name search, App Store, Google Play, .com/.app RDAP, USPTO and CIPO observations are recorded in NAME-RESEARCH.md. A similar existing Manly photo editor was identified. | Preliminary screening, not legal clearance. Direct Google search was throttled; alternative indexed searches were used. |
| Three alternative names if needed | Noseworthy Cam, Plaster Party, Mighty Nose recorded before branding. MANLYFY retained as the requested provisional name. | Alternatives were not trademark-cleared. |
| GitHub account, repository and free hosting | Public tyclodd/manlyfy repository and HTTPS GitHub Pages site. Source committed; main branch root published. | No domain or paid service purchased. |
| MANLYFY and slogan | “The Manliest Camera on Earth.” used in app and metadata. | — |
| Private reference photos | Used only for conversation-level visual direction. Never placed in source, screenshots, fixtures, filter kit or repository history. The new failure screenshot is also kept out of the public app. | Public NASA / White House / TensorFlow fixtures are used for testing. |
| Photo upload | Local decoding, MIME-byte sniffing, clear visible failures, max 35 MB per photo; browser decoder fallback. | HEIC/HEIF depends on the browser; unsupported files require a JPG/PNG copy. |
| Multiple uploaded photos | Verified three-file native selection with 1, 2 and 1 detected faces. Up to 10 files / 100 MB per set. Previous/next navigation retains per-photo edits and count credit. Only the active photo is decoded to protect memory. | Verified three-photo navigation and retained manual edits. Files and edits are session-local; downloads are per photo. |
| Automatic nose and face placement | MediaPipe first, self-hosted CPU compatibility path. Still photos use higher-resolution detection and overlapping source-space crops for small faces. | Small, obscured, strongly sideways or blurred faces can still fail. Exact user screenshot was not processed publicly. |
| Multiple people | Up to 8 faces per photo automatically; opt-in Live group for up to 4 camera faces. | Controlled group fixtures do not establish live-crowd accuracy. |
| Nose-sized plaster | Nose-wing width with an eye-span cap. Curved wrap and head-roll/yaw geometry. | Playful 2D effect, not a fitted 3D skin mesh. |
| Manual adjustment | Add/remove/select, drag, 5–220% size, ±180° rotation, arrow keys, two-finger pinch and twist. Touch selection has a larger target. | Node geometry and real editor synthetic-event checks passed; physical multi-touch still needs a phone. |
| Save immediately beside picture | One-tap Save photo overlays the preview, enabled when the filtered result is ready. Existing lower download button remains. Selection handles are DOM-only and never exported. | Browser download prompts are controlled by the browser. |
| No interruptions when saving | Rewards announce non-blocking feedback; a reward details dialog opens only if requested. No account, survey or app confirmation required to download. | — |
| Watermark-free photos | Canvas PNG export; comparison/selection UI excluded. | Up to 2560 px, according to source dimensions. |
| Live video and nose movement | Worker neural scans, optical flow between scans, decoded-frame callback with a timer fallback, current-frame rendering, bounded cached curved artwork. Fresh poses use no extra easing lag. | Controlled app simulation: 27.5 tracked-motion updates/s; downloaded video 25.1 fps. Real-device latency, fast yaw, thermal behavior and low-powered phones remain device checks. |
| Front/rear camera | Facing-mode switching; camera and microphone stop when leaving the tab. | Physical camera hardware unavailable in cloud browser. |
| Filtered recording with audio | Canvas capture + MediaRecorder, optional mic, supported codec selection, clear start/stop and timer. Filter is permanently drawn into the clip. | Real app synthetic-media recording, audible tone, download and playback verified. Physical microphone and device-specific MP4 behavior require phones. Clips stop at 3 minutes / ~100 MB. |
| Upload existing videos | Mode-specific video picker; preview/play/pause/seek; real-time nose tracking and local filtered export from the first frame; original-audio checkbox. Actual 6-second H.264 MP4 import exported VP8/Opus with audible original tone, and a separate silent vertical MP4. | One clip, up to 3 minutes / 150 MB. Browser-decodable formats; keep tab visible. Codec and device limitations remain. |
| Switch plaster before recording | Above-camera swipe carousel works before camera permission. Design controls lock during recording. | Only earned designs are wearable. |
| At least 60 original children's designs | 75 designs: 3 plain starters + 72 unique illustrated rewards. Dinosaurs, unicorns, sharks, puppies, kittens, rainbows, aliens, pirates, princesses, monsters, robots and more. | Original generic motifs; no licensed cartoon characters or branded product art. |
| Three basic starters and premium progression | Beige default, Plain Sky and Plain Blush. Playful → Deluxe → Legendary detail increases. | All rewards free; progress stays on this browser. |
| Requested unlock milestones | 3, 5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90, 100; then 150, 175, 200, 230, 260, 300, 350, 400, 450, 500; later 600, 700, 800, 900 and 1,000. Packs grow to unlock all 75. | Boundary logic tested; not 1,000 physical camera captures. |
| Band-Aid Roulette and categories | Swipeable categories, earned-only random selection, group outfit mixing. | — |
| Before/after | Source/filtered view and separate fictional manliness scores. | — |
| Funny ratings and creative jokes | 331,785 generated/legacy punchline combinations per percent. “Completely made up. Scientifically unserious.” preserved. New-joke buttons keep score unchanged. | Procedural combinations are large but not literally infinite. |
| Same image, stable score | Deterministic visual fingerprint plus up to 200 local similar-shot records. Near-identical pictures reuse the local seed. No face identification or gender/personality inference. | Similar-shot grouping is approximate and device-local; storage removal resets grouping. |
| Plaster gives higher rank; no unplastered 999% | Without any indicated/added plaster: 1–499%. With plaster: 500–999%; 999 is possible, not guaranteed. More plasters add bounded bonuses. | Digital plasters are counted automatically. A checkbox indicates physical plasters already in the source; universal physical-bandage recognition is not claimed. |
| Ranking section below camera | Dedicated “Same photo. Same MANLY.” section with before/after cards, joke controls and a plaster-upgrade action. | Fictional game scores, not evaluations of a person. |
| Instagram/TikTok vertical output and sharing | 9:16, square and original outputs; native file sharing where supported, gallery/download fallback. | WebM can require MP4 conversion for some social apps. Native Instagram sharing cannot be forced. |
| Prepare a native-style filter | Reusable ZIP: all 75 SVG/PNG designs, manifest with milestones, purple app icons, geometry, canvas renderer and an interactive example. | Not a native-editor project or a published effect. Meta Spark third-party publishing closed in January 2025. |
| PWA | Manifest, standalone app icons, service worker and local asset caching. Android installation instructions included. | Physical install/offline restart not verified here. |
| Design | Mobile-first, large preview, childish premium-tech style, playful motion, visible camera/privacy feedback. | 320/390/1024 px layouts checked previously; combined update rechecked after publication. |
| Latest logo request | Purple camera with bandage over lens; star → plane → star replaces dinosaur/butterfly. App icon PNGs and generator promo use the same artwork. | Supersedes the earlier neutral-color/dinosaur preference. |
| Creator support | Same public PayPal, Interac, Cameo and merch destinations as Manly Curses Generator. Label is “Support the MANLINESS.” | Optional links; no payments or purchases made. No “silly/silliness” copy retained in the app. |
| Instagram and YouTube | Existing verified Tye Clodd Instagram/YouTube destinations. | No social messages or posts sent. |
| Navigation between both apps | MANLYFY → Manly Curses Generator and reciprocal footer promo. | Generator edits are limited to the promo SVG, preserving concurrent work. |
| Local/private/free | No media uploads, accounts, subscriptions, ads, analytics or required payments. Self-hosted models. | Static hosting still serves app assets; external support services have their own terms. |

## Browser evidence and remaining checks

See TESTING.md for observed results, release screenshots and controlled benchmarks. The previous release's observed performance is historical; it is not automatically evidence for the changed frame loop. Every new claim is updated only after the corresponding check.

Not claimed as verified: real Android/iOS cameras, microphone input/permission prompts, physical two-finger gestures, native mobile share targets, PWA installation, real low-powered-phone performance, actual head yaw under motion blur, or native Instagram publication.
