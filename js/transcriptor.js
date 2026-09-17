export function cleanTranscript(rawText) {
    if (!rawText) return '';

    let text = rawText;
    text = text.replace(/^Эпизод.*$/gm, ' ');
    text = text.replace(/^Kapitola.*$/gm, ' ');
    text = text.replace(/\b\d{1,2}:\d{2}\b/g, ' ');
    text = text.replace(/\d+\s*(?:секунд[а-я]*|минут[а-я]*|sekund[a-z]*|minut[a-z]*)/gi, ' ');
    text = text.replace(/\[.*?\]/g, ' ');
    text = text.replace(/([.!?])\s+(?=[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ])/g, '$1\n\n');

    return text;
}

export function renderInteractiveTranscript(containerEl, cleanedText, onWordClick) {
    containerEl.innerHTML = '';
    const segments = cleanedText.split(/(\s+)/);

    segments.forEach(segment => {
        if (!segment.trim()) {
            if (segment.includes('\n')) {
                const breaksCount = (segment.match(/\n/g) || []).length;
                for (let i = 0; i < breaksCount; i++) {
                    containerEl.appendChild(document.createElement('br'));
                }
            } else {
                containerEl.appendChild(document.createTextNode(segment));
            }
            return;
        }

        const span = document.createElement('span');
        span.textContent = segment;
        span.addEventListener('click', () => {
            const cleanWord = segment.replace(/[.,!?()[\]{}"':;]/g, '').toLowerCase();
            if (typeof onWordClick === 'function') {
                onWordClick(cleanWord);
            }
        });
        containerEl.appendChild(span);
    });
}

export function findSentenceWithWord(fullText, word) {
    if (!fullText || !word) return '';
    const sentences = fullText.match(/[^.!?\n]+[.!?\n]+/g) || [fullText];
    const target = word.toLowerCase();
    const found = sentences.find(s => s.toLowerCase().includes(target));
    return found ? found.trim() : '';
}