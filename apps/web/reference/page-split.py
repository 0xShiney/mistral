#!/usr/bin/env python3
"""Slice the captured server HTML of the cloned content pages into section markup.

Run from the repo root, after placing the raw server responses in reference/:

    curl -s https://mistral.ai/products/    > reference/original-products.html
    curl -s https://mistral.ai/our-method/  > reference/original-method.html
    curl -s https://mistral.ai/use-cases/   > reference/original-usecases.html
    curl -s https://mistral.ai/sovereign-ai/> reference/original-sovereign.html
    curl -s https://mistral.ai/products/vibe/ > reference/original-vibe.html
    curl -s https://mistral.ai/products/studio/  > reference/original-studio.html
    curl -s https://mistral.ai/products/forge/   > reference/original-forge.html
    curl -s https://mistral.ai/cloud/inference/  > reference/original-inference.html
    curl -s https://mistral.ai/cloud/compute/    > reference/original-compute.html
    mkdir -p reference/original-usecases-detail
    for s in <the 16 slugs>; do
      curl -s https://mistral.ai/use-cases/$s/ > reference/original-usecases-detail/$s.html
    done
    python3 reference/page-split.py

Each top-level child of the taxi-view container (`#page-path`, `#use-case-index`)
becomes one `.html` file under src/markup/<page>/markup/, emitted byte-for-byte
through the thin .astro wrappers in src/components/<page>/ (Vite `?raw`).

Only invisible dev comments are removed, `/_astro/<hash>.<media>` URLs are
rewritten to the local `/media/` directory (same filenames) and the CDN
cache-buster is dropped, exactly like reference/research-split.py.
"""
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
    # strip the container's own closing tag
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


PAGES = {
    'products': {
        'container': '<div id="page-path"',
        'names': ['hero', 'bento'],
        'classes': ['ProductsHero', 'ProductBento'],
        'comment': 'https://mistral.ai/products/',
    },
    'method': {
        'container': '<div id="page-path"',
        'names': [
            'hero',
            'value-headline', 'value',
            'journey',
            'working-headline', 'working',
            'team-headline', 'team',
            'quotes',
            'flexibility-headline', 'flexibility',
            'closing',
        ],
        'classes': [
            'MethodHero',
            'ValueHeadline', 'ValueGrid',
            'Journey',
            'WorkingHeadline', 'Working',
            'TeamHeadline', 'Team',
            'Quotes',
            'FlexibilityHeadline', 'Flexibility',
            'Closing',
        ],
        'comment': 'https://mistral.ai/our-method/',
    },
    'use-cases': {
        'capture': 'usecases',
        'container': '<div id="use-case-index"',
        'names': ['hero', 'index'],
        'classes': ['UseCasesHero', 'UseCaseIndex'],
        'comment': 'https://mistral.ai/use-cases/',
    },
    'sovereign-ai': {
        'capture': 'sovereign',
        'container': '<div id="page-path"',
        'names': [
            'hero',
            'scroll-story',
            'layers-headline', 'layers',
            'path-headline', 'path',
            'closing',
        ],
        'classes': [
            'SovereignHero',
            'ScrollStory',
            'LayersHeadline', 'Layers',
            'PathHeadline', 'Path',
            'Closing',
        ],
        'comment': 'https://mistral.ai/sovereign-ai/',
    },
    'vibe': {
        'capture': 'vibe',
        'container': '<div id="page-path"',
        'names': [
            'hero',
            'logos',
            'features-headline', 'features',
            'pricing-headline', 'pricing',
            'understand',
            'work-headline', 'ship',
            'audiences-headline',
            'faq',
            'closing',
        ],
        'classes': [
            'VibeHero',
            'VibeLogos',
            'VibeFeaturesHeadline', 'VibeFeatures',
            'VibePricingHeadline', 'VibePricing',
            'VibeUnderstand',
            'VibeWorkHeadline', 'VibeShip',
            'VibeAudiencesHeadline',
            'VibeFaq',
            'VibeClosing',
        ],
        'comment': 'https://mistral.ai/products/vibe/',
    },
    'studio': {
        'capture': 'studio',
        'container': '<div id="page-path"',
        'names': ['hero', 'platform', 'cards-headline', 'cards', 'closing'],
        'classes': ['StudioHero', 'StudioPlatform', 'StudioCardsHeadline', 'StudioCards', 'StudioClosing'],
        'comment': 'https://mistral.ai/products/studio/',
    },
    'forge': {
        'capture': 'forge',
        'container': '<div id="page-path"',
        'names': [
            'hero',
            'logos',
            'why-headline', 'why',
            'system-headline', 'system',
            'media',
            'industries-headline', 'industries',
            'closing',
        ],
        'classes': [
            'ForgeHero',
            'ForgeLogos',
            'ForgeWhyHeadline', 'ForgeWhy',
            'ForgeSystemHeadline', 'ForgeSystem',
            'ForgeMedia',
            'ForgeIndustriesHeadline', 'ForgeIndustries',
            'ForgeClosing',
        ],
        'comment': 'https://mistral.ai/products/forge/',
    },
    'inference': {
        'capture': 'inference',
        'container': '<div id="page-path"',
        'names': [
            'hero',
            'logos',
            'sovereignty-headline', 'sovereignty',
            'models-headline', 'models',
            'apis',
            'stories',
            'resources-headline', 'resources',
            'closing-headline', 'faq',
        ],
        'classes': [
            'InferenceHero',
            'InferenceLogos',
            'InferenceSovereigntyHeadline', 'InferenceSovereignty',
            'InferenceModelsHeadline', 'InferenceModels',
            'InferenceApis',
            'InferenceStories',
            'InferenceResourcesHeadline', 'InferenceResources',
            'InferenceClosingHeadline', 'InferenceFaq',
        ],
        'comment': 'https://mistral.ai/cloud/inference/',
    },
    'compute': {
        'capture': 'compute',
        'container': '<div id="page-path"',
        'names': [
            'hero',
            'media',
            'quotes',
            'infra-headline', 'infra',
            'controls-headline', 'controls', 'guarantees',
            'closing',
        ],
        'classes': [
            'ComputeHero',
            'ComputeMedia',
            'ComputeQuotes',
            'ComputeInfraHeadline', 'ComputeInfra',
            'ComputeControlsHeadline', 'ComputeControls', 'ComputeGuarantees',
            'ComputeClosing',
        ],
        'comment': 'https://mistral.ai/cloud/compute/',
    },
}

for page, cfg in PAGES.items():
    src_path = os.path.join(ROOT, 'reference', 'original-%s.html' % cfg.get('capture', page))
    if not os.path.exists(src_path):
        print('skip %-12s (no %s)' % (page, src_path))
        continue
    html = open(src_path, encoding='utf8').read()
    body = html[html.index('<body>'):]
    container = body.index(cfg['container'])
    segs = children(body, container)
    assert len(segs) == len(cfg['names']), (page, len(segs), len(cfg['names']))

    out_dir = os.path.join(ROOT, 'src/markup', page, 'markup')
    comp_dir = os.path.join(ROOT, 'src/components', page)
    os.makedirs(out_dir, exist_ok=True)
    os.makedirs(comp_dir, exist_ok=True)

    for name, seg in zip(cfg['names'], segs):
        cleaned = clean(seg)
        with open(os.path.join(out_dir, name + '.html'), 'w', encoding='utf8') as f:
            f.write(cleaned + '\n')
        print('%-12s %-22s %7d bytes' % (page, name, len(cleaned)))

    for name, cls in zip(cfg['names'], cfg['classes']):
        comp = f"""---
// Section markup captured verbatim from {cfg['comment']}
// Behaviour (bento, tabs, sliders, filters, scrollytelling) comes from the
// original client runtime in public/js/ — this component only emits the DOM.
import RawSection from '../RawSection.astro'
import markup from '../../markup/{page}/markup/{name}.html?raw'
---

<RawSection html={{markup}} />
"""
        with open(os.path.join(comp_dir, cls + '.astro'), 'w', encoding='utf8') as f:
            f.write(comp)

    print('wrappers ->', len(cfg['names']), 'for', page)


# ---------------------------------------------------------------- detail pages
# /use-cases/<slug>/ is one CMS template: either two blocks (hero + body) or
# four (hero + body + "related" headline + related cards). The blocks stay in a
# single file per slug and the 16 routes share one component plus one dynamic
# Astro route, so adding a case study never means editing page composition.

import html as html_mod
import json

DETAIL_CAPTURES = os.path.join(ROOT, 'reference', 'original-usecases-detail')
SLUGS = sorted(f[:-5] for f in os.listdir(DETAIL_CAPTURES) if f.endswith('.html'))
DETAIL_OUT = os.path.join(ROOT, 'src/markup', 'use-cases-detail')
os.makedirs(DETAIL_OUT, exist_ok=True)


def page_inner(path):
    raw = open(path, encoding='utf8').read()
    body = raw[raw.index('<body>'):]
    segs = children(body, body.index('<div id="page-path"'))
    return clean(''.join(segs))


for slug in SLUGS:
    inner = page_inner(os.path.join(DETAIL_CAPTURES, slug + '.html'))
    with open(os.path.join(DETAIL_OUT, slug + '.html'), 'w', encoding='utf8') as f:
        f.write(inner + '\n')
    print('%-45s %7d bytes' % ('use-case-detail ' + slug, len(inner)))

# The detail component is the same for every slug; write it once.
with open(os.path.join(ROOT, 'src/components/use-cases/UseCaseDetail.astro'), 'w', encoding='utf8') as f:
    f.write("""---
// One captured /use-cases/<slug>/ page, emitted verbatim. All 16 detail pages
// share this component: the route picks the markup and passes it in.
import RawSection from '../RawSection.astro'

interface Props {
  markup: string
}

const { markup } = Astro.props
---

<RawSection html={markup} />
""")


def meta_of(path):
    raw = open(path, encoding='utf8').read()
    title = html_mod.unescape(re.search(r'<title>(.*?)</title>', raw, re.S).group(1).strip())
    m = re.search(r'<meta name="description" content="([^"]*)"', raw)
    description = html_mod.unescape(m.group(1)) if m else ''
    m = re.search(r'<script type="application/ld\+json"[^>]*>(.*?)</script>', raw, re.S)
    return title, description, json.loads(m.group(1))


records = []
for slug in SLUGS:
    path = '/use-cases/%s/' % slug
    title, description, jsonld = meta_of(os.path.join(DETAIL_CAPTURES, slug + '.html'))
    records.append({'slug': slug, 'path': path, 'title': title, 'description': description, 'jsonLd': jsonld})

vibe_title, vibe_description, vibe_jsonld = meta_of(os.path.join(ROOT, 'reference', 'original-vibe.html'))
vibe = {'slug': 'vibe', 'path': '/products/vibe/', 'title': vibe_title, 'description': vibe_description, 'jsonLd': vibe_jsonld}

# The four product/cloud landing pages cloned alongside Vibe: same shape, one
# record each, exported by name.
LANDINGS = {'STUDIO': '/products/studio/', 'FORGE': '/products/forge/', 'INFERENCE': '/cloud/inference/', 'COMPUTE': '/cloud/compute/'}
landings = {}
for const, path in LANDINGS.items():
    capture = os.path.join(ROOT, 'reference', 'original-%s.html' % path.strip('/').split('/')[-1])
    title, description, jsonld = meta_of(capture)
    landings[const] = {'slug': path.strip('/').split('/')[-1], 'path': path, 'title': title, 'description': description, 'jsonLd': jsonld}


def ts(d):
    return ("  {\n"
            "    slug: %s,\n"
            "    path: %s,\n"
            "    title: %s,\n"
            "    description: %s,\n"
            "    jsonLd: %s,\n"
            "  },\n") % (
        json.dumps(d['slug'], ensure_ascii=False),
        json.dumps(d['path'], ensure_ascii=False),
        json.dumps(d['title'], ensure_ascii=False),
        json.dumps(d['description'], ensure_ascii=False),
        json.dumps(d['jsonLd'], ensure_ascii=False, indent=2).replace('\n', '\n    '),
    )


content = (
    '/**\n'
    ' * Detail-page registry.\n'
    ' *\n'
    ' * Generated by reference/page-split.py from the captured server HTML; do not\n'
    ' * edit by hand. `jsonLd` is the page\'s own structured-data graph, re-encoded\n'
    ' * field-for-field by Base.astro.\n'
    ' */\n'
    'export type DetailPage = {\n'
    '  slug: string\n'
    '  path: string\n'
    '  title: string\n'
    '  description: string\n'
    '  jsonLd: Record<string, unknown>\n'
    '}\n\n'
    'export const VIBE: DetailPage = ' + ts(vibe).strip().rstrip(',') + '\n\n'
    + ''.join('export const %s: DetailPage = %s\n\n' % (k, ts(v).strip().rstrip(',')) for k, v in landings.items())
    + 'export const USE_CASE_DETAILS: DetailPage[] = [\n'
    + ''.join(ts(r) for r in records)
    + ']\n'
)
with open(os.path.join(ROOT, 'src/content/details.ts'), 'w', encoding='utf8') as f:
    f.write(content)
print('metadata ->', len(records), 'use-case details + vibe -> src/content/details.ts')
