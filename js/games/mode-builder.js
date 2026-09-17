import { Drill, shuffle, esc, speak } from './drill.js';

/** Phrases only — a single word has no order to get wrong. */
export function isBuildable(card) {
    const n = card.cz.trim().split(/\s+/).length;
    return n >= 2 && n <= 6;
}

/** Put the Czech phrase back in the right order. */
export class ModeBuilder extends Drill {
    render() {
        const card = this.card;
        this.target = card.cz.trim();
        this.pool = shuffle(this.target.split(/\s+/));
        this.built = [];

        this.frame(`
      <div class="prompt">
        <p class="prompt-kicker">Build the Czech phrase</p>
        <div class="prompt-sentence">${esc(card.ua)}</div>
      </div>
      <div class="build-area">
        <div class="slot" id="slot" data-empty="Tap the words below"></div>
        <div class="chip-pool" id="pool"></div>
      </div>
      <div class="verdict" id="verdict"></div>
    `, `
      <button type="button" class="btn btn-quiet" id="skip">Skip</button>
      <button type="button" class="btn btn-solid" id="check">Check</button>
    `);

        this.slotEl = this.root.querySelector('#slot');
        this.poolEl = this.root.querySelector('#pool');
        this.verdictEl = this.root.querySelector('#verdict');
        this.checkBtn = this.root.querySelector('#check');

        // Delegation: the handler lives on the containers, which are never
        // replaced, so repainting the chips can never unbind the clicks.
        this.slotEl.onclick = (e) => this.onChipClick(e, 'slot');
        this.poolEl.onclick = (e) => this.onChipClick(e, 'pool');

        this.root.querySelector('#skip').onclick = () => {
            if (this.answered) return;
            this.mark(false);
            this.reveal(false);
        };
        this.checkBtn.onclick = () => this.check();

        this.paint();
    }

    onChipClick(event, where) {
        if (this.answered) return;
        const chip = event.target.closest('.chip');
        if (!chip || chip.disabled) return;

        const i = Number(chip.dataset.i);
        if (Number.isNaN(i)) return;

        if (where === 'pool') this.built.push(this.pool.splice(i, 1)[0]);
        else this.pool.push(this.built.splice(i, 1)[0]);

        this.paint();
    }

    paint() {
        const chip = (w, i) => `<button type="button" class="chip" data-i="${i}">${esc(w)}</button>`;
        this.slotEl.innerHTML = this.built.map(chip).join('');
        this.poolEl.innerHTML = this.pool.map(chip).join('');
    }

    onKey(e) {
        if (e.key !== 'Enter') return;
        if (e.target && e.target.tagName === 'BUTTON') return;
        if (this.answered) this.next();
        else this.check();
    }

    check() {
        if (this.answered || !this.built.length) return;
        const correct = this.built.join(' ') === this.target;
        this.mark(correct);
        this.reveal(correct);
    }

    reveal(correct) {
        this.answered = true;
        this.slotEl.classList.add(correct ? 'right' : 'wrong');

        if (!correct) {
            this.built = this.target.split(/\s+/);
            this.pool = [];
            this.slotEl.innerHTML = this.built
                .map(w => `<button type="button" class="chip" disabled>${esc(w)}</button>`).join('');
            this.poolEl.innerHTML = '';
        }

        speak(this.target);

        const card = this.card;
        this.verdictEl.innerHTML =
            (correct
                ? '<p class="verdict-line ok">Correct</p>'
                : `<p class="verdict-line bad">Correct order: ${esc(this.target)}</p>`)
            + (card.usage && card.usage !== this.target
                ? `<p class="verdict-usage">${esc(card.usage)}</p>` : '');

        this.checkBtn.textContent = 'Next';
        this.checkBtn.onclick = () => this.next();
        this.checkBtn.focus();
    }
}
