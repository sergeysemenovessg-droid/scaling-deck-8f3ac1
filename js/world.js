/* ============================================================
   Объёмный мир: камера, сетка, пыль, неоновые оси.
   Оси — настоящая геометрия с шейдерным свечением и черчением
   по прогрессу, а не картинка и не CSS-линия.
   ============================================================ */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

export const PAL = {
  void: 0x04070e,
  mint: 0x22f5d6,
  blue: 0x3d7dff,
  magenta: 0xff2e88,
  teal: 0x0c3336,
};

/* ------------------------------------------------------------
   Луч оси: полоса, развёрнутая к камере, со свечением в шейдере.
   uDraw — доля прочерченного; uHead — яркость бегущего острия.
   ------------------------------------------------------------ */
const beamVert = /* glsl */`
  uniform float uLen, uWidth, uTaper;
  varying vec2 vUv;
  void main(){
    vUv = uv;
    vec3 p = position;
    p.x *= uLen;
    // к дальнему концу полоса сужается — перспектива, а не наклейка
    p.y *= uWidth * mix(1.0, uTaper, uv.x);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
  }`;

const beamFrag = /* glsl */`
  precision highp float;
  uniform vec3  uColor;
  uniform float uDraw;      // 0..1 сколько прочерчено
  uniform float uFeather;   // мягкость острия
  uniform float uGlow;      // общая яркость
  uniform float uTime;
  uniform float uPulse;     // сила бегущих импульсов
  uniform float uSoft;      // 0 — собранный неон, 1 — широкий ореол
  varying vec2 vUv;

  void main(){
    float t = vUv.x;                 // вдоль оси
    float v = abs(vUv.y - 0.5) * 2.0; // поперёк, 0 в центре

    // мягкое неоновое ядро: узкая сердцевина + широкий ореол
    float core = exp(-pow(v, 1.35) * mix(16.0, 7.0, uSoft));
    float halo = exp(-pow(v, 1.05) * mix(3.1, 1.5, uSoft)) * mix(0.42, 0.72, uSoft);
    float body = core + halo;

    // маска черчения с растушёванным острием
    float drawn = 1.0 - smoothstep(uDraw - uFeather, uDraw, t);

    // острие: короткая комета строго по сердцевине, без круглого ореола
    float head = exp(-pow((t - uDraw) / max(uFeather * 0.42, 1e-4), 2.0) * 3.4);
    head *= exp(-pow(v, 1.15) * 11.0);                       // узкий профиль поперёк
    head *= step(0.004, uDraw) * (1.0 - step(0.996, uDraw));

    // бегущие импульсы по прочерченной части — «линия под напряжением»
    float pulse = 0.0;
    if (uPulse > 0.001) {
      float ph = fract(t * 1.6 - uTime * 0.26);
      pulse = exp(-pow(ph, 2.0) * 42.0) * uPulse;
      ph = fract(t * 1.6 - uTime * 0.26 + 0.5);
      pulse += exp(-pow(ph, 2.0) * 42.0) * uPulse * 0.6;
    }

    // затухание к дальнему концу, чтобы ось «уходила в воздух»
    float fade = mix(1.0, 0.62, smoothstep(0.55, 1.0, t));

    float a = (body * drawn * fade + head * 0.95 + pulse * core * drawn) * uGlow;
    if (a < 0.002) discard;
    vec3 col = uColor * (0.70 + 0.30 * core) + vec3(head * 0.40);
    gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
  }`;

export class AxisBeam extends THREE.Mesh {
  constructor({ length = 1000, width = 26, color = PAL.mint, glow = 1.0 } = {}) {
    const geo = new THREE.PlaneGeometry(1, 1, 128, 1);
    geo.translate(0.5, 0, 0);                 // начало полосы в нуле
    const mat = new THREE.ShaderMaterial({
      vertexShader: beamVert, fragmentShader: beamFrag,
      uniforms: {
        uLen: { value: length }, uWidth: { value: width }, uTaper: { value: 0.55 },
        uColor: { value: new THREE.Color(color) },
        uDraw: { value: 0 }, uFeather: { value: 0.032 },
        uGlow: { value: glow }, uTime: { value: 0 }, uPulse: { value: 0.5 },
        uSoft: { value: 0.0 },
      },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    super(geo, mat);
    this.frustumCulled = false;
  }
  set draw(v) { this.material.uniforms.uDraw.value = v; }
  get draw() { return this.material.uniforms.uDraw.value; }
  set glow(v) { this.material.uniforms.uGlow.value = v; }
  set pulse(v) { this.material.uniforms.uPulse.value = v; }
  tick(t) { this.material.uniforms.uTime.value = t; }
}

/* ------------------------------------------------------------
   Узел на оси: ядро + кольцо, дышит и реагирует на зажигание
   ------------------------------------------------------------ */
const nodeFrag = /* glsl */`
  precision highp float;
  uniform vec3 uColor; uniform float uOn, uTime;
  varying vec2 vUv;
  void main(){
    vec2 q = vUv - 0.5;
    float r = length(q) * 2.0;
    float core = exp(-pow(r, 1.6) * 26.0);
    float ring = exp(-pow(abs(r - 0.52) * 9.0, 2.0)) * 0.7;
    float breathe = 0.86 + 0.14 * sin(uTime * 1.7);
    float a = (core * 1.25 + ring) * uOn * breathe;
    if (a < 0.003) discard;
    gl_FragColor = vec4(uColor * (0.6 + 0.6 * core) + vec3(core * 0.5), clamp(a, 0.0, 1.0));
  }`;

export class Node3 extends THREE.Mesh {
  constructor({ size = 74, color = PAL.mint } = {}) {
    super(new THREE.PlaneGeometry(size, size), new THREE.ShaderMaterial({
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: nodeFrag,
      uniforms: { uColor: { value: new THREE.Color(color) }, uOn: { value: 0 }, uTime: { value: 0 } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    this.frustumCulled = false;
  }
  set on(v) { this.material.uniforms.uOn.value = v; }
  tick(t) { this.material.uniforms.uTime.value = t; }
}

/* ------------------------------------------------------------
   Пол: сетка, растворяющаяся в тумане. Никакой «шахматной доски»:
   тонкие линии, два масштаба, световая лужа под началом координат.
   ------------------------------------------------------------ */
const floorFrag = /* glsl */`
  precision highp float;
  uniform vec3 uMint, uBlue; uniform float uTime, uOpacity;
  varying vec2 vXZ; varying float vDist;
  float grid(vec2 p, float step, float w){
    vec2 g = abs(fract(p / step - 0.5) - 0.5) * step;
    vec2 d = g / max(w, 1e-4);
    float l = min(d.x, d.y);
    return 1.0 - smoothstep(0.0, 1.0, l);
  }
  void main(){
    float fine  = grid(vXZ, 110.0, 1.9);
    float coarse= grid(vXZ, 550.0, 3.4);
    // дальше от центра — тусклее; за 3600 не видно вовсе
    float far = 1.0 - smoothstep(900.0, 4200.0, vDist);
    float pool = exp(-vDist * vDist / (1150.0 * 1150.0));     // лужа света у нуля
    vec3 col = uMint * (fine * 0.34 + coarse * 0.62) + uBlue * coarse * 0.26;
    float a = (fine * 0.30 + coarse * 0.46) * far + pool * 0.22;
    col += uMint * pool * 0.5;
    a *= uOpacity;
    if (a < 0.002) discard;
    gl_FragColor = vec4(col, a);
  }`;

export function makeFloor(y = -190) {
  const geo = new THREE.PlaneGeometry(9000, 9000, 1, 1);
  const mat = new THREE.ShaderMaterial({
    vertexShader: `varying vec2 vXZ; varying float vDist;
      void main(){ vXZ = position.xy; vDist = length(position.xy);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: floorFrag,
    uniforms: {
      uMint: { value: new THREE.Color(PAL.mint) },
      uBlue: { value: new THREE.Color(PAL.blue) },
      uTime: { value: 0 }, uOpacity: { value: 1 },
    },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const m = new THREE.Mesh(geo, mat);
  m.rotation.x = -Math.PI / 2;
  m.position.y = y;
  m.frustumCulled = false;
  return m;
}

/* ------------------------------------------------------------
   Дальний задник. Пустой тёмный кадр читается как флэтовая
   заливка; здесь — разреженная сетка в дымке и два неоновых
   облака. Стоит далеко, поэтому работает как глубина, не как фон.
   ------------------------------------------------------------ */
const backFrag = /* glsl */`
  precision highp float;
  uniform vec3 uMint, uBlue;
  varying vec2 vUv;
  float lines(float x, float step, float w){
    float g = abs(fract(x / step - 0.5) - 0.5) * step;
    return 1.0 - smoothstep(0.0, w, g);
  }
  void main(){
    vec2 q = (vUv - 0.5) * 2.0;
    float gx = lines(vUv.x * 4200.0, 300.0, 2.2);
    float gy = lines(vUv.y * 2400.0, 300.0, 2.2);
    float grid = (gx + gy) * 0.5;
    float centre = 1.0 - smoothstep(0.15, 1.15, length(q));
    float c1 = exp(-pow(length(q - vec2(-0.42, 0.24)) * 1.5, 2.0));
    float c2 = exp(-pow(length(q - vec2(0.55, -0.16)) * 1.8, 2.0));
    vec3 col = uMint * (grid * 0.34 * centre + c1 * 0.38)
             + uBlue * (grid * 0.16 * centre + c2 * 0.30);
    float a = grid * 0.055 * centre + c1 * 0.075 + c2 * 0.06;
    if (a < 0.002) discard;
    gl_FragColor = vec4(col, a);
  }`;

export function makeBackdrop(z = -3200) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(11000, 6200, 1, 1),
    new THREE.ShaderMaterial({
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: backFrag,
      uniforms: {
        uMint: { value: new THREE.Color(PAL.mint) },
        uBlue: { value: new THREE.Color(PAL.blue) },
      },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
  m.position.z = z;
  m.frustumCulled = false;
  return m;
}

/* ------------------------------------------------------------
   Пыль: три слоя на разной глубине — отсюда берётся параллакс
   ------------------------------------------------------------ */
export function makeDust({ count = 1400, spread = 4200, size = 7, color = 0x9fd6e8, opacity = .5 }) {
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * spread * 1.6;
    pos[i * 3 + 1] = (Math.random() - 0.5) * spread * 0.55;
    pos[i * 3 + 2] = (Math.random() - 0.5) * spread;
    seed[i] = Math.random() * 6.28;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uSize: { value: size }, uTime: { value: 0 },
      uColor: { value: new THREE.Color(color) }, uOpacity: { value: opacity },
    },
    vertexShader: /* glsl */`
      attribute float aSeed; uniform float uSize, uTime;
      varying float vTw;
      void main(){
        vec3 p = position;
        p.y += sin(uTime * 0.16 + aSeed) * 16.0;
        p.x += cos(uTime * 0.11 + aSeed * 1.7) * 12.0;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = uSize * (900.0 / max(-mv.z, 1.0));
        vTw = 0.45 + 0.55 * sin(uTime * 0.9 + aSeed * 3.1);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      precision highp float;
      uniform vec3 uColor; uniform float uOpacity; varying float vTw;
      void main(){
        float r = length(gl_PointCoord - 0.5) * 2.0;
        float a = exp(-r * r * 4.2) * uOpacity * vTw;
        if (a < 0.004) discard;
        gl_FragColor = vec4(uColor, a);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  return pts;
}

/* ------------------------------------------------------------
   Финальный проход: хроматическая аберрация + лёгкий грейд.
   Виньетка и зерно живут в CSS — дешевле и мягче.
   ------------------------------------------------------------ */
const FinalShader = {
  uniforms: {
    tDiffuse: { value: null },
    uAmount: { value: 0.0017 },
    uLift: { value: new THREE.Vector3(0.006, 0.010, 0.018) },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: /* glsl */`
    precision highp float;
    uniform sampler2D tDiffuse; uniform float uAmount; uniform vec3 uLift;
    varying vec2 vUv;
    void main(){
      vec2 d = vUv - 0.5;
      float r2 = dot(d, d);
      vec2 off = d * uAmount * (0.35 + r2 * 2.4);   // к краям сильнее
      vec3 c;
      c.r = texture2D(tDiffuse, vUv + off).r;
      c.g = texture2D(tDiffuse, vUv).g;
      c.b = texture2D(tDiffuse, vUv - off).b;
      c = c + uLift * (1.0 - c);                    // приподнятый чёрный, «плёночный»
      gl_FragColor = vec4(c, 1.0);
    }`,
};

/* ------------------------------------------------------------ */
export class World {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas, antialias: true, alpha: false, powerPreference: 'high-performance',
    });
    this.renderer.setClearColor(PAL.void, 1);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(PAL.void, 0.00012);

    this.camera = new THREE.PerspectiveCamera(38, 1, 1, 14000);
    this.camera.position.set(0, 0, 1500);

    /* --- содержимое мира --- */
    this.floor = makeFloor(-150);
    this.scene.add(this.floor);

    this.backdrop = makeBackdrop(-3200);
    this.scene.add(this.backdrop);

    this.dust = [
      makeDust({ count: 700, spread: 1700, size: 13, color: 0xd6f2fa, opacity: .55 }),
      makeDust({ count: 1100, spread: 3600, size: 8.5, color: 0x93c6e4, opacity: .38 }),
      makeDust({ count: 1200, spread: 6400, size: 6, color: 0x5d8fb8, opacity: .26 }),
    ];
    this.dust.forEach(d => this.scene.add(d));

    this.axes = new THREE.Group();
    this.scene.add(this.axes);

    /* --- оптика --- */
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.44, 0.52, 0.34);
    this.composer.addPass(this.bloom);
    this.final = new ShaderPass(FinalShader);
    this.composer.addPass(this.final);

    this._tmp = new THREE.Vector3();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const box = this.canvas.parentElement || document.documentElement;
    const w = box.clientWidth || window.innerWidth;
    const h = box.clientHeight || window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.composer.setPixelRatio(dpr);
    this.composer.setSize(w, h);
    this.bloom.setSize(w * dpr, h * dpr);
    this.camera.aspect = w / h;
    // на узком экране расширяем угол, иначе композиция «съезжает» за кадр
    // внутри кадра пропорция постоянна, поэтому угол фиксированный;
    // шире он становится только в портрете, где кадр вертикальный
    this.baseFov = w / h < 1 ? 60 : 38;
    this.camera.fov = this.baseFov;
    this.camera.updateProjectionMatrix();
    this.w = w; this.h = h;
  }

  /** экранные координаты точки мира — по ним позиционируется HTML-слой */
  project(v3) {
    this._tmp.copy(v3).project(this.camera);
    return {
      x: (this._tmp.x * 0.5 + 0.5) * this.w,
      y: (-this._tmp.y * 0.5 + 0.5) * this.h,
      z: this._tmp.z,
    };
  }

  /** расстояние от камеры до точки — для масштаба и затухания HTML-карточек */
  distanceTo(v3) { return this.camera.position.distanceTo(v3); }

  /** пыль держится вокруг камеры, иначе вблизи её нет и кадр плоский */
  followCamera() {
    const c = this.camera.position;
    // задник почти стоит на месте — отсюда параллакс при поездке по оси
    this.backdrop.position.x = c.x * 0.86;
    this.backdrop.position.y = c.y * 0.5;
    for (let i = 0; i < this.dust.length; i++) {
      const cell = [900, 1800, 3200][i];
      this.dust[i].position.set(
        Math.round(c.x / cell) * cell,
        Math.round(c.y / cell) * cell,
        Math.round(c.z / cell) * cell,
      );
    }
  }

  tick(t) {
    this.floor.material.uniforms.uTime.value = t;
    this.dust.forEach(d => d.material.uniforms.uTime.value = t);
    this.axes.traverse(o => { if (o.tick) o.tick(t); });
  }

  render() { this.composer.render(); }
}
