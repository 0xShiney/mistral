# /industry/energy/ verification report

Generated 2026-11-28T09:29:21.150Z by `pnpm verify --page industry/energy` (Playwright + Chromium 159.0.8154.6).

- original: https://mistral.ai/industry/energy/
- clone: http://127.0.0.1:4322/industry/energy/
- widths: 1440 · color schemes: light
- pixel tolerance: < 1% of pixels differing by more than 16/255 per channel
- geometry tolerance: 1px

**33/33 checks passed.**

## light@1440

| check | result | evidence |
| --- | --- | --- |
| full-page pixel diff < 1% | PASS | 0.005% (1440x7023 vs 1440x7023) |
| page height within 1px | PASS | equal |
| geometry + computed style (1px) | PASS | all matched |
| JS weight within 15% | PASS | 103.2kB vs 105.5kB |
| CSS weight within 15% | PASS | 38.4kB vs 40.1kB |
| CSS animations match (name/duration/easing) | PASS | 3 vs 3 |

## navbar@light

| check | result | evidence |
| --- | --- | --- |
| 25px scroll sweep (80 samples) | PASS | all sampled states matched |

## motion

| check | result | evidence |
| --- | --- | --- |
| logos moves identically | PASS | moving true/true · Δpixels 4.175%/4.175% · animations [] |
| animation inventory identical | PASS | 3 vs 3 running animations |

## interaction

| check | result | evidence |
| --- | --- | --- |
| controls behave identically | PASS | {"initial":{"blocks":14,"h1":"Sovereign AI for energy, utilities and natural resources.","headlines":["Trusted by half of Europe’s largest energy comp |

## content

| check | result | evidence |
| --- | --- | --- |
| every text node matches | PASS | 62 vs 62 text nodes |
| footer text matches | PASS | 24 nodes |
| link targets match | PASS | [] |
| image sources/alt match | PASS | 72 vs 72 images |

## meta

| check | result | evidence |
| --- | --- | --- |
| title | PASS | Energy \| Mistral |
| canonical + hreflang | PASS | ["canonical:null=https://mistral.ai/industry/energy/","alternate:en=https://mistral.ai/industry/energy/","alternate:fr=https://mistral.ai/fr/industry/energy/","alternate:it=https://mistral.ai/it/industry/energy/","alternate:x-default=https://mistral.ai/industry/energy/","alternate:null=https://mistral.ai/news/rss"] |
| structured data | PASS | {"@context":"https://schema.org","@type":"WebPage","@id":"https://mistral.ai/ind |
| single h1 + lang | PASS | Sovereign AI for energy, utilities and natural resources. · en |
| description / og / twitter / viewport | PASS | ["description=The most powerful AI platform for enterprises. Customize, fine-tune, and deploy AI assistants, autonomous agents, and multimodal AI with open mode |

## architecture

| check | result | evidence |
| --- | --- | --- |
| islands (count/framework) | PASS | orig 0, clone 0 |
| no-JS markup + styled state | PASS | nodes=792 h1=1 header=rgb(245, 244, 239) |

## transitions

| check | result | evidence |
| --- | --- | --- |
| tour across all cloned routes | PASS | ["/:false","/sovereign-ai/:true","/products/:true","/our-method/:true","/use-cases/:true","/research/:false","/:false"] |
| browser back restores previous pages | PASS | ["/research/","/use-cases/","/our-method/"] |
| after the tour a filter still works | PASS | {"path":"/use-cases/","before":"16","after":"3","listenersWork":true,"headerBg":"rgb(245, 244, 239)"} |

## quality

| check | result | evidence |
| --- | --- | --- |
| no console errors (light) | PASS | 0 (orig 0)  |
| CLS ≤ 0.05 or no worse than original (light) | PASS | 0.0162 (orig 0.0217) |
| theme resolves identically (light) | PASS | orig "" rgb(245, 244, 239) · clone "" rgb(245, 244, 239) |
| prefers-reduced-motion parity | PASS | height 7023 vs 7023, title opacity 1 vs 1 |

## chrome

| check | result | evidence |
| --- | --- | --- |
| mega behaves identically | PASS | {"h":229,"items":4,"rows":16,"closedH":2} |
| lang behaves identically | PASS | {"found":true,"count":3,"visible":3} |
| theme behaves identically | PASS | {"found":true,"dark":true,"changed":true,"stored":"light"} |
| cat behaves identically | PASS | {"found":true,"src":"/images/cat/cat-sitting-black.gif","w":256,"h":224,"rw":56,"rh":49} |
| mobile behaves identically | PASS | {"opened":{"expanded":"true","panelX":0,"label":"Menu","bodyOverflow":"hidden"},"sub":{"subX":0,"links":["/sovereign-ai/","/products/","/our-method/","/use-cases/"]},"closed":{"expanded":"false","panelX":390}} |

## Method

- Both sites run in the same Chromium build, same viewport, same `colorScheme`, same scroll program.
- The clone reuses the original server markup and the original client runtime; differences would only come from content, assets or routing.
- Every interactive control on the page is operated with synthetic input on both sites and the resulting DOM state compared.
- Copy parity walks every text node of main and footer and every link/image target.
- View transitions: a full tour across all six cloned routes plus three browser-back steps, then a control check on /use-cases/.
