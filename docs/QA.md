# Verification

Verified on 2 November 2026 against the production build.

- Headless Chromium, hardware ANGLE Metal renderer on Apple M5.
- Desktop 1440 × 900; mobile composition 390 × 844.
- Responsive resize checks at 320, 768 and 1920 px.
- Live geometry, camera and material progression checked at multiple scroll positions, including the mobile sequence.
- All three study controls exercised repeatedly; all dialogs opened, closed with Escape and checked for focus restoration.
- Keyboard skip navigation, manual Motion control and system reduced motion checked.
- WebGL deliberately disabled to verify the vector fallback and preserved content.
- No page errors, failed requests or console warnings in the main browser run.
- 60-frame hardware sample: average 60 fps, median frame interval 16.7 ms, p95 16.8 ms. This measures this Mac/browser, not every visitor's hardware.
- Main sculpture: 3 draw calls, 15,684 triangles at desktop detail. Mobile first-load geometry uses fewer segments. Resolution reduces automatically under sustained frame cost; hidden/offscreen 3D is not rendered.

The complete check list and measurements are in [qa-report.json](qa-report.json). The headless script is reproducible with `npm run qa`; see the root README for setup.

Desktop and mobile screenshots were visually inspected. Contrast on the Signal control, mobile heading breaks and mobile sculpture framing were corrected after inspection. Private reference media was kept outside this repository.

Limitations: mobile viewport behavior was simulated on this Mac; no physical iPhone/Android device was available. WebGL uses the original vector fallback when unavailable. The Three.js production chunk is approximately 134 kB gzip; Vite emits its usual warning because its uncompressed size exceeds 500 kB.
