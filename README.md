# Slovníček

Czech–Ukrainian vocabulary: 2,090 words, five drills, an A1–C2 roadmap.

## Running it

The site uses ES modules, so opening `index.html` by double-click (the
`file://` protocol) will not work. Any local server will:

    python3 -m http.server 8000

then open http://localhost:8000

If you would rather not run a server, `slovnicek.html` is a single-file
build that works from a double-click.

## Layout

    index.html
    css/
      main.css          palette tokens, the .glass primitive, type scale
      components.css    header, dictionary, roadmap, database, level test
      games.css         the practice suite
    js/
      app.js            dictionary, filters, level test, custom words
      state.js          data, progress, localStorage
      roadmap.js        the A1–C2 stage cards
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

## Speech

Pronunciation uses the browser's speech synthesis. `czechVoice()` in
`js/games/drill.js` ranks the installed Czech voices and picks the best
one, preferring network and neural voices over the stock local voice.
If everything sounds robotic, install a better Czech voice at OS level —
Chrome and Edge also ship good network voices when online.

## Rebuilding the single file

    python3 bundle.py

It reads this same folder, so the two versions cannot drift apart.
