# 🎸 Song Export for Obsidian

Turn the chord sheets in your vault into a songbook you can learn from anywhere: one EPUB with all your songs, ready to read on your e-reader, tablet or phone between practice sessions.

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

Click the songbook icon in the left ribbon, or run **Export songs to EPUB**, and you get a book where:

- 📖 **Every song is a chapter**, opened by a clean title page (`Artist` over `Title`).
- 🔖 **Every section gets its own title page**: `[Verse 1]`, `[Chorus]` and so on, with the lines on the pages that follow.
- 🧹 **The clutter is gone**: tab lines, `--` separators, stray whitespace and empty sections are dropped. Everything outside `chords` blocks stays in your vault.
- ✍️ **It looks like a book**: you pick from 10 curated Google Fonts, they are embedded in the EPUB, and every size scales with your reader's font setting.
- 🗂️ **The table of contents stays short**: songs only, in alphabetical order.

## Install with BRAT

The plugin isn't in the Community plugins directory yet, so install it with [BRAT](https://github.com/TfTHacker/obsidian42-brat):

1. In Obsidian, open *Settings → Community plugins → Browse*, then install and enable **BRAT**.
2. Run **BRAT: Add a beta plugin for testing** from the command palette.
3. Enter `akabanov/obsidian-song-export-plugin` and choose the latest version.
4. Enable **Song Export** under *Settings → Community plugins*.

BRAT checks for new releases and updates the plugin for you. Song Export runs on desktop only.

## Settings

| Setting | Default |
|---|---|
| Songs directory | vault root |
| Output file | `~/Documents/my-songs.epub` (asks before overwriting) |
| Book title / author / language | My Songbook / Obsidian / EN |
| Title split sequence | ` - ` |
| Title / content font | Playfair Display / Lora |
| Section / song title size | 2× content / 3× section |

## Development

```bash
npm install
npm run dev     # watch build
npm run build   # production build
npm run lint
```

To try a local build, symlink or copy `main.js`, `manifest.json` and `styles.css` into `<vault>/.obsidian/plugins/song-export/`.

To release, bump the version with `npm version <x.y.z>` and push the tag. The release workflow attaches the build to a draft GitHub release; publish the draft so BRAT can see it.

## License

[0BSD](LICENSE)
