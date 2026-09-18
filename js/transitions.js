/* ============================================================
   ПЕРЕХОДЫ

   Каждый переход — именованная схема. Она получает долю перегона
   t (0…1) и возвращает, что сделать с камерой, с уходящим слайдом
   и с приходящим. Схема живёт на перегоне между двумя сценами,
   и на неё же опирается проверка разнообразия: одна схема не
   больше 40 % перегонов, соседние перегоны не повторяются.

   Правило, которое здесь важнее всех: графика ЧЕРТИТСЯ и ЕДЕТ,
   а не появляется. Поэтому любое «исчезновение» — это уход в
   сторону, вглубь или схлопывание в точку, но никогда не просто
   изменение прозрачности.
   ============================================================ */

const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
const smoother = t => { t = clamp(t); return t * t * t * (t * (t * 6 - 15) + 10); };
/* разгон и торможение как у тяжёлой камеры: долго берёт с места, резко идёт, мягко встаёт */
const expoInOut = t => {
  t = clamp(t);
  if (t === 0 || t === 1) return t;
  return t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2;
};
const backOut = (t, s = 1.24) => { t = clamp(t) - 1; return t * t * ((s + 1) * t + s) + 1; };

/* Каждая схема возвращает:
     cam   {dx, dy, dz, rollDeg, fovAdd}  — добавка к кадру камеры
     out   {x, y, scale, opacity, blur, rot}  — что делаем с уходящим
     in    {…}                                — с приходящим
     world {shutter, flash, shake}            — эффекты сцены
*/

export const SCHEMES = {

  /* 1. Кнут: камера уводит вбок, кадр смазывается, новый прилетает следом.
        Самый быстрый и злой переход — для смены темы внутри одной оси. */
  whip: (t) => {
    const e = expoInOut(t);
    const peak = Math.sin(Math.PI * t);
    return {
      cam: { dx: peak * -520, dy: peak * 24, dz: peak * 90, rollDeg: peak * -2.4, fovAdd: peak * 6 },
      out: { x: -e * 46, scale: 1 - e * 0.06, opacity: 1 - smooth(t / 0.42), blur: peak * 13, rot: peak * -1.6 },
      in: { x: (1 - e) * 46, scale: 0.94 + e * 0.06, opacity: smooth((t - 0.5) / 0.44), blur: (1 - e) * 11, rot: (1 - e) * 1.6 },
      world: { shake: peak * 0.9 },
    };
  },

  /* 2. Врез: камера падает в узел, узел вспыхивает и раскрывается новой сценой.
        Для моментов «и вот что внутри». */
  punch: (t) => {
    const e = expoInOut(t);
    const peak = Math.sin(Math.PI * t);
    return {
      cam: { dx: 0, dy: 0, dz: -peak * 560, rollDeg: 0, fovAdd: -peak * 9 },
      out: { x: 0, y: 0, scale: 1 + e * 0.5, opacity: 1 - smooth(t / 0.40), blur: e * 16 },
      in: { x: 0, y: 0, scale: 0.72 + e * 0.28, opacity: smooth((t - 0.46) / 0.46), blur: (1 - e) * 14 },
      world: { flash: Math.pow(peak, 3) * 0.85 },
    };
  },

  /* 3. Поворот плоскости: камера разворачивается на новую ось.
        Ключевой вау-момент X→Y и Y→Z — зритель физически чувствует смену плоскости. */
  flip: (t) => {
    const e = expoInOut(t);
    const peak = Math.sin(Math.PI * t);
    return {
      cam: { dx: 0, dy: peak * 70, dz: peak * 320, rollDeg: peak * 3.2, fovAdd: peak * 10 },
      out: { x: 0, y: -e * 20, scale: 1 - e * 0.22, opacity: 1 - smooth(t / 0.34), blur: e * 12, rotY: -e * 62 },
      in: { x: 0, y: (1 - e) * 26, scale: 0.86 + e * 0.14, opacity: smooth((t - 0.52) / 0.42), blur: (1 - e) * 10, rotY: (1 - e) * 62 },
      world: { shake: peak * 0.5, flash: Math.pow(peak, 4) * 0.5 },
    };
  },

  /* 4. Шторка лучом: по кадру проходит неоновая полоса и меняет содержимое
        ровно там, где прошла. Чертящееся движение, а не затухание. */
  shutter: (t) => {
    const e = smoother(t);
    return {
      cam: { dx: e * 40 - 20, dy: 0, dz: 0, rollDeg: 0, fovAdd: 0 },
      out: { x: -e * 12, scale: 1 - e * 0.02, opacity: 1 - smooth((t - 0.30) / 0.22), blur: e * 4 },
      in: { x: (1 - e) * 12, scale: 0.985 + e * 0.015, opacity: smooth((t - 0.48) / 0.26), blur: (1 - e) * 4 },
      world: { shutter: t },
    };
  },

  /* 5. Подъём: камера идёт вверх вдоль растущего здания. Ось Z. */
  rise: (t) => {
    const e = expoInOut(t);
    const peak = Math.sin(Math.PI * t);
    return {
      cam: { dx: 0, dy: 0, dz: peak * 150, rollDeg: 0, fovAdd: peak * 4 },
      out: { x: 0, y: -e * 60, scale: 1 - e * 0.05, opacity: 1 - smooth(t / 0.38), blur: e * 9 },
      in: { x: 0, y: (1 - e) * 70, scale: 0.95 + e * 0.05, opacity: smooth((t - 0.48) / 0.44), blur: (1 - e) * 8 },
      world: {},
    };
  },

  /* 6. Облёт: камера обходит объект по дуге. Для спирали вокруг здания. */
  orbit: (t) => {
    const e = smoother(t);
    const peak = Math.sin(Math.PI * t);
    return {
      cam: { dx: Math.sin(t * Math.PI) * 420, dy: peak * 40, dz: peak * -120, rollDeg: peak * 1.6, fovAdd: 0 },
      out: { x: -e * 30, scale: 1 - e * 0.04, opacity: 1 - smooth(t / 0.40), blur: e * 7 },
      in: { x: (1 - e) * 30, scale: 0.96 + e * 0.04, opacity: smooth((t - 0.5) / 0.42), blur: (1 - e) * 6 },
      world: {},
    };
  },

  /* 7. Схлопывание в точку: содержимое собирается в узел и оттуда же
        разлетается новым. Для возврата к оси после длинной ветки. */
  collapse: (t) => {
    const e = expoInOut(t);
    const peak = Math.sin(Math.PI * t);
    return {
      cam: { dx: 0, dy: 0, dz: peak * 220, rollDeg: peak * -1.2, fovAdd: 0 },
      out: { x: 0, y: 0, scale: 1 - e * 0.82, opacity: 1 - smooth((t - 0.10) / 0.36), blur: e * 6 },
      in: { x: 0, y: 0, scale: 0.18 + backOut(clamp((t - 0.46) / 0.54)) * 0.82, opacity: smooth((t - 0.46) / 0.30), blur: 0 },
      world: { flash: Math.pow(peak, 5) * 0.7 },
    };
  },

  /* 8. Проезд вдоль оси: спокойная езда, которой держится весь рассказ.
        Схема по умолчанию между соседними развилками одной оси. */
  travel: (t) => {
    const e = smoother(t);
    const peak = Math.sin(Math.PI * t);
    return {
      cam: { dx: 0, dy: peak * 40, dz: peak * 200, rollDeg: 0, fovAdd: 0 },
      out: { x: -e * 22, scale: 1 + e * 0.06, opacity: 1 - smooth(t / 0.45), blur: e * 6 },
      in: { x: (1 - e) * 22, scale: 0.95 + e * 0.05, opacity: smooth((t - 0.5) / 0.45), blur: (1 - e) * 5 },
      world: {},
    };
  },
};

export const SCHEME_NAMES = Object.keys(SCHEMES);

/** применяет схему; безопасно возвращает нейтральное состояние вне перегона */
export function applyScheme(name, t) {
  const fn = SCHEMES[name] || SCHEMES.travel;
  const r = fn(clamp(t));
  return {
    cam: { dx: 0, dy: 0, dz: 0, rollDeg: 0, fovAdd: 0, ...r.cam },
    out: { x: 0, y: 0, scale: 1, opacity: 1, blur: 0, rot: 0, rotY: 0, ...r.out },
    in: { x: 0, y: 0, scale: 1, opacity: 1, blur: 0, rot: 0, rotY: 0, ...r.in },
    world: { shutter: -1, flash: 0, shake: 0, ...r.world },
  };
}

/** css-строка трансформации для слайда */
export function slideTransform(s) {
  return `translate3d(${s.x.toFixed(2)}%, ${(s.y || 0).toFixed(2)}%, 0) ` +
    `rotate(${(s.rot || 0).toFixed(2)}deg) ` +
    `perspective(1600px) rotateY(${(s.rotY || 0).toFixed(2)}deg) ` +
    `scale(${s.scale.toFixed(4)})`;
}
