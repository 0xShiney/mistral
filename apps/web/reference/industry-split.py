#!/usr/bin/env python3
"""Slice the captured server HTML of the /industry/ routes into section markup.

Run from the repo root (apps/web), after placing the raw server responses in
reference/:

    curl -sL https://mistral.ai/industry/ > reference/original-industry.html
    mkdir -p reference/original-industry-detail
    for s in cybersecurity energy financial-services manufacturing public-sector; do
      curl -sL https://mistral.ai/industry/$s/ > reference/original-industry-detail/$s.html
    done
    python3 reference/industry-split.py

/industry/ is an empty taxi view on the original (header + footer, nothing in
`#page-path`), so it gets no blocks. The five verticals are landing pages whose
`#page-path` children are captured one file each into
`src/markup/industry/markup/<vertical>/<block>.html` and emitted by the thin
wrappers in `src/components/industry/`.

Four verticals share one block order; /industry/cybersecurity/ carries an extra
promo banner after the logo strip. Metadata (title, description, JSON-LD, social
card) is written to src/content/industry.ts.

Only invisible dev comments are removed, `/_astro/<hash>.<media>` URLs are
rewritten to the local `/media/` directory (same filenames) and the CDN
cache-buster is dropped, exactly like reference/page-split.py. CMS links that the
original 301s to a trailing-slash route are normalised for the same reason as in
reference/customers-split.py: the clone ships as static files without redirects.
"""
import html as html_mod
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

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


def children(markup: str, container_start: int):
    open_end = markup.index('>', container_start) + 1
    container_end = match_end(markup, container_start)
    inner = markup[open_end:container_end]
    inner = inner[:inner.rindex('</')]
    out = []
    i = 0
    while i < len(inner):
        m = TOKEN.search(inner, i)
        if not m:
            break
        if m.group(1) is None:
            i = m.end()
            continue
        end = match_end(inner, m.start())
        out.append(inner[m.start():end])
        i = end
    return out


def clean(markup: str) -> str:
    markup = re.sub(r'<!--.*?-->', '', markup, flags=re.S)
    markup = re.sub(r'/_astro/([^"?,\s]+\.(?:webp|avif|jpg|jpeg|png|svg|gif|mp4|webm))\?dpl=[^"\s,]+', r'/media/\1', markup)
    markup = re.sub(r'/_astro/([^"?,\s]+\.(?:webp|avif|jpg|jpeg|png|svg|gif|mp4|webm))', r'/media/\1', markup)
    markup = re.sub(r'\?dpl=[a-f0-9]+', '', markup)
    return markup.strip()


VERTICALS = ['cybersecurity', 'energy', 'financial-services', 'manufacturing', 'public-sector']

# One entry per `#page-path` child, in document order. Names describe the block's
# job on the page; the class is the component written to src/components/industry/.
COMMON = [
    ('hero', 'Hero'),
    ('cover', 'Cover'),
    ('trusted-headline', 'TrustedHeadline'),
    ('trusted', 'Trusted'),
    ('logos', 'Logos'),
    ('sovereignty-headline', 'SovereigntyHeadline'),
    ('sovereignty', 'Sovereignty'),
    ('capabilities-headline', 'CapabilitiesHeadline'),
    ('capabilities', 'Capabilities'),
    ('experts-headline', 'ExpertsHeadline'),
    ('experts', 'Experts'),
    ('use-cases-headline', 'UseCasesHeadline'),
    ('use-cases', 'UseCases'),
    ('closing', 'Closing'),
]
BLOCKS = {v: COMMON for v in VERTICALS}
# /industry/cybersecurity/ adds the "Built for the Defenders" promo banner.
BLOCKS['cybersecurity'] = COMMON[:3] + [('promo', 'Promo')] + COMMON[3:]

PREFIX = {
    'cybersecurity': 'Cybersecurity',
    'energy': 'Energy',
    'financial-services': 'FinancialServices',
    'manufacturing': 'Manufacturing',
    'public-sector': 'PublicSector',
}

DETAIL_CAPTURES = os.path.join(ROOT, 'reference', 'original-industry-detail')
OUT = os.path.join(ROOT, 'src/markup', 'industry', 'markup')
COMP = os.path.join(ROOT, 'src/components', 'industry')
os.makedirs(COMP, exist_ok=True)

for vertical in VERTICALS:
    capture = os.path.join(DETAIL_CAPTURES, vertical + '.html')
    if not os.path.exists(capture):
        raise SystemExit('missing capture: ' + capture)
    raw = open(capture, encoding='utf8').read()
    body = raw[raw.index('<body>'):]
    segs = children(body, body.index('<div id="page-path"'))
    names = BLOCKS[vertical]
    assert len(segs) == len(names), (vertical, len(segs), len(names))

    out_dir = os.path.join(OUT, vertical)
    os.makedirs(out_dir, exist_ok=True)
    for (name, _cls), seg in zip(names, segs):
        cleaned = clean(seg)
        with open(os.path.join(out_dir, name + '.html'), 'w', encoding='utf8') as f:
            f.write(cleaned + '\n')
        print('%-18s %-22s %7d bytes' % (vertical, name, len(cleaned)))

    for name, cls in names:
        comp = f"""---
// Section markup captured verbatim from https://mistral.ai/industry/{vertical}/
// Behaviour (sliders, tabbed media, scroll reveals) comes from the original
// client runtime in public/js/ — this component only emits the DOM.
import RawSection from '../RawSection.astro'
import markup from '../../markup/industry/markup/{vertical}/{name}.html?raw'
---

<RawSection html={{markup}} />
"""
        with open(os.path.join(COMP, PREFIX[vertical] + cls + '.astro'), 'w', encoding='utf8') as f:
            f.write(comp)
    print('wrappers ->', len(names), 'for', vertical)


DEFAULT_OG_IMAGE = 'https://mistral.ai/cms-media/api/media/file/cover-mistral-sovereign%20copie.webp'


def meta_of(path):
    raw = open(path, encoding='utf8').read()
    title = html_mod.unescape(re.search(r'<title>(.*?)</title>', raw, re.S).group(1).strip())
    m = re.search(r'<meta name="description" content="([^"]*)"', raw)
    description = html_mod.unescape(m.group(1)) if m else ''
    m = re.search(r'<meta property="og:image" content="([^"]*)"', raw)
    image = html_mod.unescape(m.group(1)) if m else DEFAULT_OG_IMAGE
    m = re.search(r'<script type="application/ld\+json"[^>]*>(.*?)</script>', raw, re.S)
    return title, description, image, json.loads(m.group(1))


def ts(name, path, record):
    lines = ['export const %s: IndustryPage = {' % name,
             "  slug: %s," % json.dumps(record['slug'], ensure_ascii=False),
             "  path: %s," % json.dumps(path, ensure_ascii=False),
             "  title: %s," % json.dumps(record['title'], ensure_ascii=False),
             "  description: %s," % json.dumps(record['description'], ensure_ascii=False)]
    if 'image' in record:
        lines.append("  image: %s," % json.dumps(record['image'], ensure_ascii=False))
    ld = json.dumps(record['jsonLd'], ensure_ascii=False, indent=2).replace('\n', '\n  ')
    lines.append('  jsonLd: %s,' % ld)
    lines.append('}')
    return '\n'.join(lines)


index_title, index_description, index_image, index_jsonld = meta_of(os.path.join(ROOT, 'reference', 'original-industry.html'))
index_record = {'slug': 'industry', 'title': index_title, 'description': index_description, 'jsonLd': index_jsonld}
if index_image != DEFAULT_OG_IMAGE:
    index_record['image'] = index_image

blocks = ["/**",
          " * Industry-route registry.",
          " *",
          " * Generated by reference/industry-split.py from the captured server HTML; do not",
          " * edit by hand. `jsonLd` is each page's own structured-data graph, re-encoded",
          " * field-for-field by Base.astro.",
          " */",
          "export type IndustryPage = {",
          "  slug: string",
          "  path: string",
          "  title: string",
          "  description: string",
          "  /** Social card, when the page ships its own cover. */",
          "  image?: string",
          "  jsonLd: Record<string, unknown>",
          "}",
          "",
          ts('INDUSTRY_INDEX', '/industry/', index_record),
          ""]

for vertical in VERTICALS:
    title, description, image, jsonld = meta_of(os.path.join(DETAIL_CAPTURES, vertical + '.html'))
    record = {'slug': vertical, 'title': title, 'description': description, 'jsonLd': jsonld}
    if image != DEFAULT_OG_IMAGE:
        record['image'] = image
    const = vertical.upper().replace('-', '_')
    blocks.append(ts(const, '/industry/%s/' % vertical, record))
    blocks.append('')

blocks.append('export const INDUSTRY_VERTICALS: IndustryPage[] = [')
for vertical in VERTICALS:
    const = vertical.upper().replace('-', '_')
    blocks.append('  %s,' % const)
blocks.append(']')

with open(os.path.join(ROOT, 'src/content/industry.ts'), 'w', encoding='utf8') as f:
    f.write('\n'.join(blocks) + '\n')
print('metadata -> src/content/industry.ts')
