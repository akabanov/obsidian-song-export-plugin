# 🎸 Songbook Maker for Obsidian

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
3. Enter `akabanov/obsidian-songbook-maker-plugin` and choose the latest version. Early releases are betas (`0.1.0-beta.N`).
4. Enable **Songbook Maker** under *Settings → Community plugins*.

BRAT checks for new releases and updates the plugin for you. Songbook Maker runs on desktop only.

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

The only network requests Songbook Maker makes are to Google Fonts (`fonts.googleapis.com` and `fonts.gstatic.com`), to download a font the first time you select or export with it. Font files are cached in the plugin's folder, so later exports work offline. No vault content or personal data is sent.

## Development

```bash
npm install
npm run dev     # watch build
npm run build   # production build
npm test        # unit tests (Node's built-in test runner)
npm run lint
```

To try a local build, symlink or copy `main.js`, `manifest.json` and `styles.css` into `<vault>/.obsidian/plugins/songbook-maker/`.

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
3. Builds `main.js` and attests its build provenance.
4. Publishes a GitHub release for the tag, with `main.js`, `manifest.json` and `styles.css` attached and notes generated from the commits. Versions with a pre-release suffix (`-beta.N`) are marked as pre-releases.

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
