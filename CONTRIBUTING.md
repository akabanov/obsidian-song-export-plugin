# Contributing

Thanks for helping with Songbook Maker. Bug reports, reader-specific rendering quirks (with the reader model and firmware) and pull requests are all welcome.

## Reporting a problem

Open an [issue](https://github.com/akabanov/obsidian-songbook-maker-plugin/issues) with:

- your Obsidian version and operating system,
- the reader or app you open the book in,
- a minimal song note that shows the problem, and what you expected instead.

## Making a change

[SPEC.md](SPEC.md) describes what the export does. Behaviour changes start there: update the spec in the same pull request as the code, and keep [README.md](README.md) in step with it.

```bash
npm install
npm run dev     # watch build into main.js
npm test        # unit tests
npm run lint    # eslint-plugin-obsidianmd, the same rules the Community directory review uses
npm run build   # type check and production build
```

To try a build, symlink or copy `main.js` and `manifest.json` into `<vault>/.obsidian/plugins/songbook-maker/` and reload Obsidian.

Before opening a pull request, make sure `npm test`, `npm run lint` and `npm run build` pass with no warnings. Keep the plugin free of network requests and of runtime dependencies that aren't bundled into `main.js`.

Releases are made by the maintainer with the release workflow described in the README.
