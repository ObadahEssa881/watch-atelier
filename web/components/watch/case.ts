import type * as ThreeNS from "three";
import type { Kit, V2 } from "./geometry";
import type { Materials } from "./materials";
import { DIALS } from "./materials";
import type { DialId } from "@/lib/catalogue";

/**
 * The case, dial, hands, crystals and strap of the Q-01.
 *
 * Watch frame: millimetres, the dial facing +z, twelve o'clock at +y, the
 * crown at +x. A 40 mm case, 48 mm lug to lug, 20 mm between the lugs.
 *
 * Heights, low to high: caseback sapphire −5.8…−5.0 · movement −4.9…+0.7 ·
 * dial +0.7…+1.0 · hands +1.2…+1.9 · crystal to +4.4.
 */

const CASE_R = 20;
const DIAL_R = 16.7;
const DIAL_Z = 1.0;
const LUG_INNER = 10;
const LUG_W = 2.5;

export function buildCase(THREE: typeof ThreeNS, kit: Kit, m: Materials, displayFont: string) {
  const group = new THREE.Group();
  group.name = "watch";
  const mesh = (geo: ThreeNS.BufferGeometry, mat: ThreeNS.Material | ThreeNS.Material[], parent: ThreeNS.Object3D = group, shadow = true) => {
    const o = new THREE.Mesh(geo, mat);
    if (mat === m.sapphire) o.userData.glass = true;
    o.castShadow = shadow;
    o.receiveShadow = true;
    parent.add(o);
    return o;
  };
  const { polished, satin, hands } = m.caseFinish;

  /* ---- case middle, bezel, caseback ring (all turned) ------------------- */
  // bezel: polished, a gentle slope up to the crystal
  mesh(
    kit.lathe(
      [
        [17.25, 3.15],
        [17.6, 3.75],
        [18.6, 3.88],
        [19.55, 3.55],
        [19.95, 3.05],
        [19.95, 2.75],
        [17.25, 2.75],
        [17.25, 3.15],
      ],
      192,
    ),
    polished,
  );
  // case flank: brushed vertically, crisp polished chamfers top and bottom
  mesh(
    kit.lathe(
      [
        [19.95, 2.75],
        [20.0, 2.55],
        [20.0, -3.4],
        [19.92, -3.55],
        [17.0, -3.55],
        [17.0, 2.75],
        [19.95, 2.75],
      ],
      192,
    ),
    satin,
  );
  mesh(
    kit.lathe(
      [
        [19.92, -3.55],
        [19.5, -4.15],
        [18.9, -4.35],
        [16.0, -4.35],
        [16.0, -3.55],
        [19.92, -3.55],
      ],
      192,
    ),
    polished,
  );
  // screw-down caseback: ring, sapphire window, engraving — lifts off as one
  const back = new THREE.Group();
  back.name = "caseback";
  group.add(back);
  mesh(
    kit.lathe(
      [
        [18.7, -4.35],
        [18.7, -5.25],
        [18.2, -5.7],
        [14.6, -5.75],
        [14.0, -5.4],
        [14.0, -4.35],
        [18.7, -4.35],
      ],
      192,
    ),
    satin,
    back,
  );
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
    const notch = mesh(new THREE.BoxGeometry(1.2, 0.7, 0.32), m.dark, back, false);
    notch.position.set(Math.cos(a) * 17.6, Math.sin(a) * 17.6, -5.62);
    notch.rotation.z = a;
  }
  // engraving ring on the caseback: specs, a serial, and the owner's words
  const backCanvas = document.createElement("canvas");
  backCanvas.width = backCanvas.height = 2048;
  const backTex = new THREE.CanvasTexture(backCanvas);
  backTex.anisotropy = 8;
  const backMat = m.engraving.clone();
  backMat.alphaMap = backTex;
  backMat.color.set("#4a4f55");
  backMat.metalness = 0.8;
  backMat.roughness = 0.6;
  {
    const ringGeo = new THREE.RingGeometry(14.7, 18.0, 160, 1);
    const p = ringGeo.attributes.position;
    const uv = ringGeo.attributes.uv as ThreeNS.BufferAttribute;
    // planar UVs in the ring's own frame; turned to face the back, it reads true
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 36 + 0.5, p.getY(i) / 36 + 0.5);
    const o = new THREE.Mesh(ringGeo, backMat);
    o.rotation.y = Math.PI;
    o.position.z = -5.755;
    back.add(o);
  }
  const drawBack = (engraving: string) => {
    const g = backCanvas.getContext("2d")!;
    g.fillStyle = "#000";
    g.fillRect(0, 0, 2048, 2048);
    g.fillStyle = "#fff";
    g.textAlign = "center";
    g.textBaseline = "middle";
    const arcText = (text: string, radiusMM: number, center: number, sizePx: number, upper: boolean) => {
      const rad = (radiusMM / 36) * 2048;
      g.font = `500 ${sizePx}px ${displayFont}`;
      const chars = Array.from(text);
      const per = (sizePx * 0.78) / rad; // radians per character
      const span = per * (chars.length - 1);
      chars.forEach((ch, i) => {
        const a = upper ? center + span / 2 - i * per : center - span / 2 + i * per;
        g.save();
        g.translate(1024 + Math.cos(a) * rad, 1024 - Math.sin(a) * rad);
        g.rotate(upper ? Math.PI / 2 - a : -Math.PI / 2 - a);
        g.fillText(ch, 0, 0);
        g.restore();
      });
    };
    arcText("QASIOUN · Q-01 · AUTOMATIC · SAPPHIRE · 100 M", 16.4, Math.PI / 2, 64, true);
    arcText(engraving.trim() ? engraving.toUpperCase() : "Nº 0001 / 0100", 16.4, -Math.PI / 2, 68, false);
    backTex.needsUpdate = true;
  };
  drawBack("");

  // sapphire caseback window
  mesh(
    kit.lathe(
      [
        [0, -5.82],
        [13.9, -5.78],
        [14.2, -5.5],
        [14.2, -4.95],
        [0, -4.95],
      ],
      128,
    ),
    m.sapphire,
    back,
    false,
  );

  /* ---- lugs ------------------------------------------------------------- */
  // side profile (y, z), extruded across x: a lug that sweeps down to the strap
  const lugProfile = new THREE.Shape();
  lugProfile.moveTo(17.5, 2.6);
  lugProfile.bezierCurveTo(20.5, 2.6, 22.4, 2.0, 23.6, 0.6);
  lugProfile.quadraticCurveTo(24.3, -0.3, 23.9, -1.4);
  lugProfile.bezierCurveTo(23.4, -2.5, 21.6, -3.4, 18.4, -3.5);
  lugProfile.lineTo(17.5, -3.5);
  lugProfile.closePath();
  const lugGeo = kit.extrude(lugProfile, LUG_W, 0.32, 32, 4);
  // the profile lies in xy: send x → y (along the watch), y → z (height) and
  // the extrusion z → x (across), a cyclic swap of axes, so still a rotation
  lugGeo.applyMatrix4(new THREE.Matrix4().set(0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1));
  for (const sy of [1, -1])
    for (const sx of [1, -1]) {
      // mirrored copies: three flips the face winding itself for a negative scale
      const lug = mesh(lugGeo, [satin, polished]);
      lug.scale.set(sx, sy, 1);
      lug.position.x = sx * LUG_INNER;
    }

  /* ---- crown ------------------------------------------------------------ */
  const crown = new THREE.Group();
  crown.position.set(CASE_R - 0.1, 0, -0.6);
  crown.rotation.y = Math.PI / 2;
  group.add(crown);
  mesh(
    kit.lathe(
      [
        [0, 3.6],
        [1.9, 3.55],
        [2.55, 3.3],
        [2.75, 2.9],
        [2.75, 1.3],
        [2.4, 0.95],
        [1.2, 0.9],
        [1.2, 0],
        [0, 0],
      ],
      96,
    ),
    polished,
    crown,
  );
  // knurling: the grip around the crown's edge
  {
    const ridge = new THREE.BoxGeometry(0.28, 0.2, 1.5);
    const n = 44;
    const inst = new THREE.InstancedMesh(ridge, polished, n);
    const o = new THREE.Object3D();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      o.position.set(Math.cos(a) * 2.78, Math.sin(a) * 2.78, 2.1);
      o.rotation.set(0, 0, a);
      o.updateMatrix();
      inst.setMatrixAt(i, o.matrix);
    }
    inst.castShadow = true;
    crown.add(inst);
    // a small engraved Q on the crown's face
    const q = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.12, 8, 40), m.dark);
    q.position.z = 3.6;
    crown.add(q);
  }

  /* ---- dial --------------------------------------------------------------- */
  const dialGroup = new THREE.Group();
  group.add(dialGroup);
  {
    const disc = new THREE.CylinderGeometry(DIAL_R, DIAL_R, 0.3, 192, 1);
    disc.rotateX(Math.PI / 2);
    disc.translate(0, 0, DIAL_Z - 0.15);
    // planar UVs over the face, so the sunburst radiates from the centre
    const p = disc.attributes.position;
    const uv = disc.attributes.uv as ThreeNS.BufferAttribute;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / (2 * DIAL_R) + 0.5, p.getY(i) / (2 * DIAL_R) + 0.5);
    mesh(disc, m.dial, dialGroup, false);
  }
  // rehaut: the inner flange between dial and crystal, matte in the dial colour
  const rehaut = new THREE.MeshStandardMaterial({ color: DIALS.ink.color, roughness: 0.7, metalness: 0.2 });
  mesh(
    kit.lathe(
      [
        [DIAL_R - 0.4, DIAL_Z],
        [17.3, 2.7],
        [17.35, 2.7],
        [17.35, DIAL_Z - 0.1],
      ],
      192,
    ),
    rehaut,
    dialGroup,
    false,
  );
  // printing: wordmark, minute track, the words at six
  const printCanvas = document.createElement("canvas");
  printCanvas.width = printCanvas.height = 2048;
  const printTex = new THREE.CanvasTexture(printCanvas);
  printTex.anisotropy = 8;
  printTex.colorSpace = THREE.SRGBColorSpace;
  // alpha-tested, not transparent: a transmissive crystal only refracts what is
  // drawn in the opaque pass, so transparent print would vanish under the glass
  const printMat = new THREE.MeshStandardMaterial({ map: printTex, roughness: 0.55, metalness: 0, alphaTest: 0.35 });
  const print = new THREE.Mesh(new THREE.CircleGeometry(DIAL_R, 128), printMat);
  print.position.z = DIAL_Z + 0.004;
  print.receiveShadow = true;
  dialGroup.add(print);
  const drawPrint = (dial: DialId) => {
    const g = printCanvas.getContext("2d")!;
    const S = 2048 / (2 * DIAL_R);
    g.clearRect(0, 0, 2048, 2048);
    rehaut.color.set(DIALS[dial].color);
    g.fillStyle = DIALS[dial].print;
    g.strokeStyle = DIALS[dial].print;
    g.textAlign = "center";
    g.textBaseline = "middle";
    // minute track: 60 fine strokes, heavier at the hours
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2;
      const hour = i % 5 === 0;
      const r0 = (DIAL_R - (hour ? 1.15 : 0.85)) * S;
      const r1 = (DIAL_R - 0.35) * S;
      g.lineWidth = (hour ? 0.16 : 0.08) * S;
      g.beginPath();
      g.moveTo(1024 + Math.sin(a) * r0, 1024 - Math.cos(a) * r0);
      g.lineTo(1024 + Math.sin(a) * r1, 1024 - Math.cos(a) * r1);
      g.stroke();
    }
    g.font = `400 ${1.75 * S}px ${displayFont}`;
    (g as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${0.55 * S}px`;
    g.fillText("QASIOUN", 1024, 1024 - 6.2 * S);
    g.font = `500 ${0.62 * S}px ${displayFont}`;
    (g as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${0.32 * S}px`;
    g.fillText("AUTOMATIC", 1024, 1024 + 5.6 * S);
    g.font = `400 ${0.5 * S}px ${displayFont}`;
    g.fillText("Q-01", 1024, 1024 + 6.6 * S);
    printTex.needsUpdate = true;
  };

  // applied indices: faceted batons, polished like the case
  {
    const s = new THREE.Shape();
    s.moveTo(-0.42, 0);
    s.lineTo(0.42, 0);
    s.lineTo(0.42, 3.1);
    s.lineTo(0, 3.35);
    s.lineTo(-0.42, 3.1);
    s.closePath();
    const geo = kit.extrude(s, 0.42, 0.12, 4, 2);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const pairs = i === 0 ? [-0.62, 0.62] : [0];
      for (const off of pairs) {
        const o = mesh(geo, hands, dialGroup);
        o.rotation.z = -a + Math.PI; // point toward the centre
        o.position.set(Math.sin(a) * 15.6 + Math.cos(a) * off, Math.cos(a) * 15.6 - Math.sin(a) * off, DIAL_Z);
      }
    }
  }

  /* ---- hands: dauphine, faceted; a blued seconds hand ------------------- */
  const dauphine = (len: number, width: number, tail: number, ridge: number) => {
    // two facets either side of a raised centre ridge, plus a flat underside
    const T = [0, len, ridge * 0.4];
    const B = [0, -tail, ridge];
    const Lp = [-width / 2, len * 0.18, 0];
    const Rp = [width / 2, len * 0.18, 0];
    const C = [0, len * 0.18, ridge];
    const tri = [
      ...T, ...Lp, ...C,
      ...T, ...C, ...Rp,
      ...C, ...Lp, ...B,
      ...C, ...B, ...Rp,
      // underside
      ...T, ...Rp, ...[0, -tail, 0],
      ...T, ...[0, -tail, 0], ...Lp,
    ];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(tri, 3));
    g.computeVertexNormals(); // non-indexed: flat facets, which is the point
    return g;
  };
  const hourHand = new THREE.Group();
  const minuteHand = new THREE.Group();
  const secondsHand = new THREE.Group();
  hourHand.position.z = DIAL_Z + 0.25;
  minuteHand.position.z = DIAL_Z + 0.5;
  secondsHand.position.z = DIAL_Z + 0.78;
  dialGroup.add(hourHand, minuteHand, secondsHand);
  mesh(dauphine(10.2, 1.5, 1.6, 0.26), hands, hourHand);
  mesh(dauphine(15.3, 1.25, 1.9, 0.24), hands, minuteHand);
  mesh(kit.ring(0, 1.05, 0, 0.22), hands, hourHand);
  mesh(kit.ring(0, 0.82, 0, 0.22), hands, minuteHand);
  {
    const needle = new THREE.BoxGeometry(0.14, 19.6, 0.1);
    needle.translate(0, 15.6 - 9.8, 0.05);
    mesh(needle, m.blued, secondsHand);
    const counter = new THREE.CylinderGeometry(0.62, 0.62, 0.12, 32);
    counter.rotateX(Math.PI / 2);
    counter.translate(0, -3.2, 0.06);
    mesh(counter, m.blued, secondsHand);
    mesh(kit.ring(0, 0.5, 0, 0.3), m.blued, secondsHand);
  }

  /* ---- box sapphire crystal --------------------------------------------- */
  mesh(
    kit.lathe(
      [
        [0, 4.38],
        [10, 4.33],
        [15.6, 4.18],
        [17.05, 3.95],
        [17.3, 3.55],
        [17.3, 2.75],
        [16.45, 2.75],
        [16.45, 3.2],
        [15.4, 3.45],
        [0, 3.55],
      ],
      192,
    ),
    m.sapphire,
    group,
    false,
  );

  /* ---- strap: hand-stitched calf, swept down from each pair of lugs ----- */
  const strapHalf = (dir: 1 | -1, length: number) => {
    const W = LUG_INNER * 2 - 0.4;
    const pts = [
      new THREE.Vector3(0, 21.6 * dir, -0.6),
      new THREE.Vector3(0, 26.5 * dir, -1.4),
      new THREE.Vector3(0, 31 * dir, -4.4),
      new THREE.Vector3(0, 34.5 * dir, -10),
      new THREE.Vector3(0, 36.4 * dir, -17),
      new THREE.Vector3(0, 36.8 * dir, -length),
    ];
    const path = new THREE.CatmullRomCurve3(pts, false, "centripetal");
    const steps = 140;
    const ring = 28;
    const pos: number[] = [];
    const uvs: number[] = [];
    const idx: number[] = [];
    const up = new THREE.Vector3();
    const side = new THREE.Vector3(1, 0, 0);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const p = path.getPointAt(t);
      const tan = path.getTangentAt(t);
      up.crossVectors(side, tan).normalize().multiplyScalar(dir);
      const thick = 3.6 - t * 0.9;
      const width = W - t * 2.0;
      for (let j = 0; j < ring; j++) {
        // a rounded rectangle cross-section, walked around its perimeter
        const a = (j / ring) * Math.PI * 2;
        const cx = Math.cos(a);
        const cy = Math.sin(a);
        const sx = Math.sign(cx) * Math.pow(Math.abs(cx), 0.18);
        const sy = Math.sign(cy) * Math.pow(Math.abs(cy), 0.4);
        const x = sx * (width / 2);
        const yy = sy * (thick / 2);
        pos.push(p.x + side.x * x + up.x * yy, p.y + side.y * x + up.y * yy, p.z + side.z * x + up.z * yy);
        uvs.push(x / 7, (t * path.getLength()) / 7);
      }
    }
    for (let i = 0; i < steps; i++)
      for (let j = 0; j < ring; j++) {
        const a = i * ring + j;
        const b = i * ring + ((j + 1) % ring);
        const c = (i + 1) * ring + j;
        const d = (i + 1) * ring + ((j + 1) % ring);
        if (dir > 0) idx.push(a, c, b, b, c, d);
        else idx.push(a, b, c, b, d, c);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    mesh(g, m.leather);
    // saddle stitching along both edges of the visible length
    const stitches = 34;
    const st = new THREE.BoxGeometry(0.28, 1.0, 0.24);
    const inst = new THREE.InstancedMesh(st, m.stitch, stitches * 2);
    const o = new THREE.Object3D();
    let n = 0;
    for (const sx of [-1, 1])
      for (let i = 0; i < stitches; i++) {
        const t = 0.02 + (i / stitches) * 0.5;
        const p = path.getPointAt(t);
        const tan = path.getTangentAt(t);
        up.crossVectors(side, tan).normalize().multiplyScalar(dir);
        const thick = 3.6 - t * 0.9;
        const width = W - t * 2.0;
        o.position.copy(p).addScaledVector(side, sx * (width / 2 - 1.1)).addScaledVector(up, thick / 2 + 0.02);
        // length along the strap, standing proud of its surface
        o.up.copy(tan);
        o.lookAt(o.position.clone().add(up));
        o.updateMatrix();
        inst.setMatrixAt(n++, o.matrix);
      }
    inst.receiveShadow = true;
    group.add(inst);
  };
  strapHalf(1, 34);
  strapHalf(-1, 34);

  // the bars the strap hangs on, hidden inside but they cast the right shadow
  for (const sy of [1, -1]) {
    const bar = new THREE.CylinderGeometry(0.75, 0.75, LUG_INNER * 2, 16);
    bar.rotateZ(Math.PI / 2);
    const o = mesh(bar, m.steel);
    o.position.set(0, 21.7 * sy, -0.6);
  }

  return {
    group,
    back,
    hands: { hour: hourHand, minute: minuteHand, seconds: secondsHand },
    drawPrint,
    drawBack,
    anchors: {
      dial: new THREE.Vector3(0, 0, 1.5),
      caseback: new THREE.Vector3(0, 0, -5.5),
      crown: new THREE.Vector3(CASE_R + 2, 0, -0.6),
    },
  };
}

export type CaseParts = ReturnType<typeof buildCase>;
export type { V2 };
