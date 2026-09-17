export async function lookupWord(czWord) {
    const cleanWord = czWord.trim();
    if (!cleanWord) return null;

    const fetchTranslation = async (lang) => {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=cs&tl=${lang}&dt=t&dt=bd&dt=ex&q=${encodeURIComponent(cleanWord)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Translate API error: ${res.status}`);
        return res.json();
    };

    const [dataEn, dataUk] = await Promise.all([
        fetchTranslation('en'),
        fetchTranslation('uk')
    ]);

    let bestEn = '';
    if (dataEn && dataEn[0] && dataEn[0][0]) {
        bestEn = dataEn[0][0][0].trim();
    }

    let bestUk = '';
    if (dataUk && dataUk[0] && dataUk[0][0]) {
        bestUk = dataUk[0][0][0].trim();
    }

    if (bestEn.toLowerCase() === cleanWord.toLowerCase()) bestEn = '';
    if (bestUk.toLowerCase() === cleanWord.toLowerCase()) bestUk = '';

    const primary = [bestEn, bestUk].filter(Boolean).join(' / ');

    const extractVariants = (data, lang) => {
        const list = new Set();
        if (data && data[1]) {
            data[1].forEach(partOfSpeech => {
                if (partOfSpeech[1]) {
                    partOfSpeech[1].forEach(word => list.add(word.trim().toLowerCase()));
                }
            });
        }
        return Array.from(list).map(text => ({ text, lang }));
    };

    const enVariants = extractVariants(dataEn, 'en');
    const ukVariants = extractVariants(dataUk, 'uk');
    const allVariants = [...enVariants, ...ukVariants].filter(
        v => v.text !== bestEn.toLowerCase() && v.text !== bestUk.toLowerCase()
    );

    const extractExamples = (data, lang) => {
        const list = new Set();
        if (data && data[13] && data[13][0]) {
            data[13][0].forEach(group => {
                if (group[0]) {
                    const cleanEx = group[0].replace(/<\/?b>/g, '').trim();
                    list.add(cleanEx);
                }
            });
        }
        return Array.from(list).map(text => ({ text, lang }));
    };

    const enExamples = extractExamples(dataEn, 'en');
    const ukExamples = extractExamples(dataUk, 'uk');
    const allExamples = [...enExamples, ...ukExamples];

    return {
        primary,
        variants: allVariants,
        examples: allExamples
    };
}