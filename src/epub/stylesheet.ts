export interface StylesheetOptions {
	sectionTitleScale: number;
	songTitleScale: number;
}

/*
 * Kobo renders sideloaded EPUBs with Adobe RMSDK, which drops a whole
 * stylesheet when it meets one thing it can't parse, such as calc(). So the
 * styles are split in two:
 *
 * - book.css sticks to CSS 2.1, so every reader applies it.
 * - centering.css centers pages vertically with flexbox and vh, and contains a
 *   calc() on purpose: RMSDK then skips the whole file, keeping book.css's
 *   approximate placement instead of applying half of the flex layout.
 *
 * No font family is set, so the reader's font setting applies.
 */

export function bookStylesheet(options: StylesheetOptions): string {
	const sectionSize = round(options.sectionTitleScale);
	const songSize = round(options.sectionTitleScale * options.songTitleScale);

	return `html, body {
	margin: 0;
	padding: 0;
}

.page {
	padding: 1em;
}

/* Without centering.css, title pages start a third of the way down. A
   percentage padding is relative to the page width. */
.title-page {
	padding-top: 30%;
	text-align: center;
}

.icon {
	margin: 0 0 1em;
	text-align: center;
}

.song-icon {
	width: 3em;
	height: 3em;
}

h1, h2 {
	font-weight: bold;
	line-height: 1.2;
	margin: 0;
	page-break-after: avoid;
}

.song-heading {
	text-align: center;
}

.song-title {
	font-size: ${songSize}em;
}

.section-title {
	font-size: ${sectionSize}em;
}

.song-heading + .section-title {
	margin-top: 1em;
}

.content {
	text-align: left;
}

.line {
	margin: 0;
	padding: 0;
	text-indent: 0;
	line-height: 1.5;
	word-wrap: break-word;
	-webkit-hyphens: none;
	adobe-hyphenate: none;
	hyphens: none;
}

/* Sections running together: each song starts on a new page. */
.song {
	padding: 1em;
}

.song .section {
	margin: 1.5em 0 0;
}

.song .section-title {
	margin: 0 0 0.5em;
}
`;
}

export const CENTERING_STYLESHEET = `/* Centered vertically: a flex column at least one screen tall. The height
   leaves out the page's own vertical padding so a page doesn't spill a blank
   one, and min-height lets long content flow over the following pages.
   The calc() also makes Adobe RMSDK (Kobo) skip this whole file, so it
   keeps the fallback placement from book.css. */
.page {
	display: flex;
	flex-direction: column;
	justify-content: center;
	min-height: calc(100vh - 2em);
}

.title-page {
	padding-top: 1em;
}
`;

function round(value: number): string {
	return String(Math.round(value * 1000) / 1000);
}
