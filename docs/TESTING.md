# Verification record

Launch work in progress; 15 October 2026.

## Completed local checks

`npm run check`: JavaScript syntax checks and 6 meaningful Node tests passed.

- All 73 design entries exist; 72 unique original motifs include every required theme.
- Social output geometry preserves whole images and keeps encoder dimensions even.
- Mirrored selfie placement, manual rotation and hit testing agree.
- Face landmarks preserve head roll and reject missing geometry.
- Group association follows face positions when result order changes; lost faces are removed.
- Codecs are selected from browser-advertised support; permission-denial messages include recovery steps.

## Browser checks

Pending public deployment and browser verification. Implementation is not yet a verification claim.

## Still requires physical devices

- Real front and rear cameras, realistic head yaw/motion and skin/lighting diversity.
- Actual microphone capture and audio quality (synthetic audio only can be tested in the browser lab).
- Android Chrome installation, native share targets and media-gallery integration.
- Low-powered-phone throughput, heat, battery consumption and long-clip memory behavior.

The browser lab uses real MediaPipe inference, packaged public-domain fixtures, modified brightness, a composite group, an animated image stream and synthetic audio. Simulated conditions must not be described as physical-camera tests.
