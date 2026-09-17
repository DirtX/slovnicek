import { STAGES } from '../data/stages.js';

const FALLBACK = [
    { level: 'A1', title: 'Breakthrough & Survival', description: 'Greetings, family, numbers, colours and time.' },
    { level: 'A2', title: 'Elementary & Daily Routines', description: 'Home, kitchen, food, clothing, city and transport.' },
    { level: 'B1', title: 'Intermediate & Expression', description: 'Health, the body, travel, nature and weather.' },
    { level: 'B2', title: 'Vantage & Professional', description: 'Work, education, society and nuanced description.' },
    { level: 'C1', title: 'Advanced & Academic', description: 'Abstract argument, idiom, science, business and law.' },
    { level: 'C2', title: 'Mastery & Stylistic Nuance', description: 'Colloquial register, literary terms and archaisms.' }
];

function stages() {
    const raw = Array.isArray(STAGES) && STAGES.length ? STAGES : FALLBACK;
    return raw.map((s, i) => ({
        id: s.id || `stage-${(s.level || FALLBACK[i].level).toLowerCase()}`,
        level: s.level || FALLBACK[i]?.level || 'A1',
        title: s.title || FALLBACK[i]?.title || '',
        desc: s.description || s.desc || FALLBACK[i]?.description || ''
    }));
}

export function renderRoadmap(mount, state, onStudy, onTest) {
    if (!mount) return;

    // Topics come from the categories that declare this stage, so the list
    // can never drift out of sync with the vocabulary files.
    const counts = {};
    state.allWords.forEach(w => { counts[w.category] = (counts[w.category] || 0) + 1; });

    mount.innerHTML = `<div class="roadmap">${stages().map(stg => {
        const p = state.progress(stg.level);
        const has = p.total > 0;
        const done = has && p.pct >= 80;
        const key = stg.level.toLowerCase();

        const topics = state.categories
            .filter(c => c.stageId === stg.id && counts[c.id])
            .map(c => `<span class="topic">${c.name || c.id} <span class="topic-n">${counts[c.id]}</span></span>`);

        return `
        <div class="stage glass lvl-${key} ${done ? 'done' : has ? 'open' : 'locked'}">
          <div class="stage-top">
            <div>
              <p class="stage-level">${stg.level}</p>
              <h3 class="stage-title">${stg.title}</h3>
            </div>
            <span class="stage-pill">${p.pct}% mastered</span>
          </div>
          <p class="stage-desc">${stg.desc}</p>
          <div class="stage-rule"></div>
          ${topics.length ? `<div class="topic-row">${topics.join('')}</div>` : ''}
          <div class="stage-foot">
            <span class="stage-count">${has ? `${p.learned} of ${p.total} words learned` : 'No vocabulary at this level yet'}</span>
            <div class="stage-actions">
              <button type="button" class="btn btn-quiet" data-study="${stg.level}" ${has ? '' : 'disabled'}>Browse words</button>
              <button type="button" class="btn btn-outline" data-test="${stg.level}" ${has ? '' : 'disabled'}>Level test</button>
            </div>
          </div>
        </div>`;
    }).join('')}</div>`;

    mount.querySelectorAll('[data-study]').forEach(b => {
        b.onclick = () => onStudy(b.dataset.study);
    });
    mount.querySelectorAll('[data-test]').forEach(b => {
        b.onclick = () => onTest(b.dataset.test);
    });
}
