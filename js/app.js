import { state, LEVELS } from './state.js';
import { loadCategories } from '../data/registry.js';
import { renderRoadmap } from './roadmap.js';
import { GameManager } from './games/game-manager.js';
import { shuffle, sample, esc, speak, speakerButton, plural } from './games/drill.js';

const PAGE = 60;

let shown = 0;
let visible = [];
let dbShown = 0;
let dbList = [];
let games = null;

/* ============================================================
   Boot
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {
    const { categories, words } = await loadCategories();
    state.init(words, categories);

    buildNav();
    buildLevelRail();
    buildFilters();
    buildImport();
    buildLevelTest();

    games = new GameManager(
        document.getElementById('practice-root'),
        state,
        (result) => {
            state.markLearned(result.learned);
            updateLedger();
        }
    );
    games.showSetup();

    renderWords(true);
    updateLedger();
    drawRoadmap();
});

/* ============================================================
   Navigation
   ============================================================ */

function buildNav() {
    const tabs = document.querySelectorAll('#main-nav .nav-tab-btn');
    const views = document.querySelectorAll('.view-section');

    tabs.forEach(tab => {
        tab.onclick = () => {
            const target = tab.dataset.tabTarget;
            tabs.forEach(t => t.classList.toggle('active', t === tab));
            views.forEach(v => v.classList.toggle('active', v.id === target));

            if (target === 'tab-dictionary') renderWords(true);
            else if (target === 'tab-import') renderDb(true);
            else if (target === 'tab-roadmap') drawRoadmap();
            else if (target === 'tab-practice' && games && !games.active) games.showSetup();
        };
    });
}

function openTab(id) {
    const tab = document.querySelector(`[data-tab-target="${id}"]`);
    if (tab) tab.click();
}

/* ============================================================
   Progress ledger
   ============================================================ */

function updateLedger() {
    const p = state.progress();
    document.getElementById('ledger-learned').textContent = p.learned;
    document.getElementById('ledger-total').textContent = `/ ${p.total}`;
    document.getElementById('ledger-pct').textContent = `${p.pct}%`;
    document.getElementById('ledger-fill').style.width = `${p.pct}%`;
    document.getElementById('ledger-level').textContent =
        state.selectedLevel === 'ALL' ? 'all levels' : state.selectedLevel;

    const btn = document.getElementById('btn-level-test');
    const lvl = state.selectedLevel === 'ALL' ? 'A1' : state.selectedLevel;
    btn.textContent = `Level ${lvl} test`;
    btn.disabled = state.pool({ level: lvl }).length < 4;
}

/* ============================================================
   Level filter
   ============================================================ */

function buildLevelRail() {
    const rail = document.getElementById('level-rail');
    const counts = state.levelCounts();

    rail.innerHTML = ['ALL', ...LEVELS].map(lvl => {
        const n = counts[lvl] || 0;
        const empty = n === 0 && lvl !== 'ALL';
        return `
      <button type="button"
              class="level-chip ${lvl === state.selectedLevel ? 'active' : ''} ${lvl === 'ALL' ? '' : `lvl-${lvl.toLowerCase()}`}"
              data-level="${lvl}" ${empty ? 'disabled' : ''}>
        <span class="level-chip-name">${lvl === 'ALL' ? 'All' : lvl}</span>
        <span class="level-chip-count">${n} ${plural(n, 'word', 'words')}</span>
      </button>`;
    }).join('');

    rail.querySelectorAll('.level-chip:not([disabled])').forEach(btn => {
        btn.onclick = () => {
            state.setLevel(btn.dataset.level);
            rail.querySelectorAll('.level-chip').forEach(b => b.classList.toggle('active', b === btn));
            renderWords(true);
            updateLedger();
        };
    });
}

/* ============================================================
   Dictionary
   ============================================================ */

function buildFilters() {
    const cat = document.getElementById('category-select');
    cat.innerHTML = '<option value="ALL">All topics</option>' +
        state.categories.map(c => `<option value="${esc(c.id)}">${esc(c.name || c.id)}</option>`).join('');
    cat.onchange = (e) => {
        state.selectedCategory = e.target.value;
        renderWords(true);
    };

    document.getElementById('sort-select').onchange = (e) => {
        state.sortMode = e.target.value;
        renderWords(true);
    };

    let timer;
    document.getElementById('search-input').oninput = (e) => {
        clearTimeout(timer);
        const value = e.target.value.trim().toLowerCase();
        timer = setTimeout(() => {
            state.searchQuery = value;
            renderWords(true);
        }, 140);
    };

    document.getElementById('btn-more-words').onclick = () => renderWords(false);
}

function renderWords(reset) {
    const list = document.getElementById('word-list');
    const more = document.getElementById('btn-more-words');
    const line = document.getElementById('result-line');

    if (reset) {
        shown = 0;
        list.innerHTML = '';
        visible = state.filtered();
    }

    if (!visible.length) {
        list.innerHTML = `
      <div class="empty-note">
        <p>No words match this filter.</p>
        <p>Try another level, or clear the search.</p>
      </div>`;
        line.textContent = '';
        more.classList.add('hidden');
        return;
    }

    const frag = document.createDocumentFragment();
    visible.slice(shown, shown + PAGE).forEach(w => frag.appendChild(entry(w)));
    list.appendChild(frag);
    shown = Math.min(shown + PAGE, visible.length);

    line.textContent = `${visible.length} ${plural(visible.length, 'word', 'words')} · showing ${shown}`;
    more.classList.toggle('hidden', shown >= visible.length);
    more.textContent = `Show ${Math.min(PAGE, visible.length - shown)} more`;
}

function entry(word) {
    const el = document.createElement('article');
    const lvl = word.level.toLowerCase();
    el.className = `entry lvl-${lvl}${state.isLearned(word.id) ? ' is-learned' : ''}`;

    el.innerHTML = `
    <div>
      <div class="entry-head">
        <span class="entry-cz">${esc(word.cz)}</span>
        ${speakerButton(`Listen to ${word.cz}`)}
        ${word.transcription ? `<span class="entry-phon">[${esc(word.transcription)}]</span>` : ''}
      </div>
      <p class="entry-ua">${esc(word.ua)}</p>
      ${word.en ? `<p class="entry-en">${esc(word.en)}</p>` : ''}
    </div>
    <div class="entry-side">
      <span class="level-mark lvl-${lvl}">${word.level}</span>
      <button type="button" class="btn-learn${state.isLearned(word.id) ? ' on' : ''}">
        ${state.isLearned(word.id) ? 'Learned' : 'Learning'}
      </button>
    </div>
    ${word.usage ? `<p class="entry-usage">${esc(word.usage)}</p>` : ''}`;

    el.querySelector('[data-say]').onclick = () => speak(word.cz);

    const learn = el.querySelector('.btn-learn');
    learn.onclick = () => {
        state.toggleLearned(word.id);
        const on = state.isLearned(word.id);
        learn.classList.toggle('on', on);
        learn.textContent = on ? 'Learned' : 'Learning';
        el.classList.toggle('is-learned', on);
        updateLedger();
    };

    return el;
}

/* ============================================================
   Roadmap
   ============================================================ */

function drawRoadmap() {
    renderRoadmap(
        document.getElementById('roadmap-mount'),
        state,
        (lvl) => {
            state.setLevel(lvl);
            buildLevelRail();
            renderWords(true);
            updateLedger();
            openTab('tab-dictionary');
        },
        (lvl) => runLevelTest(lvl)
    );
}

/* ============================================================
   Level test
   ============================================================ */

function buildLevelTest() {
    document.getElementById('btn-level-test').onclick = () => {
        runLevelTest(state.selectedLevel === 'ALL' ? 'A1' : state.selectedLevel);
    };
}

function runLevelTest(level) {
    const pool = state.pool({ level });
    if (pool.length < 4) return;

    const questions = sample(pool, Math.min(20, pool.length));
    let i = 0;
    let score = 0;
    const right = [];

    const modal = document.createElement('div');
    modal.className = 'overlay';
    modal.innerHTML = `
    <div class="overlay-window" role="dialog" aria-modal="true">
      <div class="overlay-head">
        <div>
          <h3>Level ${level} test</h3>
          <p>${questions.length} ${plural(questions.length, 'question', 'questions')} · 80% marks them all as learned</p>
        </div>
        <button type="button" class="btn-close" aria-label="Close">&times;</button>
      </div>
      <div class="track"><div class="track-fill" id="test-fill" style="width:0%"></div></div>
      <div class="overlay-body" id="test-body"></div>
    </div>`;

    document.body.appendChild(modal);
    const close = () => {
        modal.remove();
        document.removeEventListener('keydown', onEsc);
    };
    const onEsc = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onEsc);
    modal.querySelector('.btn-close').onclick = close;
    modal.onclick = (e) => { if (e.target === modal) close(); };

    const body = modal.querySelector('#test-body');
    const fill = modal.querySelector('#test-fill');

    function question() {
        const q = questions[i];
        fill.style.width = `${Math.round((i / questions.length) * 100)}%`;

        const options = shuffle([
            q.ua,
            ...sample(pool.filter(w => w.ua !== q.ua), 3).map(w => w.ua)
        ]);

        body.innerHTML = `
      <p class="exam-meta">Question ${i + 1} of ${questions.length}</p>
      <div class="exam-word">${esc(q.cz)}</div>
      <p class="exam-phon">${q.transcription ? `[${esc(q.transcription)}]` : ''}</p>
      <div class="opt-grid">
        ${options.map(o => `<button type="button" class="opt" data-val="${esc(o)}">${esc(o)}</button>`).join('')}
      </div>`;

        speak(q.cz);

        body.querySelectorAll('.opt').forEach(btn => {
            btn.onclick = () => {
                const ok = btn.dataset.val === q.ua;
                if (ok) { score++; right.push(q.id); }

                body.querySelectorAll('.opt').forEach(b => {
                    b.disabled = true;
                    if (b.dataset.val === q.ua) b.classList.add('right');
                    else if (b === btn) b.classList.add('wrong');
                    else b.classList.add('faded');
                });

                setTimeout(() => {
                    i++;
                    if (i < questions.length) question();
                    else result();
                }, ok ? 420 : 900);
            };
        });
    }

    function result() {
        fill.style.width = '100%';
        const pct = Math.round((score / questions.length) * 100);
        const passed = pct >= 80;

        if (passed) {
            state.markLearned(right);
            updateLedger();
            renderWords(true);
            drawRoadmap();
        }

        body.innerHTML = `
      <div class="result-pane">
        <div class="result-score">${pct}%</div>
        <p class="result-of">${score} of ${questions.length}</p>
        <h2>${passed ? `Level ${level} cleared` : 'Not cleared yet'}</h2>
        <p>${passed
                ? 'Every word you got right has been added to your learned list.'
                : 'You need 80%. Run a drill in Practice, then try again.'}</p>
        <div class="result-actions">
          <button type="button" class="btn btn-solid" id="test-done">${passed ? 'Done' : 'Try again'}</button>
          ${passed ? '' : '<button type="button" class="btn btn-outline" id="test-practice">Go to practice</button>'}
        </div>
      </div>`;

        body.querySelector('#test-done').onclick = () => {
            close();
            if (!passed) runLevelTest(level);
        };
        const practice = body.querySelector('#test-practice');
        if (practice) practice.onclick = () => {
            close();
            openTab('tab-practice');
        };
    }

    question();
}

/* ============================================================
   Own words
   ============================================================ */

function buildImport() {
    document.getElementById('form-add').onsubmit = (e) => {
        e.preventDefault();
        const cz = document.getElementById('add-cz').value.trim();
        const ua = document.getElementById('add-ua').value.trim();
        const level = document.getElementById('add-level').value;
        if (!cz || !ua) return;

        state.addWords([{ cz, ua, level }]);
        e.target.reset();
        refreshAll();
    };

    document.getElementById('btn-import').onclick = () => {
        const field = document.getElementById('import-json');
        const raw = field.value.trim();
        if (!raw) return;

        let parsed;
        try {
            parsed = JSON.parse(raw);
        } catch {
            flash(field, 'That is not valid JSON. Expected an array of objects.');
            return;
        }
        if (!Array.isArray(parsed)) {
            flash(field, 'Expected an array, e.g. [{"cz":"pes","ua":"собака"}]');
            return;
        }

        const n = state.addWords(parsed);
        field.value = '';
        flash(field, `Imported ${n} ${plural(n, 'word', 'words')}.`);
        refreshAll();
    };

    let timer;
    document.getElementById('db-search').oninput = (e) => {
        clearTimeout(timer);
        const q = e.target.value.trim().toLowerCase();
        timer = setTimeout(() => {
            dbList = q
                ? state.allWords.filter(w => w.cz.toLowerCase().includes(q) || w.ua.toLowerCase().includes(q))
                : state.allWords;
            renderDb(true);
        }, 140);
    };

    document.getElementById('btn-more-db').onclick = () => renderDb(false);
    dbList = state.allWords;
}

function flash(afterEl, message) {
    let note = afterEl.parentElement.querySelector('.flash-note');
    if (!note) {
        note = document.createElement('p');
        note.className = 'flash-note result-line';
        note.style.marginTop = '10px';
        afterEl.parentElement.appendChild(note);
    }
    note.textContent = message;
}

function renderDb(reset) {
    const body = document.getElementById('db-body');
    const more = document.getElementById('btn-more-db');

    if (reset) {
        dbShown = 0;
        body.innerHTML = '';
    }

    if (!dbList.length) {
        body.innerHTML = '<tr><td colspan="5" style="color:var(--text-4)">Nothing found.</td></tr>';
        more.classList.add('hidden');
        return;
    }

    const frag = document.createDocumentFragment();
    dbList.slice(dbShown, dbShown + PAGE).forEach((w, k) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
      <td>${dbShown + k + 1}</td>
      <td class="cz-cell">${esc(w.cz)}</td>
      <td>${esc(w.ua)}</td>
      <td><span class="level-mark lvl-${w.level.toLowerCase()}">${w.level}</span></td>
      <td>${w.custom ? '<button type="button" class="btn-remove">Remove</button>' : ''}</td>`;

        const del = tr.querySelector('.btn-remove');
        if (del) del.onclick = () => {
            state.removeWord(w.id);
            dbList = dbList.filter(x => x.id !== w.id);
            tr.remove();
            refreshAll();
        };

        frag.appendChild(tr);
    });

    body.appendChild(frag);
    dbShown = Math.min(dbShown + PAGE, dbList.length);
    more.classList.toggle('hidden', dbShown >= dbList.length);
    more.textContent = `Show ${Math.min(PAGE, dbList.length - dbShown)} more`;
}

function refreshAll() {
    dbList = state.allWords;
    buildLevelRail();
    renderWords(true);
    renderDb(true);
    updateLedger();
    drawRoadmap();
    if (games && !games.active) games.showSetup();
}
