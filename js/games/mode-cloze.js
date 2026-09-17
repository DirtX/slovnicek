import { Drill, shuffle, sample, esc, speak } from './drill.js';

function escapeRe(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Returns true when the word actually appears in its own example sentence. */
export function hasGap(card) {
    return !!card.usage && card.usage.toLowerCase().includes(card.cz.toLowerCase());
}

/** Choose the word that belongs in the blank. Context, not isolated vocabulary. */
export class ModeCloze extends Drill {
    render() {
        const card = this.card;
        const sentence = esc(card.usage).replace(
            new RegExp(escapeRe(esc(card.cz)), 'i'),
            '<span class="gap">\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0</span>'
        );

        const distractors = sample(
            this.session.bank.filter(w => w.cz.toLowerCase() !== card.cz.toLowerCase()),
            3
        ).map(w => w.cz);
        const options = shuffle([card.cz, ...distractors]);

        const stage = this.frame(`
      <div class="prompt">
        <p class="prompt-kicker">Which word is missing?</p>
        <div class="prompt-sentence">${sentence}</div>
        <div class="prompt-sub">${esc(card.ua)}</div>
      </div>
      <div class="opt-grid">
        ${options.map(o => `<button type="button" class="opt opt-cz" data-val="${esc(o)}">${esc(o)}</button>`).join('')}
      </div>
      <div class="verdict" id="verdict"></div>
    `);

        stage.querySelectorAll('.opt').forEach(btn => {
            btn.onclick = () => {
                if (this.answered) return;
                const correct = btn.dataset.val.toLowerCase() === card.cz.toLowerCase();
                this.mark(correct);

                stage.querySelectorAll('.opt').forEach(b => {
                    b.disabled = true;
                    if (b.dataset.val.toLowerCase() === card.cz.toLowerCase()) b.classList.add('right');
                    else if (b === btn) b.classList.add('wrong');
                    else b.classList.add('faded');
                });

                speak(card.usage);
                stage.querySelector('#verdict').innerHTML =
                    `<p class="verdict-usage">${esc(card.usage)}</p>`;

                this.next(correct ? 900 : 1800);
            };
        });
    }
}
