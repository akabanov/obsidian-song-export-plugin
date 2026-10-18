import { Section } from '../song/sections';
import { ImageSize } from './image-size';
import { escapeXml } from './xml';

/** Stylesheet paths relative to the XHTML pages in `text/`. */
const STYLESHEETS = ['../styles/book.css', '../styles/centering.css'];

// A music note (Lucide's "music" glyph) marking song titles. The size is in
// the SVG's own attributes, in em: Kobo's Adobe renderer ignores CSS width and
// height on inline SVG and falls back to these.
const SONG_ICON = `<svg xmlns="http://www.w3.org/2000/svg" class="song-icon" viewBox="0 0 24 24" width="3em" height="3em" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`;

const STYLESHEET_LINKS = STYLESHEETS.map(
	(href) => `<link rel="stylesheet" type="text/css" href="${href}"/>`,
).join('\n');

function page(
	language: string,
	title: string,
	bodyAttributes: string,
	body: string,
	head = STYLESHEET_LINKS,
): string {
	return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${language}" lang="${language}">
<head>
<meta charset="UTF-8"/>
<title>${escapeXml(title)}</title>
${head}
</head>
<body ${bodyAttributes}>
${body}
</body>
</html>
`;
}

/**
 * The song title with its icon. Title lines are split with `<br/>`, which
 * doesn't depend on the stylesheet; `spaced` puts an empty line between them.
 */
export function songHeading(titleLines: string[], spaced: boolean): string {
	const lines = titleLines.map(escapeXml).join(spaced ? '<br/>\n<br/>\n' : '<br/>\n');
	return `<div class="song-heading">\n<div class="icon">${SONG_ICON}</div>\n<h1 class="song-title">${lines}</h1>\n</div>`;
}

export function sectionHeading(name: string): string {
	return `<h2 class="section-title">${escapeXml(name)}</h2>`;
}

// One <div> per line: unlike <p>, a div has no default margins, and readers
// that override paragraph spacing (Kobo) leave it alone.
function content(lines: string[]): string {
	const rows = lines
		.map((line) =>
			line === ''
				? '<div class="line gap">&#160;</div>'
				: `<div class="line">${escapeXml(line)}</div>`,
		)
		.join('\n');
	return `<div class="content">\n${rows}\n</div>`;
}

const chapterAttribute = (chapter: boolean) => (chapter ? ' epub:type="chapter"' : '');

/** Titles only (a song title, a section title or both), centered on the page. */
export function titlePage(
	language: string,
	title: string,
	headings: string,
	chapter: boolean,
): string {
	return page(
		language,
		title,
		`class="page title-page"${chapterAttribute(chapter)}`,
		headings,
	);
}

/** One section's content on its own page. */
export function sectionContentPage(
	language: string,
	title: string,
	lines: string[],
): string {
	return page(language, title, 'class="page content-page"', content(lines));
}

/**
 * Sections running together, each title followed by its content, below the
 * song heading when given.
 */
export function runningPage(
	language: string,
	title: string,
	sections: Section[],
	heading: string | null,
): string {
	const body = sections.map(
		(section) =>
			`<div class="section">\n${sectionHeading(section.name)}\n${content(section.lines)}\n</div>`,
	);
	if (heading) body.unshift(heading);
	return page(
		language,
		title,
		`class="song"${chapterAttribute(heading !== null)}`,
		body.join('\n'),
	);
}

// The image is wrapped in an SVG scaled to the page, the usual way to get a
// full-page cover: readers such as Kobo's don't scale a plain <img> past its
// pixel size. The inline style drops the page margins on this page only.
const COVER_STYLE = `<style type="text/css">
@page { margin: 0; padding: 0; }
body { margin: 0; padding: 0; text-align: center; }
</style>`;

export function coverPage(
	language: string,
	bookTitle: string,
	image: string,
	size: ImageSize | null,
): string {
	const alt = escapeXml(bookTitle);
	const body = size
		? `<div class="cover"><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="100%" height="100%" viewBox="0 0 ${size.width} ${size.height}" preserveAspectRatio="xMidYMid meet"><image width="${size.width}" height="${size.height}" xlink:href="../${image}"/></svg></div>`
		: `<div class="cover"><img src="../${image}" alt="${alt}" style="max-width: 100%; max-height: 100%;"/></div>`;
	return page(language, bookTitle, 'epub:type="cover"', body, COVER_STYLE);
}
