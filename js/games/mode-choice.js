import { Drill, shuffle, sample, esc, speakerButton, speak } from './drill.js';

/** Pick the right answer out of four. Works in either direction. */
export class ModeChoice extends Drill {
    constructor(root, session) {
        super(root, session);
        this.toUa = session.direction !== 'ua-cz';
    }

    ask(card) {
        return this.toUa ? card.cz : card.ua;
    }

    reply(card) {
        return this.toUa ? card.ua : card.cz;
    }

    render() {
        const card = this.card;
        const answer = this.reply(card);

        const distractors = sample(
            this.session.bank.filter(w => this.reply(w) !== answer),
            3
        ).map(w => this.reply(w));

        const options = shuffle([answer, ...distractors]);
        const optionClass = this.toUa ? 'opt' : 'opt opt-cz';

        const stage = this.frame(`
      <div class="prompt">
        <p class="prompt-kicker">${this.toUa ? 'What does this mean?' : 'How do you say this in Czech?'}</p>
        <div class="${this.toUa ? 'prompt-word' : 'prompt-sentence'}">${esc(this.ask(card))}</div>
        <div class="prompt-sub">
          ${card.transcription ? `<em>[${esc(card.transcription)}]</em>` : ''}
          ${this.toUa ? speakerButton('Listen') : ''}
        </div>
      </div>
      <div class="opt-grid">
        ${options.map(o => `<button type="button" class="${optionClass}" data-val="${esc(o)}">${esc(o)}</button>`).join('')}
      </div>
      <div class="verdict" id="verdict"></div>
    `);

        if (this.toUa) speak(card.cz);

        stage.querySelectorAll('.opt').forEach(btn => {
            btn.onclick = () => {
                if (this.answered) return;
                const correct = btn.dataset.val === answer;
                this.mark(correct);

                stage.querySelectorAll('.opt').forEach(b => {
                    b.disabled = true;
                    if (b.dataset.val === answer) b.classList.add('right');
                    else if (b === btn) b.classList.add('wrong');
                    else b.classList.add('faded');
                });

                if (!this.toUa) speak(card.cz);

                stage.querySelector('#verdict').innerHTML = card.usage
                    ? `<p class="verdict-usage">${esc(card.usage)}</p>`
                    : '';

                this.next(correct ? 650 : 1500);
            };
        });
    }
}
