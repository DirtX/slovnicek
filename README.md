# Slovníček

Czech–Ukrainian vocabulary: 8,324 words across 31 topics, five drills, an
A1–C2 roadmap.

## Running it

The site uses ES modules, so opening `index.html` by double-click (the
`file://` protocol) will not work. Any local server will:

    python3 -m http.server 8000

then open http://localhost:8000

If you would rather not run a server, build the single-file version
(`python3 bundle.py`) and double-click `dist/slovnicek.html` instead.

## Layout

    index.html
    css/
      main.css          palette tokens, the .glass primitive, type scale
      components.css    header, dictionary, roadmap, database, level test
      games.css         the practice suite
    js/
      app.js            dictionary, filters, level test, custom words
      state.js          data, progress, localStorage
      roadmap.js         the A1–C2 stage cards
      transcriptor.js    dev tool: cleans a transcript and makes it click-to-look-up
      translator.js      dev tool: Google Translate lookup for a Czech word
      games/
        drill.js        shared base for every drill, plus speech
        mode-choice.js  multiple choice
        mode-typing.js  typing
        mode-pairs.js   pairs
        mode-cloze.js   fill the gap
        mode-builder.js phrase builder
        game-manager.js setup, session, results
    data/
      registry.js       category loading
      stages.js         CEFR stages
      categories/       31 vocabulary files

## Palette

The top of `css/main.css` holds the whole theme:

    --night      #0A0908   page
    --champagne  #E6CDA3   primary accent
    --amber      #FFB765   glow
    --cream      #F4EFE7   text
    --rose       #D4676F   errors
    --leaf       #93C08F   correct answers

Frosted surfaces come from the `.glass` class and the `--glass-*` tokens
just below. Level colours (`--a1` … `--c2`) drive the roadmap rails.

If `backdrop-filter` is unsupported, `.glass` falls back to a solid warm
surface so nothing loses contrast.

## Adding vocabulary

Drop a new file in `data/categories/` shaped like the others:

    export const myCategory = {
        id: "my-id",
        name: "My Topic",
        stageId: "stage-b1",
        words: [
            { cz: "slovo", translation: "Word / Слово",
              usage: "To slovo neznám.", level: "B1" }
        ]
    };

Then add its filename to `FILES` in `data/registry.js`. Two things matter:
`stageId` decides which roadmap card lists the topic, and a `usage`
sentence containing the headword verbatim makes the word eligible for the
fill-the-gap drill.

The "Import a list" tab on the site takes the same shape, but pre-split
into `cz` and `ua` rather than one combined `translation` string.

## Dev tools

Two helper modules aren't wired into the app itself — they're for
building vocabulary data, not for the running site:

- `js/translator.js` — `lookupWord(czWord)` queries Google Translate for
  the English and Ukrainian sense of a Czech word, plus variants and
  example sentences, for drafting new category entries.
- `js/transcriptor.js` — cleans a raw subtitle/transcript dump (episode
  markers, timestamps, bracketed notes) and renders it as clickable text,
  so a word met while watching or reading can be looked up in context.

## Speech

Pronunciation uses the browser's speech synthesis. `czechVoice()` in
`js/games/drill.js` ranks the installed Czech voices and picks the best
one, preferring network and neural voices over the stock local voice.
If everything sounds robotic, install a better Czech voice at OS level —
Chrome and Edge also ship good network voices when online.

## Rebuilding the single file

    python3 bundle.py

It reads this same folder and writes `dist/slovnicek.html`, so the two
versions cannot drift apart.
