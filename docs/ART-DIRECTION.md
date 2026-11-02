# LAST WIND — art direction

A digital nocturne, told through a field and a lone wanderer. The opening is a film poster: huge pale type, silver grass, dark cloth and a moon. The camera moves toward the wanderer as the type dissolves. A diagonal sweep of blade light introduces an ember-coloured storm. An iris of darkness carries the viewer back to a wider, quieter composition.

Four movements: **The opening → The field → The awakening → The return.** The film remains one continuous viewport. There is no project catalogue or commercial call to action.

## Original imagery

These images were generated specifically for this project with the built-in image generation tool, then losslessly preserved at source outside the repository and optimized to WebP for delivery. The ronin and foreground grass retain genuine alpha transparency. The original source PNGs are not runtime dependencies.

- `public/art/field.webp` — 1672 × 941, moonlit landscape plate.
- `public/art/ronin.webp` — 1024 × 1536, full-body character with katana and trailing cloth.
- `public/art/grass.webp` — 1774 × 887, fine botanical foreground.

No visual reference videos, contact sheets, third-party characters or copied branded assets are published. The samurai is an original character illustration. The art is composited on subdivided planes with restrained, localized vertex deformation; it is not presented as a rigged character model.

## Generation prompts

### Field

Use case: stylized-concept. Asset type: original cinematic background plate for an immersive samurai scroll-film website, landscape 16:9. Create an extraordinarily beautiful dark moonlit Japanese wilderness: an immense field of delicate silver susuki pampas grass, the field sweeping like an ocean in wind, distant dark mountain ridges, a tiny weathered torii silhouette far left, a single elegant windswept pine at far right. The horizon is slightly below the middle. Upper half contains a deep charcoal blue misty night sky and soft luminous clouds, with generous dark negative space. Atmospheric layered depth: near black stalks at the bottom edge, pewter grass across the middle ground, blue-grey mist filling distant valleys. Moonlight comes from upper center but DO NOT draw the moon itself, it will be animated separately. Rich inky blacks, subtle steel blue and desaturated sage, fine silver highlights. Premium film production concept art with tactile photographic realism, delicate painterly restraint, precise natural botany, cinematic low-key lighting, extraordinary quiet melancholy. Eye level camera with a wide lens. NO people, NO samurai, NO swords, NO buildings in foreground, NO text, NO lettering, NO watermarks, NO interface. A continuous environmental painting, not a collage. Wide composition, beautiful independent crop for mobile center.

### Ronin — transparent background

Use case: stylized-concept. Asset type: a premium cinematic character layer for a dark samurai scroll-film, isolated on a genuinely transparent background. Original full-body lone ronin samurai, anatomically impeccable, realistic dramatic film concept art. THREE-QUARTER PROFILE facing to viewer's left, head slightly lowered, calm formidable presence. Face in deep shadow below a wide dark weathered woven kasa hat. Black layered kimono and charcoal lamellar shoulder armor, textured dark grey hakama, leather bracers, traditionally wrapped boots. One long elegant katana held downward in the near hand, blade diagonally down toward lower left, fine cold silver blade catching light, credible grip and five fingers; a sheathed shorter sword on the far hip. Long sculptural tattered black cloak/scarf streams strongly to viewer's right in the wind, with a small muted deep crimson fabric accent near belt. Strong readable asymmetric silhouette, human anatomy and recognizable authentic clothing. Cool silver moon rim-light comes from upper left, soft warm rusty reflection at right edge, detailed subtle dark cloth folds and metal, black cinematic contrast with legible illuminated edges. Entire body, feet, hat, blade and flowing cloth inside canvas with comfortable transparent margins. Character body vertically tall with cloth extending laterally right and katana extending left. View eye-level, not cartoon, not anime, no low polygon style, no fantasy horns, no huge armor, no extra limbs, no duplicated weapons, no blood, no text, no logos. This will be composited over an expansive moonlit grass field; do not include any ground, smoke, scenery, moon, shadow plane or background. True clean alpha transparency all around character.

### Foreground grass — transparent background

Use case: stylized-concept. Asset type: high fidelity photographic botanical foreground layer for a moonlit samurai film, wide landscape canvas. A dense, beautifully irregular band of dark Japanese susuki pampas grass and graceful wild grasses blowing strongly to the right. ONLY grass, isolated on true alpha transparency. Fine long curving stems, delicate feathery silver seed heads, narrow black green leaves, tiny individual backlit hairs, richly detailed photographic realism. Cool low-key silver-blue moon rim light, most stems almost black; absolutely no bright white flat shapes. Grass rooted at and extending below the bottom edge, highest stems reach 60 percent of the canvas height, upper 35 percent entirely transparent. Lower quarter a thick overlapping weave of dark stems and leaves, naturally varied heights, airy and uneven not a lawn or regular grid. Some taller grasses frame left and right, center a little lower, cinematic wide composition. The grass is in the same focal plane with crisp believable botanical edges, no blur baked in. No ground, no soil, no scenery, no sky, no background color, no people, no text, no moon, no geometric stylization. This is a foreground compositing asset, natural detailed plant forms with accurate alpha cutout.

## Motion

GSAP scrubs one normalized progress value. Camera and layer transforms use eased intervals of that value, so scrolling backward reverses the same composition. Ambient time is independent: continuous wind, cloth, dust/embers, fog and subtle camera drift continue when scrolling stops. Space/tap pauses ambient time without locking scroll. Reduced motion disables both the WebGL loop and pinned progression.

The GPU renders one texture for the character and another for two botanical foreground layers, with procedural fog, grass and particles. The landscape, moon and typography are composited DOM layers. No video download or external image CDN is required.
