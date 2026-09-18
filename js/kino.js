/* ============================================================
   КИНО-СКРАБ

   Скролл не листает секции — он перематывает снятый пролёт.
   `currentTime` видео = доля прокрутки героя. Поверх идут
   короткие биты текста, каждый на своём отрезке прогресса.

   Три вещи, без которых скраб выглядит дёшево:
   1. Инерция. Сырой скролл даёт рывки; ведём видео к цели
      пружиной, тогда картинка идёт как на монтажном столе.
   2. Короткий GOP при кодировании (сделан в render_flight.py).
      Иначе браузер на каждой перемотке доходит до ближайшего
      ключевого кадра и видео дёргается.
   3. Ожидание готовности. Пока кадры не декодированы, скраб
      показывает чёрное — поэтому герой не стартует, пока
      видео не отдаст первый кадр.
   ============================================================ */
import { BEATS } from './flight.js';

const hero = document.getElementById('hero');
const video = document.getElementById('flight');
const beatsBox = document.getElementById('beats');
const boot = document.getElementById('boot');

const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };

/* ---------- биты текста ---------- */
const beatEls = BEATS.map(b => {
  const el = document.createElement('div');
  el.className = 'beat' + (b.big ? ' big' : '');
  el.innerHTML = `
    <div class="beat-in">
      ${b.kicker ? `<div class="t-kicker">${b.kicker}</div>` : ''}
      <div class="${b.big ? 't-mega' : 't-h1'}">${b.title}</div>
      ${b.lead ? `<p class="t-lead">${b.lead}</p>` : ''}
    </div>`;
  beatsBox.appendChild(el);
  return { ...b, el };
});

/* ---------- прогресс героя ---------- */
let target = 0, current = 0, duration = 0;

function heroProgress() {
  const r = hero.getBoundingClientRect();
  const total = hero.offsetHeight - window.innerHeight;
  return clamp(-r.top / Math.max(total, 1));
}

function paint() {
  // пружина: скачок скролла превращается в плавный ход камеры
  current += (target - current) * 0.12;
  if (Math.abs(target - current) < 0.00015) current = target;

  if (duration) {
    const t = current * duration;
    // seek дороже, чем присвоение: не трогаем видео на микросдвигах
    if (Math.abs(video.currentTime - t) > 1 / 60) video.currentTime = t;
  }

  for (const b of beatEls) {
    // бит живёт на своём отрезке: въезжает, держится, уезжает
    const inn = smooth((current - b.a) / 0.045);
    const out = 1 - smooth((current - (b.b - 0.045)) / 0.045);
    const v = clamp(Math.min(inn, out));
    b.el.style.setProperty('--v', v.toFixed(3));
    b.el.style.visibility = v < 0.004 ? 'hidden' : 'visible';
  }

  requestAnimationFrame(paint);
}

function onScroll() { target = heroProgress(); }
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', onScroll);

/* ---------- старт ---------- */
function start() {
  duration = video.duration || 0;
  onScroll();
  current = target;
  requestAnimationFrame(paint);
  document.body.dataset.ready = '1';
  if (boot) boot.remove();
}

if (video.readyState >= 2) {
  start();
} else {
  video.addEventListener('loadeddata', start, { once: true });
  video.addEventListener('error', () => {
    // без видео страница всё равно должна читаться
    document.body.dataset.ready = '1';
    document.body.dataset.novideo = '1';
    if (boot) boot.remove();
  }, { once: true });
}
/* на мобильных Safari видео не отдаёт кадры, пока его не «тронули» */
video.play().then(() => video.pause()).catch(() => {});

/* ---------- появление секций под героем ---------- */
const io = new IntersectionObserver((items) => {
  for (const it of items) {
    if (it.isIntersecting) {
      it.target.dataset.seen = '1';
      io.unobserve(it.target);
    }
  }
}, { rootMargin: '-12% 0px -12% 0px' });
document.querySelectorAll('[data-reveal]').forEach(el => io.observe(el));

window.__kino = {
  set(p) { target = clamp(p); current = target; onScroll.skip = true; },
  get progress() { return current; },
  beats: BEATS.length,
};
