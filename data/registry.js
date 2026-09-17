const FILES = [
    '01-phrases', '02-family', '03-body', '04-health', '05-home', '06-kitchen',
    '07-food', '08-clothing', '09-colors', '10-city', '11-transport', '12-travel',
    '13-nature', '14-animals', '15-weather', '16-time', '17-numbers', '18-jobs',
    '19-education', '20-society', '21-adj-physical', '22-adj-emotion',
    '23-verbs-movement', '24-verbs-mental', '25-abstract', '26-idioms',
    '27-science', '28-business-law', '29-colloquial', '30-literary', '31-archaic'
];

/**
 * Loads every category file in parallel and flattens them into one word list.
 * Each file default-exports (or named-exports) a single object:
 *   { id, name, stageId, words: [{ cz, translation, usage, level }] }
 *
 * The single-file build drops the categories on window ahead of time, so the
 * same code path serves both the modular site and the standalone page.
 */
export async function loadCategories() {
    let categories;

    if (Array.isArray(window.__SLOVNICEK_CATEGORIES__)) {
        categories = window.__SLOVNICEK_CATEGORIES__;
    } else {
        const modules = await Promise.all(FILES.map(name =>
            import(`./categories/${name}.js`).catch(err => {
                console.error('Failed to load category', name, err);
                return null;
            })
        ));
        categories = modules
            .filter(Boolean)
            .map(mod => mod.default || Object.values(mod).find(v => v && Array.isArray(v.words)))
            .filter(Boolean);
    }

    const words = categories.flatMap(cat =>
        (cat.words || []).map((w, i) => ({
            ...w,
            id: `${cat.id}_${i}`,
            category: cat.id,
            categoryName: cat.name || cat.id
        }))
    );

    return { categories: categories.map(({ id, name, stageId }) => ({ id, name, stageId })), words };
}
