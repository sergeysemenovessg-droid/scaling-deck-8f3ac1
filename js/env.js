/* ============================================================
   СРЕДА ПОЛЁТА

   Камера может лететь идеально, но если мимо неё ничего не идёт,
   зритель не видит движения: пустота выглядит одинаково на любой
   скорости. Скорость читается по тому, что проносится мимо.

   Поэтому вдоль осей стоят опоры, под ними лежит светящаяся
   поверхность, а по сторонам в дымке — дальние массивы. Всё
   вместе даёт масштаб, глубину и ощущение хода.
   ============================================================ */
import * as THREE from 'three';
import { PAL } from './world.js';

/* ------------------------------------------------------------
   Опоры вдоль оси: тонкие неоновые стойки под линией.
   Зажигаются вместе с прочерченной частью оси, гаснут за спиной.
   ------------------------------------------------------------ */
const pylonFrag = /* glsl */`
  precision highp float;
  uniform vec3 uColor; uniform float uDraw, uFade;
  varying vec2 vUv; varying float vT;
  void main(){
    // стойка есть только там, где ось уже прочерчена
    float on = 1.0 - smoothstep(uDraw - 0.02, uDraw + 0.01, vT);
    if (on < 0.01) discard;
    float v = abs(vUv.x - 0.5) * 2.0;
    float core = exp(-pow(v, 1.3) * 12.0);
    // книзу гаснет: стойка уходит в туман, а не обрывается
    float down = pow(1.0 - vUv.y, 1.6);
    float a = core * down * 0.55 * on * uFade;
    if (a < 0.004) discard;
    gl_FragColor = vec4(uColor * (0.5 + 0.5 * core), a);
  }`;

const pylonVert = /* glsl */`
  attribute float aT;
  varying vec2 vUv; varying float vT;
  void main(){
    vUv = uv; vT = aT;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;

/** dir: 'x' — вдоль +X от (0,0,0); 'y' — вдоль −Z от (3600,0,0) */
export function makePylons({ dir = 'x', from = [0, 0, 0], len = 3600,
  step = 150, height = 460, width = 13, color = PAL.mint } = {}) {
  const n = Math.floor(len / step);
  const geos = [];
  for (let i = 1; i < n; i++) {
    const d = i * step;
    const g = new THREE.PlaneGeometry(width, height);
    g.translate(0, -height / 2 - 26, 0);      // висит под линией оси
    if (dir === 'x') g.translate(from[0] + d, from[1], from[2]);
    else { g.rotateY(Math.PI / 2); g.translate(from[0], from[1], from[2] - d); }
    const t = new Float32Array(g.attributes.position.count).fill(d / len);
    g.setAttribute('aT', new THREE.BufferAttribute(t, 1));
    geos.push(g);
  }
  const merged = mergeGeometries(geos);
  const m = new THREE.Mesh(merged, new THREE.ShaderMaterial({
    vertexShader: pylonVert, fragmentShader: pylonFrag,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uDraw: { value: 0 }, uFade: { value: 1 },
    },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  }));
  m.frustumCulled = false;
  Object.defineProperty(m, 'draw', { set(v) { m.material.uniforms.uDraw.value = v; } });
  Object.defineProperty(m, 'fade', { set(v) { m.material.uniforms.uFade.value = v; } });
  return m;
}

/** склейка однотипных геометрий без внешнего хелпера */
function mergeGeometries(list) {
  const pos = [], uv = [], at = [], idx = [];
  let off = 0;
  for (const g of list) {
    const p = g.attributes.position.array, u = g.attributes.uv.array,
      a = g.attributes.aT.array, ix = g.index.array;
    pos.push(...p); uv.push(...u); at.push(...a);
    for (let i = 0; i < ix.length; i++) idx.push(ix[i] + off);
    off += g.attributes.position.count;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  out.setAttribute('aT', new THREE.Float32BufferAttribute(at, 1));
  out.setIndex(idx);
  return out;
}

/* ------------------------------------------------------------
   Дальние массивы: низкие блоки по сторонам маршрута.
   Почти не видны, но дают миру край и масштаб — без них
   пространство читается бесконечной пустотой.
   ------------------------------------------------------------ */
export function makeDistrict({ center = [0, 0, 0], spread = 7000, count = 90, seed = 7 } = {}) {
  let s = seed;
  const rnd = () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;

  const geos = [];
  for (let i = 0; i < count; i++) {
    const w = 120 + rnd() * 420;
    const h = 200 + rnd() * 1500;
    const d = 120 + rnd() * 420;
    const g = new THREE.BoxGeometry(w, h, d);
    let x = center[0] + (rnd() - 0.5) * spread * 2;
    let z = center[2] + (rnd() - 0.5) * spread * 2;
    // коридор вдоль маршрута оставляем пустым, иначе камера влетит в дом
    if (Math.abs(z - center[2]) < 1500 && Math.abs(x - center[0]) < 1500) {
      x += (x > center[0] ? 1 : -1) * 1800;
    }
    g.translate(x, h / 2 - 40, z);
    const t = new Float32Array(g.attributes.position.count).fill(0);
    g.setAttribute('aT', new THREE.BufferAttribute(t, 1));
    geos.push(g);
  }
  const m = new THREE.Mesh(mergeGeometries(geos), new THREE.ShaderMaterial({
    vertexShader: `varying vec3 vPos; varying vec2 vUv;
      void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position,1.0);
        vPos = mv.xyz; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */`
      precision highp float; uniform vec3 uColor; uniform float uOn;
      varying vec3 vPos; varying vec2 vUv;
      void main(){
        float ex = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
        float rim = 1.0 - smoothstep(0.0, 0.035, ex);
        // дальше — бледнее: массивы тонут в дымке
        float far = 1.0 - smoothstep(2500.0, 9000.0, length(vPos));
        float a = (0.030 + rim * 0.10) * far * uOn;
        if (a < 0.003) discard;
        gl_FragColor = vec4(mix(vec3(0.05,0.08,0.13), uColor, rim * 0.6), a);
      }`,
    uniforms: { uColor: { value: new THREE.Color(PAL.blue) }, uOn: { value: 1 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  m.frustumCulled = false;
  return m;
}

/* ------------------------------------------------------------
   Слои дымки поперёк маршрута: камера проходит сквозь них,
   и это единственное, что честно показывает скорость на прямой.
   ------------------------------------------------------------ */
export function makeHaze({ count = 16, spread = 9000, center = [1800, 300, -1600] } = {}) {
  const g = new THREE.Group();
  for (let i = 0; i < count; i++) {
    const p = new THREE.Mesh(
      new THREE.PlaneGeometry(5200, 2600),
      new THREE.ShaderMaterial({
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: /* glsl */`
          precision highp float; uniform vec3 uColor; uniform float uSeed, uTime;
          varying vec2 vUv;
          void main(){
            vec2 q = vUv - 0.5;
            float d = length(q * vec2(1.0, 1.9));
            float puff = exp(-pow(d * 2.3, 2.0));
            float drift = 0.5 + 0.5 * sin(uTime * 0.12 + uSeed);
            float a = puff * 0.035 * (0.6 + 0.4 * drift);
            if (a < 0.002) discard;
            gl_FragColor = vec4(uColor, a);
          }`,
        uniforms: {
          uColor: { value: new THREE.Color(i % 3 ? PAL.mint : PAL.blue) },
          uSeed: { value: i * 1.7 }, uTime: { value: 0 },
        },
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      }));
    p.position.set(
      center[0] + (Math.sin(i * 2.4) * 0.5) * spread,
      center[1] + Math.cos(i * 1.7) * 500,
      center[2] + (i / count - 0.5) * spread * 1.4,
    );
    p.rotation.y = Math.sin(i) * 0.5;
    p.frustumCulled = false;
    g.add(p);
  }
  g.tick = t => g.children.forEach(c => { c.material.uniforms.uTime.value = t; });
  return g;
}

/* ------------------------------------------------------------
   Полотно под осью. Главный источник ощущения скорости: по нему
   бегут световые штрихи, и глаз считывает ход даже на прямой,
   где кроме оси ничего нет.
   ------------------------------------------------------------ */
export function makeRoad({ dir = 'x', from = [0, 0, 0], len = 3600,
  width = 300, color = PAL.mint } = {}) {
  const g = new THREE.PlaneGeometry(len, width, 220, 1);
  g.rotateX(-Math.PI / 2);
  g.translate(len / 2, 0, 0);
  if (dir === 'y') g.rotateY(Math.PI / 2);
  const m = new THREE.Mesh(g, new THREE.ShaderMaterial({
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */`
      precision highp float;
      uniform vec3 uColor; uniform float uDraw, uTime, uFade;
      varying vec2 vUv;
      void main(){
        float t = vUv.x;
        float on = 1.0 - smoothstep(uDraw - 0.015, uDraw, t);
        if (on < 0.01) discard;
        float v = abs(vUv.y - 0.5) * 2.0;

        // кромки полотна — две тонкие светящиеся нити
        float edge = (1.0 - smoothstep(0.86, 1.0, v)) * step(0.86, v);
        // осевая разметка: штрихи бегут навстречу камере
        float dash = step(0.55, fract(t * 90.0 - uTime * 0.55))
                   * (1.0 - smoothstep(0.10, 0.20, v));
        // само полотно едва светится, чтобы не спорить с осью
        float body = (1.0 - smoothstep(0.55, 1.0, v)) * 0.055;

        float a = (body + edge * 0.55 + dash * 0.30) * on * uFade;
        if (a < 0.004) discard;
        gl_FragColor = vec4(uColor * (0.35 + 0.65 * (edge + dash)), a);
      }`,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uDraw: { value: 0 }, uTime: { value: 0 }, uFade: { value: 1 },
    },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  }));
  m.position.set(...from);
  m.position.y -= 58;
  m.frustumCulled = false;
  Object.defineProperty(m, 'draw', { set: v => m.material.uniforms.uDraw.value = v });
  Object.defineProperty(m, 'fade', { set: v => m.material.uniforms.uFade.value = v });
  m.tick = t => m.material.uniforms.uTime.value = t;
  return m;
}

/* ------------------------------------------------------------
   Ворота на развилке: камера проходит сквозь них, и выбор
   перестаёт быть схемой — он становится местом на маршруте.
   ------------------------------------------------------------ */
export function makeGate({ at = [0, 0, 0], axis = 'x', w = 640, h = 520, color = PAL.mint } = {}) {
  const g = new THREE.PlaneGeometry(w, h);
  g.translate(0, h / 2 - 70, 0);
  const m = new THREE.Mesh(g, new THREE.ShaderMaterial({
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */`
      precision highp float;
      uniform vec3 uColor; uniform float uOn, uTime;
      varying vec2 vUv;
      void main(){
        // рамка без нижней перекладины: створ, а не окно
        float ex = min(vUv.x, 1.0 - vUv.x);
        float top = 1.0 - vUv.y;
        float frame = max(1.0 - smoothstep(0.0, 0.020, ex),
                          1.0 - smoothstep(0.0, 0.028, top));
        // створ прочерчивается снизу вверх
        float draw = smoothstep(uOn * 1.15 - 0.15, uOn * 1.15, vUv.y);
        frame *= (1.0 - draw);
        float a = frame * 0.85 * smoothstep(0.0, 0.2, uOn);
        if (a < 0.005) discard;
        gl_FragColor = vec4(uColor * 1.1, a);
      }`,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uOn: { value: 0 }, uTime: { value: 0 },
    },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  }));
  m.position.set(...at);
  if (axis === 'y') m.rotation.y = Math.PI / 2;
  m.frustumCulled = false;
  Object.defineProperty(m, 'on', { set: v => m.material.uniforms.uOn.value = v });
  return m;
}

/* ------------------------------------------------------------
   Слово в пространстве. Не подпись поверх кадра, а объект: камера
   проходит мимо него и сквозь него. Рисуется на канве тем же
   шрифтом, что и вёрстка, поэтому набор один на весь проект.
   ------------------------------------------------------------ */
export function makeWord({ text = '', at = [0, 0, 0], size = 260,
  color = '#EAFBF8', axis = 'x', opacity = 1 } = {}) {
  const pad = 40;
  const cv = document.createElement('canvas');
  const ctx = cv.getContext('2d');
  const font = `600 ${size}px Unbounded, system-ui, sans-serif`;
  ctx.font = font;
  const w = Math.ceil(ctx.measureText(text).width) + pad * 2;
  const h = Math.ceil(size * 1.5);
  cv.width = w; cv.height = h;
  const c = cv.getContext('2d');
  c.font = font;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.shadowColor = 'rgba(34,245,214,.85)';
  c.shadowBlur = size * 0.32;
  c.fillStyle = color;
  c.fillText(text, w / 2, h / 2);
  c.shadowBlur = 0;
  c.fillText(text, w / 2, h / 2);

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const scale = size * 1.5 / h;
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w * scale, h * scale),
    new THREE.ShaderMaterial({
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: /* glsl */`
        precision highp float;
        uniform sampler2D uMap; uniform float uOn;
        varying vec2 vUv;
        void main(){
          vec4 t = texture2D(uMap, vUv);
          float a = t.a * uOn;
          if (a < 0.004) discard;
          gl_FragColor = vec4(t.rgb, a);
        }`,
      uniforms: { uMap: { value: tex }, uOn: { value: opacity } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    }));
  m.position.set(...at);
  if (axis === 'y') m.rotation.y = Math.PI / 2;
  m.frustumCulled = false;
  Object.defineProperty(m, 'on', { set: v => m.material.uniforms.uOn.value = v });
  return m;
}
