/* ============================================================
   Сборка: рельс → камера → мир → слой контента.
   Всё, что видно, — функция одной величины прогресса.
   ============================================================ */
import * as THREE from 'three';
import { World, AxisBeam, Node3, PAL } from './world.js';
import { Rail } from './rail.js';
import { SCENES, AX, AXIS_LABELS, BRANCHES, BRANCH, FORK1_X, FORK2_X } from './scenes.js';

const stage = document.getElementById('stage');
const fit = document.getElementById('fit');

/* единица кадра: всё в вёрстке считается от неё.
   В альбоме эталон — 1920, в портрете телефона — 430. */
function setUnit() {
    const portrait = window.innerHeight > window.innerWidth;
    document.body.dataset.portrait = portrait ? '1' : '0';
    const w = fit.clientWidth || window.innerWidth;
    document.documentElement.style.setProperty('--k', (w / (portrait ? 430 : 1920)).toFixed(5));
}
setUnit();
window.addEventListener('resize', setUnit);
const world = new World(document.getElementById('gl'));

/* ---------- ось X и развилки как настоящая геометрия ---------- */
const beamX = new AxisBeam({ length: AX.len, width: 46, color: PAL.mint, glow: 1 });
beamX.material.uniforms.uSoft.value = 0.35;
world.axes.add(beamX);

/* призрак ещё не прочерченной оси: правая половина кадра перестаёт быть
   пустой и сразу видно, куда поедет камера */
const ghostX = new AxisBeam({ length: AX.len, width: 30, color: PAL.mint, glow: 0.085 });
ghostX.material.uniforms.uSoft.value = 0.9;
ghostX.material.uniforms.uPulse.value = 0;
ghostX.draw = 1;
world.axes.add(ghostX);

const nodeZero = new Node3({ size: 96, color: PAL.mint });
world.axes.add(nodeZero);

const forkNodes = [
  { x: FORK1_X, mesh: new Node3({ size: 58, color: PAL.mint }), from: 1.30 },
  { x: FORK2_X, mesh: new Node3({ size: 58, color: PAL.mint }), from: 2.30 },
];
forkNodes.forEach(f => { f.mesh.position.set(f.x, 0, 0); world.axes.add(f.mesh); });

/* ветви: луч, повёрнутый вверх от узла. Чертится тем же шейдером —
   значит и здесь движение настоящее, а не появление плашки. */
const branches = BRANCHES.map(b => {
  const beam = new AxisBeam({
    length: BRANCH.len, width: 58,
    color: b.color === 'blue' ? PAL.blue : PAL.mint, glow: 1,
  });
  beam.position.set(b.x, 0, 0);
  const a = BRANCH.angle * Math.PI / 180;
  beam.rotation.z = b.dir < 0 ? Math.PI - a : a;
  beam.material.uniforms.uPulse.value = 0.18;
  beam.material.uniforms.uSoft.value = 0.85;
  beam.material.uniforms.uFeather.value = 0.09;
  beam.material.uniforms.uTaper.value = 0.72;
  world.axes.add(beam);
  return { ...b, beam };
});

/* ---------- слой контента: экранный слайд на сцену ---------- */
const slides = SCENES.map((sc, si) => {
  const el = document.createElement('div');
  el.className = 'slide';
  el.dataset.scene = sc.id;
  el.dataset.layout = sc.layout || '';
  el.innerHTML = `<div class="flow">${sc.screen}</div>`;
  stage.appendChild(el);
  return {
    si, el, sc, fitK: 1,
    flow: el.querySelector('.flow'),
    pins: [...el.querySelectorAll('.pin')],
    revealGroups: groupReveals(el),
  };
});

/* Слайд ужимается до кадра. В альбоме это почти всегда 1, в портрете —
   столько, сколько нужно, чтобы поместились все блоки сцены. Меряем
   после раскладки, иначе высота ещё нулевая. */
function fitSlides() {
  // вписываемся не в кадр, а в область НАД полосой прогресса
  const frame = fit.getBoundingClientRect();
  const hudTop = document.getElementById('hud').getBoundingClientRect().top;
  const pad = frame.height * 0.045;
  const availH = Math.max(80, Math.min(frame.bottom, hudTop) - frame.top - pad * 2);
  for (const S of slides) {
    const prevV = S.el.style.visibility, prevO = S.el.style.opacity;
    S.flow.style.setProperty('--fitk', '1');
    S.el.style.visibility = 'visible';
    S.el.style.opacity = '0';
    // высота содержимого — по крайним штырям, а не по контейнеру:
    // у flex-контейнера фиксированной высоты scrollHeight врёт
    let top = Infinity, bot = -Infinity;
    for (const pin of S.pins) {
      const b = pin.getBoundingClientRect();
      if (b.height < 1) continue;
      if (b.top < top) top = b.top;
      if (b.bottom > bot) bot = b.bottom;
    }
    const h = bot - top;
    S.fitK = h > 0 ? Math.min(1, availH / h) : 1;
    S.el.style.visibility = prevV;
    S.el.style.opacity = prevO;
  }
}

/** элементы с одинаковым data-r выходят одновременно */
function groupReveals(root) {
  const map = new Map();
  for (const el of root.querySelectorAll('[data-r]')) {
    const k = +el.dataset.r;
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(el);
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0]).map(e => e[1]);
}

/* подписи узлов оси */
const labels = AXIS_LABELS.map(l => {
  const el = document.createElement('div');
  el.className = `anchor axlabel ${l.cls}`;
  el.innerHTML = l.html;
  stage.appendChild(el);
  return { el, from: l.from || 0.5, at: new THREE.Vector3(...l.at) };
});

/* ---------- HUD ---------- */
const hud = {
  fill: document.querySelector('#hud .rail-fill'),
  ticks: document.querySelector('#hud .rail-ticks'),
  badge: document.getElementById('axisBadge'),
  no: document.getElementById('stepNo'),
  total: document.getElementById('stepTotal'),
};
hud.total.textContent = String(SCENES.length).padStart(2, '0');
SCENES.forEach((_, i) => {
  const b = document.createElement('b');
  b.style.left = `${(i / (SCENES.length - 1)) * 100}%`;
  hud.ticks.appendChild(b);
});
const tickEls = [...hud.ticks.children];

/* ---------- математика ---------- */
const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
const smoother = t => { t = clamp(t); return t * t * t * (t * (t * 6 - 15) + 10); };
const lerp = (a, b, t) => a + (b - a) * t;

/* ---------- камера ---------- */
const camPos = new THREE.Vector3(...SCENES[0].cam.pos);
const camLook = new THREE.Vector3(...SCENES[0].cam.look);
const tA = new THREE.Vector3(), tB = new THREE.Vector3();

function cameraAt(p) {
  const i = clamp(Math.floor(p), 0, SCENES.length - 1);
  const j = clamp(i + 1, 0, SCENES.length - 1);
  const t = smoother(p - i);
  tA.set(...SCENES[i].cam.pos).lerp(tB.set(...SCENES[j].cam.pos), t);
  // дуга: на середине перегона камера чуть отъезжает и приподнимается
  const arc = i === j ? 0 : Math.sin(Math.PI * clamp(p - i)) * 200;
  tA.z += arc; tA.y += arc * 0.20;
  camPos.copy(tA);
  tA.set(...SCENES[i].cam.look).lerp(tB.set(...SCENES[j].cam.look), t);
  camLook.copy(tA);
}

const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
window.addEventListener('pointermove', e => {
  mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
  mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2;
}, { passive: true });

/* ---------- кадр ---------- */
const rail = new Rail({ count: SCENES.length });
let t0 = performance.now(), time = 0;

function frame(now) {
  const dt = Math.min((now - t0) / 1000, 1 / 20);
  t0 = now; time += dt;

  const p = rail.update(dt);
  const step = Math.round(p);
  const i = clamp(Math.floor(p), 0, SCENES.length - 1);
  const j = clamp(i + 1, 0, SCENES.length - 1);
  const tt = smoother(p - i);

  /* --- камера --- */
  cameraAt(p);
  const k = 1 - Math.pow(0.0012, dt);
  mouse.x = lerp(mouse.x, mouse.tx, k);
  mouse.y = lerp(mouse.y, mouse.ty, k);
  const breathe = Math.sin(time * 0.29) * 6 + Math.sin(time * 0.16) * 3.5;
  world.camera.position.set(
    camPos.x + mouse.x * 24,
    camPos.y - mouse.y * 15 + breathe,
    camPos.z
  );
  world.camera.lookAt(camLook.x + mouse.x * 8, camLook.y - mouse.y * 5, camLook.z);

  /* --- ось и развилки чертятся по прогрессу --- */
  beamX.draw = lerp(SCENES[i].axisDraw, SCENES[j].axisDraw, tt);
  beamX.glow = 0.34 + 0.40 * smooth((p - 0.3) / 0.7);
  ghostX.glow = 0.055 + 0.055 * smooth((p - 0.35) / 0.65);
  nodeZero.on = smooth((p - 0.42) / 0.55);
  forkNodes.forEach(f => { f.mesh.on = smooth((p - f.from) / 0.45); });
  branches.forEach(b => {
    const f = smoother((p - b.from) / 0.52);
    b.beam.draw = f;
    b.beam.glow = 0.38 + 0.52 * f;
  });

  /* --- контент: слайд целиком живёт на экране, глубину даёт мир --- */
  for (const S of slides) {
    const d = p - S.si;
    const vis = clamp(1 - Math.abs(d) * 1.04);
    if (vis <= 0.002) {
      if (S.el.style.visibility !== 'hidden') {
        S.el.style.visibility = 'hidden'; S.el.style.opacity = '0';
      }
      continue;
    }
    S.el.style.visibility = 'visible';
    const away = d > 0 ? d : 0, come = d < 0 ? -d : 0;

    S.el.style.opacity = Math.pow(vis, 1.25).toFixed(3);
    S.el.style.filter = (away > 0.05 || come > 0.05)
      ? `blur(${(away * 7 + come * 4).toFixed(2)}px)` : 'none';
    // уходящий слайд наезжает на зрителя, приходящий подтягивается из глубины
    const z = away * 0.085 - come * 0.055;
    S.el.style.transform = `scale(${(1 + z).toFixed(4)})`;
    S.flow.style.setProperty('--fitk', S.fitK.toFixed(4));

    // параллакс: каждый штырь смещается по своей глубине
    for (const pin of S.pins) {
      const dep = parseFloat(pin.dataset.d || '1');
      pin.style.setProperty('--px', (mouse.x * -13 * dep).toFixed(2) + 'px');
      pin.style.setProperty('--py', (mouse.y * -8 * dep).toFixed(2) + 'px');
    }

    const tIn = clamp(d + 1);
    const n = S.revealGroups.length;
    const DUR = 0.34, A = 0.18, B = 0.98 - DUR;      // последняя группа успевает до 1
    for (let r = 0; r < n; r++) {
      const start = n < 2 ? A : A + r * (B - A) / (n - 1);
      const f = smoother((tIn - start) / DUR).toFixed(3);
      for (const el of S.revealGroups[r]) el.style.setProperty('--rv', f);
    }
  }

  /* --- подписи оси --- */
  for (const L of labels) {
    const pr = world.project(L.at);
    const dist = world.distanceTo(L.at);
    const s = clamp(1500 / Math.max(dist, 1), 0.45, 1.2);
    L.el.style.transform =
      `translate3d(${pr.x.toFixed(1)}px,${pr.y.toFixed(1)}px,0) translate(-50%,-50%) scale(${s.toFixed(3)})`;
    L.el.style.opacity = pr.z > 1 ? '0' : (0.9 * smooth((p - L.from) / 0.5)).toFixed(3);
  }

  /* --- HUD --- */
  hud.fill.style.width = `${(p / (SCENES.length - 1)) * 100}%`;
  tickEls.forEach((b, n) => b.classList.toggle('on', n <= p + 0.01));
  const sc = SCENES[step];
  if (hud.badge.textContent !== sc.axis) hud.badge.textContent = sc.axis;
  hud.no.textContent = String(step + 1).padStart(2, '0');
  const cine = sc.cine ? '1' : '0';
  if (document.body.dataset.cine !== cine) document.body.dataset.cine = cine;

  world.followCamera();
  world.tick(time);
  world.render();
  requestAnimationFrame(frame);
}

/* ---------- старт ---------- */
async function boot() {
  const imgs = [...stage.querySelectorAll('img')];
  await Promise.all([
    document.fonts.ready,
    ...imgs.map(im => im.complete ? Promise.resolve()
      : new Promise(res => { im.onload = im.onerror = res; })),
  ]);
  fitSlides();
  window.addEventListener('resize', () => { setUnit(); fitSlides(); });
  rail.goto(0, { snap: true });
  requestAnimationFrame(frame);
  await new Promise(r => setTimeout(r, 140));
  document.body.dataset.ready = '1';
}
boot();

/* для консоли и для снимков Playwright */
window.__deck = {
  rail, world, count: SCENES.length,
  go(i) { rail.goto(i, { snap: true }); },
  set(v) { rail.p = v; rail.target = Math.round(v); rail.v = 0; rail.scrubbing = false; },
};
