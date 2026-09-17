import { shuffle, esc, plural } from './drill.js';
import { ModeChoice } from './mode-choice.js';
import { ModeTyping } from './mode-typing.js';
import { ModePairs } from './mode-pairs.js';
import { ModeCloze, hasGap } from './mode-cloze.js';
import { ModeBuilder, isBuildable } from './mode-builder.js';

/* Every drill that has ever shipped in this app, in one place.
   `eligible` decides which words a drill can actually use, so the
   setup screen can show a live count instead of failing at start. */
const DRILLS = [
    {
        id: 'choice',
        name: 'Multiple choice',
        desc: 'Four options, one right. The quickest way to cover a lot of ground.',
        Mode: ModeChoice,
        directional: true,
        min: 4,
        eligible: () => true
    },
    {
        id: 'typing',
        name: 'Typing',
        desc: 'Type the translation out. Diacritics are flagged rather than quietly forgiven.',
        Mode: ModeTyping,
        directional: true,
        min: 1,
        eligible: () => true
    },
    {
        id: 'pairs',
        name: 'Pairs',
        desc: 'Match Czech to Ukrainian, five pairs to a round.',
        Mode: ModePairs,
        directional: false,
        min: 4,
        eligible: () => true
    },
    {
        id: 'cloze',
        name: 'Fill the gap',
        desc: 'Drop the word into a real Czech sentence. Trains usage, not just translation.',
        Mode: ModeCloze,
        directional: false,
        min: 4,
        eligible: hasGap
    },
    {
        id: 'builder',
        name: 'Phrase builder',
        desc: 'Reorder the words into a correct phrase. Multi-word entries only.',
        Mode: ModeBuilder,
        directional: false,
        min: 1,
        eligible: isBuildable
    }
];

const LENGTHS = [10, 20, 40, 'all'];

export class GameManager {
    /**
     * @param {HTMLElement} root
     * @param {Object} state
     * @param {Function} onSessionEnd  called with the finished session result
     */
    constructor(root, state, onSessionEnd) {
        this.root = root;
        this.state = state;
        this.onSessionEnd = onSessionEnd;
        this.active = null;
        this.pick = {
            drill: 'choice',
            level: state.selectedLevel || 'ALL',
            category: 'ALL',
            length: 20,
            direction: 'cz-ua'
        };
    }

    /** Words available to a given drill under the current filters. */
    availableFor(drill) {
        return this.state.pool({ level: this.pick.level, category: this.pick.category })
            .filter(drill.eligible);
    }

    stop() {
        if (this.active) {
            this.active.destroy();
            this.active = null;
        }
    }

    /* ---------- setup ---------- */

    showSetup() {
        this.stop();
        const drill = DRILLS.find(d => d.id === this.pick.drill);

        const categories = [{ id: 'ALL', name: 'All topics' }]
            .concat(this.state.categories.map(c => ({ id: c.id, name: c.name || c.id })));

        const levels = ['ALL', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
        const counts = this.state.levelCounts();

        const ready = this.availableFor(drill);
        const enough = ready.length >= drill.min;

        this.root.innerHTML = `
      <div class="setup-lead">
        <div class="panel-title"><h2>Choose a drill</h2></div>
        <p class="panel-desc">Five drills over the same vocabulary. A correct answer marks the word as learned.</p>
      </div>

      <div class="drill-menu" id="drill-menu">
        ${DRILLS.map(d => {
            const n = this.availableFor(d).length;
            return `
            <button type="button" class="drill-option ${d.id === this.pick.drill ? 'active' : ''}"
                    data-drill="${d.id}" ${n < d.min ? 'disabled' : ''}>
              <span class="drill-option-name">${esc(d.name)}</span>
              <span class="drill-option-desc">${esc(d.desc)}</span>
              <span class="drill-option-avail">${n < d.min
                    ? 'not enough words under this filter'
                    : `${n} ${plural(n, 'word', 'words')} available`}</span>
            </button>`;
        }).join('')}
      </div>

      <div class="setup-controls">
        <label class="control">
          <span class="control-label">Level</span>
          <select class="field" id="pick-level">
            ${levels.map(l => `<option value="${l}" ${l === this.pick.level ? 'selected' : ''}>${l === 'ALL' ? `All levels (${counts.ALL})` : `${l} (${counts[l]})`}</option>`).join('')}
          </select>
        </label>

        <label class="control">
          <span class="control-label">Topic</span>
          <select class="field" id="pick-category">
            ${categories.map(c => `<option value="${esc(c.id)}" ${c.id === this.pick.category ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
          </select>
        </label>

        <label class="control">
          <span class="control-label">Length</span>
          <select class="field" id="pick-length">
            ${LENGTHS.map(n => `<option value="${n}" ${String(n) === String(this.pick.length) ? 'selected' : ''}>${n === 'all' ? 'Everything' : `${n} questions`}</option>`).join('')}
          </select>
        </label>

        <label class="control ${drill.directional ? '' : 'hidden'}">
          <span class="control-label">Direction</span>
          <select class="field" id="pick-direction">
            <option value="cz-ua" ${this.pick.direction === 'cz-ua' ? 'selected' : ''}>Czech to Ukrainian</option>
            <option value="ua-cz" ${this.pick.direction === 'ua-cz' ? 'selected' : ''}>Ukrainian to Czech</option>
          </select>
        </label>

        <button type="button" class="btn btn-solid" id="btn-start" ${enough ? '' : 'disabled'}>Start</button>
      </div>`;

        this.root.querySelectorAll('.drill-option').forEach(btn => {
            btn.onclick = () => {
                this.pick.drill = btn.dataset.drill;
                this.showSetup();
            };
        });

        const bind = (id, key) => {
            const el = this.root.querySelector(id);
            if (el) el.onchange = (e) => {
                this.pick[key] = e.target.value;
                this.showSetup();
            };
        };
        bind('#pick-level', 'level');
        bind('#pick-category', 'category');
        bind('#pick-length', 'length');
        bind('#pick-direction', 'direction');

        const startBtn = this.root.querySelector('#btn-start');
        if (startBtn) startBtn.onclick = () => this.startSession();
    }

    /* ---------- session ---------- */

    startSession() {
        const drill = DRILLS.find(d => d.id === this.pick.drill);
        const bank = this.availableFor(drill);
        if (bank.length < drill.min) return;

        let queue = shuffle(bank);
        if (this.pick.length !== 'all') {
            queue = queue.slice(0, Math.min(Number(this.pick.length), queue.length));
        }

        // Distractors may come from the wider pool so the choices stay varied
        // even when the session itself is short.
        const wide = this.state.pool({ level: this.pick.level, category: this.pick.category });
        const bankForOptions = wide.length >= 8 ? wide : this.state.allWords;

        this.stop();
        this.active = new drill.Mode(this.root, {
            queue,
            bank: bankForOptions,
            label: drill.name,
            direction: this.pick.direction,
            onFinish: (result) => this.showResult(result)
        });
        this.active.start();
    }

    /* ---------- results ---------- */

    showResult(result) {
        this.active = null;

        if (result.learned.length && this.onSessionEnd) {
            this.onSessionEnd(result);
        }

        const answered = result.answered || 1;
        const pct = Math.round((result.score / answered) * 100);
        const verdict =
            pct >= 90 ? 'Excellent. Time to take on the next topic.'
                : pct >= 70 ? 'Solid. The words below are worth another pass.'
                    : pct >= 40 ? 'The basics are there. Run the same set again.'
                        : 'These words are still new. Try Pairs — it is a gentler way in.';

        const missed = result.missed.slice(0, 8);

        this.root.innerHTML = `
      <div class="drill-result">
        <div class="result-score">${result.score}</div>
        <p class="result-of">of ${answered} ${plural(answered, 'answer', 'answers')}${result.early ? ' (ended early)' : ''}</p>
        <h2>${pct}%</h2>
        <p>${esc(verdict)}${result.bestStreak > 2 ? ` Longest streak: ${result.bestStreak}.` : ''}</p>

        ${missed.length ? `
          <div class="review-list">
            <p class="review-head">Worth reviewing</p>
            ${missed.map(c => `
              <div class="review-row">
                <span class="review-cz">${esc(c.cz)}</span>
                <span class="review-ua">${esc(c.ua)}</span>
              </div>`).join('')}
          </div>` : ''}

        <div class="result-actions">
          <button type="button" class="btn btn-solid" id="again">Again</button>
          <button type="button" class="btn btn-outline" id="back">Another drill</button>
        </div>
      </div>`;

        this.root.querySelector('#again').onclick = () => this.startSession();
        this.root.querySelector('#back').onclick = () => this.showSetup();
    }
}
