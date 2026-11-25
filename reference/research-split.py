#!/usr/bin/env python3
"""Slice the captured /research/ server HTML into per-section markup.

Run from the repo root:  python3 reference/research-split.py

The capture (reference/original-research.html) is the raw server response from
https://mistral.ai/research/. Each top-level child of `#page-path` becomes one
`.html` file under src/markup/research/markup/, consumed by the thin .astro
wrappers in src/components/research/ via Vite's `?raw` import so the markup is
emitted byte-for-byte (no formatter, no expression parsing, no re-minification).

Only invisible Handlebars/JSX dev comments are removed and `/_astro/<hash>.webp`
media URLs are rewritten to the local `/media/` directory (same filenames).
"""
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
html = open(os.path.join(ROOT, 'reference/original-research.html'), encoding='utf8').read()
body = html[html.index('<body>'):]

VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta',
        'param', 'source', 'track', 'wbr'}
RAW = {'script', 'style'}
TOKEN = re.compile(r'<!--.*?-->|<!\[CDATA\[.*?\]\]>|<![^>]*>|</?([a-zA-Z][\w:-]*)([^>]*?)(/?)>', re.S)


def match_end(markup: str, start: int) -> int:
    depth = 0
    i = start
    while True:
        m = TOKEN.search(markup, i)
        if not m:
            raise ValueError('unbalanced markup at %d' % start)
        i = m.end()
        if m.group(1) is None:
            continue
        tag = m.group(1).lower()
        if tag in VOID:
            continue
        if m.group(0).startswith('</'):
            depth -= 1
            if depth == 0:
                return i
        elif m.group(3) == '/':
            if depth == 0:
                return m.end()
        elif tag in RAW:
            close = markup.lower().find('</' + tag, i)
            i = markup.index('>', close) + 1
        else:
            depth += 1


PAGE_START = body.index('<div id="page-path"')
PAGE_OPEN_END = body.index('>', PAGE_START) + 1
MAIN_END = body.index('</div></main>')

children = []
i = PAGE_OPEN_END
while i < MAIN_END:
    m = TOKEN.search(body, i)
    if not m:
        break
    if m.group(1) is None:
        i = m.end()
        continue
    children.append((m.start(), match_end(body, m.start())))
    i = children[-1][1]

NAMES = [
    'hero',
    'models-headline',
    'models',
    'publications-headline',
    'publications',
    'areas-headline',
    'areas',
    'work-headline',
    'work',
    'build-headline',
    'build',
    'join',
]
assert len(children) == len(NAMES), (len(children), [body[a:a + 60] for a, _ in children])


def clean(markup: str) -> str:
    markup = re.sub(r'<!--.*?-->', '', markup, flags=re.S)
    markup = re.sub(r'/_astro/([^"?,\s]+\.(?:webp|avif|jpg|jpeg|png|svg))\?dpl=[^"\s,]+', r'/media/\1', markup)
    markup = re.sub(r'/_astro/([^"?,\s]+\.(?:webp|avif|jpg|jpeg|png|svg))', r'/media/\1', markup)
    markup = markup.replace('?dpl=6b05bdbedc377dc95c33a083', '')
    return markup.strip()


OUT = os.path.join(ROOT, 'src/markup/research/markup')
os.makedirs(OUT, exist_ok=True)
for name, (a, z) in zip(NAMES, children):
    seg = clean(body[a:z])
    with open(os.path.join(OUT, name + '.html'), 'w', encoding='utf8') as f:
        f.write(seg + '\n')
    print(f'{name:22} {len(seg):>7} bytes')

# Component wrappers: one per section, markup stays in the .html file.
COMP = os.path.join(ROOT, 'src/components/research')
os.makedirs(COMP, exist_ok=True)
CLASSES = {
    'hero': 'ResearchHero',
    'models-headline': 'ModelsHeadline',
    'models': 'ModelsDock',
    'publications-headline': 'PublicationsHeadline',
    'publications': 'Publications',
    'areas-headline': 'ResearchAreasHeadline',
    'areas': 'ResearchAreas',
    'work-headline': 'WorkHeadline',
    'work': 'InsideTheWork',
    'build-headline': 'BuildHeadline',
    'build': 'BuildCards',
    'join': 'JoinUs',
}
for name, cls in CLASSES.items():
    src = f"""---
// Section markup captured verbatim from https://mistral.ai/research/ .
// Behaviour (models dock, filter, reveals, sliders) comes from the original
// client runtime in public/js/ — this component only emits the DOM.
import markup from '../../content/research/markup/{name}.html?raw'
import {{ rewriteHrefs }} from '../../content/routes'
---

<Fragment set:html={{rewriteHrefs(markup)}} />
"""
    with open(os.path.join(COMP, cls + '.astro'), 'w', encoding='utf8') as f:
        f.write(src)
print('wrappers ->', len(CLASSES))
