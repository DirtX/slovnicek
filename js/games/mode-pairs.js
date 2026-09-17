import { Drill, shuffle, esc, speak } from './drill.js';

const ROUND = 5;

/** Match Czech to Ukrainian across two columns, five pairs at a time. */
export class ModePairs extends Drill {
    constructor(root, session) {
        super(root, session);
        this.rounds = [];
        for (let i = 0; i < this.queue.length; i += ROUND) {
            this.rounds.push(this.queue.slice(i, i + ROUND));
        }
        this.roundIndex = 0;
        this.picked = null;
        this.firstTry = {};
    }

    statsHTML() {
        return `
      <span>Pair <b>${Math.min(this.index + 1, this.total)}</b> / ${this.total}</span>
      <span>First try <b>${this.score}</b></span>
      <span>Round ${Math.min(this.roundIndex + 1, this.rounds.length)} / ${this.rounds.length}</span>`;
    }

    render() {
        const set = this.rounds[this.roundIndex];
        this.matched = 0;
        this.picked = null;

        const col = (items, field, side) => items.map(c => `
      <button type="button" class="tile ${field === 'cz' ? 'cz' : ''}"
              data-id="${esc(c.id)}" data-side="${side}">${esc(c[field])}</button>`).join('');

        const stage = this.frame(`
      <div class="prompt">
        <p class="prompt-kicker">Pick a Czech word on the left, then its translation on the right</p>
      </div>
      <div class="pairs">
        <div class="pair-col" id="col-cz">${col(shuffle(set), 'cz', 'l')}</div>
        <div class="pair-col" id="col-ua">${col(shuffle(set), 'ua', 'r')}</div>
      </div>
    `);

        stage.querySelectorAll('.tile').forEach(tile => {
            tile.onclick = () => this.pick(tile);
        });
    }

    pick(tile) {
        if (tile.classList.contains('locked')) return;

        if (tile.dataset.side === 'l') speak(tile.textContent.trim());

        // Re-picking within the same column just moves the selection.
        if (!this.picked || this.picked.dataset.side === tile.dataset.side) {
            if (this.picked) this.picked.classList.remove('picked');
            this.picked = tile;
            tile.classList.add('picked');
            return;
        }

        const a = this.picked;
        const b = tile;
        const id = a.dataset.id;

        if (id === b.dataset.id) {
            a.classList.remove('picked');
            a.classList.add('locked');
            b.classList.add('locked');
            this.picked = null;
            this.matched++;

            const card = this.queue.find(c => c.id === id);
            this._markPair(card, !this.firstTry[id]);
            this.refreshBar();

            if (this.matched === this.rounds[this.roundIndex].length) {
                setTimeout(() => {
                    this.roundIndex++;
                    if (this.roundIndex >= this.rounds.length) this.finish();
                    else this.render();
                }, 420);
            }
        } else {
            this.firstTry[id] = true;
            this.firstTry[b.dataset.id] = true;
            b.classList.add('miss');
            a.classList.add('miss');
            a.classList.remove('picked');
            const clear = () => {
                a.classList.remove('miss');
                b.classList.remove('miss');
            };
            this.picked = null;
            setTimeout(clear, 380);
        }
    }

    _markPair(card, clean) {
        this.index++;
        if (clean) {
            this.score++;
            this.streak++;
            this.bestStreak = Math.max(this.bestStreak, this.streak);
            this.learned.push(card.id);
        } else {
            this.streak = 0;
            this.missed.push(card);
        }
    }
}
