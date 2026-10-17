# Song Export — Specification

An Obsidian plugin that exports song notes from the vault into an EPUB book that reads like a deck of flash cards: one title page per song, then one title page plus one content page per song section.

## Platform

- Desktop only (`isDesktopOnly: true`): the book is written to an absolute path outside the vault, which needs Node's `fs`.
- No network access is needed during export, except to download fonts the first time they are used (see [Typography](#typography)).

## Triggering the export

- Command palette: **Song Export: Export songs to EPUB**.
- Ribbon icon that runs the same command.
- While the export runs, a notice says so. When it finishes, a notice reports the output path, how many songs were exported and how many were skipped. Skipped songs and the reason for each are written to the developer console.
- On failure (path not writable, font download failed, etc.) a notice shows the error and no partial file is left behind: the book is written to a temporary file in the target directory and then renamed.

## Settings

| Setting | Default | Notes |
|---|---|---|
| Songs directory | empty (vault root) | Vault-relative path, searched recursively. |
| Output file | `~/Documents/my-songs.epub` | Absolute path; a leading `~` expands to the user's home directory. Missing parent directories are created. An existing file is overwritten. |
| Book title | `My Songs` | EPUB `dc:title`. |
| Book author | empty | EPUB `dc:creator`; omitted when empty. |
| Book language | `en` | EPUB `dc:language`. |
| Title font | `Playfair Display` | Used for the song title and the section title. |
| Content font | `Lora` | Used for song content. |
| Section title size | `2` | Multiplier of the content font size. |
| Song title size | `3` | Multiplier of the **section title** size (so 6× content by default). |

Font settings are dropdowns over the curated list below.

## Source and output

The book is an EPUB 3 file (with an EPUB 2 NCX for older readers). Each song is a chapter.

The book TOC (`nav.xhtml` and `toc.ncx`) lists only song titles — no section entries. Each TOC entry links to the song's title page.

Songs are ordered alphabetically by note title (case-insensitive, locale-aware), so the book order is deterministic.

The EPUB has a stable `dc:identifier` (a UUID generated once and stored in plugin data) so readers recognise a re-export as the same book, and a `dcterms:modified` timestamp updated on every export. There is no cover image.

## Discovering the songs

A **song note** is a Markdown file under the songs directory (any depth) that contains at least one fenced code block with the info string `chords` (fenced with ```` ``` ```` or `~~~`).

Code blocks of other types (`metronome`, `alphatex`, …) and all text outside `chords` blocks are ignored.

## Songs

The **song title** is the note's file name without the `.md` extension.

The first page of a chapter is a title page that shows only the song title, split into two lines at the first occurrence of ` - ` (space, hyphen, space). For `Armstrong - What a Wonderful World`, line one is `Armstrong` and line two is `What a Wonderful World`. If the title has no ` - `, it is shown on one line. Both lines use the same font and size. The TOC entry uses the full, unsplit title.

The text is centered both vertically and horizontally. A static black-and-white icon (an inline SVG music note bundled with the plugin) sits above the title, so a song title page can be told apart from a section title page at a glance.

The title page is followed by the song sections. Only the content of the `chords` code blocks is exported. A song note may have more than one `chords` block; their contents are joined, in order of appearance, before sections are parsed. So a section may continue from one block into the next, and text before the first section header in the first block is discarded.

## Sections

Songs are divided into sections by section headers in square brackets: `[Verse]`, `[Verse 2]`, `[Intro]`, etc.

A line is a section header when, after trimming, it matches `^\[[^\[\]]+\]$`: it starts with `[`, ends with the matching `]`, and has non-empty text between them with no further brackets. Anything after the closing bracket, including space followed by text, makes it a regular line. For example, `[1.] 1 1 5 5` and `[Guitar Tabs](https://…)` are regular lines, and `[]` is a regular line.

The section name is the text between the brackets, trimmed, without the brackets.

Text before the first section header is discarded.

### Section pre-processing

These steps run in order on each line of a section's body:

1. Trim the line.
2. Drop `--` lines: lines that consist only of two or more `-` characters.
3. Drop tab lines: lines that start with a string name followed by `|`, matching `^[A-Ga-g][#b]?\|` (e.g. `e|-----`, `B|--3--`, `Eb|---`).
4. Collapse each run of whitespace characters into a single space.

After that:

5. Collapse each run of consecutive empty lines into one empty line.
6. Remove empty lines at the start and end of the section.

If a section is empty after pre-processing, it is not included.

If a song has no sections, or only empty ones, it is not included in the book and is reported as skipped.

### Section pages

Each section starts with a section title page, followed by its content page, so the book reads like flash cards.

The section title page shows only the section name, centered both vertically and horizontally.

The content page shows the pre-processed lines in order. Each line is its own line in the output, and empty lines are kept as vertical gaps. Long lines wrap. All text is HTML-escaped.

Each page (song title, section title, section content) is a separate XHTML file in the spine, so every page starts on a new screen in every reader. Vertical centering uses flexbox with `min-height: 100vh` and falls back to top-aligned text in readers that do not support it.

## Typography

Song content, song titles and section titles use non-monospaced fonts. Each font is chosen from this curated set of 10 Google Fonts, all under the SIL Open Font License, so they may be embedded:

| Font | Style |
|---|---|
| Playfair Display | Serif, high contrast (default title font) |
| Lora | Serif (default content font) |
| Merriweather | Serif |
| EB Garamond | Serif |
| Libre Baskerville | Serif |
| Crimson Pro | Serif |
| Source Serif 4 | Serif |
| Nunito | Sans-serif |
| Open Sans | Sans-serif |
| Montserrat | Sans-serif |

By default, the song title and section title use the same font, which differs from the content font.

The selected fonts are embedded in the EPUB as TTF or WOFF2 files, declared in the OPF manifest and referenced through `@font-face`. Only the weights actually used are embedded: regular (400) for content and bold (700) for titles. Font files are downloaded from Google Fonts the first time a font is used and cached in the plugin's folder, so later exports work offline. If a font cannot be downloaded, the export fails with an error notice.

Sizes are in `em`, relative to the reader's base font size, so the reader's font-size control still works:

- Content: `1em`, regular.
- Section title: bold, content size × section title multiplier (default `2em`).
- Song title: bold, section title size × song title multiplier (default `6em`).

## Open questions

- **Chord alignment.** Most song notes put chord lines above lyric lines and align them with spaces, for example `        C        Em    F         Em` above `I see trees of green, red roses too`. Steps 1 and 4 of pre-processing, together with proportional fonts, remove that alignment, so chords no longer sit above the syllables they belong to. If alignment matters, one option is to detect chord-over-lyric line pairs before trimming and render each chord as a positioned annotation over its lyric fragment (a ChordPro-style `<ruby>` or inline-block layout), which works with proportional fonts. The current spec keeps the simpler behavior: chord lines are flattened.
