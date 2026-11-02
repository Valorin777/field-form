import * as THREE from "three";

const noise = /* glsl */ `
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){return noise2(p)*.57+noise2(p*2.07)*.28+noise2(p*4.13)*.15;}
`;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const mix = (a, b, t) => a + (b - a) * t;
function seededRandom(seed = 1707) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

export async function createWorld(canvas) {
  const context = canvas.getContext("webgl2", {
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
  });
  if (!context) throw new Error("WebGL 2 unavailable");
  context.pixelStorei(context.UNPACK_FLIP_Y_WEBGL, false);
  context.pixelStorei(context.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  const renderer = new THREE.WebGLRenderer({
    canvas,
    context,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 80);
  const loader = new THREE.TextureLoader();
  const [ronin, grassTexture] = await Promise.all([
    loader.loadAsync(`${import.meta.env.BASE_URL}art/ronin.webp`),
    loader.loadAsync(`${import.meta.env.BASE_URL}art/grass.webp`),
  ]);
  grassTexture.colorSpace = THREE.SRGBColorSpace;
  ronin.colorSpace = THREE.SRGBColorSpace;
  ronin.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  const uniforms = {
    uTime: { value: 0 },
    uHeat: { value: 0 },
    uWind: { value: 1 },
    uDpr: { value: 1 },
  };
  let progress = 0,
    time = 0,
    paused = false,
    disposed = false,
    visible = true,
    frames = 0,
    last = 0,
    averageMs = 16.7;
  let width = 0,
    height = 0,
    mobile = false,
    dpr = 1,
    slowFrames = 0,
    lastRenderedProgress = -1;
  const cameraTarget = new THREE.Vector3();
  const textures = [ronin, grassTexture],
    geometries = [],
    materials = [];
  const add = (geometry, material) => {
    geometries.push(geometry);
    materials.push(material);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    return mesh;
  };

  const character = add(
    new THREE.PlaneGeometry(4.78, 7.17, 50, 75),
    new THREE.ShaderMaterial({
      uniforms: { ...uniforms, uMap: { value: ronin }, uOpacity: { value: 1 } },
      transparent: true,
      depthWrite: false,
      vertexShader: /* glsl */ `
      uniform float uTime; uniform float uWind; varying vec2 vUv;
      void main(){vUv=uv;vec3 p=position;
        // The body, fingers and blade are anchored. Wind only lifts the trailing cloth.
        float cloth=smoothstep(.57,.98,uv.x)*(1.-smoothstep(.74,.9,uv.y))*smoothstep(.08,.23,uv.y);
        float gust=sin(uTime*1.4-uv.x*9.+uv.y*4.)*.065+sin(uTime*2.3-uv.x*14.)*.028;
        p.x+=cloth*gust*uWind;p.y+=cloth*sin(uTime*1.7-uv.x*11.)*.045*uWind;
        p.z+=cloth*sin(uTime*1.4-uv.x*9.)*.16*uWind;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
      }`,
      fragmentShader: /* glsl */ `
      uniform sampler2D uMap; uniform float uHeat; uniform float uOpacity; uniform float uTime; varying vec2 vUv;
      void main(){vec4 c=texture2D(uMap,vUv);if(c.a<.012)discard;
        vec3 cool=c.rgb*vec3(.8,.94,1.02);
        vec3 warm=c.rgb*vec3(1.5,.65,.39);
        c.rgb=mix(cool,warm,uHeat*.72);
        float rim=pow(max(c.r,max(c.g,c.b)),1.5);
        c.rgb+=rim*uHeat*vec3(.13,.025,.003);
        gl_FragColor=vec4(c.rgb,c.a*uOpacity);
        #include <colorspace_fragment>
      }`,
    }),
  );
  character.renderOrder = 3;
  const contactShadow = add(
    new THREE.PlaneGeometry(2.0, 0.48),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: `varying vec2 vUv;void main(){vec2 p=(vUv-.5)*2.;float a=exp(-dot(p,p)*3.5)*.73;gl_FragColor=vec4(.004,.008,.01,a);}`,
    }),
  );
  contactShadow.renderOrder = 2;
  contactShadow.position.z = -0.01;

  const random = seededRandom();
  function grass(count, front = false, heads = false) {
    const geo = new THREE.PlaneGeometry(
      heads ? 0.16 : 0.026,
      heads ? 0.36 : 1,
      1,
      heads ? 1 : 5,
    );
    geo.translate(0, heads ? 1.05 : 0.5, 0);
    geometries.push(geo);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) seeds[i] = random();
    geo.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seeds, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        ...uniforms,
        uHeads: { value: heads ? 1 : 0 },
        uFront: { value: front ? 1 : 0 },
      },
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
      vertexShader: /* glsl */ `
        uniform float uTime;uniform float uWind;attribute float aSeed;varying vec2 vUv;varying float vLight;
        void main(){vUv=uv;vec3 p=position;float tip=max(0.,p.y);
          float phase=instanceMatrix[3].x*.31+instanceMatrix[3].z*.4+aSeed*6.;
          float sway=sin(uTime*1.25+phase)*.17+sin(uTime*.57+phase*1.7)*.08+.19;
          p.x+=(pow(tip,1.8)*sway*uWind);p.z+=pow(tip,1.8)*sin(uTime*.9+phase)*.08;
          p.x*=mix(1.,.12,smoothstep(.12,1.,uv.y))*.8+.2;
          vec4 world=instanceMatrix*vec4(p,1.);vLight=.2+aSeed*.8;
          gl_Position=projectionMatrix*modelViewMatrix*world;
        }`,
      fragmentShader: /* glsl */ `
        uniform float uHeat;uniform float uHeads;uniform float uFront;varying vec2 vUv;varying float vLight;
        void main(){float alpha=.36;
          if(uHeads>.5){float x=abs(vUv.x-.5)*2.;float shape=pow(max(0.,sin(vUv.y*3.14159)),.7);alpha=smoothstep(shape,shape-.2,x);alpha*=.4+.6*pow(sin(vUv.y*95.+x*12.),2.);}
          vec3 cool=mix(vec3(.004,.008,.01),vec3(.018,.032,.034),vLight*pow(vUv.y,.65));
          if(uHeads>.5)cool=mix(vec3(.15,.19,.17),vec3(.52,.54,.44),vLight)*.75;
          vec3 warm=cool*vec3(1.8,.63,.25);vec3 col=mix(cool,warm,uHeat);
          col*=mix(1.,.55,uFront);gl_FragColor=vec4(col,alpha);
          #include <colorspace_fragment>
        }`,
    });
    materials.push(mat);
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    mesh.frustumCulled = false;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      let x = (random() - 0.5) * 32,
        z = front ? 2.6 + random() * 4.5 : -3 + random() * 3;
      let size = 0.18 + Math.pow(random(), 2) * 1.5;
      if (front && Math.abs(x) < 2.7) size *= 0.58;
      dummy.position.set(x, -3.55 - random() * 0.22, z);
      dummy.rotation.set(0, (random() - 0.5) * 0.8, (random() - 0.5) * 0.22);
      dummy.scale.set(0.7 + random() * 0.7, size, size);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.renderOrder = front ? 6 : 1;
    scene.add(mesh);
    return mesh;
  }
  const grassBack = grass(500, false),
    grassFront = grass(320, true);
  function grassLayer(x, z, scale, flip) {
    const mesh = add(
      new THREE.PlaneGeometry(10, 5, 65, 30),
      new THREE.ShaderMaterial({
        uniforms: {
          ...uniforms,
          uMap: { value: grassTexture },
          uFlip: { value: flip },
        },
        transparent: true,
        depthWrite: false,
        vertexShader: `uniform float uTime;uniform float uWind;varying vec2 vUv;
        void main(){vUv=uv;vec3 p=position;float tip=pow(uv.y,1.9);
          p.x+=tip*(sin(uTime*1.1-position.x*.7)*.17+sin(uTime*1.8-position.x)*.06)*uWind;
          p.y+=tip*sin(uTime*.8-position.x*.9)*.045*uWind;
          p.z+=tip*sin(uTime*.7-position.x*.4)*.12;
          gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
        fragmentShader: `uniform sampler2D uMap;uniform float uHeat;uniform float uFlip;varying vec2 vUv;
        void main(){vec2 uv=vUv;uv.x=mix(uv.x,1.-uv.x,uFlip);vec4 c=texture2D(uMap,uv);if(c.a<.02)discard;
          c.rgb*=mix(vec3(.5,.63,.65),vec3(.95,.32,.12),uHeat);
          gl_FragColor=c;
          #include <colorspace_fragment>
        }`,
      }),
    );
    mesh.position.set(x, -4.0, z);
    mesh.scale.setScalar(scale);
    mesh.renderOrder = 6;
    return mesh;
  }
  grassLayer(-3.5, 2.5, 0.75, 0);
  grassLayer(3.5, 2.6, 0.75, 1);
  const footGrass = grassLayer(1.5, 0.15, 0.25, 1);
  footGrass.position.y = -3.35;
  footGrass.renderOrder = 4;

  function fog(z, order, strength) {
    const mesh = add(
      new THREE.PlaneGeometry(42, 13),
      new THREE.ShaderMaterial({
        uniforms: {
          ...uniforms,
          uStrength: { value: strength },
          uSeed: { value: z + 3 },
        },
        transparent: true,
        depthWrite: false,
        vertexShader: /* glsl */ `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
        fragmentShader: /* glsl */ `
        uniform float uTime;uniform float uHeat;uniform float uWind;uniform float uStrength;uniform float uSeed;varying vec2 vUv;
        ${noise}
        void main(){vec2 p=vUv*vec2(11.,4.);p.x-=uTime*.032*uWind+uSeed;p.y+=sin(uTime*.09)*.15;
          float n=fbm(p+vec2(fbm(p*.5),0.));float band=exp(-pow((vUv.y-.3)/.16,2.));
          float density=smoothstep(.3,.8,n)*band*uStrength;
          vec3 color=mix(vec3(.29,.39,.41),vec3(.37,.12,.055),uHeat);
          gl_FragColor=vec4(color,density);
          #include <colorspace_fragment>
        }`,
      }),
    );
    mesh.position.set(0, -0.7, z);
    mesh.renderOrder = order;
    return mesh;
  }
  fog(-1.2, 2, 0.28);
  fog(2.2, 5, 0.23);

  const particleCount = 420;
  const particleGeo = new THREE.BufferGeometry();
  geometries.push(particleGeo);
  const positions = new Float32Array(particleCount * 3),
    seeds = new Float32Array(particleCount),
    sizes = new Float32Array(particleCount);
  for (let i = 0; i < particleCount; i++) {
    positions.set(
      [(random() - 0.5) * 30, (random() - 0.5) * 14, (random() - 0.5) * 16],
      i * 3,
    );
    seeds[i] = random();
    sizes[i] = 1.7 + random() * 5;
  }
  particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  particleGeo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
  particleGeo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  const particleMat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      uniform float uTime;uniform float uWind;uniform float uDpr;attribute float aSeed;attribute float aSize;varying float vSeed;varying float vAngle;
      void main(){vec3 p=position;vSeed=aSeed;vAngle=uTime*.65+aSeed*50.;
        p.x=mod(p.x+15.+uTime*(.12+aSeed*.2)*uWind,30.)-15.;
        p.y=mod(p.y+7.+sin(uTime*.24+aSeed*25.)*.8+uTime*.025,14.)-7.;
        p.z+=sin(uTime*.19+aSeed*20.)*.7;
        vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=min(16.,aSize*uDpr*(13./max(3.,-mv.z)));
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;uniform float uHeat;varying float vSeed;varying float vAngle;
      void main(){vec2 uv=gl_PointCoord-.5;float c=cos(vAngle),s=sin(vAngle);uv=mat2(c,-s,s,c)*uv;
        float dist=length(uv*vec2(1.,1.8+sin(vAngle)*.7));float alpha=smoothstep(.5,.12,dist)*(.12+vSeed*.48);alpha*=.72+.28*sin(uTime*.7+vSeed*30.);
        vec3 col=mix(vec3(.44,.54,.48),vec3(1.,.23,.035),uHeat);gl_FragColor=vec4(col,alpha);
        #include <colorspace_fragment>
      }`,
  });
  materials.push(particleMat);
  const particles = new THREE.Points(particleGeo, particleMat);
  particles.frustumCulled = false;
  particles.renderOrder = 7;
  scene.add(particles);

  function resize() {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    mobile = width < 701;
    if (!width || !height) return;
    dpr = Math.min(devicePixelRatio, mobile ? 1.5 : 1.7);
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    uniforms.uDpr.value = dpr;
    camera.aspect = width / height;
    camera.fov = mobile ? 44 : 38;
    camera.updateProjectionMatrix();
    grassBack.count = mobile ? 250 : 500;
    grassFront.count = mobile ? 160 : 320;
    particleGeo.setDrawRange(0, mobile ? 220 : particleCount);
    lastRenderedProgress = -1;
  }
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  const intersection = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      last = 0;
    },
    { threshold: 0 },
  );
  intersection.observe(canvas);
  const contextLost = (event) => {
    event.preventDefault();
    document.body.classList.add("flat-mode");
    document.body.classList.remove("world-ready");
    dispose();
    dispatchEvent(new Event("filmcontextlost"));
  };
  canvas.addEventListener("webglcontextlost", contextLost);
  function cameraPose(p) {
    const approach = smooth(0.06, 0.39, p),
      storm = smooth(0.4, 0.64, p),
      leave = smooth(0.72, 0.99, p);
    const heat = smooth(0.38, 0.59, p) * (1 - smooth(0.76, 0.94, p));
    uniforms.uHeat.value = heat;
    uniforms.uWind.value = 1 + storm * 1.0 - leave * 0.85;
    if (mobile) {
      camera.position.set(
        mix(0.15, 0.8, approach) - leave * 0.6,
        mix(0.12, 1.0, approach) - leave * 0.2,
        mix(mix(13.5, 10.1, approach) - storm * 0.6, 17.8, leave),
      );
      cameraTarget.set(
        mix(0.1, 0.45, approach) - leave * 0.4,
        mix(0.0, 1.0, approach) - leave * 0.9,
        0,
      );
      character.position.set(mix(0.55, 0.85, approach) - leave * 0.9, -0.25, 0);
    } else {
      camera.position.set(
        mix(0, -0.1, approach) + storm * 0.3 - leave * 0.15,
        mix(0.3, 1.05, approach) - leave * 0.65,
        mix(mix(12, 9.9, approach) - storm * 2.0, 19.5, leave),
      );
      cameraTarget.set(
        mix(0, 0.65, approach) + storm * 0.45 - leave * 0.95,
        mix(0.1, 0.85, approach) + storm * 0.35 - leave * 1.05,
        0,
      );
      character.position.set(mix(1.7, 3.3, approach) - leave * 3.2, -0.25, 0);
    }
    footGrass.position.x = character.position.x - 0.2;
    contactShadow.position.x = character.position.x - 0.2;
    contactShadow.position.y = -3.51;
    const breathe = paused ? 0 : Math.sin(time * 0.24) * 0.024;
    camera.position.x += breathe;
    camera.lookAt(cameraTarget);
    character.rotation.y = -0.045 + Math.sin(time * 0.23) * 0.008;
    character.rotation.z = Math.sin(time * 0.31) * 0.0015;
    character.material.uniforms.uOpacity.value = 1 - leave * 0.2;
  }
  function tick(now) {
    if (disposed) return;
    const delta = last ? Math.min((now - last) / 1000, 0.05) : 0;
    last = now;
    if (!visible || document.hidden) {
      last = 0;
      return;
    }
    if (paused && lastRenderedProgress === progress) return;
    if (!paused) time += delta;
    uniforms.uTime.value = time;
    cameraPose(progress);
    renderer.render(scene, camera);
    frames++;
    lastRenderedProgress = progress;
    if (delta > 0 && frames > 120) {
      averageMs = mix(averageMs, delta * 1000, 0.025);
      if (averageMs > 25) slowFrames++;
      else slowFrames = Math.max(0, slowFrames - 2);
      if (slowFrames > 100 && dpr > 1) {
        dpr = Math.max(1, dpr - 0.2);
        renderer.setPixelRatio(dpr);
        uniforms.uDpr.value = dpr;
        slowFrames = 0;
      }
    }
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    renderer.setAnimationLoop(null);
    observer.disconnect();
    intersection.disconnect();
    canvas.removeEventListener("webglcontextlost", contextLost);
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    textures.forEach((t) => t.dispose());
    renderer.dispose();
  }
  resize();
  cameraPose(0);
  await renderer.compileAsync(scene, camera);
  renderer.render(scene, camera);
  renderer.setAnimationLoop(tick);
  return {
    update(p) {
      progress = clamp(p);
    },
    pause(value) {
      paused = value;
      last = 0;
      lastRenderedProgress = -1;
    },
    dispose,
    metrics() {
      return {
        progress: Number(progress.toFixed(4)),
        time: Number(time.toFixed(3)),
        frames,
        paused,
        mobile,
        dpr,
        drawCalls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        points: renderer.info.render.points,
        averageMs: Number(averageMs.toFixed(2)),
        camera: camera.position.toArray().map((n) => +n.toFixed(3)),
        heat: +uniforms.uHeat.value.toFixed(3),
        wind: +uniforms.uWind.value.toFixed(3),
        textures: renderer.info.memory.textures,
        geometries: renderer.info.memory.geometries,
      };
    },
  };
}
