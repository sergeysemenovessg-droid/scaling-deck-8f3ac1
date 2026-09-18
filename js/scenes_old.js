/* ============================================================
   Сцены 0–3. Смысл, порядок и формулировки — из SPEC.md, дословно.

   Раскладка живёт в экранных процентах: так ничего не наезжает
   ни на одной ширине. Объём даёт мир за ней — камера, сетка, пыль
   и неоновые оси, которые чертятся по прогрессу.

   Геометрия развилок посчитана ПОД раскладку: концы ветвей
   приходят ровно туда, где стоят подписи «Cash» и «Capitalization».
   ============================================================ */

export const AX = { len: 3600 };
export const FORK1_X = 1180;
export const FORK2_X = 2420;

/* Камера на развилках: поз. y 330, взгляд y 120, дистанция 1380, fov 38.
   Полувысота кадра в плоскости оси = 1380·tan19° = 475.
   Ось (y=0) ложится на 62,6 % высоты, пол (y=−150) начинается с 78 %,
   а концы ветвей должны прийти в 22 %/78 % ширины на 20 % высоты:
   смещение (−472, +285) от точки взгляда → мир (x−472, 405).
   Значит длина = корень(472²+405²) = 622, угол = atan(405/472) = 40,6°. */
export const BRANCH = { len: 622, angle: 40.6 };

export const BRANCHES = [
  { x: FORK1_X, dir: -1, from: 1.34, color: 'blue' },
  { x: FORK1_X, dir: +1, from: 1.44, color: 'mint' },
  { x: FORK2_X, dir: -1, from: 2.34, color: 'mint' },
  { x: FORK2_X, dir: +1, from: 2.44, color: 'blue' },
];

export const SCENES = [

/* ──────────────────────────── 0. ОБЛОЖКА ─────────────────────────── */
{
  id: 'cover', axis: '—', cine: true, axisDraw: 0,
  cam: { pos: [-240, 330, 2420], look: [230, 90, 200] },
  layout: 'cover',
  screen: `
    <div class="pin" style="left:var(--gutter);top:50%;--tx:0;--ty:-50%"
         data-w="cover-text">
      <div class="stack gap5">
        <div class="t-kicker" data-r="0">ESSG · Conceptual Consulting</div>
        <h1 class="t-mega" data-r="1">Масштабирование<br>среднего бизнеса<br>до уровня крупного</h1>
        <div class="t-h2 mint" style="font-weight:300;margin-top:var(--s3)" data-r="2">через бизнес-осознанность</div>
      </div>
    </div>

    <div class="pin" style="right:var(--gutter);top:50%;--tx:0;--ty:-50%" data-d="1.5"
         data-w="cover-portrait">
      <div class="stack gap4">
        <div class="plate" style="aspect-ratio:1636/1800" data-r="3">
          <img src="media/photo/portrait_tux.png" alt="Сергей Семенов">
          <div class="rim"></div><div class="bevel"></div>
        </div>
        <div class="who-line" data-r="4">
          <b class="t-h3">Сергей Семенов</b>
          <span class="t-body" style="line-height:1.45">Основатель консалтингового бренда<br>
          по развитию бизнеса с ИИ</span>
          <span class="logomark bare" style="margin-top:var(--s2)">
            <img src="media/logo/essg.png" alt="ESSG"></span>
        </div>
      </div>
    </div>`,
},

/* ────────────────────── 1. СИСТЕМА КООРДИНАТ ─────────────────────── */
{
  id: 'axes', axis: 'ось X', cine: false, axisDraw: 0.21,
  cam: { pos: [430, 360, 1520], look: [600, 130, 0] },
  layout: 'axes',
  screen: `
    <div class="pin" style="left:var(--gutter);top:13%;--tx:0;--ty:0" data-w="axes-text">
      <div class="stack gap5">
        <div class="t-kicker" data-r="0">система координат бизнеса</div>
        <h2 class="t-h1" data-r="1">Сначала разбираемся<br>со смыслом бизнеса</h2>
        <p class="t-lead" data-r="2" style="max-width:30em">
          Ось&nbsp;X отвечает на вопрос, <span class="em">зачем нужен бизнес
          и какой бизнес мы строим</span>. На ней две развилки — и обе придётся пройти.
        </p>
        <ul class="bullets t-body" data-r="3">
          <li><i class="mk"></i><span><em>Кэш или капитализация</em> — чем измеряем успех</span></li>
          <li><i class="mk"></i><span><em>Глобальный или локальный тренд</em> — чему соответствуем</span></li>
        </ul>
      </div>
    </div>`,
},

/* ───────────────── 2. КЭШ ИЛИ КАПИТАЛИЗАЦИЯ ──────────────────────── */
{
  id: 'fork-cash', axis: 'ось X · развилка 1', cine: false, axisDraw: 0.44,
  cam: { pos: [FORK1_X, 330, 1380], look: [FORK1_X, 120, 0] },
  layout: 'fork',
  screen: `
    <div class="pin" style="left:var(--gutter);top:7.5%;--tx:0;--ty:0">
      <div class="t-kicker" data-r="0">развилка 1 — чем измеряем успех</div>
    </div>

    <div class="pin fork-side l" style="left:22%;top:20%;--tx:-50%;--ty:0" data-d="0.6">
      <div class="node glass blue" data-r="1"><i class="dot"></i>Cash</div>
      <p class="t-body" data-r="2">Малый и средний бизнес говорит:
        <span class="em">«нам, бро, только про кэш»</span></p>
    </div>

    <div class="pin fork-side r" style="left:78%;top:20%;--tx:-50%;--ty:0" data-d="0.6">
      <div class="node glass" data-r="1"><i class="dot"></i>Capitalization</div>
      <p class="t-body" data-r="2">Крупные международные компании
        <span class="em">мыслят капитализацией</span></p>
    </div>

    <div class="pin" style="left:50%;top:22.5%;--tx:-50%;--ty:-50%">
      <div class="vs" data-r="3"><span>или</span></div>
    </div>

    <div class="pin" style="left:50%;top:62%;--tx:-50%;--ty:0" data-d="1.6"
         data-w="fork-shot">
      <figure class="shot" data-r="5">
        <div class="plate" style="aspect-ratio:2528/1146">
          <img src="media/photo/expo_dubai.png" alt="EXPO, Дубай">
          <div class="rim"></div><div class="bevel"></div><div class="deep"></div>
        </div>
        <figcaption class="caption">
          <b>EXPO, Дубай</b>
          <span>панельная сессия «New Age Energy» · EXPO 2020</span>
        </figcaption>
      </figure>
    </div>

    <div class="pin" style="left:50%;top:46%;--tx:-50%;--ty:-50%">
      <div class="q-mark" data-r="4">
        <div class="vs mag-q"><span>?</span></div>
        <p class="t-quote">Нужно определиться, <i>куда идём</i></p>
      </div>
    </div>`,
},

/* ───────────── 3. ГЛОБАЛЬНЫЙ ИЛИ ЛОКАЛЬНЫЙ ТРЕНД ─────────────────── */
{
  id: 'fork-trend', axis: 'ось X · развилка 2', cine: false, axisDraw: 0.76,
  cam: { pos: [FORK2_X, 330, 1380], look: [FORK2_X, 120, 0] },
  layout: 'fork',
  screen: `
    <div class="pin" style="left:var(--gutter);top:7.5%;--tx:0;--ty:0">
      <div class="t-kicker" data-r="0">развилка 2 — какому тренду соответствуем</div>
    </div>

    <div class="pin fork-side l" style="left:22%;top:20%;--tx:-50%;--ty:0" data-d="0.6">
      <div class="node glass" data-r="1"><i class="dot"></i>Global</div>
      <p class="t-body" data-r="2">У Росатома — <span class="em">устойчивое развитие,
        капитализация, доступная энергия</span>. Отсюда экспансия
        в разные страны и города.</p>
    </div>

    <div class="pin fork-side r" style="left:78%;top:20%;--tx:-50%;--ty:0" data-d="0.6">
      <div class="node glass blue" data-r="1"><i class="dot"></i>Local</div>
      <p class="t-body" data-r="2">Стратегическая сессия Росатома:
        тренды энергетики, цифровизация, устойчивое развитие.</p>
    </div>

    <div class="pin" style="left:50%;top:22.5%;--tx:-50%;--ty:-50%">
      <div class="vs" data-r="3"><span>или</span></div>
    </div>

    <div class="pin" style="left:15.5%;top:62%;--tx:-50%;--ty:0" data-d="1.4"
         data-w="trend-global">
      <div class="person" data-r="5">
        <div class="frame">
          <img src="media/photo/likhachev.png" alt="Алексей Лихачёв">
          <div class="bevel"></div><div class="glowline"></div>
        </div>
        <div class="who row">
          <span class="logomark bare"><img src="media/logo/rosatom.png" alt="Росатом"></span>
          <span class="names"><b>Алексей Лихачёв</b><span>Росатом</span></span>
        </div>
      </div>
    </div>

    <div class="pin" style="left:63%;top:62%;--tx:-50%;--ty:0" data-d="1.4"
         data-w="trend-local">
      <div class="trio" data-r="6" style="width:100%">
        <div class="person">
          <div class="frame">
            <img src="media/photo/chubais.png" alt="Анатолий Чубайс">
            <div class="bevel"></div><div class="glowline"></div>
          </div>
          <div class="who"><b>Анатолий Чубайс</b><span>о трендах энергетики</span></div>
        </div>
        <div class="person">
          <div class="frame">
            <img src="media/photo/gref.png" alt="Герман Греф">
            <div class="bevel"></div><div class="glowline"></div>
          </div>
          <div class="who"><b>Герман Греф</b><span>о цифровизации</span></div>
        </div>
        <div class="person">
          <div class="frame">
            <img src="media/photo/semenov.png" alt="Сергей Семенов">
            <div class="bevel"></div><div class="glowline"></div>
          </div>
          <div class="who"><b>Сергей Семенов</b><span>об устойчивом развитии</span></div>
        </div>
      </div>
    </div>

    <div class="pin" style="left:50%;top:46%;--tx:-50%;--ty:-50%">
      <div class="q-mark" data-r="4">
        <div class="vs mag-q"><span>?</span></div>
        <p class="t-quote">Какому тренду <i>соответствует твой бизнес</i></p>
      </div>
    </div>`,
},

];

/* Подписи узлов самой оси */
export const AXIS_LABELS = [
  { at: [0, -120, 0], cls: 'ax-node', html: `<b>0</b>`, from: 0.5 },
  { at: [AX.len + 130, 0, 0], cls: 'ax-tip', html: `<b>X</b>`, from: 0.6 },
];
