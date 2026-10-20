import { SONG_ICON_ASPECT } from './pages';

export interface StylesheetOptions {
	/** Percent of the reader's font size; every size below is in em of it. */
	textSize: number;
	sectionTitleScale: number;
	songTitleScale: number;
}

/*
 * The song icon scales with the song title: its width is a multiple of the
 * song title size. Adobe RMSDK renders em-sized SVG smaller than other
 * readers, so it gets a larger multiple (set in the SVG's attributes, which
 * RMSDK uses) than other readers (set in modern.css).
 */
const ICON_WIDTH = 2.56;
const MODERN_ICON_WIDTH = 1.92;

const songScale = (options: StylesheetOptions) =>
	options.sectionTitleScale * options.songTitleScale;

/** The song icon's width in em of the content text size, for RMSDK. */
export function songIconWidth(options: StylesheetOptions): number {
	return ICON_WIDTH * songScale(options);
}

/*
 * Kobo renders sideloaded EPUBs with Adobe RMSDK, which drops a whole
 * stylesheet when it meets one thing it can't parse, such as calc(). So the
 * styles are split in two:
 *
 * - book.css sticks to CSS 2.1, so every reader applies it. Where RMSDK
 *   renders differently, it holds the values tuned for RMSDK.
 * - modern.css centers pages vertically with flexbox and vh and overrides the
 *   RMSDK-tuned values. It contains a calc() on purpose: RMSDK then skips the
 *   whole file instead of applying half of it.
 *
 * No font family is set, so the reader's font setting applies.
 */

export function bookStylesheet(options: StylesheetOptions): string {
	const sectionSize = round(options.sectionTitleScale);
	const songSize = round(songScale(options));
	// One title line (its font size × line-height 1.2), matching the empty
	// line between the two title lines on a song title page.
	const iconGap = round(songScale(options) * 1.2);

	return `html, body {
	margin: 0;
	padding: 0;
}

body {
	font-size: ${round(options.textSize)}%;
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
	margin: 0 0 ${iconGap}em;
	text-align: center;
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

/* Guitar tabs: one block, lines set solid so the staff reads as a whole. Long
   lines aren't wrapped. */
.tab {
	margin: 0;
	padding: 0;
	text-indent: 0;
	font-family: "Courier New", Courier, monospace;
	line-height: 1.2;
	white-space: pre;
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

/* Applied by readers with modern CSS. Adobe RMSDK (Kobo) skips the whole file
   because of the calc(), and keeps book.css's values. */
export function modernStylesheet(options: StylesheetOptions): string {
	const iconWidth = MODERN_ICON_WIDTH * songScale(options);
	return `/* Centered vertically: a flex column at least one screen tall. The height
   leaves out the page's own vertical padding so a page doesn't spill a blank
   one, and min-height lets long content flow over the following pages. */
.page {
	display: flex;
	flex-direction: column;
	justify-content: center;
	min-height: calc(100vh - 2em);
}

.title-page {
	padding-top: 1em;
}

/* The icon renders larger here than in RMSDK, and the gap below it looks
   wider, so both are smaller than in book.css. */
.song-icon {
	width: ${round(iconWidth)}em;
	height: ${round(iconWidth * SONG_ICON_ASPECT)}em;
}

.icon {
	margin-bottom: 1em;
}
`;
}

function round(value: number): string {
	return String(Math.round(value * 1000) / 1000);
}
