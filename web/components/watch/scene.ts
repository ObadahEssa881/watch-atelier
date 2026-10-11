import type * as ThreeNS from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import type { Build } from "@/lib/catalogue";
import { buildCase } from "./case";
import { makeKit } from "./geometry";
import { makeMaterials } from "./materials";
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
 * Post-processing (three's own composer, so tone mapping lives in OutputPass,
 * last — see the omni-channel threejs skill, recipes/post-processing.md):
 * render → ground-truth AO (contact shadow between parts) → depth of field
 * (the macro lens) → a faint bloom on true highlights → Neutral tone mapping,
 * which keeps gold gold.
 */

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

export type Quality = "high" | "medium" | "low";

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
  const back = new THREE.Scene(); // the backdrop, outside the AO and DOF passes
  const FOV = 26;
  const camera = new THREE.PerspectiveCamera(FOV, 1, 2, 900);
  camera.position.set(0, 0, 130);

  const kit = makeKit(THREE);
  const m = makeMaterials(THREE, opts.maps);
  const studio = buildStudio(THREE, renderer);
  scene.environment = studio.environment;
  scene.add(studio.key, studio.fill, studio.key.target);
  back.add(studio.backdrop);

  const rig = new THREE.Group(); // turned and moved so the chosen part faces the lens
  scene.add(rig);
  const watch = buildCase(THREE, kit, m, opts.font);
  rig.add(watch.group);
  const movement = buildMovement(THREE, kit, m, opts.font);
  movement.group.rotation.y = Math.PI; // its +z (the caseback side) faces the watch's −z
  movement.group.position.z = 0.7;
  watch.group.add(movement.group);
  movement.group.updateMatrix();

  /* ---- post-processing ---------------------------------------------------- */
  const target = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, target);
  const backPass = new RenderPass(back, camera);
  const mainPass = new RenderPass(scene, camera);
  mainPass.clear = false;
  const gtao = new GTAOPass(scene, camera, 2, 2);
  gtao.blendIntensity = 0.9;
  gtao.updateGtaoMaterial({ radius: 1.4, distanceExponent: 1.6, thickness: 1.2, scale: 1.0, samples: 16 });
  gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 });
  // AO belongs on surfaces, not on glass: hide the crystals while GTAO reads
  // depth and normals, or it shades the dial through the sapphire in blocks
  const glass: ThreeNS.Object3D[] = [];
  scene.traverse((o) => o.userData.glass && glass.push(o));
  const gtaoRender = gtao.render.bind(gtao);
  gtao.render = (...args: Parameters<typeof gtao.render>) => {
    const vis = glass.map((g) => g.visible);
    glass.forEach((g) => (g.visible = false));
    gtaoRender(...args);
    glass.forEach((g, i) => (g.visible = vis[i]));
  };
  const bokeh = new BokehPass(scene, camera, { focus: 130, aperture: 0, maxblur: 0.012 });
  // bloom stays available but off: tested, it laid a grey haze over polished steel
  const bloom = new UnrealBloomPass(new THREE.Vector2(2, 2), 0.06, 0.15, 1.6);
  bloom.enabled = false;
  const output = new OutputPass();
  composer.addPass(backPass);
  composer.addPass(mainPass);
  composer.addPass(gtao);
  composer.addPass(bokeh);
  composer.addPass(bloom);
  composer.addPass(output);
  const bokehU = (bokeh as unknown as { uniforms: Record<string, { value: number }> }).uniforms;

  const setQuality = (q: Quality) => {
    gtao.enabled = q === "high";
    renderer.shadowMap.enabled = q !== "low";
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

  const api = {
    scene,
    camera,
    composer,
    passes: { gtao, bokeh, bloom },
    parts: { watch, movement },
    applyBuild,
    setQuality,
    resize(nw: number, nh: number, pr: number) {
      w = nw;
      h = nh;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      composer.setPixelRatio(pr);
      composer.setSize(w, h);
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
      bokehU.focus.value = cur.dist;
      bokehU.aperture.value = cur.aperture;
      bokeh.enabled = cur.aperture > 0.00002;
      studio.backdropMat.uniforms.uCentre.value.set(0.5 + cur.offX, 0.5 - cur.offY * 0.6);

      if (draw) composer.render(dt);
      return beat;
    },
    async compile() {
      await renderer.compileAsync(scene, camera);
    },
    dispose() {
      composer.dispose();
      target.dispose();
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
