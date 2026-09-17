export const STAGES = [
    {
        id: "stage-a1",
        level: "A1",
        title: "Breakthrough & Survival",
        description: "Fundamental survival phrases, introductions, basic numbers, colors, and immediate everyday items.",
        categoryIds: ["fraze", "cisla", "barvy", "rodina", "cas"],
        targetWordCount: 200,
        accentColor: "#10B981"
    },
    {
        id: "stage-a2",
        level: "A2",
        title: "Elementary & Daily Routines",
        description: "Routine interactions, home, groceries, public spaces, urban transport, basic physical descriptions.",
        categoryIds: ["domov", "kuchyne", "jidlo", "obleceni", "mesto", "doprava", "vlastnosti", "slovesa-pohyb"],
        targetWordCount: 400,
        accentColor: "#3B82F6"
    },
    {
        id: "stage-b1",
        level: "B1",
        title: "Intermediate & Expression",
        description: "Expressing feelings, discussing health, nature, travel challenges, weather phenomena, and mental states.",
        categoryIds: ["telo", "zdravi", "cestovani", "priroda", "zvirata", "pocasi", "emoce", "slovesa-mysl"],
        targetWordCount: 500,
        accentColor: "#6366F1"
    },
    {
        id: "stage-b2",
        level: "B2",
        title: "Vantage & Professional",
        description: "Workplace communication, corporate culture, higher education, technologies, legal terms, and state institutions.",
        categoryIds: ["prace", "skola", "spolecnost"],
        targetWordCount: 500,
        accentColor: "#F59E0B"
    },
    {
        id: "stage-c1",
        level: "C1",
        title: "Advanced & Academic",
        description: "Complex social discourses, abstract argumentation, formal idioms, literary expressions, and specialized scientific vocabulary.",
        categoryIds: ["abstraktum", "frazeologie", "veda", "ekonomika-pravo"],
        targetWordCount: 400,
        accentColor: "#EC4899"
    },
    {
        id: "stage-c2",
        level: "C2",
        title: "Mastery & Stylistic Nuance",
        description: "Native-level nuances, archaisms, dialectal variations, philosophical precision, stylistic registers, and rare collocations.",
        categoryIds: ["archaismy", "slang-hovorova", "literarni-stylistika"],
        targetWordCount: 300,
        accentColor: "#8B5CF6"
    }
];

export function getStageById(stageId) {
    return STAGES.find(stage => stage.id === stageId) || null;
}

export function getStageByCategoryId(categoryId) {
    return STAGES.find(stage => stage.categoryIds.includes(categoryId)) || null;
}

export function calculateStageProgress(stage, userLearnedWordIds, allCards) {
    const stageCards = allCards.filter(card => stage.categoryIds.includes(card.category));
    if (stageCards.length === 0) return 0;

    const learnedInStage = stageCards.filter(card => userLearnedWordIds.has(card.id)).length;
    return Math.min(100, Math.round((learnedInStage / stageCards.length) * 100));
}