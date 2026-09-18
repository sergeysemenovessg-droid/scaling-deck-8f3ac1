/* ============================================================
   ОСЬ Z: здание компании и спираль вокруг него.

   Здание — одна стеклянная призма, которая растёт вверх. Пять
   этажей читаются поясами перекрытий, а не пятью отдельными
   коробками: стопка коробок показывает щели и верхние грани и
   разваливается на облётах, а сплошной объём держит силуэт.

   Активный этаж горит ярче остальных — камера смотрит именно
   на него. Спираль спиральной динамики обвивает готовое здание.
   ============================================================ */
import * as THREE from 'three';
import { PAL } from './world.js';

export const FLOORS = [
  { key: 'sales', label: 'Продажи' },
  { key: 'hr', label: 'HR' },
  { key: 'marketing', label: 'Маркетинг' },
  { key: 'management', label: 'Менеджмент' },
  { key: 'it', label: 'IT' },
];

const towerVert = /* glsl */`
  varying vec2 vUv; varying vec3 vNormal; varying vec3 vPos;
  void main(){
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vPos = mv.xyz;
    gl_Position = projectionMatrix * mv;
  }`;

const towerFrag = /* glsl */`
  precision highp float;
  uniform vec3  uMint, uBlue;
  uniform float uBuilt;      // 0..1 — насколько здание построено
  uniform float uActive;     // номер подсвеченного этажа, дробный
  uniform float uFloors;     // сколько этажей всего
  uniform float uTime;
  uniform float uGhost;     // 1 — призрак будущего объёма
  varying vec2 vUv; varying vec3 vNormal; varying vec3 vPos;

  float line(float x, float w){ return 1.0 - smoothstep(0.0, w, abs(x)); }

  void main(){
    float y = vUv.y;                         // 0 низ, 1 верх призмы
    float fl = y * uFloors;
    float idx = floor(fl);

    // фронт стройки: выше него здания ещё нет
    float built = clamp((uBuilt - y) * 26.0 + 1.0, 0.0, 1.0);
    if (built < 0.004) discard;
    /* Светящаяся кромка ровно на срезе. Без неё недостроенный дом
       читался открытым аквариумом: верх просто обрывался в пустоту. */
    float front = line(y - uBuilt, 0.018) * 2.6 * step(uBuilt, 0.995);

    float f = fract(fl);
    /* Пояс перекрытия — главный элемент фасада: именно по нему
       считываются этажи. Раньше он был вровень со стойками, и здание
       читалось вертикальной шторой, а не пятиэтажным объёмом. */
    float slab = (line(f, 0.10) + line(f - 1.0, 0.10)) * 1.9;
    float mull = line(fract(vUv.x * 9.0) - 0.5, 0.045) * 0.13;   // стойки — фон
    float ex = min(vUv.x, 1.0 - vUv.x);
    float rim = (1.0 - smoothstep(0.0, 0.014, ex)) * 1.25;       // силуэтное ребро
    float roof = line(y - 1.0, 0.016) * 2.4;                     // венчающий карниз
    float base = line(y, 0.022) * 2.2;                           // цоколь
    roof += base;

    // активный этаж горит ярче: камера смотрит именно на него
    float near = 1.0 - smoothstep(0.0, 1.25, abs(idx + 0.5 - uActive));
    float lit = 0.34 + 0.66 * near;

    // фасадное стекло: френель по касательной, к низу плотнее
    float facing = clamp(dot(normalize(vNormal), normalize(-vPos)), 0.0, 1.0);
    float fres = pow(1.0 - facing, 2.1);
    float glass = 0.60 + 0.22 * (1.0 - y) + fres * 0.36;

    // редкие светящиеся окна — внутри здания есть жизнь
    float win = step(0.86, fract(sin(floor(vUv.x * 9.0) * 12.9898
              + floor(fl * 3.0) * 78.233) * 43758.5453));
    float rooms = win * 0.085 * near;

    vec3 tint = mix(uBlue, uMint, near);
    float neon = (slab * 0.9 + mull + rim + roof) * lit + front;
    float a = clamp(glass * 0.82 + neon * 0.8 + rooms, 0.0, 1.0) * built;

    vec3 body = mix(vec3(0.040, 0.060, 0.102), vec3(0.085, 0.135, 0.205), fres);
    vec3 col = body + tint * neon * 0.95 + uMint * rooms * 2.2;

    // призрак: только контур будущего объёма, без стекла и окон
    if (uGhost > 0.5) {
      float g = (slab * 0.5 + rim * 0.8 + roof) * 0.5;
      if (g < 0.02) discard;
      gl_FragColor = vec4(uMint * g, g * 0.22);
      return;
    }
    gl_FragColor = vec4(col, a);
  }`;

/* ------------------------------------------------------------
   Спираль: геликоид вокруг здания, чертится снизу вверх.
   Внизу кэш, в середине ценности, наверху созидание.
   ------------------------------------------------------------ */
const spiralFrag = /* glsl */`
  precision highp float;
  uniform vec3  uLow, uMid, uHigh;
  uniform float uDraw, uTime, uGlow;
  varying vec2 vUv;
  void main(){
    float t = vUv.x;
    float v = abs(vUv.y - 0.5) * 2.0;
    float drawn = 1.0 - smoothstep(uDraw - 0.035, uDraw, t);
    float core = exp(-pow(v, 1.3) * 9.0);
    float halo = exp(-pow(v, 1.0) * 2.4) * 0.5;
    float head = exp(-pow((t - uDraw) / 0.018, 2.0) * 3.0) * exp(-pow(v, 1.2) * 8.0);
    head *= step(0.004, uDraw) * (1.0 - step(0.996, uDraw));
    float ph = fract(t * 2.0 - uTime * 0.18);
    float pulse = exp(-pow(ph, 2.0) * 30.0) * 0.5;
    vec3 col = t < 0.5 ? mix(uLow, uMid, t / 0.5) : mix(uMid, uHigh, (t - 0.5) / 0.5);
    float a = ((core + halo) * drawn + head * 1.1 + pulse * core * drawn) * uGlow;
    if (a < 0.004) discard;
    gl_FragColor = vec4(col * (0.62 + 0.38 * core) + vec3(head * 0.5), clamp(a, 0.0, 1.0));
  }`;

export class Spiral extends THREE.Mesh {
  constructor({ radius = 640, height = 2500, turns = 3, tube = 26, segments = 420 } = {}) {
    const pts = [];
    for (let i = 0; i <= segments; i++) {
      const u = i / segments;
      const a = u * turns * Math.PI * 2;
      const r = radius * (0.90 + 0.22 * u);   // кверху раскрывается
      pts.push(new THREE.Vector3(Math.cos(a) * r, u * height, Math.sin(a) * r));
    }
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), segments, tube, 10, false);
    super(geo, new THREE.ShaderMaterial({
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: spiralFrag,
      uniforms: {
        uLow: { value: new THREE.Color(PAL.blue) },
        uMid: { value: new THREE.Color(PAL.mint) },
        uHigh: { value: new THREE.Color(0xffffff) },
        uDraw: { value: 0 }, uTime: { value: 0 }, uGlow: { value: 1 },
      },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    }));
    this.frustumCulled = false;
  }
  set draw(v) { this.material.uniforms.uDraw.value = v; }
  set glow(v) { this.material.uniforms.uGlow.value = v; }
  tick(t) { this.material.uniforms.uTime.value = t; }
}

/* ------------------------------------------------------------
   Световая лужа под зданием: без неё оно висит в пустоте
   ------------------------------------------------------------ */
function makePool(r) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(r * 7, r * 7),
    new THREE.ShaderMaterial({
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */`
        precision highp float; uniform vec3 uColor; uniform float uOn;
        varying vec2 vUv;
        void main(){
          float d = length(vUv - 0.5) * 2.0;
          float a = exp(-pow(d, 1.6) * 6.0) * 0.30 * uOn;
          if (a < 0.003) discard;
          gl_FragColor = vec4(uColor, a);
        }`,
      uniforms: { uColor: { value: new THREE.Color(PAL.mint) }, uOn: { value: 0 } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = 2;
  m.frustumCulled = false;
  return m;
}

export class Tower extends THREE.Group {
  constructor({ at = [0, 0, 0], floorH = 470, w = 660, d = 660 } = {}) {
    super();
    this.position.set(...at);
    this.floorH = floorH;
    this.topY = floorH * FLOORS.length;

    const geo = new THREE.BoxGeometry(w, this.topY, d);
    geo.translate(0, this.topY / 2, 0);        // низ призмы в нуле
    this.prism = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      vertexShader: towerVert, fragmentShader: towerFrag,
      uniforms: {
        uMint: { value: new THREE.Color(PAL.mint) },
        uBlue: { value: new THREE.Color(PAL.blue) },
        uBuilt: { value: 0 }, uActive: { value: 0 },
        uFloors: { value: FLOORS.length }, uTime: { value: 0 }, uGhost: { value: 0 },
      },
      transparent: true, depthWrite: true, side: THREE.FrontSide,
      blending: THREE.NormalBlending,
    }));
    this.prism.frustumCulled = false;
    this.add(this.prism);

    this.pool = makePool(w);
    this.add(this.pool);

    /* Призрак полного объёма: на повороте к оси Z видно, что вырастет.
       Без него сцена поворота была пустой, а низ призмы читался
       случайной галочкой у самого пола. */
    this.ghost = new THREE.Mesh(geo, this.prism.material.clone());
    this.ghost.material.uniforms.uBuilt.value = 1;
    this.ghost.material.uniforms.uGhost.value = 1;
    this.ghost.material.depthWrite = false;
    this.ghost.material.blending = THREE.AdditiveBlending;
    this.ghost.frustumCulled = false;
    this.ghost.visible = false;
    this.add(this.ghost);

    this.spiral = new Spiral({ radius: w * 0.95, height: this.topY * 1.02, turns: 3 });
    this.spiral.draw = 0;
    this.add(this.spiral);
  }

  /** built: доля построенного (0…1). active: номер этажа под камерой */
  set built(v) {
    this.prism.material.uniforms.uBuilt.value = v;
    this.pool.material.uniforms.uOn.value = Math.min(1, v * 2.2);
  }
  set active(v) { this.prism.material.uniforms.uActive.value = v; }
  set ghostOn(v) { this.ghost.visible = v > 0.01; }

  tick(t) {
    this.prism.material.uniforms.uTime.value = t;
    this.spiral.tick(t);
  }
}
