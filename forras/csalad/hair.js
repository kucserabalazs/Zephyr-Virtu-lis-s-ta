/* ==========================================================================
   hair.js – tincsekből épülő haj (több száz elvékonyodó tincs, egy rajzolási
   hívásba összefűzve), amelyet a szél shaderben mozgat.
   ========================================================================== */
import * as THREE from './lib/three.module.js';
import { mergeGeometries } from './lib/addons/utils/BufferGeometryUtils.js';
import { windify, windDepth } from './wind.js';
const { lerp, clamp } = THREE.MathUtils;

/* determinisztikus véletlen, hogy minden betöltéskor ugyanolyan legyen a frizura */
export function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) ^ Math.imul(s ^ (s >>> 13), 3266489909)) >>> 0) / 4294967296; }

/**
 * Egy tincs geometriája egy pontsorból: elvékonyodó, enyhén lapított cső.
 * pts: Vector3[], w0: tövi szélesség, flat: lapítás (1 = kerek), taper: a vég vékonysága
 */
export function lockGeometry(pts, w0, opts = {}) {
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const segs = opts.segs ?? Math.max(6, Math.min(18, Math.round(pts.length * 2.2)));
  const radial = opts.radial ?? 5;
  const g = new THREE.TubeGeometry(curve, segs, 1, radial, false);
  const pos = g.attributes.position, n = pos.count;
  const aT = new Float32Array(n), aPhase = new Float32Array(n), aLen = new Float32Array(n);
  const len = curve.getLength();
  const phase = opts.phase ?? Math.random();
  const frames = curve.computeFrenetFrames(segs, false);
  const tipW = opts.tip ?? .12, flat = opts.flat ?? .55;
  for (let i = 0; i <= segs; i++) {
    const t = i / segs, P = curve.getPointAt(t);
    const taper = (1 - t) * (1 - tipW) + tipW;
    const wt = w0 * taper * (t < .08 ? .75 + t * 3 : 1);
    for (let j = 0; j <= radial; j++) {
      const k = i * (radial + 1) + j;
      const a = j / radial * Math.PI * 2;
      const N = frames.normals[i], B = frames.binormals[i];
      const x = Math.cos(a) * wt, y = Math.sin(a) * wt * flat;
      pos.setXYZ(k, P.x + N.x * x + B.x * y, P.y + N.y * x + B.y * y, P.z + N.z * x + B.z * y);
      aT[k] = opts.still ? .04 : t; aPhase[k] = phase; aLen[k] = len;
    }
  }
  g.computeVertexNormals();
  g.setAttribute('aT', new THREE.BufferAttribute(aT, 1));
  g.setAttribute('aPhase', new THREE.BufferAttribute(aPhase, 1));
  g.setAttribute('aLen', new THREE.BufferAttribute(aLen, 1));
  g.deleteAttribute('uv');
  return g;
}

/* Pont a fejre illesztett ellipszoid felszínén (θ: a fejtetőtől mért szög, φ: elölről körbe) */
function scalp(H, th, ph, sc, k = 1) {
  return new THREE.Vector3(Math.sin(th) * Math.sin(ph) * H * sc[0] * k, Math.cos(th) * H * sc[1] * k, Math.sin(th) * Math.cos(ph) * H * sc[2] * k);
}

/* Tincs „növesztése”: a fejbőrről indul, a koponyát követve hullik lefelé */
function grow(H, sc, root, dir0, o, R) {
  const pts = [root.clone().multiplyScalar(.965)];
  let p = root.clone(), dir = dir0.clone().normalize();
  const steps = o.steps, step = o.len / steps, out = o.out ?? 1.05;
  pts.push(p.clone().addScaledVector(root.clone().normalize(), H * (o.lift ?? .04)));
  p = pts[1].clone();
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    dir.y -= (o.gravity ?? .35) * step / H * (o.gravCurve ? Math.pow(t, o.gravCurve) : 1);
    if (o.toward) dir.addScaledVector(o.toward.clone().sub(p).normalize(), o.towardK ?? .5);
    if (o.wave) { const w = Math.sin(t * Math.PI * o.wave + (o.wph ?? 0)) * (o.waveAmp ?? .5); const side = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize(); dir.addScaledVector(side, w * .35); }
    if (o.curl) { dir.x += (R() - .5) * o.curl; dir.z += (R() - .5) * o.curl; dir.y += (R() - .5) * o.curl * .5; }
    dir.normalize();
    p = p.clone().addScaledVector(dir, step);
    // ne menjen a fejbe: a fej ellipszoidjából kitoljuk
    const q = new THREE.Vector3(p.x / sc[0], p.y / sc[1], p.z / sc[2]);
    const lim = H * (out + (o.thick ?? .03) * t);
    if (q.length() < lim && p.y > -H * (o.below ?? .35)) { q.setLength(lim); p.set(q.x * sc[0], q.y * sc[1], q.z * sc[2]); }
    // arc elé ne lógjon: ha az arc felé tartana, oldalra kormányozzuk (törés nélkül)
    if (o.noFace !== false && p.z > H * .2 && p.y < H * .45 && Math.abs(p.x) < H * .95) {
      const sx = Math.sign(p.x || root.x || 1);
      const prev = pts[pts.length - 1];
      dir.x += sx * .55; dir.z -= .35; dir.normalize();
      p = prev.clone().addScaledVector(dir, step);
    }
    if (o.backZ !== undefined && p.y < -H * .5 && p.z > o.backZ) p.z = o.backZ;
    pts.push(p);
  }
  return pts;
}

/**
 * Frizura felépítése. Visszaad egy Group-ot (alapsapka + tincsek egy hálóban).
 * style: 'hosszu-hullamos' | 'rovid-kocos' | 'copfos' | 'konty' | 'oldalt-ritkas' | 'antik-hosszu' | 'fursi'
 */
export function buildHair(style, H, color, opts = {}) {
  const R = rng(opts.seed ?? 7);
  const sc = opts.sc ?? [1, 1.06, .98];
  const group = new THREE.Group();
  const col = new THREE.Color(color);
  const geos = [];
  const capMat = new THREE.MeshPhysicalMaterial({ color: col.clone().multiplyScalar(.82), roughness: .7, sheen: .6, sheenColor: col.clone().lerp(new THREE.Color('#fff'), .3) });
  const hairMat = windify(new THREE.MeshPhysicalMaterial({ color: col, roughness: .42, metalness: 0, clearcoat: .25, clearcoatRoughness: .55, sheen: 1, sheenRoughness: .45, sheenColor: col.clone().lerp(new THREE.Color('#fff8e8'), .5), side: THREE.DoubleSide }), 'hair', { amp: opts.amp ?? 1 });
  // sapka: a fejbőrt fedő réteg, hajvonal szerint kivágva (elöl magasabb homlok, hátul a tarkóig)
  const cap = (thetaMax, front = .32, k = 1.0, back = null) => {
    const g = new THREE.SphereGeometry(H * k * 1.012, 64, 40);
    const p = g.attributes.position, keep = [];
    const lim = ph => { const c = Math.cos(ph); return c > 0 ? lerp(thetaMax, front, Math.pow(c, 1.5)) : lerp(thetaMax, back ?? thetaMax + .1, -c); };
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const th = Math.acos(clamp(y / (H * k * 1.012), -1, 1)), ph = Math.atan2(x, z); keep.push(th < lim(ph)); p.setXYZ(i, x * sc[0], y * sc[1], z * sc[2]); }
    const idx = g.index.array, ni = []; for (let i = 0; i < idx.length; i += 3) if (keep[idx[i]] && keep[idx[i + 1]] && keep[idx[i + 2]]) ni.push(idx[i], idx[i + 1], idx[i + 2]);
    g.setIndex(ni); g.computeVertexNormals();
    const m = new THREE.Mesh(g, capMat); m.receiveShadow = true; group.add(m); return m;
  };
  const add = (pts, w, o = {}) => geos.push(lockGeometry(pts, w, { phase: R(), ...o }));
  const hairline = (ph) => .32 + .18 * Math.pow(Math.cos(ph / 2), 2); // elöl alacsonyabb homlok-vonal: θ nagyobb oldalt

  if (style === 'hosszu-hullamos' || style === 'antik-hosszu') {
    const antik = style === 'antik-hosszu';
    cap(Math.PI * .58, Math.PI * .26, 1, Math.PI * .66);
    const N = opts.count ?? 230;
    for (let i = 0; i < N; i++) {
      const ph = (R() * 2 - 1) * Math.PI;
      const front = Math.abs(ph) < .9;
      let th = front ? .1 + R() * .42 : .08 + R() * (Math.PI * .5);
      const root = scalp(H, th, ph, sc);
      // választék: középen (antik) vagy oldalt
      const part = antik ? 0 : .22;
      const sideSign = Math.sign(Math.sin(ph) - part * .3) || 1;
      const nrm = root.clone().normalize();
      let dir = new THREE.Vector3(0, -1, 0).addScaledVector(nrm, nrm.y).normalize();   // lefelé a fejbőr mentén
      dir.addScaledVector(new THREE.Vector3(Math.sin(ph), 0, -.4), .25).addScaledVector(new THREE.Vector3(sideSign, 0, 0), front ? .35 : .05).normalize();
      const L = H * (antik ? 2.6 : 2.2) * (.75 + R() * .4) * (front ? .9 : 1);
      const pts = grow(H, sc, root, dir, { len: L, steps: 10, gravity: 1.6, gravCurve: .3, wave: antik ? 2.2 : 3.2, wph: R() * 6, waveAmp: antik ? .18 : .28, curl: .04, out: 1.035, thick: .1, below: .45, backZ: -H * .05 }, R);
      add(pts, H * (.065 + R() * .035), { tip: .15, segs: 14, flat: .5, radial: 5 });
    }
    // térfogat-héj: a tincsek mögötti sűrű hajtömeg (szélben enyhén mozog)
    {
      const prof = antik ? [[0, -H * 2.1], [H * .55, -H * 2.0], [H * .95, -H * 1.4], [H * 1.08, -H * .6], [H * 1.1, 0], [H * .95, H * .5], [0, H * .8]]
                         : [[0, -H * 1.75], [H * .6, -H * 1.7], [H * 1.0, -H * 1.15], [H * 1.1, -H * .5], [H * 1.1, 0], [H * .95, H * .5], [0, H * .8]];
      const g = new THREE.LatheGeometry(prof.map(p => new THREE.Vector2(p[0], p[1])), 48, Math.PI * .62, Math.PI * .76);
      const p = g.attributes.position, aT = new Float32Array(p.count), aP = new Float32Array(p.count), aL = new Float32Array(p.count);
      for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setXYZ(i, p.getX(i) * sc[0], y, p.getZ(i) * .85 - H * .12); aT[i] = THREE.MathUtils.clamp(-y / (H * 2), 0, 1); aP[i] = .5; aL[i] = H * 2; }
      g.setAttribute('aT', new THREE.BufferAttribute(aT, 1)); g.setAttribute('aPhase', new THREE.BufferAttribute(aP, 1)); g.setAttribute('aLen', new THREE.BufferAttribute(aL, 1));
      g.deleteAttribute('uv'); g.computeVertexNormals(); geos.push(g);
    }
    // arcot keretező tincsek
    for (let s of [-1, 1]) for (let i = 0; i < 9; i++) {
      const ph = s * (.75 + R() * .5), th = .38 + R() * .2;
      const pts = grow(H, sc, scalp(H, th, ph, sc), new THREE.Vector3(s * .25, -1, .25), { len: H * (1.5 + R() * .5), steps: 9, gravity: .5, wave: 3, wph: R() * 6, waveAmp: .5, noFace: true, out: 1.05, thick: .04, below: .2 }, R);
      add(pts, H * .085, { tip: .15, flat: .35 });
    }
    // oldalra fésült frufru (nem antik)
    if (!antik) for (let i = 0; i < 26; i++) {
      const ph = -.6 + R() * 1.1, th = .05 + R() * .25;
      const rt = scalp(H, th, ph, sc), nn = rt.clone().normalize();
      const d0 = new THREE.Vector3(1, -.35, .2).addScaledVector(nn, -nn.dot(new THREE.Vector3(1, -.35, .2))).normalize();
      const pts = grow(H, sc, rt, d0, { len: H * (.9 + R() * .4), steps: 8, gravity: .5, wave: 1.2, waveAmp: .2, out: 1.04, thick: .02, lift: .015 }, R);
      add(pts, H * .075, { tip: .25, flat: .4 });
    }
  }
  else if (style === 'rovid-kocos') { // apa: rövid, kócos
    cap(Math.PI * .5, Math.PI * .24, .995, Math.PI * .62);
    const N = opts.count ?? 360;
    for (let i = 0; i < N; i++) {
      const ph = (R() * 2 - 1) * Math.PI;
      const front = Math.abs(ph) < 1.0;
      const th = R() * (front ? .5 : (Math.abs(ph) < 2 ? 1.25 : 1.45));
      if (front && th > hairline(ph) + .12) continue;
      const root = scalp(H, th, ph, sc);
      const n = root.clone().normalize();
      const flow = new THREE.Vector3(.35, .05, front ? .55 : -.6);
      const fl = flow.clone().addScaledVector(n, -n.dot(flow)).normalize();
      const dir = n.clone().multiplyScalar(.35).add(fl).add(new THREE.Vector3(R() - .5, R() * .2, R() - .5).multiplyScalar(.35));
      const pts = grow(H, sc, root, dir, { len: H * (.3 + R() * .2) * (th > 1 ? .6 : 1), steps: 5, gravity: .6, curl: .25, out: 1.03, thick: .06, lift: .015 }, R);
      add(pts, H * (.06 + R() * .03), { tip: .2, segs: 7, radial: 4, flat: .5 });
    }
  }
  else if (style === 'copfos') { // gyerek: copfok
    cap(Math.PI * .54, Math.PI * .27, 1, Math.PI * .62);
    const ties = [-1, 1].map(s => new THREE.Vector3(s * H * 1.0, H * .22, -H * .18));
    const N = opts.count ?? 200;
    for (let i = 0; i < N; i++) {
      const ph = (R() * 2 - 1) * Math.PI, th = .08 + R() * 1.25;
      if (Math.abs(ph) < .95 && th > .48) continue;
      const s = Math.sin(ph) >= 0 ? 1 : -1;
      const root = scalp(H, th, ph, sc);
      const pts = grow(H, sc, root, ties[s > 0 ? 1 : 0].clone().sub(root), { len: root.distanceTo(ties[s > 0 ? 1 : 0]) * 1.05, steps: 6, gravity: .02, toward: ties[s > 0 ? 1 : 0], towardK: .7, out: 1.035, thick: .015 }, R);
      add(pts, H * .05, { tip: .5, segs: 8, radial: 4 });
    }
    // frufru
    for (let i = 0; i < 34; i++) {
      const ph = -.8 + R() * 1.6, th = .3 + R() * .18;
      const pts = grow(H, sc, scalp(H, th, ph, sc), new THREE.Vector3(Math.sin(ph) * .3, -.55, 1), { len: H * (.42 + R() * .12), steps: 5, gravity: .5, out: 1.05, thick: .02 }, R);
      add(pts, H * .065, { tip: .3, segs: 7 });
    }
    // a copfok külön csoportban: rugóznak
    group.userData.pigtails = [];
    [-1, 1].forEach((s, si) => {
      const pg = new THREE.Group(); pg.position.copy(ties[si]); group.add(pg);
      const tg = [];
      for (let i = 0; i < 46; i++) {
        const a = R() * Math.PI * 2, r0 = H * .06 * R();
        const root = new THREE.Vector3(Math.cos(a) * r0, Math.sin(a) * r0 * .6, Math.sin(a) * r0);
        const pts = [root];
        let p = root.clone(); const L = H * (1.05 + R() * .35);
        for (let k = 1; k <= 8; k++) { const t = k / 8; p = p.clone().add(new THREE.Vector3(s * H * .07 * (1 - t) + (R() - .5) * H * .03, -L / 8, (R() - .5) * H * .03 + Math.sin(t * 5 + a) * H * .01)); pts.push(p); }
        tg.push(lockGeometry(pts, H * .06, { phase: R(), tip: .15, segs: 10 }));
      }
      const m = new THREE.Mesh(mergeGeometries(tg), hairMat); m.castShadow = true; m.customDepthMaterial = windDepth('hair'); pg.add(m);
      const tie = new THREE.Mesh(new THREE.TorusGeometry(H * .085, H * .04, 10, 22), new THREE.MeshPhysicalMaterial({ color: opts.tieColor ?? '#2E7565', roughness: .35, clearcoat: .6 }));
      tie.rotation.x = Math.PI / 2; tie.position.y = -H * .05; pg.add(tie);
      const bead = new THREE.Mesh(new THREE.SphereGeometry(H * .07, 16, 12), new THREE.MeshPhysicalMaterial({ color: '#E8B84A', roughness: .25, clearcoat: 1 })); bead.position.set(0, -H * .02, H * .08); pg.add(bead);
      group.userData.pigtails.push({ g: pg, s });
    });
  }
  else if (style === 'konty') { // nagymama: konty + elszabadult tincsek
    cap(Math.PI * .55, Math.PI * .24, 1, Math.PI * .62);
    const bun = new THREE.Vector3(0, H * .78, -H * .62);
    const N = opts.count ?? 220;
    for (let i = 0; i < N; i++) {
      const ph = (R() * 2 - 1) * Math.PI, th = .06 + R() * (Math.abs(ph) < 1 ? .45 : 1.35);
      const root = scalp(H, th, ph, sc);
      const pts = grow(H, sc, root, bun.clone().sub(root), { len: root.distanceTo(bun) * 1.1, steps: 7, gravity: -.05, toward: bun, towardK: .6, out: 1.03, thick: .02, curl: .05 }, R);
      add(pts, H * .05, { tip: .45, segs: 8, radial: 4 });
    }
    // a konty: körbe tekert tincsek
    for (let i = 0; i < 46; i++) {
      const pts = []; const r0 = H * (.16 + R() * .14), a0 = R() * Math.PI * 2, tilt = (R() - .5) * .8;
      for (let k = 0; k <= 10; k++) { const a = a0 + k / 10 * Math.PI * 1.6; pts.push(new THREE.Vector3(Math.cos(a) * r0, Math.sin(a) * r0 * .55 + tilt * r0 * Math.cos(a), Math.sin(a) * r0 * .8).add(bun)); }
      add(pts, H * .07, { tip: .4, segs: 14, still: true });
    }
    // laza, szélben lebegő tincsek a halántéknál és tarkón
    for (let i = 0; i < 14; i++) {
      const s = i % 2 ? 1 : -1, ph = s * (1.1 + R() * 1.4), th = .7 + R() * .6;
      const pts = grow(H, sc, scalp(H, th, ph, sc), new THREE.Vector3(s * .3, -1, -.1), { len: H * (.5 + R() * .45), steps: 6, gravity: .4, wave: 2.5, waveAmp: .6, out: 1.04, thick: .03, curl: .2 }, R);
      add(pts, H * .022, { tip: .1, segs: 10, radial: 4 });
    }
  }
  else if (style === 'oldalt-ritkas') { // nagypapa: kopasz fejtető, oldalt-hátul ősz koszorú
    const N = opts.count ?? 260;
    for (let i = 0; i < N; i++) {
      const ph = (R() * 2 - 1) * Math.PI;
      if (Math.abs(ph) < 1.15) continue;
      const th = .95 + R() * .7;
      const root = scalp(H, th, ph, sc);
      const n = root.clone().normalize();
      const dir = n.multiplyScalar(.6).add(new THREE.Vector3(0, -.6, -.25)).add(new THREE.Vector3(R() - .5, R() - .3, R() - .5).multiplyScalar(.8));
      const pts = grow(H, sc, root, dir, { len: H * (.18 + R() * .2), steps: 4, gravity: .2, curl: .9, out: 1.02, thick: .06 }, R);
      add(pts, H * (.04 + R() * .02), { tip: .25, segs: 6, radial: 4 });
    }
    // néhány szálas, szélben felálló szál a fejtetőn
    for (let i = 0; i < 9; i++) {
      const ph = (R() - .5) * 1.4, th = .1 + R() * .3;
      const root = scalp(H, th, ph, sc);
      const pts = grow(H, sc, root, root.clone().normalize().add(new THREE.Vector3(.2, .6, -.5)), { len: H * (.28 + R() * .2), steps: 5, gravity: .15, curl: .5, out: 1.0, lift: .0 }, R);
      add(pts, H * .012, { tip: .2, segs: 8, radial: 3 });
    }
  }
  else if (style === 'fursi') { // § figurák: kis tincs/kunkor a fej tetején
    for (let i = 0; i < 18; i++) {
      const pts = []; const a0 = R() * 6.28, r0 = H * (.25 + R() * .15);
      for (let k = 0; k <= 10; k++) { const t = k / 10, a = a0 + t * 4.2; pts.push(new THREE.Vector3(Math.cos(a) * r0 * (1 - t * .5) + (R() - .5) * .002, H * 1.0 + t * H * .55, Math.sin(a) * r0 * (1 - t * .5))); }
      add(pts, H * .06, { tip: .2, segs: 14 });
    }
  }

  if (geos.length) {
    const m = new THREE.Mesh(mergeGeometries(geos), hairMat);
    m.castShadow = true; m.receiveShadow = true;
    m.customDepthMaterial = windDepth('hair', opts.amp ?? 1);
    group.add(m); group.userData.locks = m;
  }
  group.userData.material = hairMat; group.userData.cap = capMat;
  return group;
}
