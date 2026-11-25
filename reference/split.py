#!/usr/bin/env python3
"""One-shot tool: slice the captured server HTML into Astro components.

The markup is kept byte-for-byte identical to the original server HTML so that
the (also identical) compiled stylesheet produces identical geometry. Only
invisible Handlebars/JSX dev comments are removed and `/_astro/<hash>.webp`
media URLs are rewritten to the local `/media/` directory.

Top-level children of `#page-path` are located with a real tag matcher instead
of hand-measured offsets so every component is a balanced element tree.
"""
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
html = open(os.path.join(ROOT, 'reference/original.html'), encoding='utf8').read()
BODY = 11377
body = html[BODY:]

VOID = {
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta',
    'param', 'source', 'track', 'wbr',
}
RAW = {'script', 'style'}

TOKEN = re.compile(r'<!--.*?-->|<!\[CDATA\[.*?\]\]>|<![^>]*>|</?([a-zA-Z][\w:-]*)([^>]*?)(/?)>', re.S)


def match_end(markup: str, start: int) -> int:
    """Return index just past the matching close tag of the element at `start`."""
    depth = 0
    i = start
    while True:
        m = TOKEN.search(markup, i)
        if not m:
            raise ValueError('unbalanced markup at %d' % start)
        i = m.end()
        if m.group(1) is None:
            continue  # comment / doctype
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
    # skip whitespace-only gaps
    children.append((m.start(), match_end(body, m.start())))
    i = children[-1][1]

NAMES = [
    'Hero',
    'VibeBar',
    'LogoMarquee',
    'Strings',
    'FeatureHeadline',
    'FeatureBody',
    'CustomersHeadline',
    'CustomersTabs',
    'DeeperHeadline',
    'DeeperCards',
]
assert len(children) == len(NAMES), (len(children), [body[a:a + 60] for a, _ in children])

# The skip link lives in Base.astro; the header component owns the
# <global-navigation> custom element that the nav runtime upgrades.
HEADER = html[html.index('<global-navigation>'): html.index('<main id="main"')]
FOOTER = body[body.index('<global-footer>'): body.index('<script type="module"')]


def clean(markup: str) -> str:
    markup = re.sub(r'<!--.*?-->', '', markup, flags=re.S)
    markup = re.sub(r'/_astro/([^"?,]+\.(?:webp|avif|jpg|jpeg|png))\?dpl=[^"\s,]+', r'/media/\1', markup)
    markup = re.sub(r'/_astro/([^"?]+\.(?:webp|avif|jpg|jpeg|png))"', r'/media/\1"', markup)
    markup = markup.replace('?dpl=6b05bdbedc377dc95c33a083', '')
    return markup.strip()


FM = """---
// Static section markup, rendered on the server exactly as the original does.
// Behaviour comes from the vanilla-TS/GSAP modules loaded in Base.astro.
---

"""


def write_component(name: str, markup: str):
    path = os.path.join(ROOT, 'src/components', name + '.astro')
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf8') as f:
        f.write(FM + markup + '\n')


write_component('GlobalNavigation', clean(HEADER))
for name, (a, z) in zip(NAMES, children):
    write_component('sections/' + name, clean(body[a:z]))
    print(f'{name:20} {z - a:>7} bytes  {body[a:a + 48]!r}')
write_component('GlobalFooter', clean(FOOTER))
print('header', len(clean(HEADER)), 'footer', len(clean(FOOTER)))
