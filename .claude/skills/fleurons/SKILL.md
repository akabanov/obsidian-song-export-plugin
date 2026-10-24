---
name: fleurons
description: Use for anything about the EPUB ornaments, i.e. the fleuron above song titles and the floret above group titles: where they come from (Noto Sans Symbols 2 glyphs), their license and credit, swapping or adding one, regenerating their SVG paths, resizing them or changing their spacing.
---

# Fleurons

The book draws two black ornaments as inline SVG paths. Both are glyph outlines from **Noto Sans Symbols 2** (© Google, SIL Open Font License 1.1):

| Ornament | Glyph | Constant in `src/epub/pages.ts` | viewBox |
| --- | --- | --- | --- |
| Song fleuron, above song titles | light swash ornament, U+1F658 | `SONG_ICON_PATH`, `SONG_ICON_ASPECT` | 879 × 605 |
| Group floret, above group titles | south west pointing vine leaf, U+1F651 | `GROUP_ICON_PATH`, `GROUP_ICON_ASPECT` | 838 × 779 |

The font isn't in the repo, and it shouldn't be added; only the paths are bundled. Get it from Google Fonts (https://fonts.google.com/noto/specimen/Noto+Sans+Symbols+2) or the `notofonts/symbols` GitHub repo. On Debian/Ubuntu, the `fonts-noto-core` package installs it at `/usr/share/fonts/truetype/noto/NotoSansSymbols2-Regular.ttf`.

Candidate ornaments: the Ornamental Dingbats block (U+1F650–U+1F67F) and the floral hearts and bullets in Dingbats (U+2619, U+2766, U+2767), all in the same font.

## Extracting a glyph path

```bash
uv run .claude/skills/fleurons/scripts/glyph-path.py <font.ttf> U+1F658
```

The script prints the glyph name, the viewBox, the aspect ratio and the path. It flips the outline to SVG's y-down axis and moves its bounding box to 0,0, so the path fills its viewBox exactly. For U+1F658 and U+1F651 it reproduces the current constants character for character. Run it this way to check that a path hasn't drifted.

`uv` installs fontTools on the fly from the script's inline metadata. Without uv: `pip install fonttools`, then run the script with `python3`.

## Swapping or adding an ornament

1. Extract the path and paste it into `pages.ts`. Update the comment above it (glyph name, codepoint, font, license), the `*_ICON_ASPECT` constant, and the viewBox numbers in the `songIcon`/`groupIcon` calls to `ornament()`.
2. Sizes live in `src/epub/stylesheet.ts`: `ICON_WIDTH`/`MODERN_ICON_WIDTH` for the fleuron and `GROUP_ICON_WIDTH`/`MODERN_GROUP_ICON_WIDTH` for the floret, as multiples of the title size. The `book.css` width targets Kobo's RMSDK, which reads only the SVG's `width`/`height` attributes; `modern.css` overrides it for other readers. A glyph with a different aspect ratio may need new widths.
3. Update the tests in `src/epub/epub.test.ts` that assert the viewBox and the icon sizes, then run `npm test`.
4. Update `SPEC.md`: **Groups** (the floret) and **Songs** (the fleuron) name the glyph and its codepoint.
5. Update the credit in the **License** section of `README.md`. A glyph from a font other than Noto needs its own copyright and license line, and its license must allow use as artwork; the OFL does.
