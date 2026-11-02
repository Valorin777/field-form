import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

// Three sections of one continuous, ribbed form. All geometry is authored here.
export function createSculpture(host, prefersStill) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });
  } catch {
    return {
      update() {},
      setStill() {},
      dispose() {},
      metrics: () => ({ fallback: true }),
    };
  }
  const mobile = () => window.innerWidth <= 700;
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile() ? 1.4 : 1.7));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  host.appendChild(renderer.domElement);
  host.classList.add("webgl-ready");
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 40);
  camera.position.set(0, 0, 8.4);
  const environment = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environmentMap = pmrem.fromScene(environment, 0.04);
  scene.environment = environmentMap.texture;
  environment.dispose();
  pmrem.dispose();
  scene.environmentIntensity = 1.25;
  const key = new THREE.DirectionalLight(0xfff5e1, 3.5);
  key.position.set(3, 4, 5);
  const edge = new THREE.DirectionalLight(0xff5a23, 4);
  edge.position.set(-3, -1, 2);
  const fill = new THREE.DirectionalLight(0x9db4e8, 1.5);
  fill.position.set(1, -2, -2);
  scene.add(key, edge, fill);
  const group = new THREE.Group();
  scene.add(group);
  const material = new THREE.MeshPhysicalMaterial({
    color: 0xc7c4b9,
    metalness: 0.94,
    roughness: 0.24,
    clearcoat: 1,
    clearcoatRoughness: 0.14,
  });
  const geometrySteps = mobile() ? 72 : 108,
    radialSteps = 24;
  function positions(part, morphed) {
    const a = [];
    for (let j = 0; j <= geometrySteps; j++) {
      const u =
        (part * Math.PI * 2) / 3 +
        0.025 +
        (j / geometrySteps) * ((Math.PI * 2) / 3 - 0.05);
      const ringRadius =
        1.3 + (morphed ? 0.32 * Math.cos(u * 3) : 0.05 * Math.sin(u * 2));
      const center = new THREE.Vector3(
        Math.cos(u) * ringRadius,
        Math.sin(u) * ringRadius,
        morphed ? 0.52 * Math.sin(3 * u) : 0.07 * Math.sin(u * 3),
      );
      const tangent = new THREE.Vector3(
        -Math.sin(u),
        Math.cos(u),
        morphed ? 1.1 * Math.cos(3 * u) : 0,
      ).normalize();
      const normal = new THREE.Vector3(Math.cos(u), Math.sin(u), 0);
      const binormal = new THREE.Vector3()
        .crossVectors(tangent, normal)
        .normalize();
      for (let k = 0; k <= radialSteps; k++) {
        const v = (k / radialSteps) * Math.PI * 2;
        const radius = 0.38 * (1 + 0.035 * Math.cos(u * 114));
        const p = center
          .clone()
          .addScaledVector(normal, Math.cos(v) * radius)
          .addScaledVector(binormal, Math.sin(v) * radius);
        a.push(p.x, p.y, p.z);
      }
    }
    return new Float32Array(a);
  }
  const pieces = [];
  for (let part = 0; part < 3; part++) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.BufferAttribute(positions(part, false), 3),
    );
    const indices = [];
    for (let j = 0; j < geometrySteps; j++)
      for (let k = 0; k < radialSteps; k++) {
        const a = j * (radialSteps + 1) + k,
          b = a + radialSteps + 1;
        indices.push(a, a + 1, b, b, a + 1, b + 1);
      }
    // Seal both ends with triangle fans; the separation reveals actual solid ends.
    for (let k = 1; k < radialSteps - 1; k++) {
      indices.push(0, k + 1, k);
      const o = geometrySteps * (radialSteps + 1);
      indices.push(o, o + k, o + k + 1);
    }
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const morphGeo = geo.clone();
    morphGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(positions(part, true), 3),
    );
    morphGeo.computeVertexNormals();
    geo.morphAttributes.position = [morphGeo.attributes.position.clone()];
    geo.morphAttributes.normal = [morphGeo.attributes.normal.clone()];
    morphGeo.dispose();
    const mesh = new THREE.Mesh(geo, material);
    mesh.userData.angle = ((part + 0.5) * Math.PI * 2) / 3;
    group.add(mesh);
    pieces.push(mesh);
  }
  let raf, pendingCapture;
  let width = 0,
    height = 0,
    progress = 0,
    targetProgress = 0,
    still = prefersStill,
    visible = true,
    paused = false,
    elapsed = 0,
    last = performance.now(),
    frames = 0;
  let px = 0,
    py = 0,
    tx = 0,
    ty = 0,
    qualityFrames = 0,
    qualityTime = 0;
  const colorA = new THREE.Color("#c7c4b9"),
    colorB = new THREE.Color("#c3cfda"),
    colorC = new THREE.Color("#242b27");
  const observer = new IntersectionObserver(
    ([e]) => {
      visible = e.isIntersecting;
    },
    { rootMargin: "120px" },
  );
  observer.observe(host);
  function size() {
    width = host.clientWidth;
    height = host.clientHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.position.z = mobile() ? 8.7 : 7.5;
    camera.updateProjectionMatrix();
    if (still && !raf) {
      last = performance.now();
      raf = requestAnimationFrame(render);
    }
  }
  const resize = new ResizeObserver(size);
  resize.observe(host);
  size();
  function pointer(e) {
    tx = (e.clientX / innerWidth - 0.5) * 0.13;
    ty = (e.clientY / innerHeight - 0.5) * 0.1;
  }
  window.addEventListener("pointermove", pointer, { passive: true });
  function visibility() {
    paused = document.hidden;
    last = performance.now();
  }
  document.addEventListener("visibilitychange", visibility);
  function render(now) {
    raf = requestAnimationFrame(render);
    const delta = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (!visible || paused) return;
    if (!still) elapsed += delta;
    progress = still
      ? 0
      : THREE.MathUtils.damp(progress, targetProgress, 7, delta);
    px = THREE.MathUtils.damp(px, still ? 0 : tx, 5, delta);
    py = THREE.MathUtils.damp(py, still ? 0 : ty, 5, delta);
    const split =
      Math.sin(Math.min(1, Math.max(0, (progress - 0.17) / 0.68)) * Math.PI) *
      0.75;
    const morph = THREE.MathUtils.smoothstep(progress, 0.51, 0.92);
    group.rotation.set(
      0.48 + py + Math.sin(elapsed * 0.22) * 0.035 + progress * 0.9,
      -0.38 + px + progress * 2.1,
      -0.3 + progress * 2.1 + (still ? 0 : Math.sin(elapsed * 0.16) * 0.04),
    );
    group.position.y = 0.04 + Math.sin(elapsed * 0.7) * 0.035;
    const scale = mobile() ? 0.78 : 1;
    group.scale.setScalar(
      scale * (1 - (mobile() ? 0.2 : 0.08) * Math.sin(progress * Math.PI)),
    );
    camera.position.set(
      Math.sin(progress * Math.PI) * 0.25,
      Math.sin(progress * Math.PI * 2) * 0.12,
      (mobile() ? 8.7 : 7.5) + Math.sin(progress * Math.PI) * 0.45,
    );
    camera.lookAt(0, 0, 0);
    scene.environmentRotation.y = progress * Math.PI * 0.7;
    key.position.x = 3 - progress * 5;
    fill.color.setHSL(0.6 - 0.54 * morph, 0.55, 0.7);
    edge.color.setHSL(0.06 + 0.5 * Math.sin(progress * Math.PI), 0.9, 0.6);
    pieces.forEach((m, i) => {
      m.position.set(
        Math.cos(m.userData.angle) * split,
        Math.sin(m.userData.angle) * split,
        split * (i - 1) * 0.4,
      );
      m.rotation.z = split * (i - 1) * 0.16;
      m.morphTargetInfluences[0] = morph;
    });
    material.color
      .copy(colorA)
      .lerp(colorB, Math.min(progress * 3, 1))
      .lerp(colorC, THREE.MathUtils.smoothstep(progress, 0.62, 0.84));
    material.roughness = 0.24 + morph * 0.2;
    material.metalness = 0.94 - morph * 0.35;
    edge.intensity = 4 * (1 - morph) + morph * 0.6;
    renderer.render(scene, camera);
    frames++;
    // Fill-rate adaptation preserves motion on low-power and software renderers.
    if (!still && frames > 30) {
      qualityFrames++;
      qualityTime += delta;
      if (qualityFrames >= 75) {
        if (
          qualityTime / qualityFrames > 0.029 &&
          renderer.getPixelRatio() > 0.65
        ) {
          renderer.setPixelRatio(
            Math.max(0.65, renderer.getPixelRatio() * 0.8),
          );
        }
        qualityFrames = 0;
        qualityTime = 0;
      }
    }
    if (pendingCapture) {
      pendingCapture(renderer.domElement.toDataURL("image/webp", 0.94));
      pendingCapture = null;
    }
    if (still) {
      cancelAnimationFrame(raf);
      raf = null;
    }
  }
  raf = requestAnimationFrame(render);
  return {
    update(p) {
      targetProgress = p;
    },
    capture() {
      return new Promise((resolve) => {
        pendingCapture = resolve;
        if (!raf) {
          last = performance.now();
          raf = requestAnimationFrame(render);
        }
      });
    },
    setStill(value) {
      still = value;
      if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(render);
      }
    },
    metrics: () => ({
      fallback: false,
      frames,
      triangles: renderer.info.render.triangles,
      drawCalls: renderer.info.render.calls,
      pixelRatio: renderer.getPixelRatio(),
      progress,
      morph: pieces[0].morphTargetInfluences[0],
      width,
      height,
    }),
    dispose() {
      cancelAnimationFrame(raf);
      observer.disconnect();
      resize.disconnect();
      window.removeEventListener("pointermove", pointer);
      document.removeEventListener("visibilitychange", visibility);
      pieces.forEach((m) => m.geometry.dispose());
      material.dispose();
      environmentMap.dispose();
      renderer.dispose();
    },
  };
}
