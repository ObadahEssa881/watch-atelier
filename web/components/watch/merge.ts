import type * as ThreeNS from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Fewer draw calls: small parts that never move against their parent —
 * screws, jewels, indices, notches, pinions on their arbors — become one mesh
 * per material. Every mesh is a draw call in every pass, and a calibre is
 * mostly small parts.
 *
 * `live` lists every object whose transform, visibility or geometry changes
 * after it is built. Nothing is merged across one: each becomes the owner of
 * the parts below it, and the merged mesh is added to it. Parts with several
 * materials, instanced parts and mirrored parts are left as they are.
 */
export function mergeStatic(THREE: typeof ThreeNS, root: ThreeNS.Object3D, live: Set<ThreeNS.Object3D>) {
  root.updateMatrixWorld(true);
  const buckets = new Map<string, { owner: ThreeNS.Object3D; meshes: ThreeNS.Mesh[] }>();
  const visit = (node: ThreeNS.Object3D, owner: ThreeNS.Object3D) => {
    for (const c of node.children) {
      if (live.has(c)) {
        visit(c, c);
        continue;
      }
      const mesh = c as ThreeNS.Mesh;
      const plain = mesh.isMesh && !(mesh as ThreeNS.InstancedMesh).isInstancedMesh && !Array.isArray(mesh.material) && c.children.length === 0;
      if (plain && c.matrixWorld.determinant() > 0) {
        const mat = mesh.material as ThreeNS.Material;
        const key = `${owner.uuid}|${mat.uuid}|${+mesh.castShadow}${+mesh.receiveShadow}`;
        const b = buckets.get(key) ?? { owner, meshes: [] };
        b.meshes.push(mesh);
        buckets.set(key, b);
      } else if (!plain) visit(c, owner);
    }
  };
  visit(root, root);

  let removed = 0;
  for (const { owner, meshes } of buckets.values()) {
    if (meshes.length < 2) continue;
    const toOwner = owner.matrixWorld.clone().invert();
    let geos = meshes.map((o) => o.geometry.clone().applyMatrix4(toOwner.clone().multiply(o.matrixWorld)));
    // the same attributes in every part, and indexed in all or none
    const names = (g: ThreeNS.BufferGeometry) => Object.keys(g.attributes).sort().join();
    if (!geos.every((g) => names(g) === names(geos[0]))) continue;
    if (geos.some((g) => g.index) && geos.some((g) => !g.index)) geos = geos.map((g) => (g.index ? g.toNonIndexed() : g));
    const merged = mergeGeometries(geos, false);
    if (!merged) continue;
    const o = new THREE.Mesh(merged, meshes[0].material);
    o.castShadow = meshes[0].castShadow;
    o.receiveShadow = meshes[0].receiveShadow;
    owner.add(o);
    for (const m of meshes) m.removeFromParent();
    removed += meshes.length - 1;
  }
  return removed;
}
