# Song Export — Specification

An Obsidian plugin that exports song notes from the vault into a single EPUB songbook for learning and practice. Every song starts with a title page. Each of its sections then gets its own title page, followed by that section's content.

## Platform

- Desktop only (`isDesktopOnly: true`): the book is written to an absolute path outside the vault, which needs Node's `fs`.
- No network access is needed during export, except to download fonts the first time they are used (see [Typography](#typography)).

## Triggering the export

- A ribbon icon in the left-hand sidebar: a custom icon of an open book with lyric lines on the left page and a music note on the right.
- Command palette: **Song Export: Export songs to EPUB**.

Both run the same export:

1. If the output file already exists, a confirmation dialog asks whether to overwrite it. Cancelling stops the export without changing anything.
2. While the export runs, a notice says so.
3. When it finishes, a notice reports the output path, how many songs were exported and how many were skipped. Skipped songs and the reason for each are written to the developer console.
4. On failure (path not writable, font download failed, etc.) a notice shows the error and no partial file is left behind: the book is written to a temporary file in the target directory and then renamed over the target.

## Settings

| Setting | Default | Notes |
|---|---|---|
| Songs directory | empty (vault root) | Vault-relative path, searched recursively. |
| Code block name | `chords` | Info string of the code blocks that hold song content. Empty means the default. |
| Output file | `~/Documents/my-songs.epub` | Absolute path; a leading `~` expands to the user's home directory. Missing parent directories are created. |
| Book title | `My Songbook` | EPUB `dc:title`. |
| Book author | `Obsidian` | EPUB `dc:creator`; omitted when empty. |
| Book language | `EN` | Dropdown, sorted alphabetically: `CS`, `DE`, `EN`, `ES`, `FR`, `IT`, `JA`, `KO`, `NL`, `PL`, `PT`, `RU`, `SV`, `UK`, `ZH`. Written to EPUB `dc:language` and `xml:lang` as the lowercase code (`en`). |
| Title split sequence | ` - ` (space, hyphen, space) | Where the song title is split into two lines. Empty means never split. |
| Cover image | Default | Dropdown: *None*, *Default* (the bundled cover) or *Custom image*. |
| Cover image path | empty | Shown only for *Custom image*. JPEG, PNG or WebP. A path starting with `/` or `~` is a filesystem path; anything else is relative to the vault root. |
| Title font | `Playfair Display` | Used for the song title and the section title. |
| Content font | `Lora` | Used for song content. |
| Section title size | `2` | Multiplier of the content font size. |
| Song title size | `2` | Multiplier of the **section title** size (so 4× content by default). Chaining sizes like this is the usual modular type scale. |

Font settings are dropdowns over the curated list in [Typography](#typography).

## Output

The output is one EPUB 3 file containing all songs (with an EPUB 2 NCX for older readers). Each song is a chapter.

The book TOC (`nav.xhtml` and `toc.ncx`) lists only song titles — no section entries. Each TOC entry links to the song's title page.

Songs are ordered alphabetically by note title (case-insensitive, locale-aware).

The EPUB has a stable `dc:identifier` (a UUID generated once and stored in plugin data) so readers recognise a re-export as the same book, and a `dcterms:modified` timestamp updated on every export.

### Cover

- **Default:** the bundled cover `assets/default-cover.jpg` (a black-and-white guitarist illustration titled "my songbook", 896×1200). It is inlined into `main.js` at build time, because Obsidian installs only `main.js`, `manifest.json` and `styles.css`. The title on it is part of the image, so it doesn't change with the *Book title* setting.
- **Custom image:** the image at *Cover image path*. If the file is missing or isn't JPEG, PNG or WebP, the export fails with an error notice.
- **None:** the book has no cover.

When there is a cover, it is declared in the OPF manifest with `properties="cover-image"`, plus `<meta name="cover">` for EPUB 2 readers. It is also shown as the first page in the spine, before the first song, scaled to fit the page without cropping. It isn't listed in the TOC.

### Page layout

- **Song title page:** one page per song.
- **Section title page:** one page per section.
- **Section content:** starts on a new page after its section title page. Content that fits on one page is centered vertically. Longer content starts at the top and flows over as many pages as it needs.

Each title page and each section's content is a separate XHTML file in the spine, so every one starts on a new page in every reader.

## Discovering the songs

A **song note** is a Markdown file under the songs directory (any depth) that contains at least one fenced code block whose info string is the *Code block name* setting (`chords` by default), fenced with ```` ``` ```` or `~~~`. Below, "`chords` block" means such a block.

Code blocks of other types (`metronome`, `alphatex`, …) and all text outside `chords` blocks are ignored.

## Songs

The **song title** is the note's file name without the `.md` extension.

The song title page shows only the song title, split into two lines at the first occurrence of the title split sequence. With the default ` - `, `Armstrong - What a Wonderful World` becomes `Armstrong` on line one and `What a Wonderful World` on line two. If the title doesn't contain the sequence, or the sequence is empty, the title is shown on one line. Both lines use the same font and size. The TOC entry uses the full, unsplit title.

The text is centered both vertically and horizontally. A static black-and-white icon (an inline SVG music note bundled with the plugin) sits above the title, so a song title page can be told apart from a section title page at a glance.

Only the content of the `chords` code blocks is exported. A song note may have more than one `chords` block; their contents are joined, in order of appearance, before sections are parsed. So a section may continue from one block into the next, and text before the first section header in the first block is discarded.

## Sections

Songs are divided into sections by section headers in square brackets: `[Verse]`, `[Verse 2]`, `[Intro]`, etc.

A line is a section header when it matches `^\s*\[[^\[\]]+\]\s*$`: it starts with `[`, ends with the matching `]`, and has non-empty text between them with no further brackets. Whitespace before the `[` or after the `]` is ignored. Any non-whitespace character after the closing bracket makes it a regular line. For example, `[1.] 1 1 5 5` and `[Guitar Tabs](https://…)` are regular lines, and `[]` is a regular line.

The section name is the text between the brackets, trimmed, without the brackets.

Text before the first section header is discarded.

### Section pre-processing

These steps run in order on each line of a section's body:

1. Trim the line.
2. Strip line-end hints: remove one or more trailing `%` + letter tokens (e.g. `%t`, `%c`) together with the whitespace before them, matching `(^|\s+)(%[A-Za-z]\s*)+$`. These are rendering hints for the Obsidian plugin that displays `chords` blocks. For example, `|b7 6m| |5 4| %t` becomes `|b7 6m| |5 4|`.
3. Drop `--` lines: lines that consist only of two or more `-` characters.
4. Drop tab lines: lines that start with a string name followed by `|`, matching `^[A-Ga-g][#b]?\|` (e.g. `e|-----`, `B|--3--`, `Eb|---`).
5. Collapse each run of whitespace characters into a single space.

After that:

6. Collapse each run of consecutive empty lines into one empty line.
7. Remove empty lines at the start and end of the section.

Trimming and collapsing whitespace (steps 1 and 5), together with proportional fonts, means chords no longer line up over the syllables they belong to. This is a deliberate trade-off for readability.

If a section is empty after pre-processing, it is not included.

If a song has no sections, or only empty ones, it is not included in the book and is reported as skipped.

### Section pages

The section title page shows only the section name, centered both vertically and horizontally.

The section content shows the pre-processed lines in order. Each line is its own line in the output, and empty lines are kept as vertical gaps. Long lines wrap. All text is HTML-escaped.

The content block is centered vertically on the page; the lines inside it stay left-aligned.

### Vertical centering

Title pages and section content are centered vertically the same way. Each page's body is a flex column with `justify-content: center` and a `min-height` of one screen. The height is `100vh` minus the page's own vertical margins and padding, so that it doesn't spill a blank page.

- It uses `min-height`, not `height`, so content longer than one screen grows past it and flows from the top over the following pages instead of being clipped.
- Readers that don't support `vh` units or flexbox in paginated mode (some older e-ink readers) fall back to top-aligned text. The book stays readable there, just not centered.

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

All sizes are in `em`, relative to the reader's base font size, so the reader's font-size control still scales everything:

- Content: `1em`, regular.
- Section title: bold, content size × section title multiplier (default `2em`).
- Song title: bold, section title size × song title multiplier (default `4em`).
