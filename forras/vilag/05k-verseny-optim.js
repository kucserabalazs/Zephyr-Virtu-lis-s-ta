  /* =================================================================== 2/K. KISÜTÉS MODELLÉ, AKADÁS ELLEN (2026. nov. 14. 16:56, a tulajdonos: „nagyon akadozik … a környezetet, a zsűrihajót
     és minden dekorációs hajót süsd ki modellnek, de ne olyan megoldással, ami a látványban zavaró”)
     Mérés (2D, egy futam): ~1350 látható háló, ~490 rajzolási hívás képkockánként – VR-ben szemenként, tehát ~1000. Ez fojtja a Questet.
     MEGOLDÁS: ugyanannak a szülőnek a mozdulatlan gyerek-hálóit egyetlen hálóvá olvasztjuk (a színük csúcsszínné válik, az anyag típusa és árnyalása
     ugyanaz marad: alap / matcap / standard), így a kép pixelre ugyanaz, de a hívások száma töredékére esik.
     • Hogy mi mozdulatlan, azt NEM mi döntjük el kézzel: a futam elején 3 másodpercig figyeljük az összes hálót (helyzet, láthatóság, geometria, szín),
       és csak a meg nem mozdultakat olvasztjuk össze. A szülő mozoghat (pl. a dőlő hajótest) – az összeolvasztott háló vele mozog.
     • ŐRSZEM: félmásodpercenként ellenőrizzük az eredetieket – ha bármelyik később mégis megmozdul, eltűnik/megjelenik vagy színt vált
       (pl. a zsűrihajó zászlói, éjszakai színezés), az a csoport azonnal visszaáll eredeti formájára. Így a játék viselkedése nem változhat.
     • Az eredetiek a fáknál maradnak, csak egy nem rajzolt rétegre (31) kerülnek – a játék kódja továbbra is hozzájuk nyúlhat. */
  const MS = { list: [], snap: null, t: 0, wd: 0, root: null, stat: {} }; W._ms = MS;
  function msSig(o) { const m = o.material, c = m && m.color ? m.color.getHex() : 0; return [o.position.x, o.position.y, o.position.z, o.quaternion.x, o.quaternion.y, o.quaternion.z, o.quaternion.w, o.scale.x, o.scale.y, o.scale.z, o.visible ? 1 : 0, o.geometry && o.geometry.attributes.position ? o.geometry.attributes.position.version : 0, c, m ? m.opacity : 1, m ? m.uuid : ""].join("|"); }
  function msNSig(o) { return [o.position.x, o.position.y, o.position.z, o.quaternion.x, o.quaternion.y, o.quaternion.z, o.quaternion.w, o.scale.x, o.scale.y, o.scale.z, o.visible ? 1 : 0].join("|"); }
  function msOk(o) {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || !o.visible || !o.parent) return false; const m = o.material; if (!m || Array.isArray(m)) return false;
    /* 2026-11-15 (szakértői jelentés B.2 – kikötő 560 hívás): a TEXTÚRÁS, átlátszatlan anyagú hálók is összeolvadhatnak, de csak az UGYANAZT az anyagot használók
       egymással (az eredeti anyag marad, a textúra-koordinátákkal együtt) – a kép pixelre ugyanaz */
    if (m.alphaMap || m.envMap || m.transparent || m.opacity < 1 || m.wireframe || (m.emissive && m.emissive.getHex() && !m.map) || m.isShaderMaterial || m.onBeforeCompile && m.onBeforeCompile.toString().length > 40) return false;
    if (m.map && (!o.geometry.attributes.uv || m.isMeshMatcapMaterial)) return false;
    if (!(m.isMeshBasicMaterial || m.isMeshMatcapMaterial || m.isMeshStandardMaterial)) return false; if (m.isMeshMatcapMaterial && !m.matcap) return false;
    if (o.renderOrder || o.userData.xr || o.userData.night || o.userData.noMerge || o.geometry.morphAttributes && Object.keys(o.geometry.morphAttributes).length) return false;
    if (T.xr && T.xr.extra && T.xr.extra.has && T.xr.extra.has(o)) return false; if (W.objs && W.objs.indexOf(o) >= 0) return false;
    for (let p = o.parent; p; p = p.parent) if ((!p.visible && !(p.userData && p.userData.msHidable)) || (p.userData && (p.userData.noMerge || p.userData.night))) return false;   /* 2026-11-15: a házak belseje (msHidable) rejtve is összeolvad – a saját csoportjában marad */   /* rejtett ős alatt nem olvasztunk */
    return o.layers.mask === 1;
  }
  /* indítás: minden korábbi összeolvasztás visszaáll, és kezdődik a 3 mp-es figyelés */
  function msStart(root, delay) { msReset(); if (W.noMerge) return; MS.re = 0; MS.pend = { root, delay: delay || 3 }; }
  function msSnap() { const P = MS.pend; MS.pend = null; MS.root = P.root; MS.t = P.delay; MS.snap = new Map(); MS.nsnap = new Map(); P.root.traverse((o) => { if (msOk(o)) MS.snap.set(o, msSig(o)); else if (!o.isMesh && o !== P.root) MS.nsnap.set(o, msNSig(o)); }); MS.stat.snap = MS.snap.size; W._ms = MS; }
  function msReset() { MS.list.forEach(msDissolve); MS.list = []; MS.snap = null; }
  function msDissolve(G) { if (G.gone) return; MS.stat.diss = (MS.stat.diss || 0) + 1; G.gone = true; if (G.mesh.parent) G.mesh.parent.remove(G.mesh); G.mesh.geometry.dispose(); G.src.forEach((s) => { s.o.layers.set(0); }); }
  function msTick(dt) {
    if (MS.pend) { msSnap(); return; }
    if (MS.snap) { MS.t -= dt; if (MS.t <= 0) { const keep = []; MS.snap.forEach((sig, o) => { if (o.parent && msOk(o) && msSig(o) === sig) keep.push(o); }); MS.stat.keep = keep.length; const stat = new Set(); MS.nsnap.forEach((sig, o) => { if (msNSig(o) === sig && !(o.userData && (o.userData.noMerge || o.userData.night || o.userData.xr))) stat.add(o); }); MS.snap = null; MS.nsnap = null; msMerge(keep, stat); } return; }
    MS.re = (MS.re || 0) + dt; if (MS.re > 24 && MS.root && MS.root.parent) { MS.re = 0; MS.pend = { root: MS.root, delay: 3 }; return; }   /* időnként újra: ami közben megállt (pl. a távoli nézők), azt is kisütjük */
    MS.wd += dt; if (MS.wd < 1.5 || !MS.list.length) return; MS.wd = 0;   /* 2026-11-15 (akadás a szemüvegben): ritkábban ellenőrzünk */
    MS.list.forEach((G) => { if (G.gone) return; for (let i = 0; i < G.src.length; i++) { const s = G.src[i]; if (!s.o.parent || msSig(s.o) !== s.sig) { msDissolve(G); return; } } for (let i = 0; i < G.chain.length; i++) if (msNSig(G.chain[i][0]) !== G.chain[i][1]) { msDissolve(G); return; } });
    MS.list = MS.list.filter((G) => !G.gone);
  }
  function msKey(o) { const m = o.material, side = m.side, nk = m.userData && m.userData.nightK ? m.userData.nightK.join(",") : "";
    if (m.map) return `X|${m.uuid}`;
    if (m.isMeshBasicMaterial) return `B|${side}|${m.fog}|${m.depthTest}|${m.depthWrite}|${m.toneMapped}|${nk}`;
    if (m.isMeshMatcapMaterial) return `M|${side}|${m.matcap.uuid}|${m.flatShading}|${nk}`;
    return `S|${side}|${Math.round(m.roughness * 4)}|${Math.round(m.metalness * 2)}|${m.flatShading}|${nk}`; }
  function msMerge(list, stat) {
    /* horgony: a legközelebbi MOZGÓ ős (vagy a gyökér) – a köztes, mozdulatlan csoportokon át az egész mozdulatlan részt egybeolvasztjuk */
    const root = MS.root, anc = new Map(); list.forEach((o) => { let A = o.parent; while (A && A !== root && stat.has(A) && A.parent && !(A.userData && A.userData.msAnchor)) A = A.parent; anc.set(o, A); });   /* msAnchor: itt megáll (pl. a ház belseje külön olvad össze, így elrejthető) */
    const groups = new Map(); list.forEach((o) => { const k = anc.get(o).uuid + "#" + msKey(o); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(o); });
    const rel = new THREE.Matrix4(), inv = new THREE.Matrix4(); root.updateMatrixWorld(true);
    let saved = 0;
    groups.forEach((arr) => { if (arr.length < 2) return; const P = anc.get(arr[0]), m0 = arr[0].material; let n = 0; inv.copy(P.matrixWorld).invert(); const chain = new Map();
      arr.forEach((o) => { for (let q = o.parent; q && q !== P; q = q.parent) if (!chain.has(q)) chain.set(q, msNSig(q)); });
      const parts = arr.map((o) => { let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry; n += g.attributes.position.count; return [o, g]; });
      if (n > 200000) return;
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3); let k = 0; const v = new THREE.Vector3(), nm = new THREE.Matrix3(), c = new THREE.Color();
      parts.forEach(([o, g]) => { rel.multiplyMatrices(inv, o.matrixWorld); nm.getNormalMatrix(rel); const flip = rel.determinant() < 0, k0 = k; const pa = g.attributes.position, na = g.attributes.normal, ca = o.material.vertexColors && g.attributes.color ? g.attributes.color : null; c.copy(o.material.color || c.setRGB(1, 1, 1));
        for (let i = 0; i < pa.count; i++, k++) { v.fromBufferAttribute(pa, i).applyMatrix4(rel); pos[k * 3] = v.x; pos[k * 3 + 1] = v.y; pos[k * 3 + 2] = v.z;
          if (na) { v.fromBufferAttribute(na, i).applyMatrix3(nm).normalize(); nor[k * 3] = v.x; nor[k * 3 + 1] = v.y; nor[k * 3 + 2] = v.z; } else nor[k * 3 + 1] = 1;
          col[k * 3] = c.r * (ca ? ca.getX(i) : 1); col[k * 3 + 1] = c.g * (ca ? ca.getY(i) : 1); col[k * 3 + 2] = c.b * (ca ? ca.getZ(i) : 1); }
        if (flip) for (let t = k0; t < k; t += 3) for (const A of [pos, nor, col]) for (let q = 0; q < 3; q++) { const x = A[(t + 1) * 3 + q]; A[(t + 1) * 3 + q] = A[(t + 2) * 3 + q]; A[(t + 2) * 3 + q] = x; }   /* tükrözött elem: a háromszögek körüljárása megfordul */
        if (g !== o.geometry) g.dispose(); });
      const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("normal", new THREE.BufferAttribute(nor, 3)); if (!m0.map) geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
      if (m0.map) { const uv = new Float32Array(n * 2); let q = 0; parts.forEach(([o, g0]) => { const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry, ua = g.attributes.uv; for (let i = 0; i < ua.count; i++, q++) { uv[q * 2] = ua.getX(i); uv[q * 2 + 1] = ua.getY(i); } if (g !== o.geometry) g.dispose(); void g0; });
        geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
        /* tükrözött elemnél a háromszögek körüljárása megfordult – az uv-t is ugyanígy cseréljük */
        { let k2 = 0; parts.forEach(([o]) => { const c2 = (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count); rel.multiplyMatrices(inv, o.matrixWorld); if (rel.determinant() < 0) for (let t = k2; t < k2 + c2; t += 3) for (let q2 = 0; q2 < 2; q2++) { const x = uv[(t + 1) * 2 + q2]; uv[(t + 1) * 2 + q2] = uv[(t + 2) * 2 + q2]; uv[(t + 2) * 2 + q2] = x; } k2 += c2; }); } }
      geo.computeBoundingSphere();
      let mat; if (m0.map) mat = m0; else if (m0.isMeshBasicMaterial) mat = new THREE.MeshBasicMaterial({ vertexColors: true, side: m0.side, fog: m0.fog, depthTest: m0.depthTest, depthWrite: m0.depthWrite, toneMapped: m0.toneMapped });
      else if (m0.isMeshMatcapMaterial) mat = new THREE.MeshMatcapMaterial({ vertexColors: true, matcap: m0.matcap, side: m0.side, flatShading: m0.flatShading });
      else mat = new THREE.MeshStandardMaterial({ vertexColors: true, side: m0.side, roughness: m0.roughness, metalness: m0.metalness, flatShading: m0.flatShading });
      if (mat !== m0) { if (m0.userData && m0.userData.nightK) mat.userData.nightK = m0.userData.nightK; mat.userData.msMerged = 1; }
      W.disposables.push(geo); if (mat !== m0) W.disposables.push(mat); const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = arr.some((o) => o.castShadow); mesh.receiveShadow = arr.some((o) => o.receiveShadow); mesh.userData.msMerged = 1; P.add(mesh);
      arr.forEach((o) => o.layers.set(31)); MS.list.push({ mesh, src: arr.map((o) => ({ o, sig: msSig(o) })), chain: Array.from(chain.entries()) }); saved += arr.length - 1; });
    MS.stat.saved = saved; MS.stat.groups = MS.list.length;
  }
