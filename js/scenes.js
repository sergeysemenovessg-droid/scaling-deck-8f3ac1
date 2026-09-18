/* ============================================================
   ВСЕ СЦЕНЫ. Смысл, порядок и формулировки — из SPEC.md, дословно.

   Камера идёт по миру настоящим маршрутом: подлетает, отлетает,
   обходит объект, разворачивается на новую плоскость. У каждой
   сцены свой ракурс — азимут, высота и дистанция считаются,
   а не подбираются на глаз.

   Мир:
     ось X   (0,0,0) → (3600,0,0)      — зачем бизнес
     ось Y   (3600,0,0) → в глубину −Z — продукт
     ось Z   здание на (3600,0,−3600)  — компания, растёт вверх
     финал   новая ось OX у (6400,0,−3600)

   Текст делится на два слоя: повествование приколото к кадру,
   а подписи объектов живут в мире и поэтому честно едут вместе
   с камерой при любом облёте.
   ============================================================ */

export const AX = { len: 3600 };
export const FORK1_X = 1180;
export const FORK2_X = 2420;

export const Y0 = [3600, 0, 0];
export const Y_LEN = 3200;
export const FORK3_Z = -1100;
export const FORK4_Z = -2300;

export const TOWER_AT = [3600, 0, -3600];
export const FLOOR_H = 470;
export const TOWER_TOP = FLOOR_H * 5;

export const FINAL_X = 6400;
export const FINAL_LEN = 2600;
export const FINAL_Z = -3600;

/* Развилки: длина и угол посчитаны под кадр — концы ветвей приходят
   ровно туда, где стоят подписи вариантов. */
export const BRANCH = { len: 622, angle: 40.6 };

export const BRANCHES = [
  { axis: 'x', at: FORK1_X, dir: -1, from: 1.34, color: 'blue' },
  { axis: 'x', at: FORK1_X, dir: +1, from: 1.44, color: 'mint' },
  { axis: 'x', at: FORK2_X, dir: -1, from: 2.34, color: 'mint' },
  { axis: 'x', at: FORK2_X, dir: +1, from: 2.44, color: 'blue' },
  { axis: 'y', at: FORK3_Z, dir: -1, from: 4.40, color: 'mag' },
  { axis: 'y', at: FORK3_Z, dir: +1, from: 4.50, color: 'blue' },
  { axis: 'y', at: FORK4_Z, dir: -1, from: 7.40, color: 'mint' },
  { axis: 'y', at: FORK4_Z, dir: +1, from: 7.50, color: 'blue' },
];

/* ------------------------------------------------------------
   Камера. Ракурс задаётся не парой чисел, а положением на сфере
   вокруг точки интереса: азимут, подъём, дистанция. Тогда облёт
   получается сам собой — достаточно менять азимут между сценами.
   azim 0°  — камера со стороны +Z, смотрим вдоль −Z (так видна ось X)
   azim 90° — камера со стороны +X, смотрим вдоль −X (так видна ось Y)
   ------------------------------------------------------------ */
const rad = d => d * Math.PI / 180;

export function orbit(center, { azim = 0, elev = 9, dist = 1400, lift = 0, tilt = 0 }) {
  const [cx, cy, cz] = center;
  const h = Math.cos(rad(elev)) * dist;
  return {
    pos: [cx + Math.sin(rad(azim)) * h,
    cy + Math.sin(rad(elev)) * dist + lift,
    cz + Math.cos(rad(azim)) * h],
    look: [cx, cy + tilt, cz],
  };
}

export const SCENES = [

/* ════════════════ 0. ОБЛОЖКА ════════════════ */
{
  id: 'cover', axis: '—', cine: true, layout: 'cover',
  draw: { x: 0 },
  cam: { pos: [-240, 330, 2420], look: [230, 90, 200] },
  screen: `
    <div class="pin" style="left:var(--gutter);top:50%;--tx:0;--ty:-50%" data-w="cover-text">
      <div class="stack gap5">
        <div class="t-kicker" data-r="0">ESSG · Conceptual Consulting</div>
        <h1 class="t-mega" data-r="1">Масштабирование<br>среднего бизнеса<br>до уровня крупного</h1>
        <div class="t-h2 mint" style="font-weight:300;margin-top:var(--s3)" data-r="2">через бизнес-осознанность</div>
      </div>
    </div>
    <div class="pin" style="right:var(--gutter);top:50%;--tx:0;--ty:-50%" data-d="1.5" data-w="cover-portrait">
      <div class="stack gap4">
        <div class="plate" style="aspect-ratio:1636/1800" data-r="3">
          <img src="media/photo/portrait_tux.png" alt="Сергей Семенов">
          <div class="rim"></div><div class="bevel"></div>
        </div>
        <div class="who-line" data-r="4">
          <b class="t-h3">Сергей Семенов</b>
          <span class="t-body" style="line-height:1.45">Основатель консалтингового<br>бренда по развитию бизнеса с ИИ</span>
          <span class="logomark bare" style="margin-top:var(--s2)"><img src="media/logo/essg.png" alt="ESSG"></span>
        </div>
      </div>
    </div>`,
},

/* ════════════════ 1. СИСТЕМА КООРДИНАТ ════════════════ */
{
  id: 'axes', axis: 'ось X', layout: 'axes',
  draw: { x: 0.21 },
  /* камера падает сверху к уровню оси — отсюда ощущение прилёта */
  cam: { pos: [430, 360, 1520], look: [600, 130, 0], via: [120, 1500, 2300] },
  screen: `
    <div class="pin" style="left:var(--gutter);top:13%;--tx:0;--ty:0" data-w="axes-text">
      <div class="stack gap5">
        <div class="t-kicker" data-r="0">система координат бизнеса</div>
        <h2 class="t-h1" data-r="1">Сначала разбираемся<br>со смыслом бизнеса</h2>
        <p class="t-lead" data-r="2" style="max-width:30em">
          Ось&nbsp;X отвечает на вопрос, <span class="em">зачем нужен бизнес
          и какой бизнес мы строим</span>. На ней две развилки — и обе придётся пройти.
        </p>
        <ul class="bullets t-body" data-r="3">
          <li><i class="mk"></i><span><em>Кэш или капитализация</em> — чем измеряем успех</span></li>
          <li><i class="mk"></i><span><em>Глобальный или локальный тренд</em> — чему соответствуем</span></li>
        </ul>
      </div>
    </div>`,
},

/* ════════════════ 2. КЭШ ИЛИ КАПИТАЛИЗАЦИЯ ════════════════ */
{
  id: 'fork-cash', axis: 'ось X · развилка 1', layout: 'fork',
  draw: { x: 0.44 },
  cam: { pos: [FORK1_X, 330, 1380], look: [FORK1_X, 120, 0] },
  world: [
    { at: [FORK1_X - 472, 405, 0], w: 320, align: 'right', html: `
      <div class="wnode" data-r="1">
        <div class="node glass blue"><i class="dot"></i>Cash</div>
        <p class="t-body">Малый и средний бизнес говорит:
          <span class="em">«нам, бро, только про кэш»</span></p>
      </div>` },
    { at: [FORK1_X + 472, 405, 0], w: 320, align: 'left', html: `
      <div class="wnode" data-r="1">
        <div class="node glass"><i class="dot"></i>Capitalization</div>
        <p class="t-body">Крупные международные компании
          <span class="em">мыслят капитализацией</span></p>
      </div>` },
    { at: [FORK1_X, 500, 0], w: 0, align: 'center', html: `
      <div class="vs" data-r="2"><span>или</span></div>` },
  ],
  screen: `
    <div class="pin" style="left:var(--gutter);top:7.5%;--tx:0;--ty:0">
      <div class="t-kicker" data-r="0">развилка 1 — чем измеряем успех</div>
    </div>
    <div class="pin" style="left:50%;top:46%;--tx:-50%;--ty:-50%">
      <div class="q-mark" data-r="3">
        <div class="vs mag-q"><span>?</span></div>
        <p class="t-quote">Нужно определиться, <i>куда идём</i></p>
      </div>
    </div>
    <div class="pin" style="left:50%;top:62%;--tx:-50%;--ty:0" data-d="1.6" data-w="fork-shot">
      <figure class="shot" data-r="4">
        <div class="plate" style="aspect-ratio:2528/1146">
          <img src="media/photo/expo_dubai.png" alt="EXPO, Дубай">
          <div class="rim"></div><div class="bevel"></div><div class="deep"></div>
        </div>
        <figcaption class="caption"><b>EXPO, Дубай</b>
          <span>панельная сессия «New Age Energy» · EXPO 2020</span></figcaption>
      </figure>
    </div>`,
},

/* ════════════════ 3. ГЛОБАЛЬНЫЙ ИЛИ ЛОКАЛЬНЫЙ ТРЕНД ════════════════ */
{
  id: 'fork-trend', axis: 'ось X · развилка 2', layout: 'fork',
  draw: { x: 0.76 },
  /* заезжаем по дуге слева-сверху — не повторяем прямой наезд прошлой сцены */
  cam: { pos: [FORK2_X, 330, 1380], look: [FORK2_X, 120, 0], via: [FORK2_X - 900, 620, 1750] },
  world: [
    { at: [FORK2_X - 472, 405, 0], w: 320, align: 'right', html: `
      <div class="wnode" data-r="1">
        <div class="node glass"><i class="dot"></i>Global</div>
        <p class="t-body">У Росатома — <span class="em">устойчивое развитие, капитализация,
          доступная энергия</span>. Отсюда экспансия в разные страны и города.</p>
      </div>` },
    { at: [FORK2_X + 472, 405, 0], w: 320, align: 'left', html: `
      <div class="wnode" data-r="1">
        <div class="node glass blue"><i class="dot"></i>Local</div>
        <p class="t-body">Стратегическая сессия Росатома:
          тренды энергетики, цифровизация, устойчивое развитие.</p>
      </div>` },
    { at: [FORK2_X, 500, 0], w: 0, align: 'center', html: `
      <div class="vs" data-r="2"><span>или</span></div>` },
  ],
  screen: `
    <div class="pin" style="left:var(--gutter);top:7.5%;--tx:0;--ty:0">
      <div class="t-kicker" data-r="0">развилка 2 — какому тренду соответствуем</div>
    </div>
    <div class="pin" style="left:50%;top:46%;--tx:-50%;--ty:-50%">
      <div class="q-mark" data-r="3">
        <div class="vs mag-q"><span>?</span></div>
        <p class="t-quote">Какому тренду <i>соответствует твой бизнес</i></p>
      </div>
    </div>
    <div class="pin" style="left:15.5%;top:62%;--tx:-50%;--ty:0" data-d="1.4" data-w="trend-global">
      <div class="person" data-r="4">
        <div class="frame"><img src="media/photo/likhachev.png" alt="Алексей Лихачёв">
          <div class="bevel"></div><div class="glowline"></div></div>
        <div class="who row">
          <span class="logomark bare"><img src="media/logo/rosatom.png" alt="Росатом"></span>
          <span class="names"><b>Алексей Лихачёв</b><span>Росатом</span></span>
        </div>
      </div>
    </div>
    <div class="pin" style="left:63%;top:62%;--tx:-50%;--ty:0" data-d="1.4" data-w="trend-local">
      <div class="trio" data-r="5" style="width:100%">
        <div class="person"><div class="frame"><img src="media/photo/chubais.png" alt="Анатолий Чубайс">
          <div class="bevel"></div><div class="glowline"></div></div>
          <div class="who"><b>Анатолий Чубайс</b><span>о трендах энергетики</span></div></div>
        <div class="person"><div class="frame"><img src="media/photo/gref.png" alt="Герман Греф">
          <div class="bevel"></div><div class="glowline"></div></div>
          <div class="who"><b>Герман Греф</b><span>о цифровизации</span></div></div>
        <div class="person"><div class="frame"><img src="media/photo/semenov.png" alt="Сергей Семенов">
          <div class="bevel"></div><div class="glowline"></div></div>
          <div class="who"><b>Сергей Семенов</b><span>об устойчивом развитии</span></div></div>
      </div>
    </div>`,
},

/* ════════════════ 4. ПОВОРОТ НА ОСЬ Y ════════════════
   Ключевой вау-момент: камера поднимается над концом оси X,
   обходит угол и разворачивается на 90°. */
{
  id: 'turn-y', axis: 'поворот на ось Y', cine: true, layout: 'turn',
  draw: { x: 1, y: 0.16 },
  cam: {
    ...orbit([3600, 150, -260], { azim: 52, elev: 16, dist: 1560 }),
    via: [3100, 1750, 1500],
  },
  world: [
    { at: [3600, 300, -900], w: 300, align: 'center', html: `
      <div class="wnode center" data-r="2"><div class="node glass"><i class="dot"></i>Продукт</div></div>` },
  ],
  screen: `
    <div class="pin" style="left:var(--gutter);top:14%;--tx:0;--ty:0" data-w="axes-text">
      <div class="stack gap5">
        <div class="t-kicker" data-r="0">ось Y — продукт</div>
        <h2 class="t-h1" data-r="1">Определились с направлением —<br>переходим к продукту</h2>
        <p class="t-lead" data-r="3" style="max-width:26em">
          Это другая категория мышления. Ось&nbsp;Y раскрывается
          <span class="em">перпендикулярно оси&nbsp;X</span>.
        </p>
      </div>
    </div>`,
},

/* ════════════════ 5. ГДЕ ИСКАТЬ ИННОВАЦИИ ════════════════ */
{
  id: 'fork-innov', axis: 'ось Y · развилка 3', layout: 'fork-y',
  draw: { x: 1, y: 0.42 },
  cam: orbit([3600, 150, FORK3_Z], { azim: 90, elev: 9, dist: 1380 }),
  world: [
    { at: [3600, 405, FORK3_Z + 472], w: 250, align: 'right', html: `
      <div class="wnode" data-r="1"><div class="node glass mag"><i class="dot"></i>RED</div>
        <p class="t-body">алый океан</p></div>` },
    { at: [3600, 405, FORK3_Z - 472], w: 250, align: 'left', html: `
      <div class="wnode" data-r="1"><div class="node glass blue"><i class="dot"></i>BLUE</div>
        <p class="t-body">голубой океан</p></div>` },
    { at: [3600, 500, FORK3_Z], w: 0, align: 'center', html: `
      <div class="vs" data-r="2"><span>или</span></div>` },
  ],
  screen: `
    <div class="pin" style="left:var(--gutter);top:7.5%;--tx:0;--ty:0">
      <div class="t-kicker" data-r="0">развилка 3 — где искать инновации</div>
    </div>
    <div class="pin" style="left:50%;top:52%;--tx:-50%;--ty:-50%" data-w="mid-claim">
      <div class="claim glass" data-r="3">
        <div class="t-label" style="color:var(--mint)">MIT</div>
        <p class="t-h3">Искать инновации <span class="mint">на существующем рынке</span></p>
        <p class="t-body">Теория алого и голубого океанов уже не актуальна.</p>
      </div>
    </div>
    <div class="pin" style="left:50%;top:84%;--tx:-50%;--ty:-50%">
      <div class="t-micro" data-r="4">два кейса — Schneider Electric и РУСАЛ</div>
    </div>`,
},

/* ════════════════ 6. КЕЙС SCHNEIDER ELECTRIC ════════════════ */
{
  id: 'case-schneider', axis: 'кейс · Schneider Electric', layout: 'case',
  draw: { x: 1, y: 0.52 },
  /* камера ныряет к кейсу сбоку и снизу — ракурс, которого ещё не было */
  cam: orbit([3600, 300, FORK3_Z - 460], { azim: 118, elev: -4, dist: 1180 }),
  screen: `
    <div class="pin" style="left:var(--gutter);top:7.5%;--tx:0;--ty:0">
      <div class="t-kicker" data-r="0">кейс 1 — инновация на существующем рынке</div>
    </div>
    <div class="pin" style="left:9%;top:50%;--tx:0;--ty:-50%" data-w="case-text">
      <div class="stack gap4">
        <h2 class="t-h2" data-r="1">Schneider Electric</h2>
        <p class="t-lead" data-r="2" style="max-width:24em">
          Продажа оборудования превратилась в <span class="em">консалтинг инноваций</span>.
          Это подняло капитализацию компании.</p>
        <p class="t-micro" data-r="3">Сергей Семенов — вице-президент Schneider Electric</p>
      </div>
    </div>
    <div class="pin" style="right:9%;top:50%;--tx:0;--ty:-50%" data-d="1.5" data-w="case-shot">
      <div class="duo" data-r="4">
        <figure class="shot"><div class="plate cut" style="aspect-ratio:1/1">
          <img src="media/photo/transformer.png" alt="Трансформатор"></div>
          <figcaption class="caption"><b>Оборудование</b><span>трансформатор</span></figcaption></figure>
        <figure class="shot"><div class="plate cut archive" style="aspect-ratio:3/4">
          <img src="media/photo/consultant.png" alt="Консультант"></div>
          <figcaption class="caption"><b>Консалтинг</b><span>направление инноваций</span></figcaption></figure>
      </div>
    </div>`,
},

/* ════════════════ 7. КЕЙС РУСАЛ ════════════════ */
{
  id: 'case-rusal', axis: 'кейс · РУСАЛ', layout: 'case',
  draw: { x: 1, y: 0.62 },
  /* зеркальный ракурс к прошлой сцене: облетаем на другую сторону оси */
  cam: orbit([3600, 300, FORK3_Z - 900], { azim: 62, elev: 13, dist: 1220 }),
  screen: `
    <div class="pin" style="left:var(--gutter);top:7.5%;--tx:0;--ty:0">
      <div class="t-kicker" data-r="0">кейс 2 — инновация на существующем рынке</div>
    </div>
    <div class="pin" style="right:9%;top:50%;--tx:0;--ty:-50%" data-w="case-text">
      <div class="stack gap4" style="align-items:flex-end;text-align:right">
        <h2 class="t-h2" data-r="1">РУСАЛ</h2>
        <p class="t-lead" data-r="2" style="max-width:24em">
          Подключил мощности <span class="em">напрямую к гидроэлектростанции</span>
          и заявил первый в мире углеродно-нейтральный алюминий.</p>
      </div>
    </div>
    <div class="pin" style="left:9%;top:50%;--tx:0;--ty:-50%" data-d="1.5" data-w="case-shot">
      <div class="duo" data-r="3">
        <figure class="shot"><div class="plate" style="aspect-ratio:383/267">
          <img src="media/photo/hpp.png" alt="Гидроэлектростанция">
          <div class="rim"></div><div class="bevel"></div><div class="deep"></div></div>
          <figcaption class="caption"><b>Гидроэлектростанция</b><span>прямое подключение</span></figcaption></figure>
        <figure class="shot"><div class="plate cut" style="aspect-ratio:1/1">
          <img src="media/photo/aluminium.png" alt="Алюминий"></div>
          <figcaption class="caption"><b>Алюминий</b><span>углеродно-нейтральный</span></figcaption></figure>
      </div>
    </div>`,
},

/* ════════════════ 8. PUSH ИЛИ PULL ════════════════ */
{
  id: 'fork-pull', axis: 'ось Y · развилка 4', layout: 'fork-y',
  draw: { x: 1, y: 0.86 },
  cam: orbit([3600, 150, FORK4_Z], { azim: 90, elev: 7, dist: 1420 }),
  world: [
    { at: [3600, 405, FORK4_Z + 472], w: 260, align: 'right', html: `
      <div class="wnode" data-r="1"><div class="node glass"><i class="dot"></i>PUSH</div>
        <p class="t-body">сами достучаться до каждого</p></div>` },
    { at: [3600, 405, FORK4_Z - 472], w: 260, align: 'left', html: `
      <div class="wnode" data-r="1"><div class="node glass blue"><i class="dot"></i>PULL</div>
        <p class="t-body">создать спрос, чтобы приходили сами</p></div>` },
    { at: [3600, 500, FORK4_Z], w: 0, align: 'center', html: `
      <div class="vs" data-r="2"><span>или</span></div>` },
  ],
  screen: `
    <div class="pin" style="left:var(--gutter);top:7.5%;--tx:0;--ty:0">
      <div class="t-kicker" data-r="0">развилка 4 — механика спроса</div>
    </div>
    <div class="pin" style="left:50%;top:58%;--tx:-50%;--ty:0" data-d="1.4" data-w="pull-row">
      <div class="trio evidence" data-r="3">
        <figure class="shot"><div class="plate cut" style="aspect-ratio:1/1">
          <img src="media/logo/apple.png" alt="Apple"></div>
          <figcaption class="caption"><b>iPhone</b><span>не бывает распродаж</span></figcaption></figure>
        <figure class="shot"><div class="plate cut archive" style="aspect-ratio:436/267">
          <img src="media/photo/mmm.png" alt="МММ"></div>
          <figcaption class="caption"><b>МММ</b><span>архив · очереди за билетами</span></figcaption></figure>
        <figure class="shot"><div class="plate archive" style="aspect-ratio:317/212">
          <img src="media/photo/award.png" alt="Премия">
          <div class="rim"></div><div class="bevel"></div><div class="deep"></div></div>
          <figcaption class="caption"><b>Премия</b><span>архив · первая в России в области устойчивого развития</span></figcaption></figure>
      </div>
    </div>
    <div class="pin" style="left:50%;top:44%;--tx:-50%;--ty:-50%">
      <p class="t-quote center" data-r="4">Так сформировался устойчивый спрос на услуги ESSG
        <i>как лидера в ИИ и устойчивом развитии</i></p>
    </div>`,
},

/* ════════════════ 9. ПОВОРОТ НА ОСЬ Z ════════════════ */
{
  id: 'turn-z', axis: 'поворот на ось Z', cine: true, layout: 'turn',
  draw: { x: 1, y: 1, z: 1 },
  /* камера отлетает, обходит основание здания и задирается вверх */
  cam: {
    ...orbit([3600, 900, -3600], { azim: 128, elev: 12, dist: 3400 }),
    via: [4500, 2400, -2000],
  },
  screen: `
    <div class="pin" style="left:var(--gutter);top:14%;--tx:0;--ty:0" data-w="axes-text">
      <div class="stack gap5">
        <div class="t-kicker" data-r="0">ось Z — компания</div>
        <h2 class="t-h1" data-r="1">Ось&nbsp;X — зачем бизнес.<br>Ось&nbsp;Y — продукт.<br>Ось&nbsp;Z — компания.</h2>
        <p class="t-lead" data-r="2" style="max-width:26em">
          Реализация стратегии. Компания состоит из
          <span class="em">пяти ключевых функций</span> — здание растёт этаж за этажом.</p>
      </div>
    </div>
    <div class="pin" style="right:var(--gutter);top:50%;--tx:0;--ty:-50%" data-w="fn-list">
      <ol class="floors" data-r="3">
        <li><b>05</b><span>IT</span></li>
        <li><b>04</b><span>Менеджмент</span></li>
        <li><b>03</b><span>Маркетинг</span></li>
        <li><b>02</b><span>HR</span></li>
        <li><b>01</b><span>Продажи</span></li>
      </ol>
    </div>`,
},

/* ════════════════ 10–14. ЭТАЖИ ════════════════ */
{
  id: 'floor-sales', axis: 'ось Z · 1 этаж', layout: 'floor',
  draw: { x: 1, y: 1, z: 1 }, floorOn: 1,
  cam: orbit([3600, 300, -3600], { azim: 104, elev: 10, dist: 1900 }),
  screen: `
    <div class="pin" style="left:var(--gutter);top:7.5%;--tx:0;--ty:0">
      <div class="t-kicker" data-r="0">этаж 1 — продажи</div></div>
    <div class="pin" style="left:var(--gutter);top:24%;--tx:0;--ty:0" data-w="floor-list">
      <ul class="bullets t-body" data-r="2">
        <li><i class="mk"></i><span>Переговоры</span></li>
        <li><i class="mk"></i><span>Лидогенерация</span></li>
        <li><i class="mk"></i><span>Поиск ЛПР</span></li>
        <li><i class="mk"></i><span>Social sales</span></li>
        <li><i class="mk"></i><span>Retention rate</span></li>
        <li><i class="mk"></i><span>Маржинальность</span></li>
      </ul></div>
    <div class="pin" style="right:var(--gutter);top:50%;--tx:0;--ty:-50%" data-d="1.5" data-w="floor-shots">
      <div class="shotgrid" data-r="3">
        <figure class="shot"><div class="plate"><img src="media/shot/sales_portrait.png" alt="Портрет клиента мечты"><div class="rim"></div><div class="bevel"></div><div class="deep"></div></div><figcaption class="caption"><b>Портрет клиента мечты</b></figcaption></figure>
        <figure class="shot"><div class="plate"><img src="media/shot/sales_lpr.png" alt="Поиск ЛПР"><div class="rim"></div><div class="bevel"></div><div class="deep"></div></div><figcaption class="caption"><b>Поиск ЛПР</b></figcaption></figure>
        <figure class="shot"><div class="plate"><img src="media/shot/sales_crm_flow.png" alt="Бот, создающий лиды в CRM"><div class="rim"></div><div class="bevel"></div><div class="deep"></div></div><figcaption class="caption"><b>Бот, создающий лиды в CRM</b></figcaption></figure>
      </div></div>`,
},

{
  id: 'floor-hr', axis: 'ось Z · 2 этаж', layout: 'floor',
  draw: { x: 1, y: 1, z: 1 }, floorOn: 2,
  /* обходим здание на другую сторону: следующий этаж — новый ракурс */
  cam: orbit([3600, 540, -3600], { azim: 62, elev: 9, dist: 2150 }),
  screen: `
    <div class="pin" style="right:var(--gutter);top:7.5%;--tx:0;--ty:0">
      <div class="t-kicker right" data-r="0">этаж 2 — HR</div></div>
    <div class="pin" style="right:var(--gutter);top:24%;--tx:0;--ty:0" data-w="floor-list">
      <ul class="bullets t-body right" data-r="2">
        <li><span>Управление талантами</span><i class="mk"></i></li>
        <li><span>eNPS</span><i class="mk"></i></li>
        <li><span>IDP — индивидуальный план развития</span><i class="mk"></i></li>
        <li><span>Рекрутмент</span><i class="mk"></i></li>
        <li><span>Мотивация</span><i class="mk"></i></li>
        <li><span>Вовлечённость</span><i class="mk"></i></li>
        <li><span>Корпоративная культура</span><i class="mk"></i></li>
      </ul></div>
    <div class="pin" style="left:var(--gutter);top:50%;--tx:0;--ty:-50%" data-d="1.5" data-w="floor-shots">
      <div class="shotgrid" data-r="3">
        <figure class="shot"><div class="plate"><img src="media/shot/hr_enps.png" alt="eNPS по отделам"><div class="rim"></div><div class="bevel"></div><div class="deep"></div></div><figcaption class="caption"><b>eNPS по отделам</b></figcaption></figure>
        <figure class="shot"><div class="plate"><img src="media/shot/hr_profiler.png" alt="Психопрофайлер"><div class="rim"></div><div class="bevel"></div><div class="deep"></div></div><figcaption class="caption"><b>Психопрофайлер</b></figcaption></figure>
        <figure class="shot"><div class="plate"><img src="media/shot/hr_architect.png" alt="Архитектор команды"><div class="rim"></div><div class="bevel"></div><div class="deep"></div></div><figcaption class="caption"><b>Архитектор команды</b></figcaption></figure>
      </div></div>`,
},

{
  id: 'floor-marketing', axis: 'ось Z · 3 этаж', layout: 'floor',
  draw: { x: 1, y: 1, z: 1 }, floorOn: 3,
  cam: orbit([3600, 790, -3600], { azim: 146, elev: 11, dist: 2950 }),
  screen: `
    <div class="pin" style="left:var(--gutter);top:7.5%;--tx:0;--ty:0">
      <div class="t-kicker" data-r="0">этаж 3 — маркетинг</div></div>
    <div class="pin" style="left:var(--gutter);top:22%;--tx:0;--ty:0" data-w="floor-list">
      <ul class="bullets t-body" data-r="2">
        <li><i class="mk"></i><span>ROMI</span></li>
        <li><i class="mk"></i><span>Региональная экспансия</span></li>
        <li><i class="mk"></i><span>УТП</span></li>
        <li><i class="mk"></i><span>NPS</span></li>
        <li><i class="mk"></i><span>Visibility</span></li>
        <li><i class="mk"></i><span>Retention rate</span></li>
        <li><i class="mk"></i><span>Market penetration</span></li>
        <li><i class="mk"></i><span>Конверсия</span></li>
      </ul></div>
    <div class="pin" style="right:var(--gutter);top:50%;--tx:0;--ty:-50%" data-d="1.5" data-w="floor-shots">
      <div class="shotgrid" data-r="3">
        <figure class="shot"><div class="plate"><img src="media/shot/mk_publications.png" alt="Публикации"><div class="rim"></div><div class="bevel"></div><div class="deep"></div></div><figcaption class="caption"><b>Публикации</b></figcaption></figure>
        <figure class="shot"><div class="plate"><img src="media/shot/mk_graph.png" alt="Карта аудиторий"><div class="rim"></div><div class="bevel"></div><div class="deep"></div></div><figcaption class="caption"><b>Карта аудиторий</b></figcaption></figure>
        <figure class="shot"><div class="plate"><img src="media/shot/sales_campaigns.png" alt="Кампании и конверсия"><div class="rim"></div><div class="bevel"></div><div class="deep"></div></div><figcaption class="caption"><b>Кампании и конверсия</b></figcaption></figure>
      </div></div>`,
},

{
  id: 'floor-management', axis: 'ось Z · 4 этаж', layout: 'floor',
  draw: { x: 1, y: 1, z: 1 }, floorOn: 4,
  cam: orbit([3600, 1040, -3600], { azim: 38, elev: 9, dist: 3750 }),
  screen: `
    <div class="pin" style="right:var(--gutter);top:7.5%;--tx:0;--ty:0">
      <div class="t-kicker right" data-r="0">этаж 4 — менеджмент</div></div>
    <div class="pin" style="right:var(--gutter);top:24%;--tx:0;--ty:0" data-w="floor-list">
      <ul class="bullets t-body right" data-r="2">
        <li><span>Ресурсы</span><i class="mk"></i></li>
        <li><span>Делегирование</span><i class="mk"></i></li>
        <li><span>Trend vision</span><i class="mk"></i></li>
        <li><span>Мультипликатор</span><i class="mk"></i></li>
        <li><span>Helicopter view</span><i class="mk"></i></li>
      </ul></div>
    <div class="pin" style="left:var(--gutter);top:50%;--tx:0;--ty:-50%" data-d="1.5" data-w="floor-shots">
      <div class="shotgrid" data-r="3">
        <figure class="shot"><div class="plate"><img src="media/shot/mg_interview.png" alt="Структура интервью"><div class="rim"></div><div class="bevel"></div><div class="deep"></div></div><figcaption class="caption"><b>Структура интервью</b></figcaption></figure>
        <figure class="shot"><div class="plate"><img src="media/shot/mg_elevator.png" alt="Elevator Pitch + Added Value"><div class="rim"></div><div class="bevel"></div><div class="deep"></div></div><figcaption class="caption"><b>Elevator Pitch + Added Value</b></figcaption></figure>
        <figure class="shot"><div class="plate"><img src="media/shot/mg_scheme.png" alt="Helicopter view"><div class="rim"></div><div class="bevel"></div><div class="deep"></div></div><figcaption class="caption"><b>Helicopter view</b></figcaption></figure>
      </div></div>`,
},

{
  id: 'floor-it', axis: 'ось Z · 5 этаж', layout: 'floor',
  draw: { x: 1, y: 1, z: 1 }, floorOn: 5,
  /* здание достроено — камера отъезжает и показывает его целиком */
  cam: orbit([3600, 1280, -3600], { azim: 94, elev: 13, dist: 4650 }),
  screen: `
    <div class="pin" style="left:var(--gutter);top:7.5%;--tx:0;--ty:0">
      <div class="t-kicker" data-r="0">этаж 5 — IT</div></div>
    <div class="pin" style="left:var(--gutter);top:22%;--tx:0;--ty:0" data-w="floor-list">
      <ul class="bullets t-body" data-r="2">
        <li><i class="mk"></i><span>Искусственный интеллект</span></li>
        <li><i class="mk"></i><span>CRM / ERP / MES</span></li>
        <li><i class="mk"></i><span>Big Data</span></li>
        <li><i class="mk"></i><span>Цифровая трансформация</span></li>
        <li><i class="mk"></i><span>Цифровая прозрачность</span></li>
      </ul></div>
    <div class="pin" style="right:var(--gutter);top:50%;--tx:0;--ty:-50%" data-d="1.5" data-w="floor-shots">
      <div class="shotgrid" data-r="3">
        <figure class="shot"><div class="plate"><img src="media/shot/it_ai.png" alt="Искусственный интеллект"><div class="rim"></div><div class="bevel"></div><div class="deep"></div></div><figcaption class="caption"><b>Искусственный интеллект</b></figcaption></figure>
        <figure class="shot"><div class="plate"><img src="media/shot/it_crm.png" alt="CRM / ERP / MES"><div class="rim"></div><div class="bevel"></div><div class="deep"></div></div><figcaption class="caption"><b>CRM / ERP / MES</b></figcaption></figure>
        <figure class="shot"><div class="plate"><img src="media/shot/it_data.png" alt="Big Data"><div class="rim"></div><div class="bevel"></div><div class="deep"></div></div><figcaption class="caption"><b>Big Data</b></figcaption></figure>
      </div></div>`,
},

/* ════════════════ 15. СПИРАЛЬ ════════════════
   Кульминация: камера обходит достроенное здание, и вокруг него
   чертится спираль — внизу кэш, в середине ценности, наверху созидание. */
{
  id: 'spiral', axis: 'четвёртая ось · смысл', cine: true, layout: 'spiral',
  draw: { x: 1, y: 1, z: 1, spiral: 1 },
  cam: {
    ...orbit([3600, 1280, -3600], { azim: 258, elev: 12, dist: 4750 }),
    via: [7000, 2600, -6200],
  },
  world: [
    { at: [4520, 240, -3600], w: 0, align: 'center', html: `
      <div class="steplabel low" data-r="1"><b>Кэш</b></div>` },
    { at: [4520, 1180, -3600], w: 0, align: 'center', html: `
      <div class="steplabel mid" data-r="2"><b>Ценности</b></div>` },
    { at: [4520, 2180, -3600], w: 0, align: 'center', html: `
      <div class="steplabel high" data-r="3"><b>Созидание</b></div>` },
  ],
  screen: `
    <div class="pin" style="left:var(--gutter);top:12%;--tx:0;--ty:0" data-w="axes-text">
      <div class="stack gap4">
        <div class="t-kicker" data-r="0">четвёртая ось — смысловая</div>
        <h2 class="t-h2" data-r="4">Спиральная динамика</h2>
        <p class="t-lead" data-r="5" style="max-width:22em">
          Компания сначала думает про кэш, потом про ценности,
          потом про <span class="em">созидание</span>.</p>
      </div></div>`,
},

/* ════════════════ 16. ФИНАЛ ════════════════ */
{
  id: 'owner', axis: 'финал', cine: true, layout: 'final',
  draw: { x: 1, y: 1, z: 1, spiral: 1, final: 0.62 },
  /* долгий вылет из здания в пустое пространство, где чертится новая ось OX */
  cam: {
    pos: [FINAL_X + 1280, 330, FINAL_Z + 1420],
    look: [FINAL_X + 1280, 120, FINAL_Z],
    via: [FINAL_X - 1400, 2600, FINAL_Z + 3200],
  },
  world: [
    { at: [FINAL_X + 1280, -300, FINAL_Z], w: 440, align: 'center', html: `
      <div class="wnode center" data-r="3">
        <div class="node glass"><i class="dot"></i>Масштабирование собственника</div>
        <p class="t-micro">первый этап на новой оси</p>
      </div>` },
  ],
  screen: `
    <div class="pin" style="left:50%;top:13%;--tx:-50%;--ty:0" data-w="final-text">
      <div class="stack gap4" style="align-items:center;text-align:center">
        <div class="t-kicker center" data-r="0">ось OX рисуется заново</div>
        <h2 class="t-hero" data-r="1" style="max-width:17em">Бизнес — это отражение собственника</h2>
        <p class="t-lead" data-r="2" style="max-width:30em">
          Масштабирование компании начинается
          <span class="em">с масштабирования собственника</span>.</p>
      </div></div>`,
},

/* ════════════════ 17. QR ════════════════ */
{
  id: 'qr', axis: 'контакт', cine: true, layout: 'qr',
  draw: { x: 1, y: 1, z: 1, spiral: 1, final: 1 },
  cam: {
    pos: [FINAL_X + 2180, 250, FINAL_Z + 760],
    look: [FINAL_X + 2180, 170, FINAL_Z],
  },
  screen: `
    <div class="pin" style="left:50%;top:50%;--tx:-50%;--ty:-50%" data-w="qr-block">
      <div class="qrwrap" data-r="0">
        <div class="qrplate"><img src="media/logo/qr_telegram.png" alt="Telegram Сергея Семенова"></div>
        <div class="stack gap2" style="align-items:center">
          <b class="t-h2">Сергей Семенов</b>
          <span class="t-body">Основатель ESSG Conceptual Consulting</span>
          <span class="t-h3 mint" style="margin-top:var(--s3)">@Sergey_ESSG</span>
          <span class="logomark bare" style="margin-top:var(--s4)">
            <img src="media/logo/essg.png" alt="ESSG"></span>
        </div>
      </div></div>`,
},

];

/* Схема перехода на каждом перегоне. Ни одна не стоит рядом с собой
   и не занимает больше 40 % — это проверяет check_variety.py. */
export const TRANSITIONS = [
  'travel',   // 0→1  прилёт к оси
  'whip',     // 1→2
  'shutter',  // 2→3
  'flip',     // 3→4  разворот на ось Y
  'travel',   // 4→5
  'punch',    // 5→6  врез в кейс
  'whip',     // 6→7
  'shutter',  // 7→8
  'flip',     // 8→9  разворот на ось Z
  'rise',     // 9→10
  'orbit',    // 10→11 обход здания
  'rise',     // 11→12
  'orbit',    // 12→13
  'rise',     // 13→14
  'orbit',    // 14→15 облёт со спиралью
  'collapse', // 15→16
  'punch',    // 16→17
];

export const AXIS_LABELS = [
  { at: [0, -120, 0], cls: 'ax-node', html: `<b>0</b>`, from: 0.5, until: 4.4 },
  { at: [AX.len + 130, 0, 0], cls: 'ax-tip', html: `<b>X</b>`, from: 0.6, until: 4.4 },
  { at: [3600, 0, -Y_LEN - 150], cls: 'ax-tip', html: `<b>Y</b>`, from: 4.2, until: 9.4 },
  { at: [3600, TOWER_TOP + 260, -3600], cls: 'ax-tip', html: `<b>Z</b>`, from: 9.3, until: 15.6 },
];
