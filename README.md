# 🎸 Song Export for Obsidian

Turn the chord sheets in your vault into a pocket songbook: one EPUB, flash-card style, ready for your e-reader, tablet or phone on the music stand.

> **Status:** early development. The plugin scaffold is in place; the export itself is being built against [SPEC.md](SPEC.md).

## How it works

Write songs as ordinary notes and put the playable part in a `chords` code block:

````markdown
```chords
[Verse 1]
        C        Em    F         Em
I see trees of green, red roses too

[Chorus]
...
```
````

Run **Export songs to EPUB** and you get a book where:

- 📖 **Every song is a chapter**, opened by a clean title page (`Artist` over `Title`).
- 🃏 **Every section is a flash card**: `[Verse 1]` on one page, its lines on the next.
- 🧹 **The clutter is gone**: tab lines, `--` separators, stray whitespace and empty sections are dropped. Everything outside `chords` blocks stays in your vault.
- ✍️ **It looks like a book**: you pick from 10 curated Google Fonts, they are embedded in the EPUB, and title sizes are adjustable.
- 🗂️ **The table of contents stays short**: songs only, in alphabetical order.

## Settings

| Setting | Default |
|---|---|
| Songs directory | vault root |
| Output file | `~/Documents/my-songs.epub` |
| Title / content font | Playfair Display / Lora |
| Section / song title size | 2× content / 3× section |

## Development

```bash
npm install
npm run dev     # watch build
npm run build   # production build
npm run lint
```

To try it, symlink or copy `main.js`, `manifest.json` and `styles.css` into `<vault>/.obsidian/plugins/song-export/`, then enable **Song Export** under *Settings → Community plugins*. The plugin is desktop-only.
