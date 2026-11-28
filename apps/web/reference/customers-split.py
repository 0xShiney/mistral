#!/usr/bin/env python3
"""Slice the captured server HTML of /customers/ into section markup.

Run from the repo root (apps/web), after placing the raw server responses in
reference/:

    curl -s https://mistral.ai/customers/ > reference/original-customers.html
    mkdir -p reference/original-customers-detail
    for s in <the 42 slugs>; do
      curl -s https://mistral.ai/customers/$s/ > reference/original-customers-detail/$s.html
    done
    python3 reference/customers-split.py

/customers/ is one taxi view (`#customer-stories`) with three top-level blocks:
the collection hero, the featured slider and the full post grid. Each becomes
one `.html` file under src/markup/customers/markup/, emitted byte-for-byte
through the thin wrappers in src/components/customers/.

/customers/<slug>/ uses one CMS template everywhere: a hero grid plus a prose
body. The 42 pages therefore share one component (`CustomerStory.astro`) and
one dynamic route; the captures land in src/markup/customers-detail/ and their
metadata is written to src/content/customers.ts.

Only invisible dev comments are removed, `/_astro/<hash>.<media>` URLs are
rewritten to the local `/media/` directory (same filenames) and the CDN
cache-buster is dropped, exactly like reference/page-split.py. One extra
rewrite: `/customers` and `/customers/<slug>` get their trailing slash back,
because the original answers those URLs with a 301 and the clone ships as plain
static files with no redirects — without it the six untrailed slider links would
404 locally. Astro adds the same slash to internal hrefs at build time anyway, so
this only keeps the capture and the rendered HTML saying the same thing.
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


DETAIL_CAPTURES = os.path.join(ROOT, 'reference', 'original-customers-detail')
SLUGS = sorted(f[:-5] for f in os.listdir(DETAIL_CAPTURES) if f.endswith('.html'))


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
    markup = re.sub(r'href="/customers/([a-z0-9-]+)"',
                    lambda m: 'href="/customers/%s/"' % m.group(1) if m.group(1) in SLUGS else m.group(0),
                    markup)
    markup = re.sub(r'href="/customers"', 'href="/customers/"', markup)
    return markup.strip()


def page_inner(path, container):
    raw = open(path, encoding='utf8').read()
    body = raw[raw.index('<body>'):]
    segs = children(body, body.index(container))
    return clean(''.join(segs))


# ------------------------------------------------------------------ /customers/
INDEX = {
    'capture': 'reference/original-customers.html',
    'container': '<div id="customer-stories"',
    'names': ['hero', 'featured', 'grid'],
    'classes': ['CustomersHero', 'CustomersFeatured', 'CustomersGrid'],
    'comment': 'https://mistral.ai/customers/',
}

src = os.path.join(ROOT, INDEX['capture'])
if not os.path.exists(src):
    raise SystemExit('missing capture: ' + src)

body = open(src, encoding='utf8').read()
body = body[body.index('<body>'):]
segs = children(body, body.index(INDEX['container']))
assert len(segs) == len(INDEX['names']), (len(segs), INDEX['names'])

out_dir = os.path.join(ROOT, 'src/markup', 'customers', 'markup')
comp_dir = os.path.join(ROOT, 'src/components', 'customers')
os.makedirs(out_dir, exist_ok=True)
os.makedirs(comp_dir, exist_ok=True)

for name, seg in zip(INDEX['names'], segs):
    cleaned = clean(seg)
    with open(os.path.join(out_dir, name + '.html'), 'w', encoding='utf8') as f:
        f.write(cleaned + '\n')
    print('%-12s %-22s %7d bytes' % ('customers', name, len(cleaned)))

for name, cls in zip(INDEX['names'], INDEX['classes']):
    comp = f"""---
// Section markup captured verbatim from {INDEX['comment']}
// Behaviour (the featured slider and the post grid) comes from the original
// client runtime in public/js/ — this component only emits the DOM.
import RawSection from '../RawSection.astro'
import markup from '../../markup/customers/markup/{name}.html?raw'
---

<RawSection html={{markup}} />
"""
    with open(os.path.join(comp_dir, cls + '.astro'), 'w', encoding='utf8') as f:
        f.write(comp)

print('wrappers ->', len(INDEX['names']), 'for customers')


# --------------------------------------------------------- /customers/<slug>/
DETAIL_OUT = os.path.join(ROOT, 'src/markup', 'customers-detail')
os.makedirs(DETAIL_OUT, exist_ok=True)

for slug in SLUGS:
    inner = page_inner(os.path.join(DETAIL_CAPTURES, slug + '.html'), '<div id="page-path"')
    with open(os.path.join(DETAIL_OUT, slug + '.html'), 'w', encoding='utf8') as f:
        f.write(inner + '\n')
    print('%-45s %7d bytes' % ('customer ' + slug, len(inner)))

with open(os.path.join(ROOT, 'src/components/customers/CustomerStory.astro'), 'w', encoding='utf8') as f:
    f.write("""---
// One captured /customers/<slug>/ page, emitted verbatim. All 42 stories share
// this component: the route picks the markup and passes it in.
import RawSection from '../RawSection.astro'

interface Props {
  markup: string
}

const { markup } = Astro.props
---

<RawSection html={markup} />
""")


# Base.astro's default social card; stories that ship their own thumbnail are
# the only pages whose og:image differs from it.
DEFAULT_OG_IMAGE = 'https://mistral.ai/cms-media/api/media/file/cover-mistral-sovereign%20copie.webp'


def meta_of(path):
    raw = open(path, encoding='utf8').read()
    title = html_mod.unescape(re.search(r'<title>(.*?)</title>', raw, re.S).group(1).strip())
    m = re.search(r'<meta name="description" content="([^"]*)"', raw)
    description = html_mod.unescape(m.group(1)) if m else ''
    m = re.search(r'<meta property="og:image" content="([^"]*)"', raw)
    image = html_mod.unescape(m.group(1)) if m else DEFAULT_OG_IMAGE
    m = re.search(r'<meta property="og:image:width" content="(\d+)"', raw)
    width = m.group(1) if m else '1200'
    m = re.search(r'<meta property="og:image:height" content="(\d+)"', raw)
    height = m.group(1) if m else '630'
    m = re.search(r'<script type="application/ld\+json"[^>]*>(.*?)</script>', raw, re.S)
    return title, description, image, width, height, json.loads(m.group(1))


records = []
for slug in SLUGS:
    path = '/customers/%s/' % slug
    title, description, image, width, height, jsonld = meta_of(os.path.join(DETAIL_CAPTURES, slug + '.html'))
    record = {'slug': slug, 'path': path, 'title': title, 'description': description, 'jsonLd': jsonld}
    if image != DEFAULT_OG_IMAGE:
        record['image'] = image
        record['imageWidth'] = width
        record['imageHeight'] = height
    records.append(record)


def ts(d):
    return ("  {\n"
            "    slug: %s,\n"
            "    path: %s,\n"
            "    title: %s,\n"
            "    description: %s,\n"
            "%s"
            "%s"
            "    jsonLd: %s,\n"
            "  },\n") % (
        json.dumps(d['slug'], ensure_ascii=False),
        json.dumps(d['path'], ensure_ascii=False),
        json.dumps(d['title'], ensure_ascii=False),
        json.dumps(d['description'], ensure_ascii=False),
        ('    image: %s,\n' % json.dumps(d['image'], ensure_ascii=False)) if 'image' in d else '',
        ('    imageWidth: %s,\n    imageHeight: %s,\n' % (json.dumps(d['imageWidth']), json.dumps(d['imageHeight']))) if 'image' in d else '',
        json.dumps(d['jsonLd'], ensure_ascii=False, indent=2).replace('\n', '\n    '),
    )


content = (
    '/**\n'
    ' * Customer-story registry.\n'
    ' *\n'
    ' * Generated by reference/customers-split.py from the captured server HTML;\n'
    ' * do not edit by hand. `jsonLd` is the page\'s own structured-data graph,\n'
    ' * re-encoded field-for-field by Base.astro.\n'
    ' */\n'
    'export type CustomerStory = {\n'
    '  slug: string\n'
    '  path: string\n'
    '  title: string\n'
    '  description: string\n'
    '  /** Social card, when the story ships its own thumbnail. */\n'
    '  image?: string\n'
    '  /** Dimensions of that card, exactly as the original declares them. */\n'
    '  imageWidth?: string\n'
    '  imageHeight?: string\n'
    '  jsonLd: Record<string, unknown>\n'
    '}\n\n'
    'export const CUSTOMER_STORIES: CustomerStory[] = [\n'
    + ''.join(ts(r) for r in records)
    + ']\n'
)
with open(os.path.join(ROOT, 'src/content/customers.ts'), 'w', encoding='utf8') as f:
    f.write(content)
print('metadata ->', len(records), 'customer stories -> src/content/customers.ts')
