import type * as ThreeNS from "three";

/**
 * The photographer's studio around the watch.
 *
 * Polished metal is only as good as what it reflects. Rather than downloading
 * an HDRI (omni-channel house rule: download nothing you can paint), the
 * environment is a small scene of emissive panels — an overhead softbox, two
 * strip lights, a ring light for the crystal, a warm card for the gold —
 * rendered once into a PMREM. This is how product studios light watches, and
 * the strip lights are what draw the long highlights down a polished bevel.
 */
export function buildStudio(THREE: typeof ThreeNS, renderer: ThreeNS.WebGLRenderer) {
  const env = new THREE.Scene();
  env.background = new THREE.Color("#050505");
  const panel = (w: number, h: number, color: string, intensity: number, pos: [number, number, number], look: [number, number, number] = [0, 0, 0]) => {
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide });
    const o = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    o.position.set(...pos);
    o.lookAt(...look);
    env.add(o);
    return o;
  };
  // a dark room with narrow lights: polished steel reads as black and white, not grey
  panel(46, 12, "#ffffff", 3.2, [0, 60, 6]); // overhead strip softbox
  panel(10, 90, "#ffffff", 7.5, [-55, 10, 20]); // left strip — the long bevel highlight
  panel(8, 90, "#f4f7ff", 5.5, [58, 5, 15]); // right strip, a touch cooler
  panel(5, 70, "#ffffff", 7, [-26, 6, 80]); // a narrow strip beside the lens: the sharp line down a polished bezel
  panel(60, 6, "#ffffff", 3.2, [0, 18, 60]); // front-top line on the crystal
  panel(80, 10, "#ffffff", 3.4, [0, 10, -60]); // back rim light
  panel(26, 26, "#ffd7a8", 1.6, [40, -30, 30]); // warm card, for the gold
  {
    // a ring light: the round highlight that says "studio photograph"
    const ring = new THREE.Mesh(new THREE.TorusGeometry(16, 1.6, 12, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color("#ffffff").multiplyScalar(3) }));
    ring.position.set(-10, 26, 55);
    ring.lookAt(0, 0, 0);
    env.add(ring);
  }
  // a large diffusion panel behind the lens, bright at the top and fading down:
  // faces turned toward the camera reflect it, which is what gives polished
  // steel and a sunburst dial their long, soft gradient
  {
    const g = new THREE.PlaneGeometry(130, 80, 1, 8);
    const col: number[] = [];
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const t = (p.getY(i) + 40) / 80; // 0 bottom → 1 top
      const k = 0.03 + Math.pow(t, 2.2) * 0.75;
      col.push(k, k * 0.985, k * 0.96);
    }
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    const front = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));
    front.position.set(0, 12, 85);
    front.lookAt(0, 0, 0);
    env.add(front);
  }
  // a dim floor so lower faces are not black
  panel(200, 200, "#141210", 1, [0, -70, 0]);
  const pmrem = new THREE.PMREMGenerator(renderer);
  // no pre-blur: PMREM builds the rough levels itself, and polished steel needs the sharp one
  const rt = pmrem.fromScene(env, 0, 0.1, 400);
  pmrem.dispose();
  env.traverse((o) => {
    const m = o as ThreeNS.Mesh;
    m.geometry?.dispose();
    (m.material as ThreeNS.Material | undefined)?.dispose();
  });

  /* ---- the backdrop: a velvet sweep, lit warm behind the watch --------- */
  const backdropMat = new THREE.ShaderMaterial({
    uniforms: {
      uCentre: { value: new THREE.Vector2(0.62, 0.5) },
      uAspect: { value: 1 },
      uInner: { value: new THREE.Color("#2a241e") },
      uOuter: { value: new THREE.Color("#0b0a09") },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec2 uCentre; uniform float uAspect; uniform vec3 uInner; uniform vec3 uOuter;
      varying vec2 vUv;
      void main() {
        vec2 d = vUv - uCentre; d.x *= uAspect;
        float r = length(d);
        float k = smoothstep(0.0, 0.75, r);
        vec3 col = mix(uInner, uOuter, k);
        // a whisper of dither, so the gradient never bands on an 8-bit screen
        float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
        col += (n - 0.5) / 255.0;
        gl_FragColor = vec4(col, 1.0);
      }`,
    depthTest: false,
    depthWrite: false,
  });
  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), backdropMat);
  backdrop.frustumCulled = false;
  backdrop.renderOrder = -1000;

  /* ---- the key light: the one that casts shadows ------------------------ */
  const key = new THREE.DirectionalLight("#fff6ec", 2.2);
  key.position.set(-28, 46, 70);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  const sc = key.shadow.camera;
  sc.left = -32;
  sc.right = 32;
  sc.top = 32;
  sc.bottom = -32;
  sc.near = 10;
  sc.far = 200;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.03;
  key.shadow.radius = 3;
  const fill = new THREE.DirectionalLight("#d8e2ff", 0.35);
  fill.position.set(40, -10, 30);

  return { environment: rt.texture, envTarget: rt, backdrop, backdropMat, key, fill };
}
