# LAST WIND

A cinematic samurai scroll film by Valorin. A moonlit field, one wanderer, and a world that never quite holds still.

**Live film:** https://valorin777.github.io/field-form/

**Repository:** https://github.com/Valorin777/field-form

The repository retains its original `field-form` address. The previous FIELD / FORM sculpture site remains in git history at `71108459fa687ae709722f1de5666e043050cd3b`.

## The film

Four continuous compositions move from silver moonlight through an ember-lit storm and back to the quiet field. Scrolling directs the camera, eclipse, colour, typography, light sweep and iris transition. Wind animates the grass and trailing cloth while layered procedural fog and particles keep the scene alive.

The character is original generated artwork composited into a layered WebGL scene. It is intentionally a detailed cinematic image with localized cloth deformation, not a skeletal 3D character model. Three original images total approximately 1.43 MB in WebP, including alpha transparency.

There are no accounts, forms, ads, analytics, cards, purchase links or visible buttons. All runtime assets and fonts are served from this repository.

## Run locally

```sh
npm ci
npm run dev
npm run build
npm run preview
```

The Vite base is `/field-form/`, including local previews. Open the full URL Vite prints.

## Motion and accessibility

- Scroll, arrow keys or Page Down advance the film using native page scrolling.
- Space pauses/resumes ambient movement; touch users can tap the artwork. The scroll-directed composition remains usable while paused.
- A keyboard-visible skip link moves focus to the afterword.
- `prefers-reduced-motion` delivers all four compositions in normal document flow, without WebGL, pinning or parallax.
- The same complete still version works with JavaScript disabled, without WebGL 2, or after GPU context loss.
- Mobile uses a different composition, fewer grass instances and particles, and a maximum rendering DPR of 1.5.
- Rendering stops when the canvas is outside the viewport or the document is hidden.

## Implementation

Vanilla JavaScript, Three.js custom GLSL shaders, GSAP ScrollTrigger, and Vite. Anton and Manrope are self-hosted OFL fonts. There is no backend or paid service requirement.

- `src/world.js` — camera, cloth, fog, instanced grass, particles, contact shadow and resource disposal.
- `src/main.js` — scroll choreography, DOM layers, keyboard/touch pause and fallback lifecycle.
- `src/style.css` — typography, atmosphere, responsive composition and the still version.
- `docs/ART-DIRECTION.md` — design and generated-art prompts.
- `docs/QA.md` — measured validation and limitations.

## Verify

With a production preview running:

```sh
npx playwright install chromium
QA_URL=http://127.0.0.1:4173/field-form/ npm run qa
```

The script also accepts the public URL in `QA_URL`. On macOS it uses Chromium's Metal renderer in headless mode. `PLAYWRIGHT_BROWSERS_PATH` may point to an existing browser installation. Reports and screenshots go into ignored `qa-output/last-wind/`.

The Pages workflow builds and deploys pushes to `main`. GitHub Pages is the only public hosting target.

## Licences

Original project source is MIT licensed. Third-party notices remain in `public/licenses/`; GSAP's no-charge Standard licence is separate from MIT. Generated artwork was created specifically for this project. No private reference video, reference screenshot or third-party branded asset is included.
