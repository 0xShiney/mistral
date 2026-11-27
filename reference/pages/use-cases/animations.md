# /use-cases/ animation inventory

Generated 2026-11-26T05:42:31.727Z by `pnpm verify --page use-cases`.

Running `document.getAnimations()` after load, full scroll pass and settle, compared 1:1 with the live original (identical list required by the harness).

| animation | duration | easing | delay | iterations |
| --- | --- | --- | --- | --- |
| — | — | — | — | — |

## Mechanisms

### Live counter + list filter

posts.*.js filter(): OR across every selected chip (`data-categories` split, .some), display:none on hidden rows, count.innerHTML

### Pagination

navigation-pagination.*.js: 9 per page, mousedown on .js-pagination-page, page in ?page=, hide() when one page

### Scroll to listing top on filter/page change

posts.*.js goTop() -> scrollTo(this.top, {offset:-48})

### Card hover

group/use-case: icon scale-95 + background shift + arrow slide (CSS transition)


## Measured motion regions



## Pixel parity per width

- light@390: 0%
- light@768: 0%
- light@1024: 0%
- light@1440: 0%
- light@1920: 0%
- light@2560: 0%
- dark@390: 0%
- dark@768: 0%
- dark@1024: 0%
- dark@1440: 0%
- dark@1920: 0%
- dark@2560: 0%
