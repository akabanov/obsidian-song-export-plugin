# Songbook Maker — Specification

An Obsidian plugin that exports song notes from the vault into a single EPUB songbook for learning and practice. Songs are written in `chords` or `chordlyrics` code blocks, the formats of the [Chord Sheets](https://github.com/olvidalo/obsidian-chord-sheets) and [Chord Lyrics](https://github.com/nevernotmove/obsidian-chordlyrics) plugins. Every song opens with its title on a page of its own. By default each section title also gets a page, with the section's content on the next, like flash cards; a setting lets the sections run together instead (see [Page layout](#page-layout)).

## Platform

- Desktop only (`isDesktopOnly: true`): the book is written to an absolute path outside the vault, which needs Node's `fs`.
- Obsidian 1.13 or later (`minAppVersion: 1.13.0`), for the declarative settings API.
- The plugin makes no network requests.

## Triggering the export

- A ribbon icon in the left-hand sidebar: a custom icon of an open book with lyric lines on the left page and a music note on the right.
- Command palette: **Songbook Maker: Export songs to EPUB**.

Both run the same export:

1. If the output file already exists, a confirmation dialog asks whether to overwrite it. Cancelling stops the export without changing anything.
2. While the export runs, a notice says so.
3. When it finishes, a notice reports the output path, how many songs were exported and how many were skipped. Skipped songs and the reason for each are written to the developer console. With [groups](#groups), it also reports how many groups there are, how many songs were left out for having none of the groups, and the names of listed groups left out for having no songs.
   If no songs are found, or with groups none of them is in a group, the export fails with an error notice and no file is written.
4. On failure (path not writable, cover image missing, etc.) a notice shows the error and no partial file is left behind: the book is written to a temporary file in the target directory and then renamed over the target.

Starting an export while one is running does nothing.

## Settings

The settings tab is declared with `getSettingDefinitions()`, so Obsidian renders it and indexes every setting for the settings search. It has the songbook icon. Settings are in four groups, in this order:

| Setting | Default | Notes |
|---|---|---|
| Songs directory | empty (vault root) | Vault folder, picked with Obsidian's folder suggester, searched recursively. |
| Excluded tags | `template` | Notes with any of these tags are left out. Typing suggests the tags used in the vault. See [Discovering the songs](#discovering-the-songs). |
| Code block names | `chords, chordlyrics` | Comma-separated info strings of the code blocks that hold song content: the defaults of Chord Sheets and Chord Lyrics. Empty means the default. |
| Output file | `~/Documents/my-songbook.epub` | Absolute path; a leading `~` expands to the user's home directory. Empty means the default. Missing parent directories are created. A relative path fails the export with an error notice. |
| Show in folder after export | Off | Toggle. After a successful export, opens the system file manager (Finder, Explorer, …) with the EPUB selected, through Electron's `shell.showItemInFolder`. If that fails, a warning goes to the developer console; the export still counts as successful. |
| **Groups** | | |
| Group by property | empty (no groups) | Name of the note property (frontmatter) to group songs by. Typing suggests the properties used in the vault. Empty: the book lists all songs without groups. See [Groups](#groups). |
| Groups | empty (every value) | Shown only with a group property. Values of the property to include, in book order, separated by commas (a value may contain spaces). Typing suggests the property's values used in the vault. Empty: every value is a group, in alphabetical order. |
| **Book** | | |
| Book title | `My Songbook` | EPUB `dc:title`. Empty means the default. |
| Book author | `Obsidian` | EPUB `dc:creator`; omitted when empty. |
| Book language | English | Dropdown of language names, sorted alphabetically: Chinese, Czech, Dutch, English, French, German, Italian, Japanese, Korean, Polish, Portuguese, Russian, Spanish, Swedish, Ukrainian. Written to EPUB `dc:language` and `xml:lang` as the language code (`en`). The description explains that readers use it for the dictionary and the text-to-speech voice, and that songs in other languages still show normally. A saved code not in the list falls back to English. |
| Cover image | Default | Dropdown: *None*, *Default* (the bundled cover) or *Custom image*. The description links to the Kobo cover-cache help in the README. |
| Cover image path | empty | Shown only for *Custom image*. JPEG, PNG or WebP, detected from the file contents. A path starting with `/` or `~` is a filesystem path; anything else is relative to the vault root. |
| **Layout** | | |
| Title split sequence | ` - ` (space, hyphen, space) | Where the song title is split into two lines. Empty means never split. Not trimmed: its spaces are part of it. |
| Flashcard-style sections | On | Toggle. See [Page layout](#page-layout). |
| Use regular font | On | Toggle. On: song content uses the reader's font, with whitespace collapsed. Off: it keeps its spacing, in the embedded monospace font. The description explains the trade-off. See [Section pre-processing](#section-pre-processing) and [Typography](#typography). |
| Text size | `100%` | Percent of the reader's font size. Slider from 65 to 130 in steps of 5. |
| Monospace text size | `70%` | Percent of the content text size, for monospace text: tab blocks, and all song content with *Use regular font* off. Slider from 50 to 100 in steps of 5. |
| Section title size | `1.25×` | Multiplier of the content text size. Slider from 1 to 3 in steps of 0.25. |
| Song title size | `1.25×` | Multiplier of the **section title** size (so about 1.56× content by default). Chaining sizes like this is the usual modular type scale. Slider from 1 to 3 in steps of 0.25. Saved values above 3 (allowed up to 0.1.0-beta.3) are lowered to 3 on load. |
| Group title size | `1.25×` | Shown only with a group property. Multiplier of the **song title** size (so about 1.95× content by default). Slider from 1 to 3 in steps of 0.25. |

Text settings other than *Title split sequence* are trimmed when the export reads them, not as they're typed, so typing a space isn't undone. Saved slider values outside their range are moved into it on load.

## Output

The output is one EPUB 3 file containing all songs (with an EPUB 2 NCX for older readers). Each song is a chapter.

The book TOC (`nav.xhtml` and `toc.ncx`) lists only song titles — no section entries. Each TOC entry links to the song's title page. With [groups](#groups), the TOC has two levels: the group titles, each linking to the group's title page, with the group's songs under them, after the index.

Songs are ordered alphabetically by note title (case-insensitive, locale-aware). Letters that differ only in case sort together; letters that differ in accents don't. With groups, this is the order within each group.

The EPUB has a stable `dc:identifier` (a UUID generated once and stored in plugin data as a hidden `bookId` setting) so readers recognise a re-export as the same book, and a `dcterms:modified` timestamp updated on every export.

### Cover

- **Default:** the bundled cover `assets/default-cover.jpg`. It is at least as large as current Kobo screens (1440 px wide or more), so the Kobo only ever scales it down: its sleep-screen copy of a smaller cover, scaled up, came out grainy, even though the page rendered the same image cleanly. It is a baseline RGB JPEG, the most common kind of cover, rather than a progressive or one-channel grayscale one. It is inlined into `main.js` at build time, because Obsidian installs only `main.js` and `manifest.json`.
- **Custom image:** the image at *Cover image path*. If the file is missing or isn't JPEG, PNG or WebP, the export fails with an error notice.
- **None:** the book has no cover.

When there is a cover, it is declared in the OPF manifest with `properties="cover-image"`, plus `<meta name="cover">` for EPUB 2 readers. It is also shown as the first page in the spine, before the first song, and isn't listed in the TOC.

The cover page fills the screen, scaled up or down without cropping or distortion. The image is wrapped in an inline SVG with `width="100%" height="100%"`, a `viewBox` of the image's pixel size (read from the JPEG, PNG or WebP header) and `preserveAspectRatio="xMidYMid meet"`; the page drops its margins with `@page { margin: 0 }` in an inline style. A plain `<img>` isn't used because some readers (Kobo's Adobe renderer) never scale it past its pixel size. If the size can't be read, the page falls back to an `<img>` limited to the page size.

### Page layout

Every song starts with a page of its own holding only the song title (see [Songs](#songs)). The cover (if any) comes first. Each page below is a separate XHTML file in the spine, so it starts on a new page in every reader.

**Flashcard-style sections** (default on) decides what follows the song title page:

- On: each section title is alone on a page, centered both ways, and the section's content starts on the next page, like the front and back of a flash card. Content that fits on one page is centered vertically. Longer content starts at the top and flows over as many pages as it needs.
- Off: the sections run together on one page that flows as long as it needs: each section title, left-aligned, then its content. A section title is kept on the same page as the start of its content where the reader supports it (`page-break-after: avoid`).

Sizes, title split and TOC (one entry per song, linking to its title page) are the same in both layouts.

### Groups

With a *Group by property* set, songs are grouped by the values of that note property:

- The property name matches ignoring case, as in Obsidian. Its value may be text, a number or a list; each list item is a value. Values are trimmed and match ignoring case.
- With *Groups* set, those values are the groups, in that order. Songs with none of them are left out.
- With *Groups* empty, every value used by a song is a group, in alphabetical order of the group titles. Songs without a value are left out.
- A song with more than one of the groups is in each of them, with its pages repeated.
- A listed group with no songs is left out.

Each group opens with a title page, centered both ways like a song title page: a black floret, the south west pointing vine leaf (U+1F651) from Noto Sans Symbols 2 (SIL Open Font License), as an inline SVG, with the group title under it. Its body has `epub:type="part"`. The title is the property value with each run of dashes, underscores and spaces turned into one space and the first letter capitalized: `in-progress` becomes `In progress`. The value's spelling comes from *Groups*, or else from the first song with it.

The floret scales with the group title like the song fleuron with the song title: 1.6 × the group title size wide in the SVG's attributes, for Kobo, and 1.2 × in `modern.css`. The gap below it is one group title line in `book.css` and `1em` in `modern.css`.

The index comes first, after the cover and before the first group, as in many songbooks and fake books, so a song is a tap away from the start of the book. It lists every song once, alphabetically, each linking to its first title page. Titles are split under headings by initial letter, uppercase and without accents (`École` under E), except letters of their own in the book's language (Russian Й). Titles that don't start with a letter come first, under `#`. The index is titled in the book's language (*Index*, *Register*, *Указатель*, …; English for others). Without groups, the book has no index.

## Discovering the songs

A **song note** is a Markdown file under the songs directory (any depth) that contains at least one fenced code block whose info string is one of the *Code block names* (`chords` and `chordlyrics` by default), fenced with ```` ``` ```` or `~~~`. Below, "`chords` block" means a block of any of these names.

Fences follow CommonMark: the info string matches when its first word equals the block name (```` ```chords extra ```` matches, ```` ```chordsx ```` doesn't). A block is closed by a fence of the same character that is at least as long as the opening one, and an unclosed block runs to the end of the note. A fence nested inside a block of another type (for example a `markdown` block showing a `chords` example) doesn't count.

If the songs directory doesn't exist, the export fails with an error notice.

Notes with an excluded tag are left out before they are read, and aren't reported as skipped. *Excluded tags* is split at commas and whitespace; a leading `#` is optional. Tags come from both the note's frontmatter and its body, as Obsidian's metadata cache lists them. Matching ignores case, as Obsidian does, and covers nested tags: `template` also excludes `#template/song`, but not `#templates`. An empty setting excludes nothing.

Code blocks of other types (`metronome`, `alphatex`, …) and all text outside `chords` blocks are ignored.

## Songs

The **song title** is the note's file name without the `.md` extension.

The song title page shows only the song title, split into two lines at the first occurrence of the title split sequence. With the default ` - `, `Armstrong - What a Wonderful World` becomes `Armstrong` on line one and `What a Wonderful World` on line two. If the title doesn't contain the sequence, the sequence is empty, or splitting would leave one of the lines empty (e.g. ` - Intro`), the title is shown on one line. Both parts are trimmed. Both lines use the same size. The lines are separated by `<br/>`, so the split doesn't depend on the stylesheet, with an empty line (a second `<br/>`) between them. The TOC entry uses the full, unsplit title.

The text is centered both vertically and horizontally. A black fleuron sits above the title, so a song title page can be told apart from a section title page at a glance: the light swash ornament (U+1F658) from Noto Sans Symbols 2 (SIL Open Font License), as an inline SVG path bundled with the plugin.

The fleuron scales with the song title: its width is a multiple of the song title size, so changing either title size multiplier resizes it too. Its size and the gap below it are tuned per renderer, because Kobo's Adobe renderer draws them differently:

- Kobo ignores CSS sizes on inline SVG, so the SVG's own `width` and `height` attributes apply there: 2.56 × the song title size wide (`4em` with the default multipliers). Other readers get 1.92 × the song title size (`3em` by default) from `modern.css`.
- The gap below the fleuron is one title line (song title size × line-height 1.2) in `book.css`, the same as the empty line between the two title lines. `modern.css` brings it back to `1em`, where it already looks as wide as that empty line.

Only the content of the `chords` code blocks is exported. A song note may have more than one `chords` block, of the same or different names; their contents are joined, in order of appearance, before sections are parsed. So a section may continue from one block into the next, and text before the first section header in the first block is discarded.

## Sections

Songs are divided into sections by section headers in square brackets: `[Verse]`, `[Verse 2]`, `[Intro]`, etc.

A line is a section header when it matches `^\s*\[[^\[\]]+\]\s*$`: it starts with `[`, ends with the matching `]`, and has non-empty text between them with no further brackets. Whitespace before the `[` or after the `]` is ignored. Any non-whitespace character after the closing bracket makes it a regular line. For example, `[1.] 1 1 5 5` and `[Guitar Tabs](https://…)` are regular lines, and `[]` is a regular line. So is a header whose text is only whitespace, such as `[   ]`, because its name would be empty.

The section name is the text between the brackets, trimmed, without the brackets.

Text before the first section header is discarded.

### Section pre-processing

These steps run in order on each line of a section's body:

1. Trim the line. With *Use regular font* off, trim only its end.
2. Strip line-end hints: remove one or more trailing `%` + letter tokens (e.g. `%t`, `%c`) together with the whitespace before them, matching `(^|\s+)(%[A-Za-z]\s*)+$`. These are line-type markers of the Chord Sheets plugin (`%c` marks a chord line, `%t` a text line). For example, `|b7 6m| |5 4| %t` becomes `|b7 6m| |5 4|`.
3. Group tab lines: lines that, trimmed, start with a string name followed by `|`, matching `^[A-Ga-g][#b]?\|` (e.g. `e|-----`, `B|--3--`, `Eb|---`). Consecutive tab lines form one tab block, kept trimmed but otherwise as they are; step 4 doesn't apply to them. An empty line between tab lines starts a new block.
4. Collapse each run of whitespace characters into a single space. Skipped with *Use regular font* off. A line of only whitespace becomes empty either way.

After that:

5. Collapse each run of consecutive empty lines into one empty line.
6. Remove empty lines at the start and end of the section.

With *Use regular font* on, trimming and collapsing whitespace (steps 1 and 4), together with the reader's proportional font, means chords no longer line up over the syllables they belong to. This is a deliberate trade-off for readability. With it off, lines keep their spacing and are set in a monospace font, so chords stay over their syllables as in Obsidian.

Lines of dashes such as `--` are regular lines and are kept.

A line that consists only of hints (e.g. `%t`) becomes an empty line in step 2, and is then handled by steps 5 and 6.

If a section is empty after pre-processing, it is not included.

If a song has no sections, or only empty ones, it is not included in the book and is reported as skipped.

### Section pages

The section title page shows only the section name, centered both vertically and horizontally.

The section content shows the pre-processed lines in order. Each line is its own `<div>`, and empty lines are kept as vertical gaps (a `<div>` holding a no-break space). `<div>` rather than `<p>`, because a `<div>` has no default margins and readers that override paragraph spacing (Kobo) leave it alone, so lines don't get blank lines between them. Long lines wrap; hyphenation is turned off. All text is HTML-escaped.

A tab block is a single `<pre class="tab">`, its lines separated by newlines, in the embedded monospace font at the *Monospace text size* (`0.7em` by default), with line-height 1.2 and no margins, so the staff lines sit close together and the columns line up. Nothing follows the opening tag before the first line: XHTML, parsed as XML, keeps a leading newline that HTML would drop. Tab lines don't wrap.

With *Use regular font* off, the content block has the classes `content mono`: its lines are set in the monospace font at the *Monospace text size*, with `white-space: pre-wrap`, so spaces are kept and long lines still wrap.

On a page of its own, the content block is centered vertically; the lines inside it stay left-aligned.

### Vertical centering

Title pages and section content pages are centered vertically the same way. Each page's body is a flex column with `justify-content: center` and a `min-height` of one screen. The height is `100vh` minus the page's own vertical padding (`calc(100vh - 2em)`), so that it doesn't spill a blank page. Running sections aren't centered vertically.

- It uses `min-height`, not `height`, so content longer than one screen grows past it and flows from the top over the following pages instead of being clipped.
- Readers that don't support `vh` units or flexbox in paginated mode fall back to the placement in the base stylesheet: title pages start a third of the way down (`padding-top: 30%`, relative to the page width), content pages at the top.

## Typography

The book sets no font family, except the monospace font of tab blocks (and of all song content with *Use regular font* off), so the text uses the reader's font setting. Song and section titles are bold.

Monospace text uses a font embedded in the book, because Kobo offers no monospace font of its own: a subset of Noto Sans Mono Regular (© Google, SIL Open Font License 1.1, whose notice stays in the font's name table) with Basic Latin, Latin-1, typographic quotes and dashes, and the ♭ ♮ ♯ signs, without hinting (about 18 KB). It is `fonts/mono.ttf`, with the media type `application/vnd.ms-opentype`, an EPUB 3 core type that RMSDK also recognizes.

The styles are split into three stylesheets, linked from every page in this order:

- `styles/book.css` uses only CSS 2.1 (plus the `hyphens` properties), with no `calc()`, `vh`, flexbox, custom properties or `@font-face`. Kobo renders sideloaded EPUBs with Adobe RMSDK, which drops a whole stylesheet when it meets one value it can't parse, so this file must parse there.
- `styles/modern.css` holds the [vertical centering](#vertical-centering) and overrides the values in `book.css` that are tuned for RMSDK (the title page's top padding, the fleuron's size and gap). Its `calc()` is deliberate: RMSDK skips the whole file, rather than applying part of it, and keeps the values from `book.css`.
- `styles/mono.css` declares the embedded font with `@font-face` and applies it to monospace text, with `!important` so that a font chosen in the reader doesn't replace it. It is a file of its own so that a reader failing on `@font-face` drops only this file; `book.css` then falls back to the generic `monospace`.

All sizes are in `em`, relative to the reader's base font size, so the reader's font-size control still scales everything:

- Content: `1em`, regular.
- Monospace text: content size × *Monospace text size* (default `0.7em`).
- Section title: bold, content size × section title multiplier (default `1.25em`).
- Song title: bold, section title size × song title multiplier (default `1.5625em`).
- Group title: bold, song title size × group title multiplier (default `1.953em`).
- Index: the title at the song title size, letter headings at the section title size, entries at the content size, as plain text rather than styled links.
