# 🎸 Song Export for Obsidian

Turn the chord sheets in your vault into a songbook you can learn from anywhere: one EPUB with all your songs, ready to read on your e-reader, tablet or phone between practice sessions.

> **Status:** early development. The export follows [SPEC.md](SPEC.md) but hasn't had a public release yet.

## How it works

Write songs as ordinary notes and put the playable part in a `chords` code block:

````markdown
```chords
[Verse 1]
   G              G7       C     G
Amazing grace! How sweet the sound
             G                 D
That saved a wretch like me

[Verse 2]
...
```
````

Click the songbook icon in the left ribbon, or run **Export songs to EPUB**, and you get a book where:

- 📖 **Every song is a chapter**, opened by a clean title (`Artist` over `Title`).
- 🔖 **Pick a layout**: *flash cards* give every song title, section title (`[Verse 1]`, `[Chorus]` …) and section its own page, for drilling one part at a time. *Book* starts each song on a new page and runs its sections together, for playing straight through.
- 🖼️ **It has a cover**: a bundled black-and-white illustration, your own image, or none.
- 🧹 **The clutter is gone**: tab lines, `--` separators, `%t`-style rendering hints, stray whitespace and empty sections are dropped. Everything outside `chords` blocks stays in your vault.
- ✍️ **It looks like a book**: you pick from 10 curated Google Fonts, they are embedded in the EPUB, and every size scales with your reader's font setting.
- 🗂️ **The table of contents stays short**: songs only, in alphabetical order.

## Install with BRAT

The plugin isn't in the Community plugins directory yet, so install it with [BRAT](https://github.com/TfTHacker/obsidian42-brat):

1. In Obsidian, open *Settings → Community plugins → Browse*, then install and enable **BRAT**.
2. Run **BRAT: Add a beta plugin for testing** from the command palette.
3. Enter `akabanov/obsidian-song-export-plugin` and choose the latest version. Early releases are betas (`0.1.0-beta.N`).
4. Enable **Song Export** under *Settings → Community plugins*.

BRAT checks for new releases and updates the plugin for you. Song Export runs on desktop only.

## Settings

| Setting | Default |
|---|---|
| Songs directory | vault root |
| Code block name | `chords` |
| Output file | `~/Documents/my-songs.epub` (asks before overwriting) |
| Book title / author / language | My Songbook / Obsidian / EN |
| Title split sequence | ` - ` |
| Cover image | bundled default (or none, or your own image) |
| Page layout | flash cards (or book) |
| Title / content font | Playfair Display / Lora |
| Section / song title size | 2× content / 2× section |

## Network use

The only network requests Song Export makes are to Google Fonts (`fonts.googleapis.com` and `fonts.gstatic.com`), to download a font the first time you select or export with it. Font files are cached in the plugin's folder, so later exports work offline. No vault content or personal data is sent.

## Development

```bash
npm install
npm run dev     # watch build
npm run build   # production build
npm test        # unit tests (Node's built-in test runner)
npm run lint
```

To try a local build, symlink or copy `main.js`, `manifest.json` and `styles.css` into `<vault>/.obsidian/plugins/song-export/`.

Releases are published by the **Release Obsidian plugin** workflow. Run it from the repository's **Actions** tab (**Run workflow**), or from a terminal:

```bash
gh workflow run release.yml                          # next beta, e.g. 0.1.0-beta.1 → 0.1.0-beta.2
gh workflow run release.yml -f version=0.2.0-beta.1  # a specific version
gh workflow run release.yml -f version=minor         # a stable release, e.g. 0.1.0 → 0.2.0
```

The workflow tests and lints the code, bumps the version in `package.json`, `manifest.json` and `versions.json`, commits and tags the bump on `main`, and publishes a GitHub release with `main.js`, `manifest.json` and `styles.css`. Versions with a `-beta.N` suffix are published as pre-releases, which BRAT can install. Pushing a version tag by hand (`npm version <x.y.z> && git push --follow-tags`) publishes a release for that tag too.

## License

[0BSD](LICENSE)
