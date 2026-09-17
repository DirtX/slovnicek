import { Drill, judge, esc, speakerButton, speak } from './drill.js';

/** Type the translation. The strictest drill — no options to lean on. */
export class ModeTyping extends Drill {
    constructor(root, session) {
        super(root, session);
        this.toUa = session.direction !== 'ua-cz';
    }

    render() {
        const card = this.card;
        const stage = this.frame(`
      <div class="prompt">
        <p class="prompt-kicker">${this.toUa ? 'Type the translation in Ukrainian' : 'Type this word in Czech'}</p>
        <div class="${this.toUa ? 'prompt-word' : 'prompt-sentence'}">${esc(this.toUa ? card.cz : card.ua)}</div>
        <div class="prompt-sub">
          ${this.toUa && card.transcription ? `<em>[${esc(card.transcription)}]</em>` : ''}
          ${this.toUa ? speakerButton('Listen') : ''}
        </div>
      </div>
      <div class="answer-row">
        <input type="text" class="answer-field" id="answer" autocomplete="off"
               autocapitalize="off" spellcheck="false"
               placeholder="${this.toUa ? 'your answer' : 'česky…'}">
        <button type="button" class="btn btn-solid" id="check">Check</button>
      </div>
      <div class="verdict" id="verdict"></div>
    `);

        this.input = stage.querySelector('#answer');
        this.checkBtn = stage.querySelector('#check');
        this.input.focus();
        this.checkBtn.onclick = () => this.check();
    }

    onKey(e) {
        if (e.key !== 'Enter') return;
        // A focused button already turns Enter into a click.
        if (e.target && e.target.tagName === 'BUTTON') return;
        if (this.answered) this.next();
        else this.check();
    }

    check() {
        if (this.answered) return;
        const card = this.card;
        const typed = this.input.value.trim();
        if (!typed) return;

        const accepted = this.toUa ? [card.ua, card.en] : [card.cz];
        const result = judge(typed, accepted.filter(Boolean));
        const correct = result !== 'no';

        this.mark(correct);

        this.input.disabled = true;
        this.input.classList.add(correct ? 'right' : 'wrong');
        this.checkBtn.textContent = 'Next';
        this.checkBtn.onclick = () => this.next();
        this.checkBtn.focus();

        let line;
        if (result === 'exact') line = '<p class="verdict-line ok">Correct</p>';
        else if (result === 'diacritics') line = `<p class="verdict-line ok">Correct — mind the diacritics: ${esc(this.toUa ? card.ua : card.cz)}</p>`;
        else line = `<p class="verdict-line bad">Answer: ${esc(this.toUa ? card.ua : card.cz)}</p>`;

        this.root.querySelector('#verdict').innerHTML =
            line + (card.usage ? `<p class="verdict-usage">${esc(card.usage)}</p>` : '');

        speak(card.cz);
    }
}
