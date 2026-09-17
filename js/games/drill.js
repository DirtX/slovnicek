/* ============================================================
   Shared foundation for every practice drill.
   The bar, the progress rule, the stage and the footer are
   identical across all five modes — only the stage differs.
   ============================================================ */

export function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

export function sample(arr, n) {
    return shuffle(arr).slice(0, n);
}

let voiceCache = null;

/**
 * Browsers ship several Czech voices of very different quality. The stock
 * local one is the robotic default; network voices (Google, Microsoft
 * neural) and the named Apple voices sound far more human, so prefer those.
 */
export function czechVoice() {
    if (voiceCache !== null) return voiceCache;
    if (!('speechSynthesis' in window)) return null;

    const all = window.speechSynthesis.getVoices();
    if (!all.length) return null; // still loading; try again next call

    const czech = all.filter(v => /^cs([-_]|$)/i.test(v.lang));
    if (!czech.length) {
        voiceCache = null;
        return null;
    }

    const score = (v) => {
        let s = 0;
        if (/neural|natural|premium|enhanced|wavenet|online/i.test(v.name)) s += 8;
        if (/google/i.test(v.name)) s += 6;
        if (/zuzana|iveta|eliška|eliska|vlasta/i.test(v.name)) s += 4;
        if (v.localService === false) s += 5;  // network voices are the better ones
        if (v.default) s += 1;
        return s;
    };

    voiceCache = czech.slice().sort((a, b) => score(b) - score(a))[0];
    return voiceCache;
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    // The voice list is populated asynchronously in most browsers.
    window.speechSynthesis.onvoiceschanged = () => { voiceCache = null; czechVoice(); };
    czechVoice();
}

export function speak(text) {
    if (!('speechSynthesis' in window) || !text) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const voice = czechVoice();
    if (voice) u.voice = voice;
    u.lang = voice ? voice.lang : 'cs-CZ';
    // Slightly under natural pace: fast enough to sound like speech,
    // slow enough to pick out the consonant clusters.
    u.rate = 0.93;
    u.pitch = 1.0;
    u.volume = 1;
    window.speechSynthesis.speak(u);
}

export function esc(s) {
    return String(s).replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const SPEAKER = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
  stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/></svg>`;

export function speakerButton(label) {
    return `<button type="button" class="btn-say" data-say aria-label="${esc(label)}">${SPEAKER}</button>`;
}

/** Loose comparison: case, spacing and punctuation are forgiven. */
function tidy(s) {
    return String(s).toLowerCase().trim()
        .replace(/[.,!?;:"'()]/g, '')
        .replace(/\s+/g, ' ');
}

/** Same, with Czech and Ukrainian diacritics folded away. */
function fold(s) {
    return tidy(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g, 'l');
}

/**
 * Compare a typed answer against every accepted variant.
 * Returns 'exact', 'diacritics' (right word, wrong accents) or 'no'.
 */
export function judge(typed, accepted) {
    const variants = accepted
        .flatMap(a => String(a).split(/[\/,;]/))
        .map(s => s.trim())
        .filter(Boolean);
    if (variants.some(v => tidy(v) === tidy(typed))) return 'exact';
    if (variants.some(v => fold(v) === fold(typed))) return 'diacritics';
    return 'no';
}

export function plural(n, one, many) {
    return n === 1 ? one : many;
}

export class Drill {
    /**
     * @param {HTMLElement} root  element the drill owns
     * @param {Object} session    { queue, label, onFinish, onQuit }
     */
    constructor(root, session) {
        this.root = root;
        this.session = session;
        this.queue = session.queue;
        this.index = 0;
        this.score = 0;
        this.streak = 0;
        this.bestStreak = 0;
        this.answered = false;
        this.missed = [];
        this.learned = [];
        this._keyHandler = (e) => this.onKey(e);
    }

    get card() {
        return this.queue[this.index];
    }

    get total() {
        return this.queue.length;
    }

    start() {
        document.addEventListener('keydown', this._keyHandler);
        this.render();
    }

    destroy() {
        document.removeEventListener('keydown', this._keyHandler);
        if (window.speechSynthesis) window.speechSynthesis.cancel();
    }

    onKey() { /* overridden where useful */ }

    /* ---------- chrome ---------- */

    /** The counters in the bar. Overridden by drills that count differently. */
    statsHTML() {
        return `
      <span>Question <b>${Math.min(this.index + 1, this.total)}</b> / ${this.total}</span>
      <span>Correct <b>${this.score}</b></span>
      ${this.streak > 1 ? `<span class="streak">Streak ${this.streak}</span>` : ''}`;
    }

    /** Updates the bar in place, for drills that keep their stage on screen. */
    refreshBar() {
        const stats = this.root.querySelector('.drill-stats');
        const fill = this.root.querySelector('.drill-rule-fill');
        if (stats) stats.innerHTML = this.statsHTML();
        if (fill) fill.style.width = `${Math.round((this.index / this.total) * 100)}%`;
    }

    /** Paints the shared frame and hands back the stage element. */
    frame(stageHTML, footRight = '') {
        const pct = Math.round((this.index / this.total) * 100);
        this.root.innerHTML = `
      <div class="drill">
        <div class="drill-bar">
          <span class="drill-name">${esc(this.session.label)}</span>
          <span class="drill-stats">${this.statsHTML()}</span>
        </div>
        <div class="drill-rule"><div class="drill-rule-fill" style="width:${pct}%"></div></div>
        <div class="drill-stage">${stageHTML}</div>
        <div class="drill-foot">
          <button type="button" class="btn btn-quiet" data-quit>End session</button>
          <div class="foot-right">${footRight}</div>
        </div>
      </div>`;

        this.root.querySelector('[data-quit]').onclick = () => this.finish(true);
        this.root.querySelectorAll('[data-say]').forEach(b => {
            b.onclick = (e) => {
                e.stopPropagation();
                speak(b.dataset.say || this.card.cz);
            };
        });
        return this.root.querySelector('.drill-stage');
    }

    /** Records the outcome of the current question. */
    mark(correct) {
        this.answered = true;
        if (correct) {
            this.score++;
            this.streak++;
            this.bestStreak = Math.max(this.bestStreak, this.streak);
            this.learned.push(this.card.id);
        } else {
            this.streak = 0;
            this.missed.push(this.card);
        }
    }

    next(delay = 0) {
        if (this.done) return;
        const go = () => {
            if (this.done) return;
            this.index++;
            if (this.index >= this.total) this.finish();
            else {
                this.answered = false;
                this.render();
            }
        };
        if (delay) setTimeout(go, delay);
        else go();
    }

    finish(early = false) {
        if (this.done) return;
        this.done = true;
        this.destroy();
        this.session.onFinish({
            score: this.score,
            answered: early ? this.index : this.total,
            total: this.total,
            bestStreak: this.bestStreak,
            missed: this.missed,
            learned: this.learned,
            early
        });
    }
}
