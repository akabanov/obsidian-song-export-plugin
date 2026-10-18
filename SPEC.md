# Songbook Maker — Specification

An Obsidian plugin that exports song notes from the vault into a single EPUB songbook for learning and practice. Every song starts on a new page. By default the song and each of its sections get their own title pages, and each section's content gets its own page, like flash cards; two settings let titles and content run together instead (see [Page layout](#page-layout)).

## Platform

- Desktop only (`isDesktopOnly: true`): the book is written to an absolute path outside the vault, which needs Node's `fs`.
- The plugin makes no network requests.

## Triggering the export

- A ribbon icon in the left-hand sidebar: a custom icon of an open book with lyric lines on the left page and a music note on the right.
- Command palette: **Songbook Maker: Export songs to EPUB**.

Both run the same export:

1. If the output file already exists, a confirmation dialog asks whether to overwrite it. Cancelling stops the export without changing anything.
2. While the export runs, a notice says so.
3. When it finishes, a notice reports the output path, how many songs were exported and how many were skipped. Skipped songs and the reason for each are written to the developer console.
   If no songs are found, the export fails with an error notice and no file is written.
4. On failure (path not writable, cover image missing, etc.) a notice shows the error and no partial file is left behind: the book is written to a temporary file in the target directory and then renamed over the target.

Starting an export while one is running does nothing.

## Settings

| Setting | Default | Notes |
|---|---|---|
| Songs directory | empty (vault root) | Vault-relative path, searched recursively. |
| Code block name | `chords` | Info string of the code blocks that hold song content. Empty means the default. |
| Output file | `~/Documents/my-songbook.epub` | Absolute path; a leading `~` expands to the user's home directory. Missing parent directories are created. A relative path fails the export with an error notice. |
| Book title | `My Songbook` | EPUB `dc:title`. |
| Book author | `Obsidian` | EPUB `dc:creator`; omitted when empty. |
| Book language | `EN` | Dropdown, sorted alphabetically: `CS`, `DE`, `EN`, `ES`, `FR`, `IT`, `JA`, `KO`, `NL`, `PL`, `PT`, `RU`, `SV`, `UK`, `ZH`. Written to EPUB `dc:language` and `xml:lang` as the lowercase code (`en`). |
| Title split sequence | ` - ` (space, hyphen, space) | Where the song title is split into two lines. Empty means never split. |
| Cover image | Default | Dropdown: *None*, *Default* (the bundled cover) or *Custom image*. |
| Cover image path | empty | Shown only for *Custom image*. JPEG, PNG or WebP, detected from the file contents. A path starting with `/` or `~` is a filesystem path; anything else is relative to the vault root. |
| Song title on its own page | On | Toggle. See [Page layout](#page-layout). |
| Section title on its own page | On | Toggle. See [Page layout](#page-layout). |
| Section title size | `2` | Multiplier of the content text size. |
| Song title size | `2` | Multiplier of the **section title** size (so 4× content by default). Chaining sizes like this is the usual modular type scale. |

## Output

The output is one EPUB 3 file containing all songs (with an EPUB 2 NCX for older readers). Each song is a chapter.

The book TOC (`nav.xhtml` and `toc.ncx`) lists only song titles — no section entries. Each TOC entry links to the song's title page.

Songs are ordered alphabetically by note title (case-insensitive, locale-aware). Letters that differ only in case sort together; letters that differ in accents don't.

The EPUB has a stable `dc:identifier` (a UUID generated once and stored in plugin data as a hidden `bookId` setting) so readers recognise a re-export as the same book, and a `dcterms:modified` timestamp updated on every export.

### Cover

- **Default:** the bundled cover `assets/default-cover.jpg` (a black-and-white guitarist illustration titled "my songbook", 896×1200). It is inlined into `main.js` at build time, because Obsidian installs only `main.js` and `manifest.json`. The title on it is part of the image, so it doesn't change with the *Book title* setting.
- **Custom image:** the image at *Cover image path*. If the file is missing or isn't JPEG, PNG or WebP, the export fails with an error notice.
- **None:** the book has no cover.

When there is a cover, it is declared in the OPF manifest with `properties="cover-image"`, plus `<meta name="cover">` for EPUB 2 readers. It is also shown as the first page in the spine, before the first song, and isn't listed in the TOC.

The cover page fills the screen, scaled up or down without cropping or distortion. The image is wrapped in an inline SVG with `width="100%" height="100%"`, a `viewBox` of the image's pixel size (read from the JPEG, PNG or WebP header) and `preserveAspectRatio="xMidYMid meet"`; the page drops its margins with `@page { margin: 0 }` in an inline style. A plain `<img>` isn't used because some readers (Kobo's Adobe renderer) never scale it past its pixel size. If the size can't be read, the page falls back to an `<img>` limited to the page size.

### Page layout

Two independent toggles decide which titles get a page to themselves. Whatever they are set to, every song starts on a new page, and the cover (if any) comes first. Each page below is a separate XHTML file in the spine, so it starts on a new page in every reader.

**Song title on its own page** (default on):

- On: the song title (with its icon) is alone on a page, centered both ways. The song's content starts on the next page.
- Off: the song title shares its page with what follows: the first section title page, or the start of the running sections.

**Section title on its own page** (default on):

- On: each section title is alone on a page, centered both ways, and the section's content starts on the next page. Content that fits on one page is centered vertically. Longer content starts at the top and flows over as many pages as it needs. With *Song title on its own page* off, the first section's title page also carries the song title above it.
- Off: the sections run together on one page that flows as long as it needs: each section title, left-aligned, then its content. A section title is kept on the same page as the start of its content where the reader supports it (`page-break-after: avoid`). With *Song title on its own page* off, the song title sits centered horizontally at the top of that page, not vertically.

Both on gives flash cards, for drilling one section at a time; both off gives a book, for reading a song straight through. Sizes, title split and TOC (one entry per song, linking to the page where the song starts) are the same in every layout.

## Discovering the songs

A **song note** is a Markdown file under the songs directory (any depth) that contains at least one fenced code block whose info string is the *Code block name* setting (`chords` by default), fenced with ```` ``` ```` or `~~~`. Below, "`chords` block" means such a block.

Fences follow CommonMark: the info string matches when its first word equals the block name (```` ```chords extra ```` matches, ```` ```chordsx ```` doesn't). A block is closed by a fence of the same character that is at least as long as the opening one, and an unclosed block runs to the end of the note. A fence nested inside a block of another type (for example a `markdown` block showing a `chords` example) doesn't count.

If the songs directory doesn't exist, the export fails with an error notice.

Code blocks of other types (`metronome`, `alphatex`, …) and all text outside `chords` blocks are ignored.

## Songs

The **song title** is the note's file name without the `.md` extension.

The song title page shows only the song title, split into two lines at the first occurrence of the title split sequence. With the default ` - `, `Armstrong - What a Wonderful World` becomes `Armstrong` on line one and `What a Wonderful World` on line two. If the title doesn't contain the sequence, the sequence is empty, or splitting would leave one of the lines empty (e.g. ` - Intro`), the title is shown on one line. Both parts are trimmed. Both lines use the same size. The lines are separated by `<br/>`, so the split doesn't depend on the stylesheet. The TOC entry uses the full, unsplit title.

On a page of its own, the text is centered both vertically and horizontally. A static black-and-white icon (an inline SVG music note bundled with the plugin) sits above the title, so a song title page can be told apart from a section title page at a glance.

Only the content of the `chords` code blocks is exported. A song note may have more than one `chords` block; their contents are joined, in order of appearance, before sections are parsed. So a section may continue from one block into the next, and text before the first section header in the first block is discarded.

## Sections

Songs are divided into sections by section headers in square brackets: `[Verse]`, `[Verse 2]`, `[Intro]`, etc.

A line is a section header when it matches `^\s*\[[^\[\]]+\]\s*$`: it starts with `[`, ends with the matching `]`, and has non-empty text between them with no further brackets. Whitespace before the `[` or after the `]` is ignored. Any non-whitespace character after the closing bracket makes it a regular line. For example, `[1.] 1 1 5 5` and `[Guitar Tabs](https://…)` are regular lines, and `[]` is a regular line. So is a header whose text is only whitespace, such as `[   ]`, because its name would be empty.

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

A line that consists only of hints (e.g. `%t`) becomes an empty line in step 2, and is then handled by steps 6 and 7.

If a section is empty after pre-processing, it is not included.

If a song has no sections, or only empty ones, it is not included in the book and is reported as skipped.

### Section pages

The section title page shows only the section name, centered both vertically and horizontally.

The section content shows the pre-processed lines in order. Each line is its own `<div>`, and empty lines are kept as vertical gaps (a `<div>` holding a no-break space). `<div>` rather than `<p>`, because a `<div>` has no default margins and readers that override paragraph spacing (Kobo) leave it alone, so lines don't get blank lines between them. Long lines wrap; hyphenation is turned off. All text is HTML-escaped.

On a page of its own, the content block is centered vertically; the lines inside it stay left-aligned.

### Vertical centering

Title pages and section content pages are centered vertically the same way. Each page's body is a flex column with `justify-content: center` and a `min-height` of one screen. The height is `100vh` minus the page's own vertical padding (`calc(100vh - 2em)`), so that it doesn't spill a blank page. Running sections aren't centered vertically.

- It uses `min-height`, not `height`, so content longer than one screen grows past it and flows from the top over the following pages instead of being clipped.
- Readers that don't support `vh` units or flexbox in paginated mode fall back to the placement in the base stylesheet: title pages start a third of the way down (`padding-top: 30%`, relative to the page width), content pages at the top.

## Typography

The book sets no font family, so the text uses the reader's font setting. Song and section titles are bold.

The styles are split into two stylesheets, linked from every page in this order:

- `styles/book.css` uses only CSS 2.1 (plus the `hyphens` properties), with no `calc()`, `vh`, flexbox, custom properties or `@font-face`. Kobo renders sideloaded EPUBs with Adobe RMSDK, which drops a whole stylesheet when it meets one value it can't parse, so this file must parse there.
- `styles/centering.css` holds the [vertical centering](#vertical-centering). Its `calc()` is deliberate: RMSDK skips the whole file, rather than applying part of the flex layout, and keeps the fallback placement from `book.css`.

All sizes are in `em`, relative to the reader's base font size, so the reader's font-size control still scales everything:

- Content: `1em`, regular.
- Section title: bold, content size × section title multiplier (default `2em`).
- Song title: bold, section title size × song title multiplier (default `4em`).
