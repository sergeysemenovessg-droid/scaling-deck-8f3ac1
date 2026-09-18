/* ============================================================
   Сборка: рельс → камера → мир → два слоя контента.
   Всё, что видно, — функция одной величины прогресса.
   ============================================================ */
import * as THREE from 'three';
import { World, AxisBeam, Node3, PAL } from './world.js';
import { Tower } from './build.js';
import { Rail } from './rail.js';
import { applyScheme, slideTransform } from './transitions.js';
import {
  SCENES, TRANSITIONS, AX, AXIS_LABELS, BRANCHES, BRANCH,
  Y_LEN, TOWER_AT, FLOOR_H, FINAL_X, FINAL_LEN, FINAL_Z,
} from './scenes.js';

const stage = document.getElementById('stage');
const fit = document.getElementById('fit');
const world = new World(document.getElementById('gl'));

/* единица кадра: вся вёрстка считается от неё */
function setUnit() {
  const portrait = window.innerHeight > window.innerWidth;
  document.body.dataset.portrait = portrait ? '1' : '0';
  const w = fit.clientWidth || window.innerWidth;
  document.documentElement.style.setProperty('--k', (w / (portrait ? 430 : 1920)).toFixed(5));
}
setUnit();

/* ============================================================
   ГЕОМЕТРИЯ МИРА
   ============================================================ */
const COL = { mint: PAL.mint, blue: PAL.blue, mag: PAL.magenta };

function beam(len, width, color, soft) {
  const b = new AxisBeam({ length: len, width, color, glow: 1 });
  b.material.uniforms.uSoft.value = soft;
  world.axes.add(b);
  return b;
}

/* ось X */
const beamX = beam(AX.len, 46, PAL.mint, 0.35);
const ghostX = beam(AX.len, 30, PAL.mint, 0.9);
ghostX.material.uniforms.uPulse.value = 0;
ghostX.draw = 1;

/* ось Y уходит в глубину: локальный +X разворачиваем в мировой −Z */
const beamY = beam(Y_LEN, 46, PAL.mint, 0.35);
beamY.position.set(3600, 0, 0);
beamY.rotation.y = Math.PI / 2;
const ghostY = beam(Y_LEN, 30, PAL.mint, 0.9);
ghostY.position.set(3600, 0, 0);
ghostY.rotation.y = Math.PI / 2;
ghostY.material.uniforms.uPulse.value = 0;
ghostY.draw = 1;

/* ось Z — вертикаль у здания */
const beamZ = beam(FLOOR_H * 5 + 260, 40, PAL.mint, 0.35);
beamZ.position.set(TOWER_AT[0], 0, TOWER_AT[2]);
beamZ.rotation.z = Math.PI / 2;

/* финальная ось OX, которая рисуется заново */
const beamF = beam(FINAL_LEN, 46, PAL.mint, 0.35);
beamF.position.set(FINAL_X, 0, FINAL_Z);

/* узлы */
const nodeZero = new Node3({ size: 96, color: PAL.mint });
world.axes.add(nodeZero);
const nodeCorner = new Node3({ size: 84, color: PAL.mint });
nodeCorner.position.set(3600, 0, 0);
world.axes.add(nodeCorner);
const nodeFinal = new Node3({ size: 84, color: PAL.mint });
nodeFinal.position.set(FINAL_X, 0, FINAL_Z);
world.axes.add(nodeFinal);

const forkNodes = [
  { at: [1180, 0, 0], from: 1.30 },
  { at: [2420, 0, 0], from: 2.30 },
  { at: [3600, 0, -1100], from: 4.30 },
  { at: [3600, 0, -2300], from: 7.30 },
].map(f => {
  const m = new Node3({ size: 58, color: PAL.mint });
  m.position.set(...f.at);
  world.axes.add(m);
  return { ...f, mesh: m };
});

/* ветви развилок: чертятся тем же шейдером, что и оси */
const branches = BRANCHES.map(b => {
  const m = new AxisBeam({ length: BRANCH.len, width: 58, color: COL[b.color], glow: 1 });
  const a = BRANCH.angle * Math.PI / 180;
  if (b.axis === 'x') {
    m.position.set(b.at, 0, 0);
    m.rotation.z = b.dir < 0 ? Math.PI - a : a;
  } else {
    m.position.set(3600, 0, b.at);
    /* сначала наклон в плоскости, потом разворот плоскости на ось Y */
    m.rotation.set(0, Math.PI / 2, b.dir < 0 ? Math.PI - a : a);
  }
  m.material.uniforms.uPulse.value = 0.18;
  m.material.uniforms.uSoft.value = 0.85;
  m.material.uniforms.uFeather.value = 0.09;
  m.material.uniforms.uTaper.value = 0.72;
  world.axes.add(m);
  return { ...b, beam: m };
});

/* здание и спираль */
const tower = new Tower({ at: TOWER_AT, floorH: FLOOR_H });
world.scene.add(tower);

/* ============================================================
   СЛОИ КОНТЕНТА
   ============================================================ */
function groupReveals(root) {
  const map = new Map();
  for (const el of root.querySelectorAll('[data-r]')) {
    const k = +el.dataset.r;
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(el);
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0]).map(e => e[1]);
}

/* слой 1: повествование, приколотое к кадру */
const slides = SCENES.map((sc, si) => {
  const el = document.createElement('div');
  el.className = 'slide';
  el.dataset.scene = sc.id;
  el.dataset.layout = sc.layout || '';
  el.innerHTML = `<div class="flow">${sc.screen || ''}</div>`;
  stage.appendChild(el);
  return {
    si, el, sc, fitK: 1,
    flow: el.querySelector('.flow'),
    pins: [...el.querySelectorAll('.pin')],
    revealGroups: groupReveals(el),
  };
});

/* слой 2: подписи объектов — живут в мире и едут вместе с камерой */
const marks = [];
SCENES.forEach((sc, si) => {
  (sc.world || []).forEach(m => {
    const el = document.createElement('div');
    el.className = `wmark ${m.align || 'center'}`;
    if (m.w) el.style.width = `calc(var(--k) * ${m.w}px)`;
    el.innerHTML = m.html;
    stage.appendChild(el);
    marks.push({
      si, el,
      at: new THREE.Vector3(...m.at),
      align: m.align || 'center',
      revealGroups: groupReveals(el),
    });
  });
});

const labels = AXIS_LABELS.map(l => {
  const el = document.createElement('div');
  el.className = `wmark axlabel ${l.cls}`;
  el.innerHTML = l.html;
  stage.appendChild(el);
  return { el, from: l.from ?? 0.5, until: l.until ?? 99, at: new THREE.Vector3(...l.at) };
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
const tA = new THREE.Vector3(), tB = new THREE.Vector3(), tC = new THREE.Vector3();
const fwd = new THREE.Vector3(), right = new THREE.Vector3(), upv = new THREE.Vector3(0, 1, 0);

/** положение камеры: квадратичная кривая через опорную точку, если она задана */
function cameraAt(p) {
  const i = clamp(Math.floor(p), 0, SCENES.length - 1);
  const j = clamp(i + 1, 0, SCENES.length - 1);
  const t = smoother(p - i);
  const A = SCENES[i].cam, B = SCENES[j].cam;
  if (B.via && i !== j) {
    // кривая Безье: камера идёт дугой, а не по прямой
    const u = 1 - t;
    tA.set(...A.pos).multiplyScalar(u * u);
    tB.set(...B.via).multiplyScalar(2 * u * t);
    tC.set(...B.pos).multiplyScalar(t * t);
    camPos.copy(tA).add(tB).add(tC);
  } else {
    camPos.set(...A.pos).lerp(tB.set(...B.pos), t);
  }
  camLook.set(...A.look).lerp(tB.set(...B.look), t);
}

const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
window.addEventListener('pointermove', e => {
  mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
  mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2;
}, { passive: true });

/* ---------- подгонка слайда под кадр ---------- */
function fitSlides() {
  const frame = fit.getBoundingClientRect();
  const hudTop = document.getElementById('hud').getBoundingClientRect().top;
  const pad = frame.height * 0.045;
  const top0 = frame.top + pad;
  const bot0 = Math.min(frame.bottom, hudTop) - pad;
  const availH = Math.max(80, bot0 - top0);
  const availMid = (top0 + bot0) / 2;          // область над HUD смещена вверх
  const frameMid = frame.top + frame.height / 2;
  for (const B of slides) {
    if (!B.pins.length) { B.fitK = 1; continue; }
    const prevV = B.el.style.visibility, prevO = B.el.style.opacity;
    B.flow.style.setProperty('--fitk', '1');
    B.el.style.visibility = 'visible';
    B.el.style.opacity = '0';
    let top = Infinity, bot = -Infinity;
    for (const pin of B.pins) {
      const r = pin.getBoundingClientRect();
      if (r.height < 1) continue;
      if (r.top < top) top = r.top;
      if (r.bottom > bot) bot = r.bottom;
    }
    const h = bot - top;
    B.fitK = h > 0 ? Math.min(1, availH / h) : 1;
    // одного масштаба мало: центр содержимого надо ещё и подвинуть
    // к центру свободной области, иначе низ всё равно лезет на HUD
    const mid = (top + bot) / 2;
    const dy = h > 0 ? availMid - (frameMid + (mid - frameMid) * B.fitK) : 0;
    B.flow.style.setProperty('--fitk', B.fitK.toFixed(4));
    B.flow.style.setProperty('--fity', dy.toFixed(2) + 'px');
    B.el.style.visibility = prevV;
    B.el.style.opacity = prevO;
  }
}

/** раскрытие по прогрессу: последняя группа обязана дойти до единицы */
function revealGroups(obj, tIn) {
  const n = obj.revealGroups.length;
  if (!n) return;
  const DUR = 0.34, A = 0.18, B = 0.98 - DUR;
  for (let r = 0; r < n; r++) {
    const start = n < 2 ? A : A + r * (B - A) / (n - 1);
    const f = smoother((tIn - start) / DUR).toFixed(3);
    for (const el of obj.revealGroups[r]) el.style.setProperty('--rv', f);
  }
}

/* ---------- кадр ---------- */
const rail = new Rail({ count: SCENES.length });
let t0 = performance.now(), time = 0;
const optics = {
  flash: document.querySelector('#optics .flash'),
  shutter: document.querySelector('#optics .shutter'),
};

function frame(now) {
  const dt = Math.min((now - t0) / 1000, 1 / 20);
  t0 = now; time += dt;

  const p = rail.update(dt);
  const step = Math.round(p);
  const i = clamp(Math.floor(p), 0, SCENES.length - 1);
  const j = clamp(i + 1, 0, SCENES.length - 1);
  const local = clamp(p - i);
  const tt = smoother(local);

  /* --- переход перегона --- */
  const schemeName = TRANSITIONS[Math.min(i, TRANSITIONS.length - 1)] || 'travel';
  const inTransit = i !== j && local > 0.001 && local < 0.999;
  const S = applyScheme(schemeName, inTransit ? local : 0);

  /* --- камера --- */
  cameraAt(p);
  const k = 1 - Math.pow(0.0012, dt);
  mouse.x = lerp(mouse.x, mouse.tx, k);
  mouse.y = lerp(mouse.y, mouse.ty, k);
  const breathe = Math.sin(time * 0.29) * 6 + Math.sin(time * 0.16) * 3.5;
  const shake = S.world.shake * (Math.sin(time * 41) * 3 + Math.sin(time * 27) * 2);

  // базис камеры: смещения перехода идут в её собственных осях
  fwd.copy(camLook).sub(camPos).normalize();
  right.copy(fwd).clone().cross(upv).normalize();

  world.camera.position.copy(camPos)
    .addScaledVector(right, S.cam.dx + mouse.x * 24 + shake)
    .addScaledVector(upv, S.cam.dy + breathe - mouse.y * 15)
    .addScaledVector(fwd, -S.cam.dz);
  world.camera.lookAt(
    camLook.x + mouse.x * 8 + right.x * S.cam.dx * 0.25,
    camLook.y - mouse.y * 5 + S.cam.dy * 0.25,
    camLook.z + right.z * S.cam.dx * 0.25,
  );
  if (S.cam.rollDeg) world.camera.rotateZ(S.cam.rollDeg * Math.PI / 180);
  const fovWant = world.baseFov + S.cam.fovAdd;
  if (Math.abs(world.camera.fov - fovWant) > 0.01) {
    world.camera.fov = fovWant;
    world.camera.updateProjectionMatrix();
  }

  /* --- черчение осей и рост здания --- */
  const dA = SCENES[i].draw, dB = SCENES[j].draw;
  const dr = key => lerp(dA[key] ?? 0, dB[key] ?? 0, tt);
  beamX.draw = dr('x');
  beamY.draw = dr('y');
  beamZ.draw = dr('z');
  beamF.draw = dr('final');
  beamX.glow = 0.34 + 0.40 * smooth((p - 0.3) / 0.7);
  beamY.glow = 0.34 + 0.40 * smooth((p - 3.6) / 0.8);
  beamZ.glow = 0.34 + 0.40 * smooth((p - 8.8) / 0.8);
  beamF.glow = 0.34 + 0.40 * smooth((p - 15.4) / 0.8);
  ghostX.glow = clamp(0.06 + 0.05 * smooth((p - 0.35) / 0.65)) * (1 - smooth((p - 4.0) / 0.9));
  ghostY.glow = clamp(0.05 * smooth((p - 3.4) / 0.9)) * (1 - smooth((p - 8.8) / 0.9));

  /* Отработавшая геометрия уходит из кадра. Иначе на оси Y старая ось X
     уходит в точку схода и читается лишней диагональю поперёк кадра. */
  const fadeX = 1 - smooth((p - 4.0) / 1.0);
  const fadeY = 1 - smooth((p - 8.9) / 1.0);
  beamX.glow *= fadeX;
  beamY.glow *= fadeY;

  nodeZero.on = smooth((p - 0.42) / 0.55) * (1 - smooth((p - 4.2) / 1.0));
  nodeCorner.on = smooth((p - 3.4) / 0.6) * (1 - smooth((p - 9.2) / 1.0));
  nodeFinal.on = smooth((p - 15.5) / 0.6);
  forkNodes.forEach((f, n) => {
    const off = n < 2 ? fadeX : fadeY;
    f.mesh.on = smooth((p - f.from) / 0.45) * off;
  });
  branches.forEach(b => {
    const f = smoother((p - b.from) / 0.52);
    b.beam.draw = f;
    b.beam.glow = (0.38 + 0.52 * f) * (b.axis === 'x' ? fadeX : fadeY);
  });

  // здание растёт: доля построенного и номер этажа под камерой
  const fOnA = SCENES[i].floorOn ?? (i > 9 ? 5 : 0);
  const fOnB = SCENES[j].floorOn ?? (j > 9 ? 5 : 0);
  tower.built = clamp(lerp(fOnA, fOnB, tt) / 5);
  tower.active = clamp(p - 10, 0, 4.6);
  tower.ghostOn = (p > 8.6 && p < 14.6) ? 1 : 0;
  // здание появляется только когда сюжет до него дошёл:
  // иначе его верхняя кромка торчала обрезком в кадрах оси X
  tower.visible = p > 8.3;
  tower.spiral.draw = smoother((p - 14.15) / 0.95);
  tower.spiral.glow = 0.5 + 0.8 * smooth((p - 14.2) / 1.0);

  /* --- оптика перехода --- */
  if (optics.flash) optics.flash.style.opacity = (S.world.flash || 0).toFixed(3);
  if (optics.shutter) {
    const sh = S.world.shutter;
    optics.shutter.style.opacity = sh >= 0 ? '1' : '0';
    if (sh >= 0) optics.shutter.style.setProperty('--sw', (sh * 140 - 20).toFixed(2) + '%');
  }

  /* --- повествование --- */
  for (const B of slides) {
    const d = p - B.si;
    const vis = clamp(1 - Math.abs(d) * 1.04);
    if (vis <= 0.002) {
      if (B.el.style.visibility !== 'hidden') {
        B.el.style.visibility = 'hidden'; B.el.style.opacity = '0';
      }
      continue;
    }
    B.el.style.visibility = 'visible';
    const active = inTransit && ((d > 0 && B.si === i) || (d < 0 && B.si === j));
    const st = active ? (d > 0 ? S.out : S.in)
      : { x: 0, y: 0, scale: 1, opacity: 1, blur: 0, rot: 0, rotY: 0 };

    B.el.style.opacity = (Math.pow(vis, 1.25) * st.opacity).toFixed(3);
    B.el.style.filter = st.blur > 0.15 ? `blur(${st.blur.toFixed(2)}px)` : 'none';
    B.el.style.transform = slideTransform(st);
    for (const pin of B.pins) {
      const dep = parseFloat(pin.dataset.d || '1');
      pin.style.setProperty('--px', (mouse.x * -13 * dep).toFixed(2) + 'px');
      pin.style.setProperty('--py', (mouse.y * -8 * dep).toFixed(2) + 'px');
    }
    revealGroups(B, clamp(d + 1));
  }

  /* --- подписи объектов в мире --- */
  for (const M of marks) {
    const d = p - M.si;
    const vis = clamp(1 - Math.abs(d) * 1.04);
    if (vis <= 0.002) {
      if (M.el.style.visibility !== 'hidden') {
        M.el.style.visibility = 'hidden'; M.el.style.opacity = '0';
      }
      continue;
    }
    const pr = world.project(M.at);
    if (pr.z > 1) { M.el.style.opacity = '0'; continue; }
    M.el.style.visibility = 'visible';
    const dist = world.distanceTo(M.at);
    const s = clamp(1500 / Math.max(dist, 1), 0.5, 1.5);
    M.el.style.opacity = Math.pow(vis, 1.3).toFixed(3);
    M.el.style.transform =
      `translate3d(${pr.x.toFixed(1)}px, ${pr.y.toFixed(1)}px, 0) ` +
      `translate(${M.align === 'right' ? '-100%' : M.align === 'left' ? '0' : '-50%'}, -50%) ` +
      `scale(${s.toFixed(3)})`;
    revealGroups(M, clamp(d + 1));
  }

  for (const L of labels) {
    const on = smooth((p - L.from) / 0.5) * (1 - smooth((p - L.until) / 0.6));
    if (on < 0.01) { L.el.style.opacity = '0'; continue; }
    const pr = world.project(L.at);
    const dist = world.distanceTo(L.at);
    const s = clamp(1500 / Math.max(dist, 1), 0.45, 1.2);
    L.el.style.transform =
      `translate3d(${pr.x.toFixed(1)}px,${pr.y.toFixed(1)}px,0) translate(-50%,-50%) scale(${s.toFixed(3)})`;
    L.el.style.opacity = pr.z > 1 ? '0' : (0.9 * on).toFixed(3);
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
  tower.tick(time);
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
  window.addEventListener('resize', () => { setUnit(); world.resize(); fitSlides(); });
  rail.goto(0, { snap: true });
  requestAnimationFrame(frame);
  await new Promise(r => setTimeout(r, 140));
  document.body.dataset.ready = '1';
}
boot();

window.__deck = {
  rail, world, count: SCENES.length,
  scenes: SCENES.map(s => s.id),
  transitions: TRANSITIONS,
  go(i) { rail.goto(i, { snap: true }); },
  set(v) { rail.p = v; rail.target = Math.round(v); rail.v = 0; rail.scrubbing = false; },
};
