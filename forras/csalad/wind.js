/* ==========================================================================
   wind.js – közös szél: haj és ruha mozgatása a vertex shaderben
   A szél világkoordinátában fúj; erősség, irány és széllökések állíthatók.
   ========================================================================== */
import * as THREE from './lib/three.module.js';

export const WIND = {
  uniforms: {
    uTime: { value: 0 },
    uWindDir: { value: new THREE.Vector3(1, 0, .35).normalize() },
    uWindStr: { value: .45 },   // 0 = szélcsend, 1 = erős szél
    uGust: { value: 0 }
  },
  strength: .45,
  update(dt, t) {
    const u = this.uniforms;
    u.uTime.value = t;
    // lassú, természetes széllökések
    const g = Math.max(0, Math.sin(t * .37) * .6 + Math.sin(t * .91 + 1.3) * .3 + Math.sin(t * 2.3) * .1);
    u.uGust.value = g;
    u.uWindStr.value = this.strength;
    // az irány is lassan vándorol
    const a = Math.sin(t * .11) * .35;
    u.uWindDir.value.set(Math.cos(a), 0, Math.sin(a) * .6 + .25).normalize();
  }
};

/* Közös GLSL zajfüggvény (olcsó, sima) */
const NOISE = /* glsl */`
  float hsh(float n){ return fract(sin(n)*43758.5453123); }
  float vnoise(vec3 x){
    vec3 p=floor(x); vec3 f=fract(x); f=f*f*(3.0-2.0*f);
    float n=p.x+p.y*57.0+113.0*p.z;
    return mix(mix(mix(hsh(n+0.0),hsh(n+1.0),f.x),mix(hsh(n+57.0),hsh(n+58.0),f.x),f.y),
               mix(mix(hsh(n+113.0),hsh(n+114.0),f.x),mix(hsh(n+170.0),hsh(n+171.0),f.x),f.y),f.z);
  }`;

/**
 * Szél hozzáadása egy anyaghoz.
 * kind: 'hair'  – aT attribútum (0 = gyökér, 1 = vég), aPhase (tincsenként), aLen (tincs hossza)
 *       'cloth' – aSway attribútum (0 = rögzített, 1 = szabad szél)
 * opts.amp: szorzó (pl. rövid haj kevesebbet mozog)
 */
export function windify(material, kind = 'hair', opts = {}) {
  const amp = opts.amp ?? 1;
  material.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, WIND.uniforms);
    sh.uniforms.uAmp = { value: amp };
    material.userData.shader = sh;
    const attrs = kind === 'hair' ? 'attribute float aT; attribute float aPhase; attribute float aLen;' : 'attribute float aSway;';
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
      uniform float uTime; uniform vec3 uWindDir; uniform float uWindStr; uniform float uGust; uniform float uAmp;
      ${attrs}
      ${NOISE}`);
    const disp = kind === 'hair' ? /* glsl */`
        float w = aT*aT*(0.6+0.4*aT);
        float spd = 1.6 + 2.2*uWindStr;
        vec3 wp0 = (modelMatrix*vec4(transformed,1.0)).xyz;
        float n1 = vnoise(vec3(wp0.x*3.0 - uTime*spd, wp0.y*2.0, aPhase*7.0 + uTime*0.7));
        float n2 = vnoise(vec3(aPhase*13.0, uTime*(2.4+uWindStr*3.0), aT*3.0));
        float flutter = (n2-0.5)*2.0;
        float gust = 0.55 + 0.9*uGust;
        vec3 side = normalize(cross(uWindDir, vec3(0.0,1.0,0.0)) + 1e-4);
        vec3 d = uWindDir * (uWindStr*gust*(0.55+0.6*n1)) + side*flutter*(0.18+0.5*uWindStr) + vec3(0.0, flutter*0.12*uWindStr + 0.08*uWindStr*gust, 0.0);
        d += vec3(sin(uTime*1.3+aPhase*6.28), 0.0, cos(uTime*1.1+aPhase*5.0))*0.05;
        vec3 worldDisp = d * w * min(aLen, 0.5) * 0.16 * uAmp;`
      : /* glsl */`
        float w = aSway*aSway;
        vec3 wp0 = (modelMatrix*vec4(transformed,1.0)).xyz;
        float n1 = vnoise(vec3(wp0.x*4.0 - uTime*(1.2+uWindStr*2.0), wp0.y*3.0, wp0.z*4.0 + uTime*0.6));
        float n2 = vnoise(vec3(wp0.x*9.0, wp0.y*7.0 - uTime*3.0, wp0.z*9.0));
        float gust = 0.5 + 0.9*uGust;
        vec3 worldDisp = (uWindDir*(uWindStr*gust*(0.35+0.65*n1)) + vec3(0.0,(n2-0.5)*0.25*uWindStr,0.0) + normalize(cross(uWindDir,vec3(0,1,0))+1e-4)*(n2-0.5)*0.35*uWindStr) * w * 0.09 * uAmp;`;
    sh.vertexShader = sh.vertexShader.replace('#include <project_vertex>', `
      ${disp}
      vec4 mvPosition = vec4( transformed, 1.0 );
      #ifdef USE_INSTANCING
        mvPosition = instanceMatrix * mvPosition;
      #endif
      vec4 wpos = modelMatrix * mvPosition;
      wpos.xyz += worldDisp;
      mvPosition = viewMatrix * wpos;
      gl_Position = projectionMatrix * mvPosition;`);
  };
  material.customProgramCacheKey = () => 'wind-' + kind + '-' + amp;
  return material;
}

/* Árnyékhoz ugyanaz az elmozdulás (különben az árnyék nem lobogna) */
export function windDepth(kind, amp = 1) {
  const m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  windify(m, kind, { amp });
  return m;
}
