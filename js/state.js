const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const KEY_LEARNED = 'slovnicek_learned_words';
const KEY_LEVEL = 'slovnicek_selected_level';
const KEY_CUSTOM = 'slovnicek_custom_words';

/* The source data keeps both translations in one string:
   "Good morning (before noon) / Доброго дня (до полудня)".
   The separator is always a slash padded with spaces — slashes inside
   parentheses never are — so this split is safe for the whole dataset. */
function splitTranslation(raw) {
    if (!raw) return { en: '', ua: '' };
    const at = raw.indexOf(' / ');
    if (at === -1) return { en: '', ua: raw.trim() };
    return { en: raw.slice(0, at).trim(), ua: raw.slice(at + 3).trim() };
}

export const state = {
    allWords: [],
    categories: [],
    selectedLevel: 'ALL',
    selectedCategory: 'ALL',
    sortMode: 'default',
    searchQuery: '',
    learnedWords: {},

    init(rawWords, rawCategories = []) {
        this.categories = rawCategories;
        this.allWords = this.normalize(rawWords);
        this.allWords.unshift(...this.loadCustom());
        this.learnedWords = readJSON(KEY_LEARNED, {});
        const saved = readRaw(KEY_LEVEL);
        this.selectedLevel = saved && (saved === 'ALL' || LEVELS.includes(saved)) ? saved : 'ALL';
    },

    normalize(input) {
        if (!Array.isArray(input)) return [];
        return input.map((w, i) => {
            const cz = (w.cz || w.czech || w.word || '').trim();

            // A word may arrive either pre-split (custom words, imports) or
            // as one combined "translation" string (the bundled dataset).
            let en = w.en || '';
            let ua = (w.ua || w.uk || '').trim();
            if (!ua) {
                const parts = splitTranslation(w.translation || w.translate || '');
                en = en || parts.en;
                ua = parts.ua;
            }

            let level = String(w.level || w.lvl || 'A1').toUpperCase().trim();
            if (!LEVELS.includes(level)) level = 'A1';

            return {
                id: w.id || `w${i}_${cz}`,
                cz,
                ua,
                en,
                level,
                usage: (w.usage || '').trim(),
                transcription: w.transcription || w.trans || w.pronunciation || '',
                category: w.category || w.cat || 'custom',
                categoryName: w.categoryName || '',
                custom: !!w.custom
            };
        }).filter(w => w.cz && w.ua);
    },

    /* ---------- persistence ---------- */

    loadCustom() {
        const raw = readJSON(KEY_CUSTOM, []);
        return this.normalize(raw.map(w => ({ ...w, custom: true })));
    },

    saveCustom() {
        writeJSON(KEY_CUSTOM, this.allWords.filter(w => w.custom).map(w => ({
            id: w.id, cz: w.cz, ua: w.ua, en: w.en, level: w.level, usage: w.usage, category: w.category
        })));
    },

    saveLearned() {
        writeJSON(KEY_LEARNED, this.learnedWords);
    },

    /* ---------- mutations ---------- */

    addWords(list) {
        const added = this.normalize(list.map((w, i) => ({
            ...w,
            custom: true,
            id: w.id || `custom_${Date.now()}_${i}`,
            category: w.category || 'custom',
            categoryName: 'My words'
        })));
        this.allWords.unshift(...added);
        this.saveCustom();
        return added.length;
    },

    removeWord(id) {
        this.allWords = this.allWords.filter(w => w.id !== id);
        delete this.learnedWords[id];
        this.saveCustom();
        this.saveLearned();
    },

    setLevel(level) {
        this.selectedLevel = level;
        writeRaw(KEY_LEVEL, level);
    },

    toggleLearned(id) {
        if (this.learnedWords[id]) delete this.learnedWords[id];
        else this.learnedWords[id] = 1;
        this.saveLearned();
    },

    markLearned(ids) {
        ids.forEach(id => { this.learnedWords[id] = 1; });
        this.saveLearned();
    },

    isLearned(id) {
        return !!this.learnedWords[id];
    },

    /* ---------- queries ---------- */

    levelCounts() {
        const counts = { ALL: this.allWords.length };
        LEVELS.forEach(l => { counts[l] = 0; });
        this.allWords.forEach(w => { counts[w.level]++; });
        return counts;
    },

    filtered() {
        const q = this.searchQuery;
        let list = this.allWords.filter(w => {
            if (this.selectedLevel !== 'ALL' && w.level !== this.selectedLevel) return false;
            if (this.selectedCategory !== 'ALL' && w.category !== this.selectedCategory) return false;
            if (!q) return true;
            return w.cz.toLowerCase().includes(q)
                || w.ua.toLowerCase().includes(q)
                || w.en.toLowerCase().includes(q);
        });

        if (this.sortMode === 'az') {
            const collator = new Intl.Collator('cs');
            list = [...list].sort((a, b) => collator.compare(a.cz, b.cz));
        } else if (this.sortMode === 'todo') {
            list = [...list].sort((a, b) => this.isLearned(a.id) - this.isLearned(b.id));
        }
        return list;
    },

    /** Word pool for a practice session. */
    pool({ level = 'ALL', category = 'ALL' } = {}) {
        return this.allWords.filter(w =>
            (level === 'ALL' || w.level === level) &&
            (category === 'ALL' || w.category === category)
        );
    },

    progress(level = null) {
        const target = level || this.selectedLevel;
        const words = target === 'ALL' ? this.allWords : this.allWords.filter(w => w.level === target);
        if (!words.length) return { total: 0, learned: 0, pct: 0 };
        const learned = words.reduce((n, w) => n + (this.learnedWords[w.id] ? 1 : 0), 0);
        return { total: words.length, learned, pct: Math.round((learned / words.length) * 100) };
    }
};

export { LEVELS };

function readRaw(key) {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

function writeRaw(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch (e) {
        console.warn('Could not save', key, e);
    }
}

function readJSON(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
}

function writeJSON(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.warn('Could not save', key, e);
    }
}
