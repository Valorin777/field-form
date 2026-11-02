# LAST WIND — verification

Verified on 2 November 2026 against the final production build. All **51 checks passed**, with **zero runtime errors, failed asset requests or browser warnings**. The complete machine-readable record is [qa-report.json](qa-report.json). Reproduce with `npm run qa` and `QA_URL`; see the README.

## Visual checks

Four scroll positions were captured at desktop 1440 × 900 and mobile 390 × 844 (DPR 3, WebGL capped at 1.5). The actual frames are shown in [preview.jpg](preview.jpg). Independent visual review inspected all eight frames. Follow-up corrections improved mobile title legibility, replaced a schematic foreground with detailed botanical artwork, subdued regular grass stems, grounded the feet with a contact shadow and local grass, and replaced the desktop keyboard hint with a touch hint on phones.

The sequence has continuously changing camera position, moon/eclipse, colour, foreground depth and type. A blade-light sweep and an iris transition are separately driven by scroll. Actual rendered pixels were compared across stationary frames to confirm ambient movement, alongside simulation/frame counters.

## Functional coverage

- Forward and repeated reverse scrolling through all four scenes.
- Space pause/resume, scroll while paused, and touch tap pause/resume.
- Native Page Down and a keyboard-visible skip link with focus transfer.
- Resize at 320 × 740, 390 × 844, 768 × 1024, 1440 × 900, 1920 × 1080, and 844 × 390; no horizontal overflow.
- Mobile composition, actual high-DPR rendering cap and lower geometry density.
- System reduced motion, including repeated changes while the page is open.
- WebGL unavailable, GPU context loss and JavaScript disabled: all four chapters remain readable in natural flow.
- All runtime assets use the same origin. No external font, image or tracking requests.
- No buttons, sales forms or portfolio cards.

## Measurements

Headless Chromium used hardware ANGLE Metal on Apple M5. A 120-frame sample measured a median of 16.7 ms, p95 of 16.8 ms and mean of 16.67 ms (approximately 60 fps). Desktop rendered 10 draw calls, 27,406 triangles and 420 particles. Only two GPU image textures are used; the background image and type are DOM layers.

The three WebP images total 1,425,342 bytes. Fonts total approximately 43 kB. The Three.js chunk is approximately 132 kB gzip; Vite reports its usual advisory because the uncompressed chunk exceeds 500 kB. DPR reduces after sustained slow frames. Hidden and offscreen rendering is suspended.

## Limits

Mobile checks used a touch/DPR emulation on this Mac, not a physical iPhone or Android handset. Measurements describe this device and browser, not all visitor hardware. The cinematic character is layered original artwork with localized cloth deformation, not a skeletal 3D model. There is no audio. The reduced-motion and non-WebGL versions deliberately use still scenes.

The prior FIELD / FORM site is preserved in genuine git history at `71108459fa687ae709722f1de5666e043050cd3b`. Private reference media remains outside this repository.
