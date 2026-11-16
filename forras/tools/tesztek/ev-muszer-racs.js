const THREE = AFRAME.THREE;
const btns = (W.objs||[]).filter(o => o.userData && o.userData.xr && o.geometry && o.geometry.type==="BoxGeometry" && o.material && o.material.length===6);
const bt = btns[0], pod = bt.parent; let wheel = null;
W.root.traverse(o => { if (!wheel && o.geometry && o.geometry.type==="TorusGeometry" && Math.abs(o.geometry.parameters.radius-.46)<.002) wheel = o.parent.parent; });
const rc = new THREE.Raycaster(); rc.camera = AFRAME.scenes[0].camera; const solid = [];
wheel.traverse(o => { if (o.isMesh && o.visible && o.material && (o.material.opacity === undefined || o.material.opacity > .1) && o.material.visible !== false && o.material.colorWrite !== false) solid.push(o); });
const P = bt.geometry.parameters, eyes = []; for (const dx of [-.12,0,.12]) for (const dy of [-.15,-.1,0,.05]) for (const dz of [-.05,0,.1,.2]) eyes.push(new THREE.Vector3(dx,dy,dz));
const el = (p, e) => Math.atan2(p.y - e.y, -(p.z - e.z)) * 180 / Math.PI;
const rows = [], y0 = pod.position.y, r0 = pod.rotation.x;
for (const ry of [1.40, 1.44, 1.47, 1.50, 1.53]) for (const rx of [.3, .5, .7]) { pod.position.y = ry; pod.rotation.x = rx; pod.updateMatrixWorld(true);
  const pts = []; for (const x of [-.45,-.22,0,.22,.45]) for (const y of [-.45,0,.45]) pts.push(bt.localToWorld(new THREE.Vector3(P.width*x, P.height*y, P.depth/2)));
  const vis = (eye) => { let ok = 0; pts.forEach(p => { const dir = p.clone().sub(eye), dist = dir.length(); dir.normalize(); rc.set(eye, dir); rc.far = dist - .004; if (!rc.intersectObjects(solid, false).length) ok++; }); return ok / pts.length; };
  const f = eyes.map(vis); const e0 = new THREE.Vector3();
  let top = -99; for (const lx of [-.28, 0, .28]) for (const lz of [-.092, .0]) { const q = pod.localToWorld(new THREE.Vector3(lx, .235 + (lz === 0 ? 0 : 0.0), lz)); top = Math.max(top, el(q, e0)); }
  const scr = pod.localToWorld(new THREE.Vector3(0, .23, .004));
  rows.push(`y=${ry} rx=${rx} látszik min=${Math.min(...f).toFixed(2)} átl=${(f.reduce((a,b)=>a+b,0)/f.length).toFixed(2)} ház-teteje=${top.toFixed(1)}° kép-teteje=${el(scr,e0).toFixed(1)}°`); }
pod.position.y = y0; pod.rotation.x = r0; return rows.join("\n");
