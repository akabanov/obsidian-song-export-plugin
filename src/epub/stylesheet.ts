export interface StylesheetFont {
	family: string;
	weight: number;
	/** Relative to the stylesheet. */
	href: string;
	format: 'truetype' | 'woff2';
}

export interface StylesheetOptions {
	fonts: StylesheetFont[];
	titleFont: string;
	contentFont: string;
	sectionTitleScale: number;
	songTitleScale: number;
}

export function stylesheet(options: StylesheetOptions): string {
	const faces = options.fonts
		.map(
			(font) => `@font-face {
	font-family: "${font.family}";
	font-style: normal;
	font-weight: ${font.weight};
	src: url("${font.href}") format("${font.format}");
}`,
		)
		.join('\n\n');
	const sectionSize = round(options.sectionTitleScale);
	const songSize = round(options.sectionTitleScale * options.songTitleScale);

	return `${faces}

html, body {
	margin: 0;
	padding: 0;
}

body {
	font-family: "${options.contentFont}", serif;
	font-weight: 400;
}

/* Centered vertically: a flex column at least one screen tall. The height
   leaves out the body's own vertical padding so a page doesn't spill a blank
   one, and min-height lets long content flow over the following pages.
   Readers without vh or flexbox fall back to top-aligned text. */
.page {
	display: flex;
	flex-direction: column;
	justify-content: center;
	padding: 1em;
	min-height: calc(100vh - 2em);
}

.song-page,
.section-page {
	text-align: center;
}

.icon {
	margin: 0 0 1em;
}

.song-icon {
	width: 3em;
	height: 3em;
}

h1, h2 {
	font-family: "${options.titleFont}", serif;
	font-weight: 700;
	line-height: 1.2;
	margin: 0;
	page-break-before: avoid;
	page-break-after: avoid;
}

.song-title {
	font-size: ${songSize}em;
}

.title-line {
	display: block;
}

.section-title {
	font-size: ${sectionSize}em;
}

.content {
	text-align: left;
}

.line {
	margin: 0;
	text-indent: 0;
	line-height: 1.5;
	overflow-wrap: break-word;
	hyphens: none;
}

/* Book layout: the song starts on a new page and its sections follow it. */
.song {
	padding: 1em;
}

.song-heading {
	text-align: center;
	margin: 0 0 1.5em;
}

.section {
	margin: 0 0 1.5em;
}

.song .section-title {
	margin: 0 0 0.5em;
}

.cover-page {
	text-align: center;
}

.cover img {
	max-width: 100%;
	max-height: 100vh;
	width: auto;
	height: auto;
}
`;
}

function round(value: number): string {
	return String(Math.round(value * 1000) / 1000);
}
