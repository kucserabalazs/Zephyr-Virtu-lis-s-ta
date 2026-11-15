/* ==========================================================================
   face.js – kidolgozott arc: formázott koponya, szemek írisz-textúrával és
   szaruhártya-csillanással, fel- és alsó szemhéj szempillasorral, mozgó
   szemöldök (belső/külső vég), alakítható ajkak, fogak, nyelv, állkapocs,
   arcpofa-emelés, nasolabiális redő, szarkalábak, pír, guruló könnyek.
   ========================================================================== */
import * as THREE from './lib/three.module.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const damp = THREE.MathUtils.damp, clamp = THREE.MathUtils.clamp, lerp = THREE.MathUtils.lerp;

/* ---------- Arckifejezések ---------- */
// bi: belső szemöldök fel(+)/le(−), bo: külső vég, bs: összehúzás (harag), lu: felső szemhéj (0 nyitott, 1 csukott),
// ld: alsó szemhéj emelés, ch: arcpofa emelés, sm: szájzug (+ mosoly), op: szájnyitás, wd: szélesség, tt: fogak,
// tear, blush, tilt, asym (egyoldalú szemöldök), pk: csücsörítés
export const EXPR = {
  semleges:       { bi: 0, bo: 0, bs: 0, lu: .12, ld: .05, ch: 0, sm: .05, op: 0, wd: 1, tt: 0, tear: 0, blush: .25, tilt: 0, asym: 0, pk: 0 },
  vidam:          { bi: .06, bo: .02, bs: 0, lu: .1, ld: .3, ch: .6, sm: .75, op: .12, wd: 1.08, tt: .7, tear: 0, blush: .55, tilt: .02, asym: 0, pk: 0 },
  nevet:          { bi: .18, bo: .08, bs: 0, lu: .38, ld: .55, ch: 1, sm: 1, op: .75, wd: 1.18, tt: 1, tear: 0, blush: .85, tilt: .08, asym: 0, pk: 0 },
  megkonnyebbult: { bi: .12, bo: -.05, bs: 0, lu: .5, ld: .35, ch: .4, sm: .5, op: .04, wd: 1, tt: .2, tear: 0, blush: .45, tilt: -.06, asym: 0, pk: 0 },
  aggodo:         { bi: .45, bo: -.1, bs: .35, lu: .08, ld: .1, ch: 0, sm: -.25, op: .06, wd: .82, tt: 0, tear: 0, blush: .15, tilt: .05, asym: 0, pk: .25 },
  szomoru:        { bi: .55, bo: -.25, bs: .3, lu: .38, ld: .1, ch: 0, sm: -.75, op: .03, wd: .9, tt: 0, tear: 1, blush: .3, tilt: -.1, asym: 0, pk: .1 },
  meglepett:      { bi: .65, bo: .55, bs: 0, lu: -.18, ld: 0, ch: .1, sm: 0, op: .65, wd: .7, tt: .3, tear: 0, blush: .3, tilt: 0, asym: 0, pk: .45 },
  gondolkodo:     { bi: .15, bo: .2, bs: .1, lu: .3, ld: .2, ch: .1, sm: .1, op: 0, wd: .78, tt: 0, tear: 0, blush: .2, tilt: .12, asym: 1, pk: .3 },
  hatarozott:     { bi: -.22, bo: .05, bs: .4, lu: .25, ld: .25, ch: .1, sm: .12, op: 0, wd: .95, tt: 0, tear: 0, blush: .2, tilt: 0, asym: 0, pk: 0 },
  duhos:          { bi: -.5, bo: .2, bs: 1, lu: .3, ld: .4, ch: .25, sm: -.5, op: .2, wd: 1.05, tt: .9, tear: 0, blush: .7, tilt: -.04, asym: 0, pk: 0 },
  nyugodt:        { bi: .05, bo: 0, bs: 0, lu: .42, ld: .2, ch: .15, sm: .22, op: 0, wd: .95, tt: 0, tear: 0, blush: .25, tilt: .04, asym: 0, pk: 0 },
  egyutterzo:     { bi: .38, bo: -.08, bs: .15, lu: .28, ld: .25, ch: .3, sm: .32, op: 0, wd: .95, tt: 0, tear: 0, blush: .4, tilt: .14, asym: 0, pk: .1 }
};
export const EXPR_NAMES = { nyugodt: 'Nyugodt', vidam: 'Vidám', nevet: 'Nevet', megkonnyebbult: 'Megkönnyebbült', egyutterzo: 'Együttérző', aggodo: 'Aggódó', szomoru: 'Szomorú', meglepett: 'Meglepett', gondolkodo: 'Gondolkodó', hatarozott: 'Határozott', duhos: 'Dühös', semleges: 'Semleges' };

/* ---------- Írisz textúra (radiális szálak, sötét peremgyűrű) ---------- */
const IRIS_CACHE = {};
function irisTexture(hex) {
  if (IRIS_CACHE[hex]) return IRIS_CACHE[hex];
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
  const col = new THREE.Color(hex), dark = col.clone().multiplyScalar(.45), light = col.clone().lerp(new THREE.Color('#fff4d8'), .35);
  x.fillStyle = '#' + col.getHexString(); x.beginPath(); x.arc(S / 2, S / 2, S / 2, 0, 7); x.fill();
  // szálak
  for (let i = 0; i < 260; i++) {
    const a = Math.random() * Math.PI * 2, r0 = S * (.12 + Math.random() * .08), r1 = S * (.36 + Math.random() * .12);
    x.strokeStyle = (Math.random() < .5 ? '#' + light.getHexString() : '#' + dark.getHexString()) + (Math.random() < .5 ? '88' : '55');
    x.lineWidth = .8 + Math.random() * 1.6; x.beginPath(); x.moveTo(S / 2 + Math.cos(a) * r0, S / 2 + Math.sin(a) * r0);
    x.quadraticCurveTo(S / 2 + Math.cos(a + .08) * (r0 + r1) / 2, S / 2 + Math.sin(a + .08) * (r0 + r1) / 2, S / 2 + Math.cos(a) * r1, S / 2 + Math.sin(a) * r1); x.stroke();
  }
  // belső arany gyűrű (heterokróm hatás)
  const g = x.createRadialGradient(S / 2, S / 2, S * .1, S / 2, S / 2, S * .26); g.addColorStop(0, 'rgba(201,150,70,.55)'); g.addColorStop(1, 'rgba(201,150,70,0)'); x.fillStyle = g; x.beginPath(); x.arc(S / 2, S / 2, S * .3, 0, 7); x.fill();
  // pupilla és sötét peremgyűrű
  x.fillStyle = '#0d0b0a'; x.beginPath(); x.arc(S / 2, S / 2, S * .17, 0, 7); x.fill();
  const lg = x.createRadialGradient(S / 2, S / 2, S * .4, S / 2, S / 2, S * .5); lg.addColorStop(0, 'rgba(0,0,0,0)'); lg.addColorStop(1, 'rgba(10,12,14,.85)'); x.fillStyle = lg; x.beginPath(); x.arc(S / 2, S / 2, S / 2, 0, 7); x.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return (IRIS_CACHE[hex] = t);
}

/* Elvékonyodó cső (ajak, szemöldök, redő): r(t) = r·(min + (1−min)·sin(πt)^p) */
function taperTube(pts, r, min = .3, p = .7, segs = 26, radial = 8, flat = 1) {
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const g = new THREE.TubeGeometry(curve, segs, 1, radial, false);
  const pos = g.attributes.position; const fr = curve.computeFrenetFrames(segs, false);
  for (let i = 0; i <= segs; i++) {
    const t = i / segs, P = curve.getPointAt(t), rr = r * (min + (1 - min) * Math.pow(Math.sin(Math.PI * t), p));
    for (let j = 0; j <= radial; j++) {
      const a = j / radial * Math.PI * 2, k = i * (radial + 1) + j, N = fr.normals[i], B = fr.binormals[i];
      const cx = Math.cos(a) * rr, cy = Math.sin(a) * rr * flat;
      pos.setXYZ(k, P.x + N.x * cx + B.x * cy, P.y + N.y * cx + B.y * cy, P.z + N.z * cx + B.z * cy);
    }
  }
  g.computeVertexNormals(); return g;
}


/* Felszíni dombormű: 2D körvonal (x,y) a bőrre vetítve, kis vastagsággal.
   Z(x,y): bőrfelszín; lift: emelés; th: vastagság (középen), a szélek simán a bőrbe futnak */
function surfaceShape(outline, Z, lift, th, holes) {
  const sh = new THREE.Shape(outline.map(p => new THREE.Vector2(p.x, p.y)));
  if (holes) holes.forEach(h => sh.holes.push(new THREE.Path(h.map(p => new THREE.Vector2(p.x, p.y)))));
  const g = new THREE.ShapeGeometry(sh, 6);
  // finomítás: minden háromszöget 4 részre bontunk kétszer, hogy a görbült bőrt kövesse
  let geo = g.toNonIndexed();
  for (let it = 0; it < 2; it++) {
    const p = geo.attributes.position, out = [];
    for (let i = 0; i < p.count; i += 3) {
      const a = new THREE.Vector3().fromBufferAttribute(p, i), b = new THREE.Vector3().fromBufferAttribute(p, i + 1), c = new THREE.Vector3().fromBufferAttribute(p, i + 2);
      const ab = a.clone().add(b).multiplyScalar(.5), bc = b.clone().add(c).multiplyScalar(.5), ca = c.clone().add(a).multiplyScalar(.5);
      [[a, ab, ca], [ab, b, bc], [ca, bc, c], [ab, bc, ca]].forEach(t => t.forEach(v => out.push(v.x, v.y, 0)));
    }
    geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
  }
  // távolság a körvonaltól → domborulat
  const p = geo.attributes.position, poly = outline;
  const distEdge = (x, y) => { let d = 1e9; for (let i = 0; i < poly.length; i++) { const A = poly[i], B = poly[(i + 1) % poly.length]; const vx = B.x - A.x, vy = B.y - A.y, l = vx * vx + vy * vy || 1e-12; let t = ((x - A.x) * vx + (y - A.y) * vy) / l; t = Math.max(0, Math.min(1, t)); const dx = A.x + vx * t - x, dy = A.y + vy * t - y; d = Math.min(d, Math.hypot(dx, dy)); } return d; };
  let maxd = 1e-9; const ds = [];
  for (let i = 0; i < p.count; i++) { const d = distEdge(p.getX(i), p.getY(i)); ds.push(d); maxd = Math.max(maxd, d); }
  for (let i = 0; i < p.count; i++) { const k = Math.sqrt(Math.min(1, ds[i] / maxd)); p.setZ(i, Z(p.getX(i), p.getY(i)) + lift + th * k); }
  geo.computeVertexNormals(); return geo;
}
/* Vastag vonal körvonala (szemöldök, redő): középvonal + szélesség-profil */
function strokeOutline(pts, w0, min = .2) {
  const c = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p.x, p.y, 0)));
  const N = 24, L = [], R = [];
  for (let i = 0; i <= N; i++) { const t = i / N, P = c.getPointAt(t), T = c.getTangentAt(t); const w = w0 * (min + (1 - min) * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.15)), .6)); L.push({ x: P.x - T.y * w, y: P.y + T.x * w }); R.push({ x: P.x + T.y * w, y: P.y - T.x * w }); }
  return L.concat(R.reverse());
}

/* Koponya: gömb, amelyet arc-formára gyúrunk (keskenyebb áll, telt arc, lapos oldal) */
export function headGeometry(H, sc, child) {
  const g = new THREE.SphereGeometry(H, 72, 56); const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).divideScalar(H);
    let { x, y, z } = v;
    if (y < 0) { const k = Math.pow(-y, 1.6); x *= 1 - (child ? .1 : .2) * k; z *= 1 - .05 * k; if (z > 0) z += .06 * k * z; y *= 1 + (child ? 0 : .1) * k; }
    if (y > .2 && z < 0) { z *= 1.06; }                       // tarkó telt
    if (Math.abs(x) > .6 && y > -.2 && y < .4) x *= .96;     // halánték lapos
    if (z > .3 && y < .05 && y > -.55) { const c = Math.exp(-Math.pow((Math.abs(x) - .45) / .25, 2)) * .045; z += c; } // arccsont
    if (z > .7 && y > .1 && y < .45 && Math.abs(x) < .45) z -= .03; // szemgödör
    p.setXYZ(i, x * H * sc[0], y * H * sc[1], z * H * sc[2]);
  }
  g.computeVertexNormals(); return g;
}

export class Face {
  /**
   * parent: a fej csoport; H: fej sugár; sc: ellipszoid arány; o: { skin, lip, brow, iris, lashes, age, child, eyeR, wrinkles }
   */
  constructor(parent, H, sc, o) {
    this.H = H; this.sc = sc; this.o = o;
    this.g = new THREE.Group(); parent.add(this.g);
    this.cur = { ...EXPR.semleges }; this.tgt = { ...EXPR.vidam };
    this.blink = 0; this.blinkT = 1 + Math.random() * 2; this.sacc = new THREE.Vector2(); this.saccT = .5; this.browIdle = 0; this.talkT = 0; this.talkPh = 0;
    const skin = o.skin, H_ = H;
    const mk = (geo, mat, parent, p, sc_, rot) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; if (p) m.position.copy(p); if (sc_) m.scale.set(...sc_); if (rot) m.rotation.set(...rot); parent.add(m); return m; };
    const SPH = new THREE.SphereGeometry(1, 32, 24);
    this.M = {
      white: new THREE.MeshPhysicalMaterial({ color: '#fbf8f3', roughness: .25, clearcoat: .6 }),
      cornea: new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0, metalness: 0, transparent: true, opacity: .14, clearcoat: 1, clearcoatRoughness: 0, specularIntensity: 1, depthWrite: false }),
      dark: new THREE.MeshStandardMaterial({ color: '#1b1412', roughness: .6 }),
      lip: new THREE.MeshPhysicalMaterial({ color: o.lip, roughness: .38, clearcoat: .45, clearcoatRoughness: .4, sheen: .5, sheenColor: new THREE.Color('#ffd0c8') }),
      mouth: new THREE.MeshStandardMaterial({ color: '#4a1a1e', roughness: .8 }),
      teeth: new THREE.MeshPhysicalMaterial({ color: '#f7f2e8', roughness: .25, clearcoat: .7 }),
      tongue: new THREE.MeshPhysicalMaterial({ color: '#d9737a', roughness: .45, clearcoat: .3 }),
      brow: new THREE.MeshStandardMaterial({ color: o.brow, roughness: .85 }),
      crease: new THREE.MeshBasicMaterial({ color: new THREE.Color(o.skinColor).multiplyScalar(.72), transparent: true, opacity: 0, depthWrite: false }),
      blush: new THREE.MeshBasicMaterial({ color: '#ec7d72', transparent: true, opacity: .3, depthWrite: false }),
      tear: new THREE.MeshPhysicalMaterial({ color: '#cfeaff', roughness: 0, transmission: .7, thickness: .01, transparent: true, opacity: .85, clearcoat: 1 })
    };
    const ell = (x, y) => { const xx = x / (H * sc[0]), yy = y / (H * sc[1]); const r = 1 - xx * xx - yy * yy; return (r > 0 ? Math.sqrt(r) : 0) * H * sc[2]; };
    // a valódi (gyúrt) arcfelszín z-je: a fej háromszögeit egyszer mélységrácsba raszterizáljuk
    let grid = null; const GN = 96, X0 = -H * 1.2, X1 = H * 1.2, Y0 = -H * 1.3, Y1 = H * 1.2;
    if (o.surface) {
      grid = new Float32Array(GN * GN).fill(-1e9);
      const g = o.surface.geometry, p = g.attributes.position, idx = g.index.array;
      const gx = x => (x - X0) / (X1 - X0) * (GN - 1), gy = y => (y - Y0) / (Y1 - Y0) * (GN - 1);
      for (let t = 0; t < idx.length; t += 3) {
        const a = idx[t], b = idx[t + 1], c = idx[t + 2];
        const ax = gx(p.getX(a)), ay = gy(p.getY(a)), az = p.getZ(a), bx = gx(p.getX(b)), by = gy(p.getY(b)), bz = p.getZ(b), cx = gx(p.getX(c)), cy = gy(p.getY(c)), cz = p.getZ(c);
        if (az < -H * .3 && bz < -H * .3 && cz < -H * .3) continue;
        const minx = Math.max(0, Math.floor(Math.min(ax, bx, cx))), maxx = Math.min(GN - 1, Math.ceil(Math.max(ax, bx, cx)));
        const miny = Math.max(0, Math.floor(Math.min(ay, by, cy))), maxy = Math.min(GN - 1, Math.ceil(Math.max(ay, by, cy)));
        const d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy); if (Math.abs(d) < 1e-9) continue;
        for (let j = miny; j <= maxy; j++) for (let i = minx; i <= maxx; i++) {
          const l1 = ((by - cy) * (i - cx) + (cx - bx) * (j - cy)) / d, l2 = ((cy - ay) * (i - cx) + (ax - cx) * (j - cy)) / d, l3 = 1 - l1 - l2;
          if (l1 < -.02 || l2 < -.02 || l3 < -.02) continue;
          const z = l1 * az + l2 * bz + l3 * cz, k = j * GN + i; if (z > grid[k]) grid[k] = z;
        }
      }
    }
    const Z = o.flatZ !== undefined ? ((x, y) => o.flatZ - (x * x) * .6 / H) : grid ? ((x, y) => {
      const fx = clamp((x - X0) / (X1 - X0) * (GN - 1), 0, GN - 1.001), fy = clamp((y - Y0) / (Y1 - Y0) * (GN - 1), 0, GN - 1.001);
      const i = Math.floor(fx), j = Math.floor(fy), u = fx - i, v = fy - j;
      const q = (ii, jj) => { const z = grid[jj * GN + ii]; return z < -1e8 ? ell(x, y) : z; };
      return (q(i, j) * (1 - u) + q(i + 1, j) * u) * (1 - v) + (q(i, j + 1) * (1 - u) + q(i + 1, j + 1) * u) * v;
    }) : ell;
    this.Z = Z;

    // ---- szemek ----
    const er = o.eyeR ?? H * .16, ex = H * .37, ey = H * .08, ez = Z(ex, ey) - er * .55;
    this.eyes = [];
    [-1, 1].forEach(s => {
      const socket = new THREE.Group(); socket.position.set(s * ex, ey, ez); this.g.add(socket);
      const ball = new THREE.Group(); socket.add(ball);
      mk(SPH, this.M.white, ball, null, [er, er, er]);
      const iris = mk(new THREE.CircleGeometry(er * .58, 40), new THREE.MeshPhysicalMaterial({ map: irisTexture(o.iris), roughness: .3, clearcoat: 1 }), ball, V(0, 0, er * .965)); iris.castShadow = false;
      iris.geometry = new THREE.SphereGeometry(er * 1.0, 32, 16, 0, Math.PI * 2, 0, .62); iris.rotation.x = Math.PI / 2; iris.position.set(0, 0, -er * .0); iris.scale.setScalar(1.005);
      // gömbsüveg textúra-koordinátái: középen a pupilla
      const uv = iris.geometry.attributes.uv, pp = iris.geometry.attributes.position; for (let i = 0; i < uv.count; i++) { const x = pp.getX(i) / (er * Math.sin(.62)), z = pp.getZ(i) / (er * Math.sin(.62)); uv.setXY(i, .5 + x * .5, .5 - z * .5); }
      const cor = mk(new THREE.SphereGeometry(er * 1.04, 32, 16, 0, Math.PI * 2, 0, .75), this.M.cornea, ball, null, null, [Math.PI / 2, 0, 0]); cor.castShadow = false;
      const glint = mk(new THREE.SphereGeometry(er * .085, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffffff' }), ball, V(er * .3, er * .3, er * .99)); glint.castShadow = false;
      // szemhéjak: bőr-félgömbhéj + szempillasor
      const lidU = new THREE.Group(); socket.add(lidU);
      mk(new THREE.SphereGeometry(er * 1.09, 40, 16, 0, Math.PI * 2, 0, Math.PI * .5), skin, lidU, null, [1, 1.05, 1.02]);
      const lg = new THREE.TorusGeometry(er * 1.075, er * (o.lashes ? .085 : .05), 6, 40, Math.PI * .92); lg.rotateZ(Math.PI * .04);
      const lash = mk(lg, this.M.dark, lidU, null, null, [Math.PI / 2, 0, 0]); lash.castShadow = false;
      if (o.lashes) [-.6, -.25, .15, .5, .8].forEach(a => { const l = mk(new THREE.ConeGeometry(er * .05, er * .32, 5), this.M.dark, lidU, V(Math.sin(a * 1.4) * er * 1.06 * s, 0, Math.cos(a * 1.4) * er * 1.06), null, [Math.PI / 2 + .5, 0, -s * a * .6]); l.castShadow = false; });
      const lidD = new THREE.Group(); socket.add(lidD);
      mk(new THREE.SphereGeometry(er * 1.075, 40, 12, 0, Math.PI * 2, Math.PI * .5, Math.PI * .5), skin, lidD, null, [1, 1.02, 1.01]);
      // szemhéj-redő a felső szemhéj fölött
      const fold = mk(taperTube([V(-er * 1.0, er * .55, er * .55), V(0, er * 1.0, er * .9), V(er * 1.0, er * .55, er * .55)], er * .06, .2, .8, 16, 5), this.M.crease, socket); fold.castShadow = false;
      // szarkalábak
      const crow = [0, 1, 2].map(k => { const m = mk(taperTube([V(s * er * 1.15, er * (.25 - k * .25), er * .2), V(s * er * 1.55, er * (.35 - k * .32), -er * .1)], er * .045, .15, .8, 8, 4), this.M.crease, socket); m.castShadow = false; return m; });
      this.eyes.push({ socket, ball, lidU, lidD, s, er, fold, crow });
    });
    this.er = er; this.ex = ex; this.ey = ey;

    // ---- szemöldök (újragenerált cső, belső/külső vég mozog) ----
    this.brows = [-1, 1].map(s => ({ s, mesh: null, key: '' }));
    this.browBase = { y: ey + er * 1.55, x0: ex - er * .95, x1: ex + er * 1.25 };

    // ---- orr ----
    const ny = -H * .12, nz = Z(0, ny);
    if (!o.mascot) {
    mk(new THREE.CapsuleGeometry(H * .045, H * .24, 6, 12), skin, this.g, V(0, ny + H * .13, nz - H * .045), [1, 1, .85], [-.3, 0, 0]);
    mk(SPH, skin, this.g, V(0, ny, nz + H * .02), [H * .075, H * .068, H * .07]);
    [-1, 1].forEach(s => mk(SPH, skin, this.g, V(s * H * .065, ny - H * .02, nz - H * .01), [H * .045, H * .04, H * .045]));
    [-1, 1].forEach(s => { const n = mk(SPH, this.M.mouth, this.g, V(s * H * .035, ny - H * .055, nz + H * .01), [H * .02, H * .01, H * .015]); n.castShadow = false; });

    }
    // ---- arcpofák (mosolynál felemelkednek) ----
    this.cheeks = o.mascot ? [] : [-1, 1].map(s => { const c = mk(SPH, skin, this.g, V(s * H * .44, -H * .2, Z(H * .44, -H * .2) - H * .115), [H * .24, H * .17, H * .08], [0, s * .55, 0]); c.userData.keep = 1; return { m: c, s, y0: -H * .2, z0: c.position.z - H * .03 }; });
    this.blushes = [-1, 1].map(s => { const pts = []; for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; pts.push({ x: s * H * .44 + Math.cos(a) * H * .15, y: -H * .2 + Math.sin(a) * H * .1 }); } const b = new THREE.Mesh(surfaceShape(pts, Z, H * .006, H * .002), this.M.blush); this.g.add(b); b.castShadow = false; b.renderOrder = 2; return b; });

    // ---- nasolabiális redők ----
    this.naso = o.mascot ? [] : [-1, 1].map(s => { const m = mk(taperTube([V(s * H * .13, -H * .15, Z(H * .13, -H * .15) - H * .005), V(s * H * .22, -H * .3, Z(H * .22, -H * .3) + H * .005), V(s * H * .25, -H * .44, Z(H * .25, -H * .44) - H * .005)], H * .016, .1, .9, 14, 5), this.M.crease, this.g); m.castShadow = false; return m; });

    // ---- száj ----
    this.mouthY = -H * .42; this.mouthZ = Z(0, this.mouthY);
    this.mouthG = new THREE.Group(); this.mouthG.position.set(0, this.mouthY, 0); this.g.add(this.mouthG);
    this.cavity = mk(SPH, this.M.mouth, this.mouthG, V(0, 0, this.mouthZ - H * .1), [H * .2, H * .05, H * .12]); this.cavity.castShadow = false;
    const teethArc = (r, y) => { const t = mk(new THREE.CylinderGeometry(r, r, H * .07, 28, 1, true, -Math.PI * .3, Math.PI * .6), this.M.teeth, this.mouthG, V(0, y, this.mouthZ - r - H * .03)); t.material.side = THREE.DoubleSide; t.castShadow = false; return t; };
    this.teethU = teethArc(H * .2, H * .01); this.teethD = teethArc(H * .19, -H * .05);
    this.tongue = mk(SPH, this.M.tongue, this.mouthG, V(0, -H * .06, this.mouthZ - H * .1), [H * .12, H * .04, H * .1]); this.tongue.castShadow = false;
    this.lipU = null; this.lipD = null; this._mkey = '';
    // áll (állkapocs nyitásnál lefelé mozdul)
    this.chin = mk(SPH, skin, this.g, V(0, -H * .66, Z(0, -H * .66) - H * .19), [H * .26, H * .16, H * .18]); this.chin.visible = !o.mascot;
    this.chinY0 = this.chin.position.y;
    // ---- könnyek ----
    this.tears = [-1, 1].map(s => { const t = mk(new THREE.SphereGeometry(1, 14, 10), this.M.tear, this.g); t.visible = false; t.castShadow = false; return { m: t, s, ph: Math.random() }; });
    // ---- fülek ----
    if (!o.mascot) [-1, 1].forEach(s => {
      const ear = new THREE.Group(); ear.position.set(s * H * sc[0] * .96, -H * .02, -H * .04); ear.rotation.y = s * .35; this.g.add(ear);
      mk(SPH, skin, ear, null, [H * .1, H * .2, H * .13]);
      mk(new THREE.TorusGeometry(H * .12, H * .035, 8, 20, Math.PI * 1.4), skin, ear, V(s * H * .03, 0, 0), null, [0, s * Math.PI / 2, Math.PI * .8]);
      if (o.earrings) { const e = mk(SPH, o.earrings, ear, V(s * H * .02, -H * .22, H * .02), [H * .045, H * .045, H * .045]); }
    });
    if (o.wrinkles) { // homlokráncok idősebbeknek
      [0, 1].forEach(k => { const m = mk(taperTube([V(-H * .32, H * (.48 + k * .09), Z(H * .32, H * (.48 + k * .09)) + H * .003), V(0, H * (.52 + k * .09), Z(0, H * (.52 + k * .09)) + H * .006), V(H * .32, H * (.48 + k * .09), Z(H * .32, H * (.48 + k * .09)) + H * .003)], H * .009, .1, .9, 16, 4), this.M.crease, this.g); m.material = this.M.crease.clone(); m.material.opacity = .45; m.castShadow = false; });
    }
    this.markKeep();
    this.set('vidam', true);
  }

  markKeep() { const k = m => m && (m.userData.keep = 1);
    [this.cavity, this.teethU, this.teethD, this.tongue, this.chin].forEach(k); this.blushes.forEach(k); this.naso.forEach(k); this.tears.forEach(t => k(t.m));
    this.eyes.forEach(e => { k(e.fold); e.crow.forEach(k); }); this.g.traverse(o => { if (o.material === this.M.crease || (o.material && o.material.opacity !== undefined && o.material.transparent)) k(o); }); }
  set(name, instant) { this.name = name; this.tgt = { ...EXPR.semleges, ...(EXPR[name] || {}) }; if (instant) this.cur = { ...this.tgt }; }
  talk(sec) { this.talkT = sec; }

  _brow(b, E) {
    const H = this.H, BB = this.browBase, s = b.s, er = this.er;
    const asy = E.asym ? (s < 0 ? .4 : -.15) : 0;
    const ib = (E.bi + asy * .6 + this.browIdle) * er * .9, ob = (E.bo + asy * .5 + this.browIdle * .6) * er * .7;
    const sq = E.bs * er * .35;
    const pts = [
      V(s * (BB.x0 - sq * .8), BB.y + ib - E.bs * er * .25, 0),
      V(s * (BB.x0 + (BB.x1 - BB.x0) * .4), BB.y + (ib + ob) * .5 + er * .22, 0),
      V(s * (BB.x0 + (BB.x1 - BB.x0) * .75), BB.y + ob + er * .16, 0),
      V(s * BB.x1, BB.y + ob - er * .12, 0)];
    const key = pts.map(p => (p.y / H).toFixed(2) + (p.x / H).toFixed(2)).join();
    if (key === b.key) return; b.key = key;
    const geo = surfaceShape(strokeOutline(s < 0 ? pts.slice().reverse() : pts, er * (this.o.browW ?? .2) * 1.1, .25), this.Z, H * .004, H * .018);
    if (b.mesh) { b.mesh.geometry.dispose(); b.mesh.geometry = geo; }
    else { b.mesh = new THREE.Mesh(geo, this.M.brow); b.mesh.castShadow = false; b.mesh.userData.keep = 1; this.g.add(b.mesh); }
  }

  _mouth(E, open) {
    const H = this.H, W = H * .25 * E.wd * (1 - E.pk * .25);
    const cy = E.sm * H * .17, upY = H * .032, pk = E.pk;
    const key = [W / H, cy / H, open, pk].map(v => v.toFixed(2)).join();
    if (key === this._mkey) return; this._mkey = key;
    const zf = (x, y) => this.Z(x, this.mouthY + y) + H * .03 + pk * H * .03 * (1 - Math.abs(x) / W);
    const ou = open * H * .03, od = open * H * .2;
    const up = [V(-W, cy, 0), V(-W * .55, upY + cy * .55 + ou, 0), V(-W * .12, upY * 1.25 + ou, 0), V(0, upY * .95 + ou, 0), V(W * .12, upY * 1.25 + ou, 0), V(W * .55, upY + cy * .55 + ou, 0), V(W, cy, 0)];
    const dn = [V(-W, cy - H * .004, 0), V(-W * .5, -H * .045 + cy * .35 - od * .85, 0), V(0, -H * .06 - od - Math.max(0, E.sm) * H * .02, 0), V(W * .5, -H * .045 + cy * .35 - od * .85, 0), V(W, cy - H * .004, 0)];
    // ajak-körvonalak (Cupido-ív felül, telt alsó ajak)
    const my = this.mouthY, Zm = (x, y) => this.Z(x, y);
    const seamU = up.map(p => ({ x: p.x, y: my + p.y - (Math.abs(p.x) < W * .9 ? ou * .0 : 0) }));
    const topU = [{ x: -W, y: my + cy }, { x: -W * .6, y: my + upY * 1.9 + cy * .55 + ou }, { x: -W * .2, y: my + upY * 2.6 + ou }, { x: 0, y: my + upY * 2.1 + ou }, { x: W * .2, y: my + upY * 2.6 + ou }, { x: W * .6, y: my + upY * 1.9 + cy * .55 + ou }, { x: W, y: my + cy }];
    const seamLine = [{ x: -W, y: my + cy }, { x: -W * .5, y: my + cy * .55 + ou * .5 }, { x: 0, y: my + ou * .6 }, { x: W * .5, y: my + cy * .55 + ou * .5 }, { x: W, y: my + cy }];
    const lowTop = [{ x: W, y: my + cy - H * .004 }, { x: W * .5, y: my + cy * .5 - od * .8 }, { x: 0, y: my - od }, { x: -W * .5, y: my + cy * .5 - od * .8 }, { x: -W, y: my + cy - H * .004 }];
    const lowBot = [{ x: -W * .92, y: my + cy - H * .01 }, { x: -W * .45, y: my - H * .07 + cy * .3 - od * .95 }, { x: 0, y: my - H * .085 - od - Math.max(0, E.sm) * H * .015 }, { x: W * .45, y: my - H * .07 + cy * .3 - od * .95 }, { x: W * .92, y: my + cy - H * .01 }];
    const smooth = (arr, n = 8) => { const c = new THREE.CatmullRomCurve3(arr.map(p => new THREE.Vector3(p.x, p.y, 0))); return c.getPoints(n * arr.length).map(v => ({ x: v.x, y: v.y })); };
    const upperOutline = smooth(topU).concat(smooth(seamLine).reverse());
    const lowerOutline = smooth(lowTop).concat(smooth(lowBot));
    const gU = surfaceShape(upperOutline.map(p => ({ x: p.x, y: p.y - my })), (x, y) => Zm(x, y + my), H * .004, H * .028);
    const gD = surfaceShape(lowerOutline.map(p => ({ x: p.x, y: p.y - my })), (x, y) => Zm(x, y + my), H * .004, H * .04);
    if (this.lipU) { this.lipU.geometry.dispose(); this.lipD.geometry.dispose(); this.lipU.geometry = gU; this.lipD.geometry = gD; }
    else { this.lipU = new THREE.Mesh(gU, this.M.lip); this.lipD = new THREE.Mesh(gD, this.M.lip); [this.lipU, this.lipD].forEach(m => { m.castShadow = false; m.userData.keep = 1; this.mouthG.add(m); }); }
    // szájrés (zárt szájnál vékony sötét vonal)
    const gapO = smooth(seamLine).concat(smooth(lowTop));
    const gG = surfaceShape(gapO.map(p => ({ x: p.x, y: p.y - my })), (x, y) => Zm(x, y + my), H * .002, H * .004);
    if (this.gap) { this.gap.geometry.dispose(); this.gap.geometry = gG; } else { this.gap = new THREE.Mesh(gG, this.M.mouth); this.gap.userData.keep = 1; this.mouthG.add(this.gap); }
    // üreg, fogak, nyelv
    const o2 = Math.max(open, 0);
    this.cavity.visible = false;
    const showT = E.tt * clamp(o2 * 4, 0, 1);
    this.teethU.visible = showT > .05; this.teethU.position.y = ou - H * .03 + cy * .3; this.teethU.position.z = this.mouthZ - H * .2 - H * .03 + H * .02; this.teethU.scale.set(E.wd * .9, 1, 1);
    this.teethD.visible = o2 > .35 && E.tt > .5; this.teethD.position.y = -od + H * .025; this.teethD.position.z = this.mouthZ - H * .19 - H * .03 + H * .02;
    this.tongue.visible = o2 > .3; this.tongue.position.y = -od * .75; this.tongue.position.z = this.mouthZ - H * .09;
  }

  update(dt, t, look) {
    const C = this.cur, T = this.tgt, H = this.H;
    for (const k in T) C[k] = damp(C[k] ?? 0, T[k], 6.5, dt);
    // pislogás + mikromozgások
    this.blinkT -= dt; if (this.blinkT < 0) { this.blink = 1; this.blinkT = 1.8 + Math.random() * 3.6; if (Math.random() < .18) this._dbl = .3; }
    if (this._dbl !== undefined) { this._dbl -= dt; if (this._dbl < 0) { this.blink = 1; delete this._dbl; } }
    this.blink = Math.max(0, this.blink - dt * 6.5);
    const bk = Math.sin(Math.min(1, this.blink) * Math.PI);
    this.saccT -= dt; if (this.saccT < 0) { this.sacc.set((Math.random() - .5) * .12, (Math.random() - .5) * .08); this.saccT = .4 + Math.random() * 1.8; }
    this.browIdle = Math.max(0, Math.sin(t * .23) * Math.sin(t * .71)) * .12;
    // beszéd: magánhangzó-szerű szájmozgás
    let talkO = 0; if (this.talkT > 0) { this.talkT -= dt; this.talkPh += dt * (9 + Math.sin(t * 3) * 3); talkO = (Math.abs(Math.sin(this.talkPh)) * .5 + Math.abs(Math.sin(this.talkPh * 1.7)) * .25) * clamp(this.talkT * 3, 0, 1); }
    const open = clamp(C.op + talkO, 0, 1);
    // szemek: tekintet + saccade
    const lx = (look?.x ?? 0) + this.sacc.x, ly = (look?.y ?? 0) + this.sacc.y;
    const lu = clamp(C.lu + bk * (1 - C.lu), -.25, 1), ld = clamp(C.ld, 0, 1);
    this.eyes.forEach(e => {
      e.ball.rotation.set(clamp(ly, -.4, .4), clamp(lx, -.5, .5), 0);
      const a = E => E;
      e.lidU.rotation.x = lerp(-.72, 1.45, Math.max(0, lu)) + Math.min(0, lu) * .9 + ly * .25 - (C.asym && e.s > 0 ? .18 : 0);
      e.lidD.rotation.x = lerp(1.0, .4, ld) + ly * .15;
      e.fold.material.opacity = .25 + C.ch * .2; e.fold.position.y = C.bi * this.er * .1;
      e.crow.forEach(c => c.material.opacity = Math.max(this.o.age ? .35 : 0, C.ch * .55));
    });
    this.brows.forEach(b => this._brow(b, C));
    this._mouth(C, open);
    // arcpofa emelés, pír, redők
    this.cheeks.forEach(c => { c.m.position.y = c.y0 + C.ch * H * .05; c.m.position.z = c.z0 + C.ch * H * .035; });
    this.blushes.forEach(b => b.material.opacity = .08 + C.blush * .38);
    this.naso.forEach(n => n.material.opacity = (this.o.age ? .35 : .08) + Math.max(0, C.sm) * .35 + C.bs * .1);
    this.chin.position.y = this.chinY0 - open * H * .12;
    // könnyek gördülése
    this.tears.forEach((tr, i) => {
      const on = C.tear > .5; tr.m.visible = on; if (!on) return;
      const ph = ((t * .45 + tr.ph) % 1);
      const x = tr.s * (this.ex + this.er * .2) * (1 - ph * .15), y = this.ey - this.er * 1.05 - ph * H * .55;
      tr.m.position.set(x, y, this.Z(x, y) + H * .02);
      const sz = this.er * (.18 + (ph < .1 ? ph * 2 : .2)) * (1 - ph * .3); tr.m.scale.set(sz, sz * 1.35, sz * .8);
    });
    return C;
  }
}
