# MANLYFY reusable filter kit

This is preparation for reusing the MANLYFY nose-plaster effect, **not a published Instagram effect or a native-platform project**.

Meta ended the Meta Spark third-party AR publishing platform on 14 January 2025. The old Spark route cannot publish a new MANLYFY effect. The original official announcement is at https://spark.meta.com/blog/meta-spark-announcement/ (access may be blocked); contemporaneous report: https://www.reuters.com/technology/meta-shut-augmented-reality-studio-used-by-third-party-creators-2024-08-27/ .

The working Instagram path is to record/export in MANLYFY, use **9:16 Story**, then share a supported file to Instagram or import it from the phone gallery. Native sharing depends on the browser and Instagram; MANLYFY cannot force a share target or automatically publish a Story. WebM may require conversion to MP4 in a compatible editor. Recording format is chosen from the browser's supported codecs.

## What the ZIP includes

- 75 original transparent SVG textures and matching 640×200 PNGs.
- Camera app icons, including the purple star–plane–star logo.
- `manifest.json` with design IDs, names, categories, tiers and free unlock milestones.
- Browser-independent geometry and canvas rendering modules under `web/`.
- A browser-local `example.html`: open through any static HTTP server and choose a design to inspect the curved effect and its roll/yaw controls. No camera, account or face photos are included.
- MIT license and a porting contract for normalized nose position, width, head roll, yaw and mirroring.

These are reusable assets and a working browser renderer. A native AR platform would need its own face-landmark adapter, packaging, creator account, review and separate device verification. No compatibility with a specific native editor is claimed.

## Placement contract

`web/core.js` exports `landmarkToPatch(points, sourceWidth, sourceHeight)` and `patchPose(patch, outputRect, mirrored)`. The sparse geometry uses MediaPipe face indexes 33/263 (outer eyes), 5 (nose bridge), and 98/327 (nose wings). Positions are normalized to the unmirrored source. `landmarkToPatch` returns nose-width-based sizing with an eye-span cap. Roll is radians. Yaw is clamped to ±0.7. If another SDK has different landmark indexes, map those anatomical positions before calling it. Face geometry remains on the device.

`web/render.js` exports `drawBandage(context, decodedTexture, pose, live = false)`. It wraps artwork across the nose; `live=true` uses a bounded curved-sprite cache to reduce per-frame drawing cost. Photos use the full-resolution path. This is a 2D effect, not a fitted 3D face mesh.

Start with three plain designs. Free milestones are 3, 5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90, 100, 150, 175, 200, 230, 260, 300, 350, 400, 450, 500, 600, 700, 800, 900 and 1000 photos. See the per-design `unlockAtPhotos` value and pack sizes in the manifest. A platform port should explicitly decide how local progression works; the asset pack does not implement native-platform progression.

## Rebuild

Run `npm run filter-kit` with Node 20+, Python 3, and the optional `sharp` image package available (`npm install --no-save sharp`). This does not change the browser app's runtime dependencies. It creates `integrations/manlyfy-filter-kit.zip`. The renderer and art are copied from this repository; no private photo or test portrait is included.
