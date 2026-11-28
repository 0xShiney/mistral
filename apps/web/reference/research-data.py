#!/usr/bin/env python3
"""Generate the typed content model for /research/ from the captured server HTML.

Run from the repo root:  python3 reference/research-data.py

The page itself renders the original markup verbatim (src/markup/research/markup/*.html);
these files are the typed, diffable view of the same content — used for review and for
content assertions. Both come from the same capture, so they cannot drift silently.
"""
import html
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAP = os.path.join(ROOT, 'reference/original-research.html')
OUT = os.path.join(ROOT, 'src/data/research')
os.makedirs(OUT, exist_ok=True)
src = open(CAP, encoding='utf8').read()
# Same asset-path normalisation as the markup splitter: Astro-hashed media is
# served from /media/ locally, and the CDN cache-buster is dropped.
src = re.sub(r'/_astro/([^"?,\s]+\.(?:webp|avif|jpg|jpeg|png|svg))\?dpl=[^"\s,]+', r'/media/\1', src)
src = src.replace('?dpl=6b05bdbedc377dc95c33a083', '')
body = src[src.index('<body>'):]


def text(fragment: str) -> str:
    fragment = re.sub(r'<(script|style)[^>]*>.*?</\1>', '', fragment, flags=re.S)
    fragment = re.sub(r'<[^>]+>', ' ', fragment)
    return re.sub(r'\s+', ' ', html.unescape(fragment)).strip()


def attr(fragment: str, name: str) -> str | None:
    m = re.search(r'\b' + name + r'="([^"]*)"', fragment)
    return html.unescape(m.group(1)) if m else None


def blocks(markup: str, opener: str) -> list[str]:
    """Split on an opener and keep each element up to the next opener (good enough:
    the captured cards are flat siblings)."""
    parts = markup.split(opener)
    return parts[1:]


# ---------------------------------------------------------------- models
models_src = body[body.index('mistral-section-models-dock'):]
models_src = models_src[:models_src.index('</mistral-section-models-dock>')]
panels = []
for panel in blocks(models_src, '<div data-tab-panel'):
    label = attr(panel, 'data-active')
    tab_head = panel[: panel.index('</div>', panel.index('js-tab-content'))]
    cards = []
    for card in blocks(panel, '<article data-model-card'):
        card = card[: card.index('</article>')]
        name_m = re.search(r'<p class="text-h4[^"]*">(.*?)</p>', card, re.S)
        desc_m = re.search(r'<p class="text-body-large[^"]*">(.*?)</p>', card, re.S)
        chips = [text(c) for c in re.findall(r'<p class="text-eyebrow[^"]*"[^>]*>(.*?)</p>', card, re.S)]
        link_m = re.search(r'<a class="[^"]*bg-action[^"]*"[^>]*href="([^"]+)"', card, re.S)
        link_label_m = re.search(r'<p class="text-button-large[^"]*">(.*?)</p>', card, re.S)
        thumbs = re.findall(r'<img src="([^"]+)"', card)
        icons = re.findall(r'<img class="block size-10 lg:size-14" src="([^"]+)"', card)
        cards.append(
            {
                'name': text(name_m.group(1)) if name_m else None,
                'specs': chips,
                'description': text(desc_m.group(1)) if desc_m else None,
                'href': html.unescape(link_m.group(1)) if link_m else None,
                'linkLabel': text(link_label_m.group(1)) if link_label_m else None,
                'icon': icons[0] if icons else None,
                'thumbnail': next((t.split(' ')[0] for t in re.findall(r'<img src="([^"]+)"', card) if '/media/' in t), None),
            }
        )
    panels.append({'cards': cards})

# group headings live above the panels
tabs = re.findall(r'<div data-active="(true|false)" class="js-tab[^"]*"[^>]*>.*?<p class="text-h5[^"]*">(.*?)</p>', models_src, re.S)
headings = re.findall(
    r'<p class="text-h5 font-mistral text-current">(.*?)</p><p class="text-body-small[^"]*">(.*?)</p>',
    body[body.index('mistral-section-models-dock'):],
    re.S,
)
model_groups = []
for i, ((title, desc), panel) in enumerate(zip(headings[:2], panels)):
    model_groups.append(
        {
            'name': text(title),
            'description': text(desc),
            'active': i == 0,
            'models': panel['cards'],
        }
    )

# ---------------------------------------------------------- publications
pubs_src = body[body.index('<mistral-section-posts'):]
pubs_src = pubs_src[: pubs_src.index('</mistral-section-posts>')]
publications = []
for row in blocks(pubs_src, '<a '):
    if 'js-listing-item js-post' not in row[:400]:
        continue
    row = row[: row.index('</a>') + 4]
    title_m = re.search(r'<p class="text-h5[^"]*">(.*?)</p>', row, re.S)
    desc_m = re.search(r'<p class="text-body-base text-text-muted">(.*?)</p>', row, re.S)
    tag_m = re.search(r'data-category-slug="([^"]+)"[^>]*>(.*?)</p>', row, re.S)
    publications.append(
        {
            'title': text(title_m.group(1)) if title_m else None,
            'description': text(desc_m.group(1)) if desc_m else None,
            'topic': text(tag_m.group(2)) if tag_m else None,
            'topicSlug': tag_m.group(1) if tag_m else None,
            'href': attr(row, 'href'),
        }
    )

topics = []
for m in re.finditer(r'data-slug="([^"]+)"><label for="cap-[^"]+"[^>]*>.*?<p class="text-eyebrow-small[^"]*">(.*?)</p>', pubs_src, re.S):
    topics.append({'slug': m.group(1), 'label': text(m.group(2))})

# --------------------------------------------------------- research areas
areas_src = body[body.index('mistral-section-cards-service'):]
areas_src = areas_src[: areas_src.index('</mistral-section-cards-service>')]
areas = []
for card in blocks(areas_src, 'class="js-slider-item'):
    h4 = re.search(r'<p class="text-h4[^"]*">(.*?)</p>', card, re.S)
    desc = re.search(r'js-card-service-description[^>]*>(.*?)</p>', card, re.S)
    icon = re.search(r'<img class="block w-12" src="([^"]+)"', card)
    if h4:
        areas.append(
            {
                'title': text(h4.group(1)),
                'description': text(desc.group(1)) if desc else None,
                'icon': html.unescape(icon.group(1)) if icon else None,
            }
        )

# ------------------------------------------------------- inside the work
work_src = body[body.index('<section class="text-text-primary w-full bg-surface-brand-primary inverted"'):]
work_src = work_src[: work_src.index('</section>')]
articles = []
for card in blocks(work_src, '<article '):
    href = attr(card, 'href')
    if not href or '/news/' not in href:
        continue
    tail = card[: card.index('</article>')]
    title_m = re.search(r'js-post-title[^>]*>(.*?)</h2>', tail, re.S)
    desc_m = re.search(r'<p class="text-body-base[^"]*">(.*?)</p>', tail, re.S)
    small = [text(x) for x in re.findall(r'<p class="text-body-small[^"]*"[^>]*>(.*?)</p>', tail, re.S)]
    date_val = next((x for x in small if re.match(r'[A-Z][a-z]+ \d{1,2}, \d{4}$', x)), None)
    author_val = next((x[3:].strip() for x in small if x.startswith('By ')), None)
    cat_m = re.search(r'<p class="text-eyebrow-small[^"]*"[^>]*>(.*?)</p>', tail, re.S)
    img = re.search(r'<img src="([^"]+)"', tail)
    articles.append(
        {
            'category': text(cat_m.group(1)) if cat_m else None,
            'title': text(title_m.group(1)) if title_m else None,
            'description': text(desc_m.group(1)) if desc_m else None,
            'date': date_val,
            'author': author_val,
            'href': html.unescape(href),
            'image': html.unescape(img.group(1)) if img else None,
        }
    )


def ts(path: str, name: str, data, comment: str):
    header = (
        "// Generated by reference/research-data.py from reference/original-research.html.\n"
        "// Content is the original's, verbatim; the page renders the same content through\n"
        "// the captured markup in src/markup/research/markup/.\n"
        + comment
        + "\n\n"
    )
    with open(os.path.join(OUT, path), 'w', encoding='utf8') as f:
        f.write(header + f"export const {name} = " + json.dumps(data, ensure_ascii=False, indent=2) + " as const\n")


ts('publications.ts', 'publications', {'topics': topics, 'items': publications}, '/** 21 publication rows + 9 filter topics, in DOM order. */')
ts('models.ts', 'modelGroups', {'groups': model_groups}, '/** Two dock groups (General purpose, Specialist) with their cards, specs and links. */')
ts('research-areas.ts', 'researchAreas', areas, '/** Six research-area cards. */')
ts('articles.ts', 'articles', articles, '/** Seven “Inside the work” cards. */')

print('models', sum(len(g['models']) for g in model_groups), 'publications', len(publications), 'topics', len(topics), 'areas', len(areas), 'articles', len(articles))
