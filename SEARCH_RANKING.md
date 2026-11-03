# Search ranking

Search ranking is part of the navigation experience. The executable examples live
in `src/utils/tabSearch.test.ts`, especially `search ranking contract` and
`navigation relevance`. Change these examples deliberately when changing ranking.

For a query such as `flight`, within the same search field, prefer:

1. An exact field: `Flight`
2. A complete word: `Book a flight today`
3. A field prefix: `Flights tomorrow`
4. A contiguous substring: `Inflight entertainment`
5. Scattered characters: `F - light`

Matching ignores case. Highlights should select a complete word even if an
earlier substring exists, as in `Inflight or flight`.

These match scores sit within the broader navigation rules:

- Matching open tabs come before history results.
- Each whitespace-separated query word must match somewhere in the title or URL.
  Words may occur in either order or across both fields; repeated query words
  do not add extra score.
- Each query word contributes its best field score. Titles and hostnames use full
  weight, URL paths use 0.9, and full URL fallback matches use 0.4. Explicit URLs
  containing `://` retain full weight. Thus the order above describes equal-weight
  fields, rather than an unconditional ordering across all URL components.
- Stronger relevance beats recency within each source; recency breaks score ties.
- Scattered matches remain available when they meet the match quality thresholds.

Spaces express separate search terms. `f ight` is not rewritten into `flight`.
