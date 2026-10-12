import type * as ThreeNS from "three";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { FullScreenQuad } from "three/examples/jsm/postprocessing/Pass.js";
import type { Build } from "@/lib/catalogue";
import { buildCase } from "./case";
import { makeKit } from "./geometry";
import { makeMaterials } from "./materials";
import { mergeStatic } from "./merge";
import { buildMovement, type Explode } from "./movement";
import { buildStudio } from "./studio";
import type { Maps } from "./textures";

/**
 * The watch, lit and photographed.
 *
 * The camera never moves: like a product photographer, the scene turns the
 * watch under fixed lights, so reflections sweep across the metal as it turns
 * — the single thing that most makes a render read as an object.
 *
 * The watch is drawn once a frame (plus the key light's shadow map), and
 * everything after reads that one render's colour and depth instead of
 * drawing the watch again:
 * render (backdrop first, 4× MSAA, half-float) → ground-truth AO from its
 * depth, at half resolution (contact shadow between parts) → depth of field
 * from the same depth, blurring only what is out of focus (the macro lens) →
 * Neutral tone mapping, which keeps gold gold. Tone mapping lives in
 * OutputPass, last — see the omni-channel threejs skill,
 * recipes/post-processing.md.
 */

// The macro lens: the gather of three's BokehShader (41 taps), with its
// depth read from the render's own depth texture, and two exits where the
// gather could not change the pixel: in focus, where all 41 taps land on the
// same pixel; and open backdrop, where every outer tap is backdrop too and
// the average of a smooth gradient is the gradient. Near an edge the full
// gather runs, so the soft fringe of an out-of-focus silhouette stays.
const LENS_FRAG = /* glsl */ `
  #include <common>
  #include <packing>
  varying vec2 vUv;
  uniform sampler2D tColor;
  uniform sampler2D tDepth;
  uniform float focus, aperture, maxblur, nearClip, farClip, aspect, width;
  const vec2 RIM[16] = vec2[16](
    vec2(0.0, 0.4), vec2(0.15, 0.37), vec2(0.29, 0.29), vec2(-0.37, 0.15), vec2(0.4, 0.0), vec2(0.37, -0.15), vec2(0.29, -0.29), vec2(-0.15, -0.37),
    vec2(0.0, -0.4), vec2(-0.15, 0.37), vec2(-0.29, 0.29), vec2(0.37, 0.15), vec2(-0.4, 0.0), vec2(-0.37, -0.15), vec2(-0.29, -0.29), vec2(0.15, -0.37));
  const vec2 SKEW[8] = vec2[8](vec2(0.15, 0.37), vec2(-0.37, 0.15), vec2(0.37, -0.15), vec2(-0.15, -0.37), vec2(-0.15, 0.37), vec2(0.37, 0.15), vec2(-0.37, -0.15), vec2(0.15, -0.37));
  const vec2 AXES[8] = vec2[8](vec2(0.29, 0.29), vec2(0.4, 0.0), vec2(0.29, -0.29), vec2(0.0, -0.4), vec2(-0.29, 0.29), vec2(-0.4, 0.0), vec2(-0.29, -0.29), vec2(0.0, 0.4));
  void main() {
    float depth = texture2D(tDepth, vUv).x;
    float viewZ = perspectiveDepthToViewZ(depth, nearClip, farClip);
    vec2 blur = vec2(clamp((focus + viewZ) * aperture, -maxblur, maxblur));
    vec4 col = texture2D(tColor, vUv);
    if (abs(blur.x) * width < 0.5) {
      gl_FragColor = vec4(col.rgb, 1.0);
      return;
    }
    vec2 ac = vec2(1.0, aspect);
    if (depth >= 1.0) {
      bool open = true;
      for (int i = 0; i < 16; i++)
        if (texture2D(tDepth, vUv + RIM[i] * ac * blur).x < 1.0) {
          open = false;
          break;
        }
      if (open) {
        gl_FragColor = vec4(col.rgb, 1.0);
        return;
      }
    }
    for (int i = 0; i < 16; i++) col += texture2D(tColor, vUv + RIM[i] * ac * blur);
    for (int i = 0; i < 8; i++) col += texture2D(tColor, vUv + SKEW[i] * ac * blur * 0.9);
    for (int i = 0; i < 8; i++) col += texture2D(tColor, vUv + AXES[i] * ac * blur * 0.7);
    for (int i = 0; i < 8; i++) col += texture2D(tColor, vUv + AXES[i] * ac * blur * 0.4);
    gl_FragColor = vec4(col.rgb / 41.0, 1.0);
  }`;

export type AnchorName = "dial" | "caseback" | "rotor" | "barrel" | "train" | "escapement" | "balance" | "jewel" | "finishing" | "centre";

export interface StageInput {
  /** Watch orientation, quaternion [x, y, z, w]. */
  quat: [number, number, number, number];
  /** Which part sits at the centre of the frame. */
  anchor: AnchorName;
  /** Camera distance in mm (the lens is a 26° long lens). */
  dist: number;
  offX: number;
  offY: number;
  aperture: number;
  explode: Explode & { caseback: number };
  /** Movement time scale: 1 real time, 0.1 slow motion. */
  speed: number;
  /** Target rotor angle. */
  rotor: number;
}

/** What the governor (stage.tsx) may give up. None of it recompiles a shader. */
export interface Quality {
  ao: boolean;
  msaa: number;
}

export function createWatchScene(
  THREE: typeof ThreeNS,
  renderer: ThreeNS.WebGLRenderer,
  opts: { maps: Maps; font: string; quality: Quality },
) {
  renderer.toneMapping = THREE.NeutralToneMapping; // applied by OutputPass
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap; // r186: PCFSoftShadowMap is gone; PCF is soft now

  const scene = new THREE.Scene();
  const FOV = 26;
  const camera = new THREE.PerspectiveCamera(FOV, 1, 2, 900);
  camera.position.set(0, 0, 130);

  const kit = makeKit(THREE);
  const m = makeMaterials(THREE, opts.maps);
  const studio = buildStudio(THREE, renderer);
  scene.environment = studio.environment;
  // the backdrop is drawn first and writes no depth, so AO and the lens see
  // it as distance; in the same render as the watch, because a multisampled
  // target is resolved — and its samples discarded — at the end of each render
  scene.add(studio.key, studio.fill, studio.key.target, studio.backdrop);

  const rig = new THREE.Group(); // turned and moved so the chosen part faces the lens
  scene.add(rig);
  const watch = buildCase(THREE, kit, m, opts.font);
  rig.add(watch.group);
  const movement = buildMovement(THREE, kit, m, opts.font);
  movement.group.rotation.y = Math.PI; // its +z (the caseback side) faces the watch's −z
  movement.group.position.z = 0.7;
  watch.group.add(movement.group);
  movement.group.updateMatrix();
  // everything that moves, turns, hides or changes shape after this point
  mergeStatic(
    THREE,
    watch.group,
    new Set<ThreeNS.Object3D>([watch.back, watch.face, watch.crystal, watch.backGlass, ...Object.values(watch.hands), movement.group, ...movement.live]),
  );

  /* ---- post-processing ---------------------------------------------------- */
  const sceneRT = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, samples: opts.quality.msaa, depthTexture: new THREE.DepthTexture(2, 2) });
  const aoRT = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, depthBuffer: false });
  const lensRT = aoRT.clone();
  const gtao = new GTAOPass(scene, camera, 2, 2);
  gtao.setGBuffer(sceneRT.depthTexture!); // normals rebuilt from depth: no second render of the watch
  gtao.blendIntensity = 0.9;
  gtao.updateGtaoMaterial({ radius: 1.4, distanceExponent: 1.6, thickness: 1.2, scale: 1.0, samples: 16 });
  gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 });
  const lensMat = new THREE.ShaderMaterial({
    uniforms: {
      tColor: { value: null },
      tDepth: { value: sceneRT.depthTexture },
      focus: { value: 130 },
      aperture: { value: 0 },
      maxblur: { value: 0.012 },
      nearClip: { value: camera.near },
      farClip: { value: camera.far },
      aspect: { value: 1 },
      width: { value: 2 },
    },
    vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: LENS_FRAG,
    depthTest: false,
    depthWrite: false,
  });
  const lens = new FullScreenQuad(lensMat);
  let lensOn = false;
  const output = new OutputPass();
  output.renderToScreen = true;

  const render = () => {
    renderer.setRenderTarget(sceneRT);
    renderer.render(scene, camera);
    let src = sceneRT;
    if (gtao.enabled) {
      gtao.render(renderer, aoRT, src, 0, false);
      src = aoRT;
    }
    if (lensOn) {
      lensMat.uniforms.tColor.value = src.texture;
      renderer.setRenderTarget(lensRT);
      lens.render(renderer);
      src = lensRT;
    }
    output.render(renderer, null as unknown as ThreeNS.WebGLRenderTarget, src, 0, false); // renderToScreen: writes to the canvas
  };

  const setQuality = (q: Quality) => {
    gtao.enabled = q.ao;
    if (sceneRT.samples !== q.msaa) {
      sceneRT.samples = q.msaa;
      sceneRT.dispose(); // rebuilt with the new sample count on its next use
    }
  };
  setQuality(opts.quality);

  /* ---- the build -------------------------------------------------------- */
  const applyBuild = (b: Build) => {
    m.setCase(b.case);
    m.setDial(b.dial);
    m.setStrap(b.strap);
    watch.drawPrint(b.dial);
    watch.drawBack(b.engraving);
  };

  /* ---- state, eased toward the input every frame ----------------------- */
  const cur = {
    quat: new THREE.Quaternion(),
    target: new THREE.Vector3(),
    dist: 130,
    offX: 0,
    offY: 0,
    aperture: 0,
    explode: { rotor: 0, barrel: 0, train: 0, pallet: 0, cock: 0, cover: 0, caseback: 0 },
    rotor: 0,
  };
  const want = { quat: new THREE.Quaternion(), target: new THREE.Vector3() };
  let first = true;
  let w = 1;
  let h = 1;
  // movement time starts at the visitor's wall clock, so the train is "now"
  const d0 = new Date();
  let seconds = d0.getHours() * 3600 + d0.getMinutes() * 60 + d0.getSeconds() + d0.getMilliseconds() / 1000;
  const backBase = watch.back.position.z;

  const anchorOf = (name: AnchorName, out: ThreeNS.Vector3) => {
    if (name === "dial") return out.copy(watch.anchors.dial);
    if (name === "caseback") return out.copy(watch.anchors.caseback);
    const local = movement.anchors[name === "centre" ? "centre" : name];
    return out.copy(local).applyMatrix4(movement.group.matrix);
  };

  const eye = new THREE.Vector3();
  const unturn = new THREE.Quaternion();

  const api = {
    scene,
    camera,
    renderer,
    passes: { gtao, lens: lensMat },
    parts: { watch, movement },
    applyBuild,
    setQuality,
    render,
    resize(nw: number, nh: number, pr: number) {
      w = nw;
      h = nh;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      const W = Math.floor(w * pr); // as the renderer sizes its drawing buffer
      const H = Math.floor(h * pr);
      sceneRT.setSize(W, H);
      aoRT.setSize(W, H);
      lensRT.setSize(W, H);
      // AO is soft by nature: half resolution is a quarter of the work
      gtao.setSize(Math.ceil(W / 2), Math.ceil(H / 2));
      lensMat.uniforms.aspect.value = w / h;
      lensMat.uniforms.width.value = W;
      studio.backdropMat.uniforms.uAspect.value = w / h;
    },
    /** One frame. Returns whether the escapement released (for the tick). */
    frame(dt: number, input: StageInput, draw = true) {
      const D = THREE.MathUtils.damp;
      const k = first ? 1 : 1 - Math.exp(-3.2 * dt);
      want.quat.set(...input.quat);
      anchorOf(input.anchor, want.target);
      if (first) {
        cur.quat.copy(want.quat);
        cur.target.copy(want.target);
      } else {
        cur.quat.slerp(want.quat, k);
        cur.target.lerp(want.target, k);
      }
      cur.dist = first ? input.dist : D(cur.dist, input.dist, 3.2, dt);
      cur.offX = first ? input.offX : D(cur.offX, input.offX, 3.5, dt);
      cur.offY = first ? input.offY : D(cur.offY, input.offY, 3.5, dt);
      cur.aperture = first ? input.aperture : D(cur.aperture, input.aperture, 2.5, dt);
      for (const key of Object.keys(cur.explode) as (keyof typeof cur.explode)[])
        cur.explode[key] = first ? input.explode[key] : D(cur.explode[key], input.explode[key], 3.6, dt);
      cur.rotor = first ? input.rotor : D(cur.rotor, input.rotor, 2.2, dt);
      first = false;

      // turn the watch, then slide it so the chosen part sits at the origin
      rig.quaternion.copy(cur.quat);
      rig.position.copy(cur.target).applyQuaternion(cur.quat).multiplyScalar(-1);
      camera.position.set(0, 0, cur.dist);
      camera.lookAt(0, 0, 0);
      camera.setViewOffset(w, h, -cur.offX * w, cur.offY * h, w, h);

      // the caseback unscrews and lifts before anything inside can
      // (it slides out of frame sideways, so it never passes in front of the lens)
      watch.back.position.set(cur.explode.caseback * cur.explode.caseback * 95, cur.explode.caseback * -10, backBase - Math.min(1, cur.explode.caseback * 3) * 6);
      watch.back.visible = cur.explode.caseback < 0.985;
      watch.back.rotation.z = cur.explode.caseback * 1.4;
      movement.explode(cur.explode);
      movement.group.updateMatrix();

      // draw only what the lens can see. Seen from the dial side, a closed
      // watch seals its movement in; seen from the back, the dial's face and
      // hands are behind the dial itself. Decided by which side of the dial's
      // plane the lens is on, in the watch's own frame, so perspective cannot
      // fool it; the parts are skipped by the shadow map too.
      eye.copy(camera.position).sub(rig.position).applyQuaternion(unturn.copy(cur.quat).invert());
      const assembled = Object.values(cur.explode).every((v) => v < 0.001);
      movement.group.visible = eye.z < 0 || !assembled;
      watch.face.visible = watch.crystal.visible = eye.z > 0;
      watch.backGlass.visible = eye.z < 0 || cur.explode.caseback > 0.001;

      // hands: the visitor's own time, the seconds hand in eight steps a second
      const now = new Date();
      const s = now.getSeconds() + Math.floor((now.getMilliseconds() / 1000) * 8) / 8;
      const mnt = now.getMinutes() + s / 60;
      const hr = (now.getHours() % 12) + mnt / 60;
      watch.hands.seconds.rotation.z = -(s / 60) * Math.PI * 2;
      watch.hands.minute.rotation.z = -(mnt / 60) * Math.PI * 2;
      watch.hands.hour.rotation.z = -(hr / 12) * Math.PI * 2;

      seconds += dt * input.speed;
      const beat = movement.update({ seconds, rotor: cur.rotor });

      // depth of field focused on the part at the centre of the frame
      lensMat.uniforms.focus.value = cur.dist;
      lensMat.uniforms.aperture.value = cur.aperture;
      lensOn = cur.aperture > 0.00002;
      studio.backdropMat.uniforms.uCentre.value.set(0.5 + cur.offX, 0.5 - cur.offY * 0.6);

      if (draw) render();
      return beat;
    },
    async compile() {
      await renderer.compileAsync(scene, camera);
    },
    dispose() {
      gtao.dispose();
      lens.dispose();
      lensMat.dispose();
      output.dispose();
      sceneRT.depthTexture?.dispose();
      sceneRT.dispose();
      aoRT.dispose();
      lensRT.dispose();
      studio.envTarget.dispose();
      scene.traverse((o) => {
        const mesh = o as ThreeNS.Mesh;
        mesh.geometry?.dispose();
        const mat = mesh.material as ThreeNS.Material | ThreeNS.Material[] | undefined;
        for (const x of Array.isArray(mat) ? mat : mat ? [mat] : []) {
          for (const v of Object.values(x)) if (v && (v as ThreeNS.Texture).isTexture) (v as ThreeNS.Texture).dispose();
          x.dispose();
        }
      });
      Object.values(opts.maps).forEach((t) => t.dispose());
    },
  };
  return api;
}

export type WatchScene = ReturnType<typeof createWatchScene>;
