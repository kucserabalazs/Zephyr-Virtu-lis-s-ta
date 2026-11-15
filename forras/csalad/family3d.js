/* ==========================================================================
   family3d.js (v2) – A család és a jog alakjai, procedurális 3D (Three.js)
   Bodnár Emese Ügyvédi Iroda · ugyvedhez.hu
   Szereplők: gyerek, anya, apa, nagymama, nagypapa, Justitia,
              § Bölcs, § Vidám, § Bíró
   Ötujjú kezek, tincsekből épülő, szélben lobogó haj, ráncolódó ruhák,
   kidolgozott mimika, kellékek (mackó, bot, mérleg, kard, kalapács, lúdtoll).
   ========================================================================== */
import * as THREE from './lib/three.module.js';
import { mergeGeometries } from './lib/addons/utils/BufferGeometryUtils.js';
import { WIND, windify, windDepth } from './wind.js';
import { buildHair, lockGeometry, rng } from './hair.js';
import { Hand } from './hands.js';
import { Face, EXPR, EXPR_NAMES, headGeometry } from './face.js';

export { WIND, EXPR_NAMES };
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const { lerp, clamp, damp } = THREE.MathUtils;
const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const bell = (t, a, b) => (t <= a || t >= b) ? 0 : Math.sin(Math.PI * (t - a) / (b - a));

/* ---------- Anyagok ---------- */
export function skinMat(hex) {
  return new THREE.MeshPhysicalMaterial({ color: hex, roughness: .52, metalness: 0, sheen: .25, sheenRoughness: .7, sheenColor: new THREE.Color('#ff9e86'), clearcoat: .08, clearcoatRoughness: .6, emissive: new THREE.Color('#b8502e'), emissiveIntensity: .045 });
}
export function clothMat(hex, o = {}) { const c = new THREE.Color(hex); return new THREE.MeshPhysicalMaterial({ color: c, roughness: o.rough ?? .82, sheen: o.sheen ?? .7, sheenRoughness: .8, sheenColor: c.clone().lerp(new THREE.Color('#ffffff'), .35), side: o.side ?? THREE.FrontSide, metalness: o.metal ?? 0, clearcoat: o.cc ?? 0 }); }
const GOLD = () => new THREE.MeshPhysicalMaterial({ color: '#D9B56A', metalness: .95, roughness: .26, clearcoat: .4 });
const SPH = new THREE.SphereGeometry(1, 32, 24);

function mesh(geo, mat, parent, pos, rot, scl, shadow = true) {
  const m = new THREE.Mesh(geo, mat); m.castShadow = shadow; m.receiveShadow = true;
  if (pos) m.position.copy(pos); if (rot) m.rotation.set(rot[0], rot[1], rot[2]); if (scl) m.scale.set(scl[0], scl[1], scl[2]);
  if (parent) parent.add(m); return m;
}
const ball = (r, mat, parent, pos, s = [1, 1, 1], sh = true) => mesh(SPH, mat, parent, pos, null, [r * s[0], r * s[1], r * s[2]], sh);
const capsule = (r, len, mat, parent, pos, rot, sh = true) => mesh(new THREE.CapsuleGeometry(r, Math.max(.001, len), 8, 20), mat, parent, pos, rot, null, sh);
function tube(pts, r, mat, parent, closed = false, segs = 40, radial = 10) { const c = new THREE.CatmullRomCurve3(pts.map(p => p.isVector3 ? p : V(...p)), closed); return mesh(new THREE.TubeGeometry(c, segs, r, radial, closed), mat, parent); }

/**
 * Ruha-esztergált test redőkkel és szél-attribútummal.
 * prof: [[r, y], ...] lentről felfelé; folds: { n, amp: y=>0..1 } ; sway: [yFix, yFree] (aSway 0→1)
 */
function clothLathe(prof, mat, parent, o = {}) {
  if (prof[0][1] > prof[prof.length - 1][1]) prof = prof.slice().reverse();   // lentről felfelé (helyes normálisok)
  const pts = prof.map(p => new THREE.Vector2(p[0], p[1]));
  const g = new THREE.LatheGeometry(pts, o.segs ?? 72, o.phi0 ?? 0, o.phiLen ?? Math.PI * 2);
  const pos = g.attributes.position, n = pos.count, sway = new Float32Array(n);
  const ymin = Math.min(...prof.map(p => p[1])), ymax = Math.max(...prof.map(p => p[1]));
  for (let i = 0; i < n; i++) {
    let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const th = Math.atan2(x, z), yn = (y - ymin) / (ymax - ymin || 1);
    if (o.folds) { const a = o.folds.amp(yn); const k = 1 + a * (Math.sin(th * o.folds.n + (o.folds.ph ?? 0)) * .7 + Math.sin(th * o.folds.n * 2.3 + 1.3) * .3); x *= k; z *= k; }
    z *= o.depth ?? .82;
    if (o.flatBack && z < 0) z *= .92;
    pos.setXYZ(i, x, y, z);
    if (o.sway) sway[i] = clamp((o.sway[0] - y) / (o.sway[0] - o.sway[1]), 0, 1);
  }
  g.computeVertexNormals();
  g.setAttribute('aSway', new THREE.BufferAttribute(sway, 1));
  let m = mat;
  if (o.sway) { m = windify(mat.clone(), 'cloth', { amp: o.amp ?? 1 }); }
  const me = mesh(g, m, parent, o.pos);
  if (o.sway) me.customDepthMaterial = windDepth('cloth', o.amp ?? 1);
  return me;
}

/* Változó vastagságú cső (antikva tollvonás: vastag törzs, vékony hajszálvonal) */
function varTube(pts, rFn, segs = 120, radial = 20) {
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const g = new THREE.TubeGeometry(curve, segs, 1, radial, false), pos = g.attributes.position, fr = curve.computeFrenetFrames(segs, false);
  for (let i = 0; i <= segs; i++) { const t = i / segs, P = curve.getPointAt(t), r = rFn(t);
    for (let j = 0; j <= radial; j++) { const a = j / radial * Math.PI * 2, k = i * (radial + 1) + j, N = fr.normals[i], B = fr.binormals[i]; const cx = Math.cos(a) * r, cy = Math.sin(a) * r * .72;
      pos.setXYZ(k, P.x + N.x * cx + B.x * cy, P.y + N.y * cx + B.y * cy, P.z + N.z * cx + B.z * cy); } }
  g.computeVertexNormals(); return g;
}

/* ---------- Szereplők leírása ---------- */
export const CAST = {
  gyerek:   { name: 'Gyerek', age: 'kb. 6 éves', kind: 'ember', height: 1.0, H: .215, sc: [1.04, 1, 1], skin: '#F0C3A2', lip: '#D88C83', hairC: '#8A5A2B', hair: 'copfos', iris: '#6B4A2F', brow: '#7A4E26', top: '#E8B84A', bottom: '#3B5B8C', shoes: '#C2554A', sole: '#F5F2EA', b: { sh: .125, hip: .105, torso: .27, leg: .26, arm: .26, belly: 1.06 }, child: true, eyeR: 1.18, lashes: true, prop: 'maci', star: true, hand: .062 },
  anya:     { name: 'Anya', age: 'kb. 35 éves', kind: 'ember', height: 1.55, H: .2, sc: [.98, 1.07, .98], skin: '#EDB894', lip: '#C46A68', hairC: '#9C4A2A', hair: 'hosszu-hullamos', iris: '#4E7A5C', brow: '#7A3A20', top: '#1E5A4F', bottom: '#2C3A47', shoes: '#7A3B2E', sole: '#3a2a22', b: { sh: .15, hip: .13, torso: .42, leg: .52, arm: .44, belly: .95 }, dress: true, earrings: true, lashes: true, necklace: true, hand: .078 },
  apa:      { name: 'Apa', age: 'kb. 38 éves', kind: 'ember', height: 1.68, H: .2, sc: [1, 1.06, .98], skin: '#ECBB98', lip: '#B9776E', hairC: '#3B2A20', hair: 'rovid-kocos', iris: '#5B7FA6', brow: '#2E2018', top: '#3E5C7A', bottom: '#3A3A40', shoes: '#5A3A26', sole: '#2a1d16', b: { sh: .2, hip: .15, torso: .46, leg: .56, arm: .48, belly: 1 }, shirt: true, stubble: true, belt: true, hand: .088, browW: .26 },
  nagymama: { name: 'Nagymama', age: 'kb. 68 éves', kind: 'ember', height: 1.47, H: .195, sc: [1, 1.04, .98], skin: '#EFCAAE', lip: '#B97A78', hairC: '#DCD8D2', hair: 'konty', iris: '#6B5A48', brow: '#A9A39A', top: '#8E3B4A', bottom: '#5B4E66', shoes: '#4B3A3A', sole: '#2b2020', b: { sh: .16, hip: .15, torso: .4, leg: .46, arm: .42, belly: 1.08 }, cardigan: true, skirt: true, glasses: 'kerek', pearls: true, lashes: true, age: true, wrinkles: true, hand: .076 },
  nagypapa: { name: 'Nagypapa', age: 'kb. 72 éves', kind: 'ember', height: 1.6, H: .198, sc: [1, 1.06, .98], skin: '#EDC5A8', lip: '#B57A72', hairC: '#E6E3DE', hair: 'oldalt-ritkas', iris: '#5B6E7E', brow: '#D8D4CE', top: '#E9E4D6', bottom: '#4A4A4F', shoes: '#3D2E24', sole: '#211812', b: { sh: .19, hip: .15, torso: .44, leg: .5, arm: .46, belly: 1.1 }, vest: true, glasses: 'szogletes', mustache: true, age: true, wrinkles: true, cane: true, hand: .086, browW: .3 },
  justitia: { name: 'Justitia', age: 'az igazságosság római istennője', kind: 'ember', height: 1.72, H: .19, sc: [.97, 1.08, .98], skin: '#F2CFB6', lip: '#C07A70', hairC: '#6B4226', hair: 'antik-hosszu', iris: '#5A6B7A', brow: '#5a3820', top: '#F4EEE2', bottom: '#F4EEE2', shoes: '#C9A55A', sole: '#8C6A30', b: { sh: .15, hip: .13, torso: .44, leg: .6, arm: .48, belly: .92 }, goddess: true, lashes: true, hand: .08 },
  parBolcs: { name: '§ Bölcs', age: 'tudós kalauz a kódexből', kind: 'para', variant: 'bolcs', height: 1.0, H: .16, glyph: '#C9A13B', iris: '#4B5E7A', brow: '#E9E5DD', lip: '#A6503F', hand: .06 },
  parOltalmazo: { name: '§ Oltalmazó', age: 'szelíd, oltalmazó kísérő', kind: 'para', variant: 'oltalmazo', height: .96, H: .165, glyph: '#7A1F2B', iris: '#5A4632', brow: '#3E0A1A', lip: '#9E4A45', hand: .058 },
  parBiro:  { name: '§ Bíró', age: 'méltóságteljes bíró', kind: 'para', variant: 'biro', height: 1.08, H: .16, glyph: '#C9A13B', iris: '#3B4A5A', brow: '#5a4a3a', lip: '#8E3B3B', hand: .062 }
};
export const ORDER = ['nagypapa', 'nagymama', 'apa', 'anya', 'gyerek'];
export const ALL = ['gyerek', 'anya', 'apa', 'nagymama', 'nagypapa', 'justitia', 'parBolcs', 'parOltalmazo', 'parBiro'];

export const ACTIONS = {
  integet: 'Integet', bolint: 'Bólint', ugral: 'Ugrál', tapsol: 'Tapsol', mutat: 'Mutat', rax: 'Kitárja a karját', olel: 'Ölel',
  nevet: 'Nevet', sir: 'Sír', setal: 'Sétál', fordul: 'Körbefordul', kezetfog: 'Kezet fog', ir: 'Ír', meghajol: 'Meghajol',
  merlegel: 'Mérlegel', kalapacs: 'Kalapácsot üt'
};

/* ==========================================================================
   Szereplő
   ========================================================================== */
export class Character {
  constructor(key, opts = {}) {
    const P = CAST[key]; if (!P) throw new Error('Ismeretlen szereplő: ' + key);
    this.key = key; this.P = P; this.name = P.name;
    this.root = new THREE.Group(); this.root.name = key;
    this.t = Math.random() * 10;
    this.lookTgt = V(0, 1.3, 4); this.look = new THREE.Vector2();
    this.action = null; this.actT = 0; this.actDur = 0;
    this.walkTo = null; this.walkSpeed = .8; this.walking = 0; this.facing = 0; this.facingTgt = 0;
    this.props = {};
    if (P.kind === 'para') this._buildPara(); else this._buildHuman();
    this._finish();
    this.setExpr(opts.expr || (P.goddess ? 'nyugodt' : P.kind === 'para' ? 'semleges' : 'vidam'), true);
  }

  /* ---------------- közös csontváz ---------------- */
  _skeleton(hipY, torsoH) {
    this.mover = new THREE.Group(); this.root.add(this.mover);
    this.squash = new THREE.Group(); this.mover.add(this.squash);
    this.pelvis = new THREE.Group(); this.pelvis.position.y = hipY; this.squash.add(this.pelvis);
    this.spine = new THREE.Group(); this.pelvis.add(this.spine);
    this.chest = new THREE.Group(); this.chest.position.y = torsoH * .55; this.spine.add(this.chest);
    this.neck = new THREE.Group(); this.neck.position.y = torsoH * .5; this.chest.add(this.neck);
  }

  _arm(s, shoulderPos, ua, fa, r, sleeveMat, skin, o = {}) {
    const sh = new THREE.Group(); sh.position.copy(shoulderPos); (o.parent ?? this.chest).add(sh);
    ball(r * 1.12, o.shoulderMat ?? sleeveMat, sh, V(0, -r * .1, 0), [1, 1, 1]);
    const upperMat = o.sleeve === 'rovid' || o.sleeve === 'nincs' ? skin : sleeveMat;
    capsule(r, ua - r, upperMat, sh, V(0, -ua / 2, 0));
    if (o.sleeve === 'rovid') { const sl = mesh(new THREE.CylinderGeometry(r * 1.22, r * 1.32, ua * .42, 24, 1, true), sleeveMat, sh, V(0, -ua * .18, 0)); sl.material.side = THREE.DoubleSide; mesh(new THREE.TorusGeometry(r * 1.3, r * .1, 8, 24), sleeveMat, sh, V(0, -ua * .39, 0), [Math.PI / 2, 0, 0]); }
    const elbow = new THREE.Group(); elbow.position.y = -ua; sh.add(elbow);
    ball(r * .95, upperMat === skin ? skin : (o.sleeve === 'feltur' ? skin : sleeveMat), elbow);
    const foreMat = (o.sleeve === 'rovid' || o.sleeve === 'feltur' || o.sleeve === 'nincs') ? skin : sleeveMat;
    const fr = mesh(new THREE.CylinderGeometry(r * .78, r * .92, fa, 20), foreMat, elbow, V(0, -fa / 2, 0));
    if (o.sleeve === 'feltur') { mesh(new THREE.TorusGeometry(r * 1.02, r * .38, 10, 24), sleeveMat, elbow, V(0, -fa * .08, 0), [Math.PI / 2, 0, 0]); mesh(new THREE.TorusGeometry(r * 1.0, r * .3, 10, 24), sleeveMat, elbow, V(0, -fa * .2, 0), [Math.PI / 2, 0, 0]); }
    if (o.cuff) mesh(new THREE.TorusGeometry(r * .88, r * .16, 8, 22), o.cuff, elbow, V(0, -fa * .9, 0), [Math.PI / 2, 0, 0]);
    if (o.bracelet) mesh(new THREE.TorusGeometry(r * .86, r * .12, 8, 22), o.bracelet, elbow, V(0, -fa * .82, 0), [Math.PI / 2, 0, 0]);
    const wrist = new THREE.Group(); wrist.position.y = -fa; elbow.add(wrist);
    const hand = new Hand(s, this.P.hand, skin); wrist.add(hand.group);
    hand.group.traverse(o2 => { if (o2.isMesh && o2.geometry.type === 'CapsuleGeometry') o2.castShadow = false; });
    return { sh, elbow, wrist, hand, s, ua, fa };
  }

  _legs(hip, Lg, r, mat, P, o = {}) {
    this.legs = [];
    [-1, 1].forEach(s => {
      const h = new THREE.Group(); h.position.set(s * hip * .5, 0, 0); this.pelvis.add(h);
      if (!o.noThigh) capsule(r, Lg * .48 - r, mat, h, V(0, -Lg * .25, 0));
      const knee = new THREE.Group(); knee.position.y = -Lg * .52; h.add(knee);
      ball(r * .9, o.shinMat ?? mat, knee);
      mesh(new THREE.CylinderGeometry(r * .78, r * .9, Lg * .44, 18), o.shinMat ?? mat, knee, V(0, -Lg * .22, 0));
      if (o.socks) mesh(new THREE.CylinderGeometry(r * .8, r * .8, Lg * .1, 16), o.socks, knee, V(0, -Lg * .4, 0));
      const foot = new THREE.Group(); foot.position.y = -Lg * .46; knee.add(foot);
      this._shoe(foot, r, P, s, o);
      this.legs.push({ hip: h, knee, foot, s });
    });
  }
  _shoe(foot, r, P, s, o) {
    const up = new THREE.MeshPhysicalMaterial({ color: P.shoes, roughness: .38, clearcoat: .7, clearcoatRoughness: .3 });
    const sole = new THREE.MeshStandardMaterial({ color: P.sole, roughness: .8 });
    if (o.sandal) {
      mesh(new THREE.BoxGeometry(r * 2.1, r * .28, r * 3.6), sole, foot, V(0, -r * .62, r * .7));
      ball(r * 1.0, o.skin, foot, V(0, -r * .25, r * .75), [.95, .55, 1.6]);
      for (let k = 0; k < 3; k++) mesh(new THREE.TorusGeometry(r * .98, r * .09, 6, 20, Math.PI), up, foot, V(0, -r * .2, r * (.2 + k * .55)), [0, Math.PI / 2, Math.PI / 2]);
      mesh(new THREE.TorusGeometry(r * .9, r * .09, 6, 20), up, foot, V(0, r * .3, 0), [Math.PI / 2, 0, 0]);
      return;
    }
    ball(r * 1.12, up, foot, V(0, -r * .28, r * .62), [1, .72, 1.7]);
    ball(r * .95, up, foot, V(0, -r * .05, -r * .1), [1, .9, 1]);
    const so = mesh(new THREE.CylinderGeometry(r * 1.12, r * 1.12, r * .26, 24), sole, foot, V(0, -r * .7, r * .55)); so.scale.set(1, 1, 1.75);
    if (o.laces) for (let k = 0; k < 3; k++) mesh(new THREE.BoxGeometry(r * .9, r * .06, r * .1), new THREE.MeshStandardMaterial({ color: '#fbfbf7' }), foot, V(0, r * (.12 - k * .1), r * (.55 + k * .28)), [-.6, 0, 0], null, false);
  }

  /* ---------------- ember ---------------- */
  _buildHuman() {
    const P = this.P, B = P.b, H = P.H;
    const skin = skinMat(P.skin); this.skin = skin;
    const top = clothMat(P.top), bottom = clothMat(P.bottom);
    const Lg = B.leg, hipY = Lg + .07, T = B.torso, w = B.sh, hw = B.hip;
    this._skeleton(hipY, T);
    const legR = hw * .36;
    // ---- lábak ----
    if (P.goddess) this._legs(hw, Lg, legR * .85, skin, P, { sandal: true, skin, noThigh: true });
    else if (P.dress || P.skirt) this._legs(hw, Lg, legR * .8, skin, P, { socks: P.skirt ? new THREE.MeshStandardMaterial({ color: '#c9b9a8', roughness: .6 }) : null, noThigh: P.dress });
    else this._legs(hw, Lg, legR, bottom, P, { laces: P.child });
    // ---- törzs és ruha ----
    if (P.goddess) this._goddessDress(T, w, hw, Lg, skin);
    else if (P.dress) {
      clothLathe([[.0, T * 1.04], [w * .62, T * 1.03], [w * .95, T * .82], [w * .84, T * .55], [hw * 1.0, T * .1], [hw * 1.05, -.02]], top, this.spine, { folds: { n: 9, amp: y => .02 }, depth: .8 });
      clothLathe([[hw * 1.05, 0], [hw * 1.25, -Lg * .2], [hw * 1.6, -Lg * .52], [hw * 1.82, -Lg * .64], [hw * 1.78, -Lg * .66], [.0, -Lg * .66]], top, this.spine, { folds: { n: 11, amp: y => (1 - y) * .09 }, sway: [0, -Lg * .66], amp: 1, depth: .86 });
      mesh(new THREE.TorusGeometry(hw * 1.02, .011, 10, 64), GOLD(), this.spine, V(0, T * .14, 0), [Math.PI / 2, 0, 0]).scale.set(1, .8, 1);
      // nyakkivágás szegély
      mesh(new THREE.TorusGeometry(w * .45, .006, 8, 48, Math.PI), clothMat('#174a41'), this.spine, V(0, T * .98, w * .2), [Math.PI * .62, 0, Math.PI]);
    } else {
      const bulge = P.b.belly;
      clothLathe([[0, -.03], [hw * 1.08, -.02], [hw * 1.15 * bulge, T * .25], [w * .86 * bulge, T * .56], [w * 1.0, T * .82], [w * .78, T * .99], [.05, T * 1.05], [0, T * 1.05]], top, this.spine, { folds: { n: 7, amp: y => .012 + (1 - y) * .015 }, depth: .8 });
      if (!P.skirt) clothLathe([[0, -.07], [hw * 1.13, -.07], [hw * 1.14, .05], [0, .05]], bottom, this.spine, { depth: .82 });
      if (P.skirt) clothLathe([[hw * 1.12, .04], [hw * 1.3, -Lg * .25], [hw * 1.62, -Lg * .6], [hw * 1.7, -Lg * .66], [0, -Lg * .66]], bottom, this.spine, { folds: { n: 13, amp: y => (1 - y) * .08 }, sway: [0, -Lg * .66], amp: .9, depth: .86 });
    }
    const fz = (y, k = 1) => V(0, y, (P.dress ? w * .84 : hw * 1.15 * B.belly) * .8 * k);
    if (P.shirt) {
      const collar = clothMat('#F1EDE4');
      [-1, 1].forEach(s => { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(s * .07, .012); sh.lineTo(s * .06, -.05); sh.lineTo(s * .012, -.03); sh.lineTo(0, 0); mesh(new THREE.ExtrudeGeometry(sh, { depth: .006, bevelEnabled: true, bevelSize: .003, bevelThickness: .003 }), collar, this.spine, V(s * .02, T * 1.02, w * .5), [-.5, 0, 0]); });
      mesh(new THREE.BoxGeometry(.028, T * .9, .006), clothMat('#36536f'), this.spine, V(0, T * .5, w * .79));
      for (let i = 0; i < 5; i++) ball(.008, new THREE.MeshPhysicalMaterial({ color: '#f5f1e8', roughness: .3, clearcoat: 1 }), this.spine, V(0, T * (.9 - i * .2), w * .8 + .004));
      // zseb
      mesh(new THREE.BoxGeometry(.09, .1, .006), clothMat('#3a5672'), this.spine, V(w * .45, T * .7, w * .73), [0, .45, 0]);
    }
    if (P.belt) { mesh(new THREE.TorusGeometry(hw * 1.15, .016, 8, 64), new THREE.MeshPhysicalMaterial({ color: '#3b2618', roughness: .5, clearcoat: .5 }), this.spine, V(0, .0, 0), [Math.PI / 2, 0, 0]).scale.set(1, .82, 1); mesh(new THREE.BoxGeometry(.05, .036, .012), GOLD(), this.spine, V(0, 0, hw * 1.15 * .82 + .004)); }
    if (P.cardigan) {
      const cm = clothMat('#7a2e3c');
      clothLathe([[0, T * .02], [hw * 1.24 * B.belly, T * .0], [hw * 1.24 * B.belly, T * .3], [w * .93 * B.belly, T * .58], [w * 1.04, T * .82], [w * .8, T * .98], [0, T * 1.0]], cm, this.spine, { folds: { n: 6, amp: y => .02 }, depth: .82 });
      const blouse = clothMat('#F6F0E6');
      [-1, 1].forEach(s => { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.quadraticCurveTo(s * .06, .01, s * .065, -.045); sh.quadraticCurveTo(s * .02, -.04, 0, -.012); mesh(new THREE.ExtrudeGeometry(sh, { depth: .005, bevelEnabled: true, bevelSize: .003, bevelThickness: .002 }), blouse, this.spine, V(s * .006, T * 1.0, w * .48), [-.55, 0, 0]); });
      for (let i = 0; i < 4; i++) ball(.012, GOLD(), this.spine, V(-.005, T * (.78 - i * .18), w * .8 * B.belly + .03));
      mesh(new THREE.BoxGeometry(.012, T * .95, .004), new THREE.MeshStandardMaterial({ color: '#5c2230' }), this.spine, V(.008, T * .5, w * .82 * B.belly + .03));
    }
    if (P.vest) {
      const vm = clothMat('#46442F');
      clothLathe([[0, T * .02], [hw * 1.24 * B.belly, T * .0], [hw * 1.25 * B.belly, T * .3], [w * .92 * B.belly, T * .58], [w * .98, T * .8], [0, T * .8]], vm, this.spine, { depth: .83, folds: { n: 5, amp: y => .01 } });
      for (let i = 0; i < 4; i++) ball(.011, GOLD(), this.spine, V(0, T * (.7 - i * .15), w * .82 * B.belly + .028 - i * .002));
      tube([V(-.015, T * .5, w * .86), V(-.07, T * .44, w * .84), V(-.12, T * .49, w * .76)], .0035, GOLD(), this.spine);
      // ing gallér a mellény fölött
      const collar = clothMat('#F6F2E8');
      [-1, 1].forEach(s => { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(s * .065, .01); sh.lineTo(s * .055, -.045); sh.lineTo(0, -.02); mesh(new THREE.ExtrudeGeometry(sh, { depth: .005, bevelEnabled: true, bevelSize: .003, bevelThickness: .002 }), collar, this.spine, V(s * .015, T * 1.02, w * .5), [-.5, 0, 0]); });
    }
    if (P.star) { const sh = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? .022 : .05; i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); } mesh(new THREE.ExtrudeGeometry(sh, { depth: .006, bevelEnabled: true, bevelSize: .004, bevelThickness: .003, bevelSegments: 2 }), new THREE.MeshPhysicalMaterial({ color: '#FFF3D0', roughness: .35, clearcoat: .5 }), this.spine, fz(T * .52, 1.12)); }
    if (P.pearls) for (let i = 0; i < 21; i++) { const a = Math.PI * .1 + i * (Math.PI * .8 / 20); ball(.0115, new THREE.MeshPhysicalMaterial({ color: '#FBF5EA', roughness: .12, clearcoat: 1, sheen: 1, sheenColor: new THREE.Color('#ffd9e8'), iridescence: .4 }), this.chest, V(Math.cos(a) * .078, T * .44 - Math.sin(a) * .03, Math.sin(a) * .065 + .012)); }
    if (P.necklace) { tube([V(-.06, T * .47, .04), V(0, T * .38, .1), V(.06, T * .47, .04)], .0025, GOLD(), this.chest); ball(.014, new THREE.MeshPhysicalMaterial({ color: '#2E7565', roughness: .05, clearcoat: 1, transmission: .3 }), this.chest, V(0, T * .36, .1)); }
    // nyak
    capsule(H * .25, .05, skin, this.neck, V(0, .025, 0));
    // ---- karok ----
    const ar = w * .3 * (P.child ? 1.12 : 1);
    const sleeve = P.dress ? 'rovid' : P.child ? 'rovid' : P.shirt ? 'feltur' : P.goddess ? 'nincs' : P.vest ? 'hosszu' : 'hosszu';
    const sleeveMat = P.cardigan ? clothMat('#7a2e3c') : (P.vest ? clothMat('#E9E4D6') : top);
    this.arms = [-1, 1].map(s => this._arm(s, V(s * w * .98, T * .38, 0), B.arm * .48, B.arm * .42, ar, sleeveMat, skin, { sleeve, cuff: (sleeve === 'hosszu') ? sleeveMat : null, bracelet: P.goddess ? GOLD() : null, shoulderMat: P.goddess ? skin : sleeveMat }));
    // ---- fej ----
    this.headG = new THREE.Group(); this.headG.position.y = .055 + H * .95; this.neck.add(this.headG);
    const head = new THREE.Group(); this.headG.add(head); this.head = head;
    const headMesh = mesh(headGeometry(H, P.sc, P.child), skin, head); headMesh.updateMatrixWorld(true);
    if (P.stubble) { const st = mesh(headGeometry(H * 1.004, P.sc, false), new THREE.MeshStandardMaterial({ color: '#4d3a2e', transparent: true, opacity: .16, depthWrite: false }), head); st.castShadow = false; st.material.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <dithering_fragment>', '#include <dithering_fragment>\n'); }; st.renderOrder = 1; this._stubble = st; st.geometry = headGeometry(H * 1.004, P.sc, false); const g = st.geometry, p = g.attributes.position; /* csak az állra/arcra */ const keep = []; for (let i = 0; i < p.count; i++) { const y = p.getY(i) / H, z = p.getZ(i) / H; keep.push(y < -.12 && z > -.2 ? 1 : 0); } const idx = g.index.array, ni = []; for (let i = 0; i < idx.length; i += 3) if (keep[idx[i]] && keep[idx[i + 1]] && keep[idx[i + 2]]) ni.push(idx[i], idx[i + 1], idx[i + 2]); g.setIndex(ni); }
    this.face = new Face(head, H, P.sc, { surface: headMesh, skin, skinColor: P.skin, lip: P.lip, brow: P.brow, iris: P.iris, lashes: P.lashes, age: P.age, wrinkles: P.wrinkles, child: P.child, eyeR: H * .16 * (P.eyeR ?? 1), earrings: P.earrings ? GOLD() : null, browW: P.browW });
    this.hair = buildHair(P.hair, H, P.hairC, { sc: P.sc, seed: [...this.key].reduce((a, c) => a + c.charCodeAt(0), 0), amp: P.hair === 'rovid-kocos' ? .7 : 1 });
    head.add(this.hair);
    if (P.mustache) this._mustache(head, H, P);
    if (P.glasses) this._glasses(head, H, P.glasses);
    if (P.goddess) this._goddessHead(head, H);
    // ---- kellékek ----
    if (P.prop === 'maci') this._teddy();
    if (P.cane) this._cane();
    if (P.goddess) { this._scales(); this._sword(); }
  }

  _mustache(head, H, P) {
    const R = rng(91), geos = [];
    for (let i = 0; i < 70; i++) {
      const s = i % 2 ? 1 : -1, x0 = s * H * (.02 + R() * .18), y0 = -H * .3 + R() * H * .03;
      const z0 = this.face.Z(x0, y0) + H * .01;
      const pts = [V(x0, y0, z0)]; let p = pts[0].clone();
      for (let k = 1; k <= 4; k++) { p = p.clone().add(V(s * H * .045, -H * .025 * k * .6, -H * .01 * k)); pts.push(p); }
      geos.push(lockGeometry(pts, H * .028, { tip: .2, segs: 6, radial: 4, phase: R() }));
    }
    const m = mesh(mergeGeometries(geos), windify(new THREE.MeshPhysicalMaterial({ color: P.hairC, roughness: .5, sheen: 1, sheenColor: new THREE.Color('#ffffff') }), 'hair', { amp: .15 }), head);
  }
  _glasses(head, H, type) {
    const f = this.face, er = f.er;
    const gm = type === 'kerek' ? GOLD() : new THREE.MeshPhysicalMaterial({ color: '#2b2b2b', roughness: .25, clearcoat: 1 });
    const lens = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0, transmission: 1, thickness: .002, transparent: true, opacity: .3, depthWrite: false, clearcoat: 1 });
    [-1, 1].forEach(s => {
      const z = f.Z(s * f.ex, f.ey) + er * .85;
      const rim = mesh(new THREE.TorusGeometry(er * 1.55, er * (type === 'kerek' ? .09 : .13), 10, type === 'kerek' ? 48 : 4), gm, head, V(s * f.ex, f.ey, z), [0, 0, type === 'kerek' ? 0 : Math.PI / 4]);
      if (type !== 'kerek') rim.scale.set(1.2, .82, 1);
      mesh(new THREE.CircleGeometry(er * 1.5, 32), lens, head, V(s * f.ex, f.ey, z - .001), null, null, false);
      tube([V(s * (f.ex + er * 1.55), f.ey + er * .2, z), V(s * H * .93, f.ey + er * .35, H * .25), V(s * H * .97, f.ey + er * .1, -H * .15)], er * .07, gm, head);
    });
    tube([V(-f.ex + er * 1.5, f.ey + er * .2, f.Z(0, f.ey) + er * .75), V(0, f.ey + er * .5, f.Z(0, f.ey) + er * 1.0), V(f.ex - er * 1.5, f.ey + er * .2, f.Z(0, f.ey) + er * .75)], er * .08, gm, head);
    if (type === 'kerek') tube([V(-H * .93, f.ey, -H * .05), V(-H * 1.05, -H * .6, -H * .1), V(-H * .7, -H * 1.3, .02), V(0, -H * 1.55, H * .5), V(H * .7, -H * 1.3, .02), V(H * 1.05, -H * .6, -H * .1), V(H * .93, f.ey, -H * .05)], .0018, GOLD(), head, false, 60, 5); // szemüveglánc
  }

  /* ---- Justitia: redős khitón, átvetett himation, aranyöv, szembekötő, babérkoszorú ---- */
  _goddessDress(T, w, hw, Lg, skin) {
    const marble = clothMat('#F4EEE2', { sheen: .9, rough: .7 }), trim = GOLD();
    // vállak és kar bőr
    ball(w * .5, skin, this.chest, V(0, T * .42, 0), [1.8, .7, 1.1]);
    // mellrész + szoknya egy darabban, mély redőkkel
    clothLathe([[0, T * 1.0], [w * .55, T * .98], [w * .92, T * .78], [w * .82, T * .55], [hw * 1.05, T * .2], [hw * 1.2, 0], [hw * 1.5, -Lg * .35], [hw * 1.95, -Lg * .9], [hw * 2.15, -Lg * 1.06], [hw * 2.1, -Lg * 1.08], [0, -Lg * 1.08]], marble, this.spine, { folds: { n: 15, amp: y => .02 + Math.pow(1 - y, 1.5) * .12 }, sway: [T * .15, -Lg * 1.08], amp: 1.3, depth: .84 });
    // aranyszegély az alján
    mesh(new THREE.TorusGeometry(hw * 2.12, .009, 8, 96), trim, this.spine, V(0, -Lg * 1.03, 0), [Math.PI / 2, 0, 0]).scale.set(1, .84, 1);
    // öv a mell alatt, keresztpánt
    mesh(new THREE.TorusGeometry(w * .86, .013, 10, 64), trim, this.spine, V(0, T * .6, 0), [Math.PI / 2, 0, 0]).scale.set(1, .8, 1);
    tube([V(-w * .8, T * .98, .02), V(-w * .2, T * .78, w * .75), V(w * .45, T * .62, w * .68), V(w * .8, T * .58, .0)], .009, trim, this.spine);
    // himation: átvetett palást a bal vállról a jobb csípőn át lelógva (szélben lobog)
    const R = rng(5), geos = [];
    for (let i = 0; i < 26; i++) {
      const o = (i / 25 - .5) * .09;
      const pts = [V(w * .95, T * 1.0 + o * .3, -.04), V(w * .5, T * .75 + o, w * .74), V(-w * .2, T * .3 + o, hw * 1.2), V(-hw * 1.15, -T * .05 + o, hw * .7), V(-hw * 1.35, -Lg * .3 + o, .02), V(-hw * 1.2 + R() * .02, -Lg * .62 + o * 2, -hw * .4)];
      geos.push(lockGeometry(pts, .028, { tip: .6, flat: .25, segs: 22, radial: 5, phase: .3 + R() * .2 }));
    }
    const him = new THREE.MeshPhysicalMaterial({ color: '#8E2A2A', roughness: .75, sheen: 1, sheenColor: new THREE.Color('#ffb0a0'), side: THREE.DoubleSide });
    const hm = mesh(mergeGeometries(geos), windify(him, 'hair', { amp: .35 }), this.spine); hm.customDepthMaterial = windDepth('hair', .35);
    tube([V(w * .95, T * 1.0, -.02), V(w * .5, T * .77, w * .78), V(-w * .2, T * .32, hw * 1.25), V(-hw * 1.18, -T * .05, hw * .72)], .007, trim, this.spine);
    // fibula a vállon
    const fib = mesh(new THREE.CylinderGeometry(.022, .022, .01, 24), trim, this.chest, V(w * .85, T * .47, .03), [Math.PI / 2, 0, 0]);
    ball(.01, new THREE.MeshPhysicalMaterial({ color: '#2B4C7E', roughness: .05, clearcoat: 1 }), this.chest, V(w * .85, T * .47, .04));
  }
  _goddessHead(head, H) {
    const f = this.face;
    // a tulajdonos döntése: kendő nélkül – szabad, nyugodt, lesütött tekintet (korhű ábrázolás)
    const band = GOLD();
    const bandG = mesh(new THREE.TorusGeometry(H * 1.06, H * .018, 8, 64), band, head, V(0, f.ey + H * .45, -H * .02), [Math.PI / 2 - .25, 0, 0]); bandG.scale.set(this.P.sc[0], this.P.sc[2] * 1.02, 1);
    // aranyozott babérkoszorú
    const leaf = new THREE.SphereGeometry(1, 10, 6); const lm = GOLD(); lm.color.set('#d6b05e');
    const wreath = new THREE.InstancedMesh(leaf, lm, 64); wreath.castShadow = true;
    const dummy = new THREE.Object3D(); let n = 0;
    for (let i = 0; i < 32; i++) {
      const a = Math.PI * .08 + i / 31 * Math.PI * 1.84, r = H * 1.1;
      for (const side of [-1, 1]) {
        dummy.position.set(Math.sin(a) * r * this.P.sc[0], f.ey + H * .48 + Math.cos(a) * H * .12 - Math.abs(Math.cos(a)) * H * .02, Math.cos(a) * r * this.P.sc[2]);
        dummy.rotation.set(0, a, side * .7 + (i % 2) * .2); dummy.rotateX(-.25);
        dummy.scale.set(H * .035, H * .1, H * .016); dummy.updateMatrix(); wreath.setMatrixAt(n++, dummy.matrix);
      }
    }
    wreath.position.set(0, -H * .02, 0); wreath.rotation.x = -.18; head.add(wreath);
    const ring = mesh(new THREE.TorusGeometry(H * 1.1, H * .012, 6, 64, Math.PI * 1.84), lm, head, V(0, f.ey + H * .46, 0), [Math.PI / 2 - .18, 0, Math.PI * .58]);
    ring.scale.set(this.P.sc[0], this.P.sc[2], 1);
  }

  /* ---------------- § emberke ---------------- */
  _buildPara() {
    const P = this.P, v = P.variant, H = P.H;
    const G = P.height * .74;               // a § jel magassága
    const legL = P.height * .2;
    const enamel = v === 'oltalmazo'
      ? new THREE.MeshPhysicalMaterial({ color: P.glyph, roughness: .38, clearcoat: .5, clearcoatRoughness: .35, metalness: .15 })
      : new THREE.MeshPhysicalMaterial({ color: P.glyph, roughness: .24, metalness: .92, clearcoat: .6 });
    this.skin = enamel;
    this._skeleton(legL + .04, G * .5);
    const glyphG = new THREE.Group(); glyphG.position.y = G * .5; this.spine.add(glyphG); this.glyph = glyphG;
    // a § középvonala két összefonódó S-ből
    const S1 = [[.17, .4], [.07, .495], [-.09, .49], [-.19, .39], [-.16, .27], [-.02, .19], [.16, .09], [.205, -.03], [.12, -.12], [-.04, -.15]];
    const S2 = [[.04, .15], [-.12, .12], [-.205, .03], [-.16, -.09], [.02, -.19], [.16, -.27], [.19, -.39], [.09, -.49], [-.07, -.495], [-.17, -.4]];
    const thick = .05 * G;
    const sx = 1;
    [S1, S2].forEach(S => {
      const pts = S.map(p => V(p[0] * G * sx, p[1] * G, 0));
      // antikva-vonás: a középső ív vastag, a végek hajszálvékonyak, a végeken csepp
      const g = varTube(pts, t => thick * (.32 + .68 * Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, (t - .08) / .84))), 1.3)));
      mesh(g, enamel, glyphG);
      ball(thick * .95, enamel, glyphG, pts[0], [1, 1, .72]); ball(thick * .35, enamel, glyphG, pts[pts.length - 1]);
    });
    // arc a felső íven (kabala-arc)
    const faceG = new THREE.Group(); faceG.position.set(-G * .01, G * .33, thick * .9); glyphG.add(faceG); this.head = faceG; this.headG = faceG;
    const er = H * (v === 'oltalmazo' ? .3 : .26);
    this.face = new Face(faceG, H, [1, 1, 1], { skin: enamel, skinColor: v === 'oltalmazo' ? '#2B4C7E' : '#C9A050', lip: P.lip, brow: P.brow, iris: P.iris, lashes: v === 'oltalmazo', mascot: true, flatZ: H * .12, eyeR: er, browW: .28 });
    // a kabala-arc elemeit a jel elé hozzuk
    this.face.g.position.set(0, -H * .05, 0);
    // fehér „arcmező” a szemek mögé, hogy a szemek ne lebegjenek
    const plate = mesh(new THREE.SphereGeometry(1, 32, 16), enamel, faceG, V(0, H * .02, -H * .02), null, [H * .78, H * .58, H * .2]);
    // haj-kunkor
    this.hair = buildHair('fursi', H * .9, v === 'bolcs' ? '#ECE8E0' : v === 'oltalmazo' ? '#E8B84A' : '#3b2c22', { seed: 3 });
    this.hair.position.set(G * .02, G * .33, 0); this.hair.scale.setScalar(.8); glyphG.add(this.hair);
    // karok a jel közepéből
    const arm = .26 * P.height, r = .022 * P.height;
    const armMat = v === 'oltalmazo' ? enamel : (v === 'biro' ? clothMat('#141a19') : clothMat('#1c2a28'));
    this.arms = [-1, 1].map(s => this._arm(s, V(s * G * .22 * sx, G * .02, 0), arm * .5, arm * .44, r, armMat, new THREE.MeshPhysicalMaterial({ color: '#f1d2b8', roughness: .5, sheen: .3 }), { parent: glyphG, sleeve: 'hosszu', cuff: v === 'bolcs' || v === 'biro' ? clothMat('#F6F2E8') : null }));
    // lábak
    const legMat = v === 'oltalmazo' ? enamel : clothMat('#1d2423');
    this._legs(G * .16, legL * 1.05, .028 * P.height, legMat, { shoes: v === 'oltalmazo' ? '#C2554A' : '#1a1410', sole: v === 'oltalmazo' ? '#F5F2EA' : '#0c0a08' }, { laces: v === 'oltalmazo' });
    // változatok
    if (v === 'bolcs') {
      // kis talár (köpeny) hátul + fehér zsabó
      const cape = clothMat('#1c2a28', { side: THREE.DoubleSide });
      const cg = new THREE.CylinderGeometry(G * .22, G * .34, G * .58, 40, 6, true, Math.PI * .55, Math.PI * .9);
      const cp = cg.attributes.position, sw = new Float32Array(cp.count);
      for (let i = 0; i < cp.count; i++) { const y = cp.getY(i), a = Math.atan2(cp.getX(i), cp.getZ(i)); const k = 1 + Math.sin(a * 9) * .05 * (.5 - y / (G * .58)); cp.setX(i, cp.getX(i) * k); cp.setZ(i, cp.getZ(i) * k); sw[i] = clamp((G * .29 - y) / (G * .58), 0, 1); }
      cg.computeVertexNormals(); cg.setAttribute('aSway', new THREE.BufferAttribute(sw, 1));
      const cm = mesh(cg, windify(cape.clone(), 'cloth', { amp: 1.5 }), glyphG, V(0, -G * .06, -thick * .2)); cm.customDepthMaterial = windDepth('cloth', 1.5);
      mesh(new THREE.TorusGeometry(G * .23, G * .018, 8, 40, Math.PI * 1.1), clothMat('#123D38'), glyphG, V(0, G * .23, -thick * .1), [Math.PI / 2 - .2, 0, Math.PI * -.05]);
      this._jabot(glyphG, V(0, G * .16, thick * 1.4), G * .9);
      this._pincenez();
      this._book();
    }
    if (v === 'oltalmazo') {
      // arany szegély-gyöngyök és piros szív a kezében
      [S1[2], S1[4], S2[5], S2[7]].forEach(p => ball(thick * .32, GOLD(), glyphG, V(p[0] * G * sx, p[1] * G, thick * .95)));
      this._handOnHeart = true;
    }
    if (v === 'biro') {
      // hosszú bírói talár zöld bársony gallérral, fehér zsabó, arany lánc
      const robe = clothMat('#121716', { sheen: .5 });
      const rob = clothLathe([[G * .2, G * .14], [G * .29, -G * .05], [G * .36, -G * .4], [G * .43, -G * .62], [G * .42, -G * .64]], new THREE.MeshPhysicalMaterial({ color: '#121716', roughness: .85, sheen: .5, side: THREE.DoubleSide }), glyphG, { folds: { n: 12, amp: y => (1 - y) * .08 }, sway: [G * .1, -G * .64], amp: 1.1, depth: .8, phi0: Math.PI * .28, phiLen: Math.PI * 1.44 });   // elöl nyitott talár: a § látszik
      mesh(new THREE.TorusGeometry(G * .19, G * .035, 10, 48), clothMat('#123D38', { sheen: 1 }), glyphG, V(0, G * .12, 0), [Math.PI / 2 - .1, 0, 0]).scale.set(1, .8, 1);
      this._jabot(glyphG, V(0, G * .07, G * .17), G * 1.1);
      tube([V(-G * .16, G * .12, G * .08), V(-G * .06, -G * .05, G * .2), V(G * .06, -G * .05, G * .2), V(G * .16, G * .12, G * .08)], .004, GOLD(), glyphG);
      ball(.016, GOLD(), glyphG, V(0, -G * .07, G * .21));
      this.legs.forEach(L => L.hip.visible = true);
      this._gavel();
    }
  }
  _jabot(parent, pos, s) {
    const wm = clothMat('#FBF8F1');
    [-1, 1].forEach(k => mesh(new THREE.BoxGeometry(.028 * s, .07 * s, .006 * s), wm, parent, pos.clone().add(V(k * .016 * s, -.03 * s, 0)), [0, 0, k * .08]));
    ball(.016 * s, wm, parent, pos, [1.4, .8, .6]);
  }
  _pincenez() {
    const f = this.face, er = f.er, gm = GOLD();
    const lens = new THREE.MeshPhysicalMaterial({ color: '#fff', transmission: 1, transparent: true, opacity: .25, roughness: 0, depthWrite: false });
    [-1, 1].forEach(s => { const z = f.Z(s * f.ex, f.ey) + er * .95; mesh(new THREE.TorusGeometry(er * 1.2, er * .07, 8, 40), gm, f.g, V(s * f.ex, f.ey - er * .3, z)); mesh(new THREE.CircleGeometry(er * 1.15, 28), lens, f.g, V(s * f.ex, f.ey - er * .3, z - .001), null, null, false); });
    tube([V(-f.ex + er * 1.15, f.ey - er * .1, f.Z(0, 0) + er * .95), V(0, f.ey + er * .2, f.Z(0, 0) + er * 1.05), V(f.ex - er * 1.15, f.ey - er * .1, f.Z(0, 0) + er * .95)], er * .06, gm, f.g);
    tube([V(f.ex + er * 1.2, f.ey - er * .3, f.Z(0, 0) + er * .9), V(f.ex + er * 2.2, f.ey - er * 2.8, f.Z(0, 0) + er * .2), V(f.ex + er * 1.6, f.ey - er * 5, 0)], .0012, gm, f.g, false, 30, 4);
  }

  /* ---------------- kellékek ---------------- */
  _palm(arm) { const g = new THREE.Group(); g.position.set(-arm.s * this.P.hand * .1, -this.P.hand * .78, 0); arm.hand.group.add(g); return g; }
  _teddy() {
    const A = this.arms[0], g = this._palm(A); this.props.teddy = g; A.hand.set('fog'); this._holdL = 'fog';
    const fur = clothMat('#A8713F', { sheen: 1, rough: .95 }), lt = clothMat('#E4C39A'), dk = new THREE.MeshStandardMaterial({ color: '#1b1412', roughness: .3 });
    const t = new THREE.Group(); t.position.set(A.s * .02, -.06, .08); t.rotation.y = -A.s * .4; g.add(t);
    ball(.075, fur, t, V(0, 0, 0), [1, 1.12, .9]); ball(.04, lt, t, V(0, -.005, .055), [1, 1.2, .6]);
    ball(.062, fur, t, V(0, .115, 0));
    [-1, 1].forEach(s => { ball(.024, fur, t, V(s * .045, .165, 0)); ball(.013, lt, t, V(s * .045, .165, .012)); ball(.026, fur, t, V(s * .07, -.062, .02), [1, 1.2, 1]); ball(.028, fur, t, V(s * .045, .015, .055)); ball(.0075, dk, t, V(s * .022, .128, .055)); });
    ball(.026, lt, t, V(0, .1, .052), [1.1, .8, .8]); ball(.01, dk, t, V(0, .108, .074));
    tube([V(-.035, .06, .035), V(0, .045, .06), V(.035, .06, .035)], .008, clothMat('#2E7565'), t);
  }
  _cane() {
    const A = this.arms[0], g = this._palm(A); A.hand.set('fog'); this._holdL = 'fog';
    const c = new THREE.Group(); g.add(c); this.props.cane = c;
    const cm = new THREE.MeshPhysicalMaterial({ color: '#5E3D24', roughness: .35, clearcoat: .8 });
    mesh(new THREE.CylinderGeometry(.012, .012, .86, 14), cm, c, V(0, -.43, 0));
    tube([V(0, 0, 0), V(0, .05, 0), V(.04, .085, 0), V(.09, .07, 0), V(.1, .04, 0)], .016, cm, c);
    mesh(new THREE.CylinderGeometry(.015, .013, .03, 14), new THREE.MeshStandardMaterial({ color: '#1a1a1a' }), c, V(0, -.86, 0));
    mesh(new THREE.TorusGeometry(.0135, .004, 6, 16), GOLD(), c, V(0, -.02, 0), [Math.PI / 2, 0, 0]);
  }
  _scales() {
    const A = this.arms[1], g = this._palm(A); A.hand.set('fog'); this._holdR = 'fog';
    const gm = GOLD(); const s = new THREE.Group(); g.add(s); this.props.scales = s;
    mesh(new THREE.CylinderGeometry(.008, .008, .12, 12), gm, s, V(0, .03, 0));
    ball(.014, gm, s, V(0, .095, 0));
    const beam = new THREE.Group(); beam.position.y = .09; s.add(beam); this.props.beam = beam;
    mesh(new THREE.CylinderGeometry(.006, .006, .44, 12), gm, beam, null, [0, 0, Math.PI / 2]);
    [-1, 1].forEach(k => ball(.01, gm, beam, V(k * .22, 0, 0)));
    this.props.pans = [-1, 1].map(k => {
      const p = new THREE.Group(); p.position.x = k * .22; beam.add(p);
      [0, 2.09, 4.19].forEach(a => { const ch = mesh(new THREE.CylinderGeometry(.0018, .0018, .2, 5), gm, p, V(Math.cos(a) * .03, -.1, Math.sin(a) * .03), [Math.sin(a) * .15, 0, -Math.cos(a) * .15]); ch.castShadow = false; });
      const pan = mesh(new THREE.SphereGeometry(.075, 32, 10, 0, Math.PI * 2, Math.PI * .62, Math.PI * .38), gm, p, V(0, -.16, 0)); pan.material.side = THREE.DoubleSide;
      return p;
    });
  }
  _sword() {
    const A = this.arms[0], g = this._palm(A); A.hand.set('fog'); this._holdL = 'fog';
    const s = new THREE.Group(); g.add(s); this.props.sword = s; s.rotation.x = Math.PI;
    const steel = new THREE.MeshPhysicalMaterial({ color: '#e8ebee', metalness: 1, roughness: .12, clearcoat: 1 });
    const bl = new THREE.Shape(); bl.moveTo(-.022, 0); bl.lineTo(-.018, .62); bl.lineTo(0, .7); bl.lineTo(.018, .62); bl.lineTo(.022, 0); bl.lineTo(-.022, 0);
    const bg = new THREE.ExtrudeGeometry(bl, { depth: .004, bevelEnabled: true, bevelSize: .004, bevelThickness: .004, bevelSegments: 2 }); bg.translate(0, 0, -.002);
    mesh(bg, steel, s, V(0, .07, 0));
    mesh(new THREE.BoxGeometry(.14, .016, .022), GOLD(), s, V(0, .065, 0));
    [-1, 1].forEach(k => ball(.013, GOLD(), s, V(k * .072, .065, 0)));
    mesh(new THREE.CylinderGeometry(.012, .012, .1, 12), new THREE.MeshPhysicalMaterial({ color: '#4a2a18', roughness: .5 }), s, V(0, .01, 0));
    ball(.02, GOLD(), s, V(0, -.045, 0));
  }
  _gavel() {
    const A = this.arms[1], g = this._palm(A); A.hand.set('fog'); this._holdR = 'fog';
    const wood = new THREE.MeshPhysicalMaterial({ color: '#4A2A16', roughness: .3, clearcoat: 1 });
    const gv = new THREE.Group(); g.add(gv); this.props.gavel = gv;
    mesh(new THREE.CylinderGeometry(.008, .01, .2, 14), wood, gv, V(0, -.02, 0));
    const head = new THREE.Group(); head.position.y = -.12; gv.add(head);
    mesh(new THREE.CylinderGeometry(.03, .03, .1, 24), wood, head, null, [0, 0, Math.PI / 2]);
    [-1, 1].forEach(k => mesh(new THREE.TorusGeometry(.03, .004, 8, 24), GOLD(), head, V(k * .035, 0, 0), [0, Math.PI / 2, 0]));
  }
  _quill() {
    const A = this.arms[1], g = this._palm(A); this.props.quill = g;
    const q = new THREE.Group(); q.visible = false; g.add(q); this.props.quillG = q; q.rotation.set(.3, 0, A.s * .5);
    const vane = new THREE.Shape(); vane.moveTo(0, 0); vane.quadraticCurveTo(.03, .1, .008, .22); vane.quadraticCurveTo(-.01, .12, 0, 0);
    mesh(new THREE.ShapeGeometry(vane, 12), new THREE.MeshPhysicalMaterial({ color: '#F6F2E8', side: THREE.DoubleSide, roughness: .6, sheen: 1 }), q, V(0, .02, 0));
    mesh(new THREE.CylinderGeometry(.002, .003, .26, 6), new THREE.MeshStandardMaterial({ color: '#d8cfb8' }), q, V(.004, .1, 0));
    mesh(new THREE.ConeGeometry(.003, .02, 6), new THREE.MeshStandardMaterial({ color: '#2a2018' }), q, V(.0, -.035, 0), [Math.PI, 0, 0]);
  }
  _book() {
    const A = this.arms[0], g = this._palm(A); A.hand.set('tal'); this._holdL = 'tal';
    const b = new THREE.Group(); b.position.set(A.s * .01, -.02, .05); b.rotation.set(-1.0, 0, 0); g.add(b); this.props.book = b;
    const cover = new THREE.MeshPhysicalMaterial({ color: '#6B1230', roughness: .5, sheen: .8, sheenColor: new THREE.Color('#c9577a') });
    const page = new THREE.MeshStandardMaterial({ color: '#F3EAD3', roughness: .9 });
    const W = .11, Hh = .15;
    [-1, 1].forEach(k => { const half = new THREE.Group(); half.rotation.y = k * .35; b.add(half);
      mesh(new THREE.BoxGeometry(W, Hh, .006), cover, half, V(k * W / 2, 0, -.004));
      mesh(new THREE.BoxGeometry(W * .94, Hh * .94, .012), page, half, V(k * W * .48, 0, .006));
      mesh(new THREE.BoxGeometry(W * .3, .004, .002), GOLD(), half, V(k * W * .5, Hh * .38, -.008)); });
    const leaf = new THREE.Group(); b.add(leaf); this.props.leaf = leaf;
    mesh(new THREE.BoxGeometry(W * .92, Hh * .92, .0015), page, leaf, V(W * .46, 0, .014));
  }
  _heart() {
    const A = this.arms[1], g = this._palm(A); A.hand.set('fog'); this._holdR = 'fog';
    const s = new THREE.Shape(); s.moveTo(0, -.05); s.bezierCurveTo(-.1, .01, -.05, .075, 0, .032); s.bezierCurveTo(.05, .075, .1, .01, 0, -.05);
    const geo = new THREE.ExtrudeGeometry(s, { depth: .02, bevelEnabled: true, bevelSize: .01, bevelThickness: .01, bevelSegments: 4, curveSegments: 20 }); geo.center();
    const h = mesh(geo, new THREE.MeshPhysicalMaterial({ color: '#C8333E', roughness: .2, clearcoat: 1 }), g, V(0, -.03, .06)); this.props.heart = h;
  }

  /* azonos anyagú, mozdulatlan gyerekhálók összevonása csoportonként → kevesebb rajzolási hívás */
  _bake(group) {
    const kids = group.children.slice();
    kids.forEach(c => { if (c.isGroup || c.isObject3D && !c.isMesh) this._bake(c); });
    const buckets = new Map();
    kids.forEach(m => {
      if (!m.isMesh || m.isInstancedMesh || m.userData.keep || m.children.length || !m.geometry.attributes.normal) return;
      if (m.material.transparent) return;
      const key = m.material.uuid + '|' + Object.keys(m.geometry.attributes).sort().join(',') + '|' + !!m.geometry.index + '|' + m.castShadow + '|' + (m.customDepthMaterial ? m.customDepthMaterial.uuid : '');
      if (!buckets.has(key)) buckets.set(key, []); buckets.get(key).push(m);
    });
    buckets.forEach(list => {
      if (list.length < 2) return;
      const geos = list.map(m => { m.updateMatrix(); const g = m.geometry.clone().applyMatrix4(m.matrix); for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'aSway', 'aT', 'aPhase', 'aLen'].includes(k)) g.deleteAttribute(k); return g; });
      let merged; try { merged = mergeGeometries(geos); } catch (e) { merged = null; }
      if (!merged) return;
      const nm = new THREE.Mesh(merged, list[0].material); nm.castShadow = list[0].castShadow; nm.receiveShadow = true; nm.customDepthMaterial = list[0].customDepthMaterial;
      list.forEach(m => group.remove(m)); group.add(nm);
    });
  }
  _finish() {
    this.root.traverse(o => { if (o.isMesh && (o.material.map || o.material === this.face?.M.lip)) o.userData.keep = 1; });
    this._bake(this.root);
    const shTex = Character.shadowTexture();
    this.blob = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shTex, transparent: true, depthWrite: false, opacity: .5 }));
    this.blob.rotation.x = -Math.PI / 2; this.blob.position.y = .003; this.blob.scale.setScalar(this.P.height * .55); this.root.add(this.blob);
    this.root.traverse(o => { if (o.isMesh && o.material && o.material.transparent && o !== this.blob) o.castShadow = false; });
    this.hips = this.legs;
  }
  static shadowTexture() {
    if (Character._sh) return Character._sh;
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
    const g = x.createRadialGradient(64, 64, 4, 64, 64, 62); g.addColorStop(0, 'rgba(30,24,12,.5)'); g.addColorStop(1, 'rgba(30,24,12,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128); return (Character._sh = new THREE.CanvasTexture(c));
  }

  /* ---------------- nyilvános API ---------------- */
  setExpr(name, instant) { this.exprName = name; this.face.set(name, instant); return this; }
  say(sec) { this.face.talk(sec); return this; }
  act(name) {
    const dignified = this.P.kind === 'para' || this.P.goddess;
    if (dignified && (name === 'integet' || name === 'ugral' || name === 'tapsol' || name === 'nevet' || name === 'sir')) name = name === 'integet' ? 'meghajol' : 'bolint';
    if (name && name === this.action && name === 'olel') name = null;
    this.action = name; this.actT = 0;
    this.actDur = { integet: 2.8, bolint: 1.6, ugral: 2.2, tapsol: 2.4, mutat: 2.8, rax: 2.8, olel: 1e9, nevet: 2.4, sir: 3.2, setal: 3, fordul: 2.2, kezetfog: 2.8, ir: 3.6, meghajol: 2.4, merlegel: 4, kalapacs: 2.6 }[name] || 0;
    if (name === 'nevet') { this._prevExpr = this.exprName; this.face.set('nevet'); }
    if (name === 'sir') { this._prevExpr = this.exprName; this.face.set('szomoru'); }
    if (name === 'setal' && !this.walkTo) this._walkDemo = true;
    if (this.props.quillG) this.props.quillG.visible = name === 'ir';
    return this;
  }
  lookAt(v) { this.lookTgt.copy(v); return this; }
  moveTo(x, z = this.root.position.z, speed = .75) { this.walkTo = V(x, 0, z); this.walkSpeed = speed; this._walkDemo = false; return this; }

  /* ---------------- képkocka ---------------- */
  update(dt, time) {
    this.t += dt; const t = this.t, P = this.P, para = P.kind === 'para';
    let a = this.action, at = 0;
    if (a) { this.actT += dt; at = this.actT / this.actDur; if (at >= 1) { if (a === 'nevet' || a === 'sir') this.face.set(this._prevExpr || 'vidam'); if (this.props.quillG) this.props.quillG.visible = false; this.action = a = null; at = 0; } }
    const k = a ? Math.min(1, Math.min(at, 1 - at) * 7) : 0;   // be/ki úsztatás
    // ---- séta ----
    let walkAmt = 0;
    if (this._walkDemo) { walkAmt = a === 'setal' ? 1 : 0; this.facingTgt = Math.sin(this.actT * 1.1) * .6; if (!a) { this._walkDemo = false; this.facingTgt = 0; } }
    else if (this.walkTo) { const d = this.walkTo.clone().sub(this.root.position); d.y = 0; const dist = d.length(); if (dist > .02) { this.root.position.addScaledVector(d.normalize(), Math.min(dist, this.walkSpeed * dt)); this.facingTgt = Math.atan2(d.x, d.z); walkAmt = 1; } else { this.walkTo = null; this.facingTgt = 0; } }
    this.walking = damp(this.walking, walkAmt, 6, dt);
    this.facing = damp(this.facing, this.facingTgt + (a === 'fordul' ? ease(at) * Math.PI * 2 : 0), a === 'fordul' ? 30 : 5, dt);
    this.mover.rotation.y = this.facing;
    const W = this.walking, wph = t * 7;
    // ---- törzs ----
    const breathe = Math.sin(t * 1.65) * .5 + .5;
    let jumpY = 0, sq = 1;
    if (a === 'ugral') { const ph = (this.actT % .72) / .72, air = bell(ph, .2, .9); jumpY = air * .2 * P.height * .55; sq = ph < .2 ? 1 - bell(ph, 0, .2) * .12 : ph > .9 ? 1 - bell(ph, .9, 1) * .1 : 1 + air * .05; }
    if (a === 'nevet') jumpY = Math.abs(Math.sin(this.actT * 13)) * .01;
    this.mover.position.y = jumpY + Math.abs(Math.sin(wph)) * .018 * W;
    this.squash.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
    this.spine.scale.set(1 + breathe * .01, 1 + breathe * .018, 1 + breathe * .016);
    let bow = 0; if (a === 'meghajol') bow = bell(at, .1, .9) * .55;
    this.spine.rotation.x = (P.age ? .05 : 0) + W * .06 + bow + (a === 'sir' ? .1 : 0) + (a === 'kalapacs' ? bell(at, .45, .75) * .12 : 0);
    this.spine.rotation.z = Math.sin(t * .75) * .02 + Math.sin(wph) * .035 * W + (a === 'merlegel' ? Math.sin(this.actT * 1.6) * .05 : 0);
    this.spine.rotation.y = Math.sin(wph) * .08 * W;
    if (para) this.glyph.rotation.z = Math.sin(t * 1.2) * .03 + (a === 'ugral' ? Math.sin(this.actT * 9) * .06 : 0);
    // ---- lábak ----
    this.legs.forEach(L => {
      const ph = wph + (L.s > 0 ? Math.PI : 0);
      const jb = a === 'ugral' ? bell((this.actT % .72) / .72, 0, .25) * .6 + bell((this.actT % .72) / .72, .85, 1) * .5 : 0;
      L.hip.rotation.x = -Math.sin(ph) * .5 * W - jb * .55 - bow * .2;
      L.knee.rotation.x = Math.max(0, Math.sin(ph + 1.25)) * .85 * W + jb + bow * .25;
      L.foot.rotation.x = -L.knee.rotation.x * .35 + Math.max(0, -Math.sin(ph)) * .2 * W;
    });
    // ---- fej és tekintet ----
    this.headG.updateWorldMatrix(true, false);
    const hp = new THREE.Vector3(); this.headG.getWorldPosition(hp);
    const dir = this.lookTgt.clone().sub(hp);
    const yaw = clamp(Math.atan2(dir.x, dir.z) - this.facing, -.75, .75), pitch = clamp(-Math.atan2(dir.y, Math.hypot(dir.x, dir.z)), -.45, .45);
    this.look.x = damp(this.look.x, yaw, 4.5, dt); this.look.y = damp(this.look.y, pitch, 4.5, dt);
    const C = this.face.cur;
    let nod = 0; if (a === 'bolint') nod = Math.sin(this.actT * 11) * .18 * k;
    const sob = a === 'sir' ? Math.sin(this.actT * 15) * .025 + .22 : 0;
    const headK = para ? .35 : .6;
    if (!para) this.headG.rotation.set(this.look.y * headK + nod + sob + Math.sin(t * 1.65) * .015 + bow * .3, this.look.x * headK, (C.tilt ?? 0) + Math.sin(t * .55) * .025);
    else this.headG.rotation.set(this.look.y * .2 + nod * .5, this.look.x * .35, (C.tilt ?? 0) * .6);
    this.face.update(dt, t, { x: this.look.x * (para ? .9 : .55), y: this.look.y * .5 });
    // copfok rugózása
    if (this.hair?.userData.pigtails) this.hair.userData.pigtails.forEach(p => { p.g.rotation.z = p.s * (.12 + jumpY * 3 + Math.sin(t * 4.2 + p.s) * .04) + Math.sin(wph) * .1 * W; p.g.rotation.x = Math.sin(t * 2.7 + p.s) * .05 - jumpY * 2; });
    // ---- karok és kezek ----
    const [L, R] = this.arms;             // L: s = −1 (a szereplő jobb keze), R: s = +1
    const idle = Math.sin(t * 1.65) * .035;
    const lr = { z: -.1 - idle, x: 0, ey: 0, e: -.18, wy: 0, wz: 0, wx: 0, pose: this._holdL || 'laza' };
    const rr = { z: .1 + idle, x: 0, ey: 0, e: -.18, wy: 0, wz: 0, wx: 0, pose: this._holdR || 'laza' };
    lr.x = Math.sin(wph) * .45 * W; rr.x = -Math.sin(wph) * .45 * W;
    if (para) { lr.z = -.5 - idle; rr.z = .5 + idle; }
    if (this.props.teddy) { lr.x = -.75; lr.e = -1.25; lr.z = -.05; lr.wx = .2; }
    if (this.props.cane) { lr.x = -.32; lr.e = -.32; lr.z = -.16; }
    if (this.props.scales) { rr.z = 1.05; rr.x = -.5; rr.e = -1.25; rr.wx = .1; rr.wz = -.2; }
    if (this.props.sword) { lr.z = -.28; lr.x = -.25; lr.e = -.25; }
    if (this.props.gavel) { rr.x = -.5; rr.e = -.9; rr.z = .25; }
    if (this.props.heart) { rr.x = -.7; rr.e = -.9; rr.z = .2; }
    if (this._handOnHeart && !a) { rr.x = -.55; rr.z = -.35; rr.e = -1.35; rr.wy = -.4; rr.pose = 'tal'; lr.x = -.55; lr.z = .35; lr.e = -1.35; lr.wy = .4; lr.pose = 'tal'; }   // összekulcsolt, oltalmazó kéztartás
    if (this.props.leaf) { const ph = (t % 9) / 9; this.props.leaf.rotation.y = -Math.PI * ease(clamp((ph - .55) / .35, 0, 1)) * .9; }
    const right = R; // a gesztusokat a +x oldali kar végzi (a nézőnek bal oldalon)
    const G = rr;
    if (a === 'integet') { G.z = lerp(G.z, 2.55, k); G.x = lerp(G.x, -.25, k); G.e = lerp(G.e, -.55, k); G.ey = Math.sin(this.actT * 10) * .5 * k; G.wy = lerp(0, -1.4 * G === rr ? 1 : 1, k) * -1.5; G.pose = 'nyitott'; }
    if (a === 'mutat') { G.z = lerp(G.z, 1.25, k); G.x = lerp(G.x, -1.0, k); G.e = lerp(G.e, -.05, k); G.wy = -1.2 * k; G.pose = k > .3 ? 'mutat' : G.pose; }
    if (a === 'rax' || a === 'olel') { const kk = a === 'olel' ? Math.min(1, this.actT * 2.5) : k; lr.z = lerp(lr.z, -1.2, kk); rr.z = lerp(rr.z, 1.2, kk); lr.x = rr.x = lerp(0, -.8, kk); lr.e = rr.e = lerp(-.18, -.55, kk); lr.wy = 1.2 * kk; rr.wy = -1.2 * kk; if (kk > .3) { if (!this._holdL) lr.pose = 'nyitott'; if (!this._holdR) rr.pose = 'nyitott'; } }
    if (a === 'tapsol') { const c = Math.abs(Math.sin(this.actT * 8.5)); lr.x = rr.x = lerp(0, -1.15, k); lr.z = lerp(lr.z, -.12 - c * .32, k); rr.z = lerp(rr.z, .12 + c * .32, k); lr.e = rr.e = lerp(-.18, -1.05, k); lr.wy = .9 * k; rr.wy = -.9 * k; if (!this._holdL) lr.pose = 'lapos'; if (!this._holdR) rr.pose = 'lapos'; }
    if (a === 'ugral') { const air = bell((this.actT % .72) / .72, .1, .95); lr.z = lerp(lr.z, -2.5, air * k); rr.z = lerp(rr.z, 2.5, air * k); if (!this._holdL) lr.pose = 'nyitott'; if (!this._holdR) rr.pose = 'nyitott'; }
    if (a === 'nevet') { lr.x = rr.x = -.35 * k; lr.e = rr.e = -1.5 * k; lr.z = -.35 * k - .1; rr.z = .35 * k + .1; }
    if (a === 'sir') { lr.x = rr.x = lerp(0, -1.45, k); lr.e = rr.e = lerp(-.18, -2.15, k); lr.z = lerp(lr.z, .3, k); rr.z = lerp(rr.z, -.3, k); if (!this._holdL) lr.pose = 'lapos'; if (!this._holdR) rr.pose = 'lapos'; }
    if (a === 'kezetfog') { G.x = lerp(G.x, -1.05, k); G.z = lerp(G.z, .2, k); G.e = lerp(G.e, -.35, k) + Math.sin(this.actT * 9) * .12 * bell(at, .2, .85); G.wy = -1.5 * k; G.pose = 'fog'; }
    if (a === 'ir') { G.x = lerp(G.x, -.95, k); G.z = lerp(G.z, .25, k); G.e = lerp(G.e, -1.25, k); G.wx = .5 * k; G.wz = Math.sin(this.actT * 12) * .12 * k; G.ey = Math.sin(this.actT * 3) * .08 * k; G.pose = 'csippent'; lr.x = lerp(lr.x, -.8, k); lr.e = lerp(lr.e, -1.3, k); if (!this._holdL) lr.pose = 'tal'; }
    if (a === 'meghajol') { G.x = lerp(G.x, -.75, k); G.z = lerp(G.z, -.15, k); G.e = lerp(G.e, -1.7, k); G.pose = 'lapos'; lr.z = lerp(lr.z, -.25, k); }
    if (a === 'merlegel' && this.props.beam) { rr.z = 1.15 + Math.sin(this.actT * 1.4) * .05; }
    if (a === 'kalapacs') { const up = bell(at, .05, .55) * .55; rr.x = lerp(-.5, -1.1, up); rr.e = lerp(-.9, -1.2, up); }   // egyetlen, nyugodt koppintás
    [[L, lr], [R, rr]].forEach(([A, r]) => {
      A.sh.rotation.z = damp(A.sh.rotation.z, r.z, 10, dt); A.sh.rotation.x = damp(A.sh.rotation.x, r.x, 10, dt);
      A.elbow.rotation.x = damp(A.elbow.rotation.x, r.e, 10, dt); A.elbow.rotation.z = r.ey;
      A.wrist.rotation.y = damp(A.wrist.rotation.y, r.wy, 8, dt); A.wrist.rotation.z = damp(A.wrist.rotation.z, r.wz, 10, dt); A.wrist.rotation.x = damp(A.wrist.rotation.x, r.wx, 10, dt);
      A.hand.set(r.pose); A.hand.update(dt, t + A.s);
    });
    // ---- kellékek ----
    this.root.updateMatrixWorld(true);
    const keepUpright = (obj, extra) => { const q = new THREE.Quaternion(); obj.parent.getWorldQuaternion(q); const qr = new THREE.Quaternion(); this.mover.getWorldQuaternion(qr); obj.quaternion.copy(q.invert().multiply(qr)); if (extra) obj.quaternion.multiply(extra); };
    if (this.props.cane) keepUpright(this.props.cane);
    if (this.props.scales) {
      keepUpright(this.props.scales);
      const tilt = a === 'merlegel' ? Math.sin(this.actT * 1.7) * .3 * Math.exp(-this.actT * .35) : Math.sin(t * .9) * .04;
      this.props.beam.rotation.z = damp(this.props.beam.rotation.z, tilt, 6, dt);
      this.props.pans.forEach(p => { p.rotation.z = -this.props.beam.rotation.z + Math.sin(t * 1.3 + p.position.x * 20) * .03; p.rotation.x = Math.sin(t * 1.1 + p.position.x * 9) * .03; });
    }
    if (this.props.sword) keepUpright(this.props.sword, new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI, 0, .08)));
    if (this.props.gavel) { const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 2)); this.props.gavel.quaternion.copy(q); }
    // ---- árnyék ----
    this.blob.scale.setScalar(P.height * .55 * (1 - jumpY * 1.5)); this.blob.material.opacity = .5 * (1 - jumpY * 2);
  }
}
