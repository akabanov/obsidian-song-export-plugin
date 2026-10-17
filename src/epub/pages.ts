import { Section } from '../song/sections';
import { escapeXml } from './xml';

/** Path of the stylesheet relative to the XHTML pages in `text/`. */
const STYLESHEET = '../styles/book.css';

// A music note (Lucide's "music" glyph) marking song title pages.
const SONG_ICON = `<svg xmlns="http://www.w3.org/2000/svg" class="song-icon" viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`;

function page(
	language: string,
	title: string,
	bodyAttributes: string,
	body: string,
): string {
	return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${language}" lang="${language}">
<head>
<meta charset="UTF-8"/>
<title>${escapeXml(title)}</title>
<link rel="stylesheet" type="text/css" href="${STYLESHEET}"/>
</head>
<body ${bodyAttributes}>
${body}
</body>
</html>
`;
}

function songHeading(titleLines: string[]): string {
	const lines = titleLines
		.map((line) => `<span class="title-line">${escapeXml(line)}</span>`)
		.join('\n');
	return `<div class="icon">${SONG_ICON}</div>\n<h1 class="song-title">\n${lines}\n</h1>`;
}

function sectionHeading(name: string): string {
	return `<h2 class="section-title">${escapeXml(name)}</h2>`;
}

function content(lines: string[]): string {
	const paragraphs = lines
		.map((line) =>
			line === ''
				? '<p class="line gap">&#160;</p>'
				: `<p class="line">${escapeXml(line)}</p>`,
		)
		.join('\n');
	return `<div class="content">\n${paragraphs}\n</div>`;
}

// Flash-card layout: every title and every section's content on its own page.

export function songTitlePage(
	language: string,
	title: string,
	titleLines: string[],
): string {
	return page(
		language,
		title,
		'class="page song-page" epub:type="chapter"',
		songHeading(titleLines),
	);
}

export function sectionTitlePage(
	language: string,
	songTitle: string,
	sectionName: string,
): string {
	return page(
		language,
		`${songTitle}: ${sectionName}`,
		'class="page section-page"',
		sectionHeading(sectionName),
	);
}

export function sectionContentPage(
	language: string,
	songTitle: string,
	sectionName: string,
	lines: string[],
): string {
	return page(
		language,
		`${songTitle}: ${sectionName}`,
		'class="page content-page"',
		content(lines),
	);
}

// Book layout: one page per song, with titles and content running together.

export function songPage(
	language: string,
	title: string,
	titleLines: string[],
	sections: Section[],
): string {
	const body = sections.map(
		(section) =>
			`<div class="section">\n${sectionHeading(section.name)}\n${content(section.lines)}\n</div>`,
	);
	return page(
		language,
		title,
		'class="song" epub:type="chapter"',
		`<div class="song-heading">\n${songHeading(titleLines)}\n</div>\n${body.join('\n')}`,
	);
}

export function coverPage(language: string, bookTitle: string, image: string): string {
	return page(
		language,
		bookTitle,
		'class="cover-page" epub:type="cover"',
		`<div class="cover"><img src="../${image}" alt="${escapeXml(bookTitle)}"/></div>`,
	);
}
