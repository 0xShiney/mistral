#!/usr/bin/env python3
"""Extract every inline <svg> in the clone into its own component.

The captures in src/markup/ are DOM-exact strings, and the hand-written
components in src/components/ embed their icons inline. Both carry the same
little pixel-art SVGs over and over (526 occurrences, 114 distinct drawings),
so this script lifts each distinct drawing into src/svg/<group>/<name>.svg,
generates a one-line .astro wrapper per file, and leaves a reference behind:

  * src/markup/**/*.html       <svg>...</svg>  ->  <!--svg:ComponentName-->
  * src/components/**/*.astro  <svg>...</svg>  ->  <ComponentName />
                               plus the matching import

src/components/RawSection.astro resolves the markers back to components, so the
rendered bytes stay identical to the original capture (the .svg file is imported
with Vite `?raw` and emitted through set:html — no re-serialisation).

Names are assigned in scan order, so re-running this script on unchanged
sources is a no-op. Run page-split.py first: it rewrites the captures, and this
script has to be the last word on them.

    python3 reference/split-svgs.py
"""

import glob
import hashlib
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SVG_DIR = os.path.join(ROOT, 'src/svg')
COMP_DIR = os.path.join(ROOT, 'src/components/svg')

SVG_RE = re.compile(r'<svg\b[^>]*>.*?</svg>', re.S)
MARKER_RE = re.compile(r'<!--svg:([A-Za-z0-9]+)-->')
RAW_RE = re.compile(r'<(script|style)\b[^>]*>.*?</\1>', re.S)

# Drawings whose meaning is unambiguous from their aria-label / hook, so they
# get a readable name instead of a positional one.
NAMES = {
    '0aad6d01': 'arrow-up-right',
    'b0ab8d84': 'arrow-down-left',
    '5733d781': 'arrow-right',
    '71f72135': 'arrow-down',
    '9ce78335': 'logo-mistral',
    '54c277a2': 'social-linkedin',
    '27bb429d': 'social-x',
    'e1028aba': 'social-youtube',
    'e19f20c6': 'social-discord',
    'ffd5a49e': 'social-reddit',
    '2d81af51': 'badge-app-store',
    'a1e1e37e': 'badge-google-play',
    '947d01a5': 'theme-system',
    '4aabce77': 'theme-light',
    '10abe69c': 'theme-dark',
    '94d1426a': 'icon-grapple',
    '3302f89a': 'icon-factory',
    'b97adfe7': 'icon-castle',
    'ce4bce84': 'footer-illustration',
}


def digest(svg):
    return hashlib.sha1(svg.encode('utf8')).hexdigest()[:8]


def pascal(stem):
    return ''.join(p[:1].upper() + p[1:] for p in re.split(r'[-_]+', stem) if p)


def group_and_section(path):
    rel = os.path.relpath(path, ROOT).replace(os.sep, '/')
    if rel.startswith('src/markup/'):
        rest = rel[len('src/markup/'):]
        parts = rest.split('/')
        if len(parts) == 3 and parts[1] == 'markup':          # <page>/markup/<section>.html
            return parts[0], parts[2].rsplit('.html', 1)[0]
        return parts[0], parts[-1].rsplit('.html', 1)[0]      # <group>/<slug>.html
    return 'global', os.path.basename(path).rsplit('.astro', 1)[0].lower()


def sources():
    markup = sorted(glob.glob('src/markup/**/*.html', recursive=True))
    components = sorted(
        p for p in glob.glob('src/components/**/*.astro', recursive=True)
        if '/components/svg/' not in p.replace(os.sep, '/')
    )
    return [os.path.join(ROOT, p) for p in markup + components]


def choose_name(path, svg, taken, counters):
    """Assign a stable, unique, readable name for one drawing."""
    h = digest(svg)
    if h in NAMES:
        return NAMES[h]
    group, section = group_and_section(path)
    key = (group, section)
    counters[key] = counters.get(key, 0) + 1
    stem = '%s-%02d' % (section, counters[key])
    name = stem if group == 'global' else '%s-%s' % (group, stem)
    while name in taken:
        counters[key] += 1
        stem = '%s-%02d' % (section, counters[key])
        name = stem if group == 'global' else '%s-%s' % (group, stem)
    return name


def insert_imports(text, imports):
    """Add `import X from './…'` lines to an .astro frontmatter block."""
    if not imports:
        return text
    lines = text.split('\n')
    end = lines.index('---', 1)
    last_import = max((i for i in range(1, end) if lines[i].startswith('import ')), default=None)
    at = (last_import + 1) if last_import is not None else 1
    lines[at:at] = imports
    return '\n'.join(lines)


def main():
    drawings = {}       # name -> {'group', 'body', 'first'}
    bodies = {}         # sha1 -> name
    taken = set()
    existing = set()    # names already on disk; their files are left untouched
    counters = {}

    # Drawings that already have a file keep their name, so re-running the
    # pipeline (page-split.py regenerates captures, this script names them) is
    # stable and markers left in untouched captures still resolve.
    for path in sorted(glob.glob('src/svg/**/*.svg', recursive=True)):
        path = os.path.join(ROOT, path)
        group = os.path.basename(os.path.dirname(path))
        name = os.path.basename(path)[:-4]
        body = open(path, encoding='utf8').read()
        drawings[name] = {'name': name, 'group': group, 'body': body, 'first': None}
        bodies[digest(body)] = name
        taken.add(name)
        existing.add(name)

    # Pass 1: give every distinct drawing a name (scan order decides).
    for path in sources():
        text = open(path, encoding='utf8').read()
        skip = [(m.start(), m.end()) for m in RAW_RE.finditer(text)]
        for m in SVG_RE.finditer(text):
            if any(a <= m.start() < b for a, b in skip):
                continue
            body = m.group(0)
            if re.fullmatch(r'<svg\b[^>]*></svg>', body):
                continue                      # empty hook svg (e.g. data-strings canvas)
            h = digest(body)
            if h in bodies:
                d = drawings[bodies[h]]
                if d['first'] is None:
                    d['first'] = os.path.relpath(path, ROOT)
                continue
            name = choose_name(path, body, taken, counters)
            taken.add(name)
            bodies[h] = name
            drawings[name] = {
                'name': name,
                'group': group_and_section(path)[0],
                'body': body,
                'first': os.path.relpath(path, ROOT),
            }

    # Pass 2: write the .svg files, their components and the registry.
    for d in drawings.values():
        d['component'] = pascal(d['name'])
    for d in drawings.values():
        if d['name'] in existing:
            continue
        out_dir = os.path.join(SVG_DIR, d['group'])
        os.makedirs(out_dir, exist_ok=True)
        with open(os.path.join(out_dir, d['name'] + '.svg'), 'w', encoding='utf8') as f:
            f.write(d['body'])
    os.makedirs(COMP_DIR, exist_ok=True)
    for d in drawings.values():
        if d['name'] in existing:
            continue
        cls = d['component']
        with open(os.path.join(COMP_DIR, cls + '.astro'), 'w', encoding='utf8') as f:
            f.write(
                '---\n'
                '// %s — extracted from %s (reference/split-svgs.py).\n'
                '// Kept as raw bytes so the rendered markup matches the original exactly.\n'
                "import source from '../../svg/%s/%s.svg?raw'\n"
                '---\n\n'
                '<Fragment set:html={source} />\n'
                % (d['name'], d['first'], d['group'], d['name'])
            )

    ordered = sorted(drawings.values(), key=lambda d: d['name'])
    registry = ['// Generated by reference/split-svgs.py — do not edit by hand.',
                '// Maps the <!--svg:Name--> markers in src/markup/ to components.']
    for d in ordered:
        registry.append("import %s from '../components/svg/%s.astro'" % (d['component'], d['component']))
    registry.append('')
    registry.append('export const SVG_COMPONENTS: Record<string, any> = {')
    for d in ordered:
        registry.append('  %s,' % d['component'])
    registry.append('}')
    with open(os.path.join(SVG_DIR, 'registry.ts'), 'w', encoding='utf8') as f:
        f.write('\n'.join(registry) + '\n')

    # Pass 3: rewrite the sources to reference the components.
    by_hash = {h: drawings[name]['component'] for h, name in bodies.items()}
    rewritten_files = 0
    rewritten_svgs = 0
    for path in sources():
        text = open(path, encoding='utf8').read()
        skip = [(m.start(), m.end()) for m in RAW_RE.finditer(text)]
        is_markup = '/src/markup/' in path.replace(os.sep, '/')
        used = []

        def repl(m):
            if any(a <= m.start() < b for a, b in skip):
                return m.group(0)
            body = m.group(0)
            if re.fullmatch(r'<svg\b[^>]*></svg>', body):
                return body
            cls = by_hash[digest(body)]
            used.append(cls)
            return '<!--svg:%s-->' % cls if is_markup else '<%s />' % cls

        # Markers already in captures are left exactly as they are.
        new = SVG_RE.sub(repl, text)
        if is_markup:
            for marker in MARKER_RE.findall(new):
                used.append(marker)
        else:
            rel_dir = os.path.dirname(path)
            imports = []
            seen = set()
            for cls in used:
                if cls in seen:
                    continue
                seen.add(cls)
                target = os.path.relpath(os.path.join(COMP_DIR, cls + '.astro'), rel_dir).replace(os.sep, '/')
                if not target.startswith('.'):
                    target = './' + target
                imports.append("import %s from '%s'" % (cls, target))
            new = insert_imports(new, imports)
        if new != text:
            with open(path, 'w', encoding='utf8') as f:
                f.write(new)
            rewritten_files += 1
            rewritten_svgs += sum(1 for _ in SVG_RE.finditer(text))
    print('drawings: %d · files rewritten: %d · inline svgs replaced: %d'
          % (len(drawings), rewritten_files, rewritten_svgs))


if __name__ == '__main__':
    main()
