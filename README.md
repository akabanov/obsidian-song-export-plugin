# 🎸 Songbook Maker for Obsidian

Turn the chord sheets in your vault into a songbook you can learn from anywhere: one EPUB with all your songs (chords over lyrics, guitar tabs and all), ready to read on your e-reader, tablet or phone between practice sessions.

Songbook Maker reads the `chords` code blocks of the [Chord Sheets](https://github.com/olvidalo/obsidian-chord-sheets) plugin, `%c`/`%t` line markers included, so the songs you already play from in Obsidian go straight into the book.

> **Status:** beta. Until it's listed in Community plugins, install it with [BRAT](#install-with-brat). The export follows [SPEC.md](SPEC.md).

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
- 🔖 **Practice with flashcards, or play straight through**: with flashcard-style sections, each section title (`[Verse 1]`, `[Chorus]` …) is the front of a card and its content is on the next page, so you can drill one part at a time. Turn them off for a regular songbook layout.
- 🖼️ **It has a cover**: a bundled black-and-white illustration, your own image, or none.
- ✍️ **It reads well on e-ink**: the text uses your reader's font, sized relative to your other books (say, 80% to fit long lines), titles are sized by multipliers you choose, and everything follows your reader's font-size setting. The book works with Kobo's stricter EPUB renderer too.
- 🎼 **You choose how chords line up**: by default, songs use your reader's font, which is easiest to read on a small screen. Its letters vary in width, so spaces can't place a chord over its syllable; the book drops the extra spaces, and each chord line lists the chords in order above its lyric line. To keep every chord exactly where you put it, turn off **Use regular font**: songs keep their spacing, in a monospaced font embedded in the book.
- 🎸 **Guitar tabs stay readable**: tab lines (`e|---0---|`) are set in a monospaced font embedded in the book, so the strings line up even on readers without a monospaced font of their own.
- 🗂️ **The table of contents stays short**: songs only, in alphabetical order.
- 📚 **Group songs your way**: set **Group by property** to a note property, such as `song-status` or `genre`, and the book gets a part for each value, with a title page, the songs under each group in the table of contents, and an index at the back. List the values you want in **Groups** to pick them and their order (say, `learning, polishing`).
- 🏷️ **Templates stay out**: notes tagged `#template` (or any tags you choose) are left out of the book.

## Works with your chord plugins

Songbook Maker doesn't render chords in Obsidian; it exports them. Keep using your favourite plugin for writing and playing, and export with this one:

- [**Chord Sheets**](https://github.com/olvidalo/obsidian-chord-sheets): works as is. Its `chords` code blocks, `[Verse]`-style section headers and `%c`/`%t` line markers are what Songbook Maker reads. If you changed Chord Sheets' block name, set the same **Code block name** here.
- [**Chord Lyrics**](https://github.com/nevernotmove/obsidian-chordlyrics): set **Code block name** to `chordlyrics`.

Any other chords-over-lyrics code block with `[Section]` headers works the same way.

## Install with BRAT

The plugin isn't in the Community plugins directory yet, so install it with [BRAT](https://github.com/TfTHacker/obsidian42-brat):

1. In Obsidian, open *Settings → Community plugins → Browse*, then install and enable **BRAT**.
2. Run **BRAT: Add a beta plugin for testing** from the command palette.
3. Enter `akabanov/obsidian-songbook-maker-plugin` and choose the latest version. Early releases are betas (`0.1.0-beta.N`).
4. Enable **Songbook Maker** under *Settings → Community plugins*.

BRAT checks for new releases and updates the plugin for you. Songbook Maker runs on desktop only and needs Obsidian 1.13 or later.

## Settings

| Setting | Default |
|---|---|
| Songs directory | vault root |
| Excluded tags | `template` |
| Code block name | `chords` |
| Output file | `~/Documents/my-songbook.epub` (asks before overwriting) |
| Show in folder after export | off |
| Group by property / Groups | none (no groups) / every value, alphabetically |
| Book title / author / language | My Songbook / Obsidian / English |
| Title split sequence | ` - ` |
| Cover image | bundled default (or none, or your own image) |
| Flashcard-style sections | on |
| Use regular font | on (off: keep chord spacing, in a monospaced font) |
| Text size | 100% of your reader's font size (65–130%) |
| Monospace text size | 70% of the text size (50–100%), for tabs and monospaced songs |
| Section / song / group title size | 1.25× content / 1.25× section / 1.25× song |

## Privacy and disclosures

- **No network**: Songbook Maker makes no network requests and collects no telemetry.
- **Files outside your vault**: the export writes the EPUB file to the **Output file** path, which is usually outside your vault (`~/Documents` by default), so that the book doesn't end up synced or indexed as a vault file and is easy to copy to your e-reader. It writes nothing else, apart from a temporary file next to it while the export runs. A **Cover image path** starting with `/` or `~` is read from outside the vault too.
- **What it reads**: only the notes under **Songs directory**, and only when you run the export.

This is also why the plugin is desktop only: writing outside the vault needs Node's file system access.

## Reading on a Kobo

For a sharp cover, use an image at least as large as your screen (for example 1072×1448 on a Clara, 1264×1680 on a Libra). Smaller images are scaled up to fill the page.

If the sleep screen keeps showing the old cover after you change it, the Kobo is holding on to its cached cover. Remove the book from the Kobo, delete the hidden `.kobo-images` folder at its root, power it off completely (not just to sleep), then turn it on and copy the book back. Saving the book under a new file name (**Output file**) also works, without the restart.

## Development

```bash
npm install
npm run dev     # watch build
npm run build   # production build
npm test        # unit tests (Node's built-in test runner)
npm run lint
```

To try a local build, symlink or copy `main.js` and `manifest.json` into `<vault>/.obsidian/plugins/songbook-maker/`. See [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

## Releasing

Releases are built and published by the [**Release Obsidian plugin**](.github/workflows/release.yml) GitHub Actions workflow. You never need to edit version numbers by hand.

### Start a release

From GitHub: open the **Actions** tab, select **Release Obsidian plugin**, then select **Run workflow**, enter a version and confirm.

From a terminal, with the [GitHub CLI](https://cli.github.com/):

```bash
gh workflow run release.yml                          # next beta, e.g. 0.1.0-beta.1 → 0.1.0-beta.2
gh workflow run release.yml -f version=0.2.0-beta.1  # a specific version
gh workflow run release.yml -f version=minor         # a stable release, e.g. 0.1.0 → 0.2.0
gh run watch                                         # follow the run
```

The `version` input takes an explicit version or an `npm version` keyword:

| `version` | Example result | Release type |
|---|---|---|
| `prerelease` (default) | `0.1.0-beta.1` → `0.1.0-beta.2` | Pre-release |
| `0.2.0-beta.1` | `0.2.0-beta.1` | Pre-release |
| `prepatch`, `preminor`, `premajor` | `0.1.0` → `0.1.1-beta.0`, `0.2.0-beta.0`, `1.0.0-beta.0` | Pre-release |
| `patch`, `minor`, `major` | `0.1.0` → `0.1.1`, `0.2.0`, `1.0.0` | Stable |
| `0.2.0` | `0.2.0` | Stable |

### What the workflow does

1. Installs dependencies, runs the unit tests and the linter. A failure stops the release before anything is changed.
2. Bumps the version in `package.json`, `manifest.json` and `versions.json`, commits it to `main` as `Release <version>` and tags it with the bare version (no leading `v`).
3. Builds `main.js` and has GitHub sign a record that this workflow built it from this commit, so anyone can check that the file in the release wasn't built elsewhere or changed afterward (`gh attestation verify main.js --repo akabanov/obsidian-songbook-maker-plugin`).
4. Publishes a GitHub release for the tag, with `main.js` and `manifest.json` attached and notes generated from the commits. Versions with a pre-release suffix (`-beta.N`) are marked as pre-releases.

BRAT picks up the new version on its next update check, or right away with **BRAT: Check for updates to all beta plugins**.

After a release, run `git pull` so your local `main` has the version bump commit.

### Release from a hand-made tag

Pushing a version tag also publishes a release for that tag, without bumping anything:

```bash
npm version 0.2.0      # bumps package.json, manifest.json and versions.json, commits and tags
git push --follow-tags
```

The tag must match the `version` in `manifest.json`, or the workflow fails.

## License

[0BSD](LICENSE)

Books embed a subset of [Noto Sans Mono](https://fonts.google.com/noto/specimen/Noto+Sans+Mono) for tabs and monospaced songs (`assets/mono.ttf`), © Google, licensed under the [SIL Open Font License 1.1](https://openfontlicense.org).
