/* ============================================================
   Рельс презентации: одна непрерывная величина прогресса.
   Стрелки и пробел ведут камеру между шагами, колесо скрабит
   вручную — движение не прерывается ни на кадр.
   ============================================================ */

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

export class Rail {
  constructor({ count, onChange }) {
    this.count = count;
    this.onChange = onChange || (() => {});
    this.p = 0;              // фактическая позиция, дробная
    this.target = 0;         // куда едем
    this.v = 0;              // скорость (для пружины)
    this.scrubbing = false;
    this.settleAt = 0;
    this.stiffness = 105;    // жёсткость пружины
    this.damping = 19.5;     // почти критическое — без дрожи на остановке
    this._wheelAcc = 0;
    this._lastStep = -1;
    this._bind();
  }

  setCount(n) { this.count = n; this.target = clamp(this.target, 0, n - 1); }

  goto(i, { snap = false } = {}) {
    this.target = clamp(i, 0, this.count - 1);
    this.scrubbing = false;
    if (snap) { this.p = this.target; this.v = 0; }
  }
  next() { this.goto(Math.floor(this.p + 1e-4) + 1); }
  prev() { this.goto(Math.ceil(this.p - 1e-4) - 1); }

  /* ---- ввод ---- */
  _bind() {
    /* HUD появляется только когда презентацией управляют:
       на экране форума постоянная шкала и подсказка выдают веб-страницу */
    let hideTimer = 0;
    const moved = () => {
      document.body.dataset.moved = '1';
      document.body.dataset.touch = '1';
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => { document.body.dataset.touch = '0'; }, 2600);
    };

    window.addEventListener('keydown', (e) => {
      const k = e.key;
      if (k === 'ArrowRight' || k === 'ArrowDown' || k === 'PageDown' || k === ' ' || k === 'Enter') {
        e.preventDefault(); this.next(); moved();
      } else if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'PageUp' || k === 'Backspace') {
        e.preventDefault(); this.prev(); moved();
      } else if (k === 'Home') { e.preventDefault(); this.goto(0); moved(); }
      else if (k === 'End') { e.preventDefault(); this.goto(this.count - 1); moved(); }
    }, { passive: false });

    // колесо — прямой скраб: прогресс идёт ровно столько, сколько прокрутили
    window.addEventListener('wheel', (e) => {
      e.preventDefault();
      const d = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      const unit = e.deltaMode === 1 ? 18 : e.deltaMode === 2 ? 400 : 1;
      this.p = clamp(this.p + d * unit / 900, 0, this.count - 1);
      this.scrubbing = true;
      this.v = 0;
      this.settleAt = performance.now() + 140;   // отпустили колесо — мягко встаём на шаг
      moved();
    }, { passive: false });

    // касание — вертикальный свайп скрабит, горизонтальный листает
    let t0 = null, p0 = 0;
    window.addEventListener('touchstart', (e) => {
      t0 = { x: e.touches[0].clientX, y: e.touches[0].clientY }; p0 = this.p;
    }, { passive: true });
    window.addEventListener('touchmove', (e) => {
      if (!t0) return;
      const dy = t0.y - e.touches[0].clientY;
      const dx = t0.x - e.touches[0].clientX;
      const d = Math.abs(dy) >= Math.abs(dx) ? dy : dx;
      this.p = clamp(p0 + d / (window.innerHeight * 0.55), 0, this.count - 1);
      this.scrubbing = true; this.v = 0;
      this.settleAt = performance.now() + 140;
      moved();
    }, { passive: true });
    window.addEventListener('touchend', () => { t0 = null; }, { passive: true });

    // клик по половинам экрана — вперёд/назад, как в плеере
    window.addEventListener('pointerdown', (e) => {
      if (e.target.closest('#hud')) return;
      if (e.pointerType === 'touch') return;
      if (e.clientX > window.innerWidth * 0.32) this.next(); else this.prev();
      moved();
    });
  }

  /* ---- шаг физики ---- */
  update(dt) {
    if (this.scrubbing) {
      if (performance.now() > this.settleAt) {
        this.scrubbing = false;
        this.target = clamp(Math.round(this.p), 0, this.count - 1);
      }
    } else {
      // пружина с почти критическим затуханием: разгон и остановка без рывка
      const a = (this.target - this.p) * this.stiffness - this.v * this.damping;
      this.v += a * dt;
      this.p += this.v * dt;
      if (Math.abs(this.target - this.p) < 0.0004 && Math.abs(this.v) < 0.004) {
        this.p = this.target; this.v = 0;
      }
    }
    this.p = clamp(this.p, 0, this.count - 1);
    const step = Math.round(this.p);
    const changed = step !== this._lastStep;
    this._lastStep = step;
    this.onChange(this.p, step, changed);
    return this.p;
  }
}
