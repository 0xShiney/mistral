# /use-cases/physics-ai-for-injection-molding-simulation/ verification report

Generated 2026-11-27T02:01:49.415Z by `pnpm verify --page use-cases/physics-ai-for-injection-molding-simulation` (Playwright + Chromium 159.0.8154.6).

- original: https://mistral.ai/use-cases/physics-ai-for-injection-molding-simulation/
- clone: http://127.0.0.1:4322/use-cases/physics-ai-for-injection-molding-simulation/
- widths: 1440 · color schemes: light
- pixel tolerance: < 1% of pixels differing by more than 16/255 per channel
- geometry tolerance: 1px

**32/32 checks passed.**

## light@1440

| check | result | evidence |
| --- | --- | --- |
| full-page pixel diff < 1% | PASS | 0.000% (1440x2819 vs 1440x2819) |
| page height within 1px | PASS | equal |
| geometry + computed style (1px) | PASS | all matched |
| JS weight within 15% | PASS | 66.9kB vs 68.4kB |
| CSS weight within 15% | PASS | 38.3kB vs 40.1kB |
| CSS animations match (name/duration/easing) | PASS | 0 vs 0 |

## navbar@light

| check | result | evidence |
| --- | --- | --- |
| 25px scroll sweep (63 samples) | PASS | all sampled states matched |

## motion

| check | result | evidence |
| --- | --- | --- |
| animation inventory identical | PASS | 0 vs 0 running animations |

## interaction

| check | result | evidence |
| --- | --- | --- |
| controls behave identically | PASS | {"initial":{"tags":["Industrial Engineering"],"headings":["How engineers predict mold filling with physics AI.","Physics AI for injection-molding simu |

## content

| check | result | evidence |
| --- | --- | --- |
| every text node matches | PASS | 18 vs 18 text nodes |
| footer text matches | PASS | 24 nodes |
| link targets match | PASS | [] |
| image sources/alt match | PASS | 5 vs 5 images |

## meta

| check | result | evidence |
| --- | --- | --- |
| title | PASS | Physics AI for injection-molding simulation \| Mistral |
| canonical + hreflang | PASS | ["canonical:null=https://mistral.ai/use-cases/physics-ai-for-injection-molding-simulation/","alternate:en=https://mistral.ai/use-cases/physics-ai-for-injection-molding-simulation/","alternate:fr=https://mistral.ai/fr/use-cases/physics-ai-for-injection-molding-simulation/","alternate:it=https://mistral.ai/it/use-cases/physics-ai-for-injection-molding-simulation/","alternate:x-default=https://mistral.ai/use-cases/physics-ai-for-injection-molding-simulation/","alternate:null=https://mistral.ai/news/rss"] |
| structured data | PASS | {"@context":"https://schema.org","@id":"https://mistral.ai/use-cases/physics-ai- |
| single h1 + lang | PASS | How engineers predict mold filling with physics AI. · en |
| description / og / twitter / viewport | PASS | ["description=The most powerful AI platform for enterprises. Customize, fine-tune, and deploy AI assistants, autonomous agents, and multimodal AI with open mode |

## architecture

| check | result | evidence |
| --- | --- | --- |
| islands (count/framework) | PASS | orig 0, clone 0 |
| no-JS markup + styled state | PASS | nodes=86 h1=1 header=rgb(245, 244, 239) |

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
| CLS ≤ 0.05 or matches original (light) | PASS | 0.0000 (orig 0.0000) |
| theme resolves identically (light) | PASS | orig "" rgb(245, 244, 239) · clone "" rgb(245, 244, 239) |
| prefers-reduced-motion parity | PASS | height 2819 vs 2819, title opacity null vs null |

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
- Detail template: hero, sticky summary card, Challenge/Solution/Result grid and the optional related-use-case slider are measured; the back/CTA hover state is operated on both sites.
- Copy parity walks every text node of main and footer and every link/image target.
- View transitions: a full tour across all six cloned routes plus three browser-back steps, then a control check on /use-cases/.
