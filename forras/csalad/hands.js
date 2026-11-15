/* ==========================================================================
   hands.js – ötujjú kéz ízületekkel (ujjanként 3 perc, hüvelykujj 3),
   körmökkel, tenyér-párnával és lágyan átúszó kéztartásokkal.
   ========================================================================== */
import * as THREE from './lib/three.module.js';

/* Kéztartások: ujjanként [tő, közép, vég] hajlítás (radián), szétterpesztés,
   hüvelykujj: [tő, közép, vég] + szembefordítás (opp) + távolítás (abd) */
export const POSES = {
  laza:    { f: [[.22, .3, .2], [.28, .36, .24], [.34, .42, .28], [.42, .5, .32]], spread: .05, t: [.15, .2, .15], opp: .35, abd: .25 },
  nyitott: { f: [[.02, .04, .02], [.0, .03, .02], [.03, .05, .03], [.06, .08, .05]], spread: .2, t: [0, .02, .05], opp: .05, abd: .7 },
  mutat:   { f: [[0, .02, 0], [1.35, 1.55, 1.1], [1.4, 1.55, 1.1], [1.45, 1.5, 1.1]], spread: 0, t: [.5, .7, .5], opp: .8, abd: .2 },
  okol:    { f: [[1.45, 1.6, 1.15], [1.5, 1.6, 1.15], [1.5, 1.6, 1.15], [1.5, 1.55, 1.1]], spread: 0, t: [.6, .7, .6], opp: 1, abd: .1 },
  fog:     { f: [[1.05, 1.05, .7], [1.1, 1.05, .7], [1.15, 1.05, .7], [1.2, 1.0, .7]], spread: 0, t: [.35, .45, .35], opp: .9, abd: .35 },
  csippent:{ f: [[.65, .6, .35], [.8, .7, .4], [1.25, 1.3, .9], [1.35, 1.35, .95]], spread: 0, t: [.45, .4, .3], opp: 1.1, abd: .3 },
  lapos:   { f: [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]], spread: 0, t: [0, .05, .05], opp: .15, abd: .15 },
  tal:     { f: [[.15, .1, .05], [.12, .1, .05], [.15, .12, .06], [.2, .14, .08]], spread: .1, t: [.1, .1, .1], opp: .3, abd: .45 }
};

let NAIL_MAT = null;
export class Hand {
  /**
   * s: -1 = a szereplő jobb keze (−x oldalon), +1 = bal keze (+x)
   * size: tenyérhossz (m), skin: anyag
   */
  constructor(s, size, skin, opts = {}) {
    this.s = s; this.group = new THREE.Group();
    this.cur = JSON.parse(JSON.stringify(POSES.laza)); this.tgt = POSES.laza;
    const L = size, W = size * .92, T = size * .36;
    const skinM = skin;
    NAIL_MAT = NAIL_MAT || new THREE.MeshPhysicalMaterial({ color: '#f6d6cc', roughness: .2, clearcoat: 1, clearcoatRoughness: .2 });
    const nailM = opts.nail ?? NAIL_MAT;
    const mk = (geo, mat, parent, p, sc) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; if (p) m.position.copy(p); if (sc) m.scale.set(...sc); parent.add(m); return m; };
    const SPH = new THREE.SphereGeometry(1, 24, 16);
    // csukló és tenyér
    mk(new THREE.CapsuleGeometry(T * .62, size * .16, 6, 14), skinM, this.group, new THREE.Vector3(0, -size * .05, 0), [1, 1, W / T * .5]);
    const palm = mk(SPH, skinM, this.group, new THREE.Vector3(0, -L * .46, 0), [T * .5, L * .52, W * .5]);
    // tenyér-párna és kézhát íve
    mk(SPH, skinM, this.group, new THREE.Vector3(-s * T * .12, -L * .62, -W * .12), [T * .34, L * .3, W * .32]);
    mk(SPH, skinM, this.group, new THREE.Vector3(-s * T * .1, -L * .45, W * .27), [T * .36, L * .28, W * .2]); // hüvelykpárna
    // ujjak: mutató, középső, gyűrűs, kis
    const lens = [.98, 1.08, 1.0, .8].map(k => k * L * .78);
    const rad = [.098, .104, .097, .085].map(k => k * L);
    const zs = [.33, .11, -.11, -.32].map(k => k * W);
    this.fingers = [];
    for (let i = 0; i < 4; i++) {
      const base = new THREE.Group(); base.position.set(0, -L * .9 + Math.abs(zs[i]) * .25, zs[i]); this.group.add(base);
      const segL = [.44, .31, .25].map(k => k * lens[i]);
      let parent = base; const joints = [];
      for (let k = 0; k < 3; k++) {
        const j = new THREE.Group(); if (k > 0) j.position.y = -segL[k - 1]; parent.add(j); joints.push(j);
        const r = rad[i] * (1 - k * .12);
        mk(new THREE.CapsuleGeometry(r, Math.max(.001, segL[k] - r * .6), 6, 12), skinM, j, new THREE.Vector3(0, -segL[k] / 2, 0), [k === 0 ? 1.05 : 1, 1, 1]);
        if (k === 2) mk(SPH, nailM, j, new THREE.Vector3(s * r * .78, -segL[k] * .62, 0), [r * .32, r * .75, r * .72]); // köröm (kézhát felől)
        parent = j;
      }
      this.fingers.push({ base, joints });
    }
    // hüvelykujj
    const tb = new THREE.Group(); tb.position.set(-s * T * .05, -L * .3, W * .44); this.group.add(tb);
    this.thumbBase = tb;
    const tl = [.42, .34, .28].map(k => k * L * .78), tr = L * .135;
    let parent = tb; const tj = [];
    for (let k = 0; k < 3; k++) {
      const j = new THREE.Group(); if (k > 0) j.position.y = -tl[k - 1]; parent.add(j); tj.push(j);
      const r = tr * (1 - k * .1);
      mk(new THREE.CapsuleGeometry(r, Math.max(.001, tl[k] - r * .6), 6, 12), skinM, j, new THREE.Vector3(0, -tl[k] / 2, 0), [k === 0 ? 1.25 : 1, 1, 1]);
      if (k === 2) mk(SPH, nailM, j, new THREE.Vector3(s * r * .75, -tl[k] * .6, r * .1), [r * .33, r * .75, r * .75]);
      parent = j;
    }
    this.thumb = tj;
    this.apply(1);
  }
  set(name) { this.tgt = POSES[name] || POSES.laza; this.poseName = name; return this; }
  apply(k) {
    const c = this.cur, t = this.tgt, s = this.s;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) c.f[i][j] += (t.f[i][j] - c.f[i][j]) * k;
    for (let j = 0; j < 3; j++) c.t[j] += (t.t[j] - c.t[j]) * k;
    c.spread += (t.spread - c.spread) * k; c.opp += (t.opp - c.opp) * k; c.abd += (t.abd - c.abd) * k;
    // ujjak: hajlítás a tenyér felé (−s·x), szétterpesztés z irányban
    this.fingers.forEach((F, i) => {
      F.base.rotation.x = (1.5 - i) * c.spread * .55;
      F.joints.forEach((j, k) => { j.rotation.z = -s * c.f[i][k]; });
    });
    // hüvelykujj: előre-lefelé áll, szembefordítás a tenyér elé
    const tb = this.thumbBase;
    tb.rotation.set(-.55 - c.abd * .65, -s * c.opp * .9, -s * (.25 + c.opp * .55));
    this.thumb.forEach((j, k) => { j.rotation.z = -s * c.t[k] * (k === 0 ? .6 : 1); });
  }
  update(dt, idleT = 0) {
    const k = 1 - Math.exp(-dt * 10);
    this.apply(k);
    // apró élő ujjmozgás
    if (this.poseName === 'laza' || !this.poseName) this.fingers.forEach((F, i) => { F.joints[0].rotation.z += -this.s * Math.sin(idleT * 1.3 + i * .8) * .025; });
  }
}
