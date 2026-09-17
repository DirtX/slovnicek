"""Builds a single self-contained HTML page from the modular site.

Everything is read from build/slovnicek/, so the standalone page and the
project folder can never drift apart.
"""
import json
import re
import os

SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.')
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'dist')

CSS = ['main.css', 'components.css', 'games.css']

# Dependency order — drill first, modes, then manager, then app.
MODULES = [
    'js/games/drill.js',
    'js/games/mode-choice.js',
    'js/games/mode-typing.js',
    'js/games/mode-pairs.js',
    'js/games/mode-cloze.js',
    'js/games/mode-builder.js',
    'js/games/game-manager.js',
    'js/state.js',
    'data/registry.js',
    'js/roadmap.js',
    'js/app.js',
]

CATEGORY_FILES = sorted(
    f for f in os.listdir(os.path.join(SRC, 'data', 'categories')) if f.endswith('.js')
)


def read(rel):
    with open(os.path.join(SRC, rel), encoding='utf-8') as fh:
        return fh.read().replace('\r\n', '\n')


def strip_module_syntax(code):
    """Turn an ES module into plain script-scope code."""
    # Drop import statements entirely; everything lands in one scope.
    code = re.sub(r'^\s*import\s+[^;]*?from\s+[\'"][^\'"]+[\'"];?\s*$', '', code, flags=re.M)
    code = re.sub(r'^\s*import\s+[\'"][^\'"]+[\'"];?\s*$', '', code, flags=re.M)
    # Drop re-export statements like `export { LEVELS };`
    code = re.sub(r'^\s*export\s*\{[^}]*\}\s*;?\s*$', '', code, flags=re.M)
    # `export const X` -> `const X`, `export function`, `export class`
    code = re.sub(r'^\s*export\s+(?=(const|let|var|function|class|async)\b)', '', code, flags=re.M)
    return code


def extract_category(js):
    """Pull the single exported category object literal out of a data file."""
    match = re.search(r'export\s+const\s+\w+\s*=\s*(\{.*?\n\};)', js, re.S)
    if not match:
        raise ValueError('no category object found')
    return match.group(1).rstrip(';')


def build():
    os.makedirs(OUT, exist_ok=True)

    css = '\n'.join(read(os.path.join('css', name)) for name in CSS)

    categories = ',\n'.join(
        extract_category(read(os.path.join('data', 'categories', name)))
        for name in CATEGORY_FILES
    )

    stages = strip_module_syntax(read(os.path.join('data', 'stages.js')))
    modules = '\n\n'.join(strip_module_syntax(read(rel)) for rel in MODULES)

    html = read('index.html')

    # Replace the stylesheet links and the module script with inline content.
    html = re.sub(r'\s*<link rel="stylesheet" href="css/[^"]+">', '', html)
    html = html.replace('</head>', f'<style>\n{css}\n</style>\n</head>')
    html = html.replace(
        '  <script type="module" src="js/app.js"></script>\n',
        '  <script>\n'
        f'window.__SLOVNICEK_CATEGORIES__ = [\n{categories}\n];\n'
        f'{stages}\n'
        f'{modules}\n'
        '  </script>\n'
    )

    target = os.path.join(OUT, 'slovnicek.html')
    with open(target, 'w', encoding='utf-8') as fh:
        fh.write(html)

    size = os.path.getsize(target)
    words = sum(len(re.findall(r'\{\s*cz:', read(os.path.join('data', 'categories', n))))
                for n in CATEGORY_FILES)
    print(f'{target}  {size/1024:.0f} KB  ({len(CATEGORY_FILES)} categories, {words} words)')


if __name__ == '__main__':
    build()
