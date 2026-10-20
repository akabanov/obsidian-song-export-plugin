import { Line, Section } from '../song/sections';
import { ImageSize } from './image-size';
import { escapeXml } from './xml';

/** Stylesheet paths relative to the XHTML pages in `text/`. */
const STYLESHEETS = ['../styles/book.css', '../styles/modern.css', '../styles/mono.css'];

// A fleuron marking song titles: the light swash ornament (U+1F658) from Noto
// Sans Symbols 2, © Google, SIL Open Font License 1.1.
const SONG_ICON_PATH = `M530 605Q492 605 451 582Q410 559 369.5 522.5Q329 486 289 444Q249 402 213 364Q180 378 146 387.5Q112 397 74 397Q38 397 19 379.5Q0 362 0 336Q0 304 20 275.5Q40 247 70.5 229Q101 211 132 211Q156 211 188.5 238Q221 265 259 305Q268 301 278 295Q301 272 332.5 235.5Q364 199 401 158Q438 117 478 81Q518 45 558.5 22.5Q599 0 636 0Q680 0 701.5 20Q723 40 723 69Q723 90 712.5 109.5Q702 129 689 141.5Q676 154 670 154Q664 154 664 150Q664 148 668 143Q672 138 672 125Q672 102 653.5 81.5Q635 61 597 61Q560 61 520 85Q480 109 443 144.5Q406 180 376.5 214Q347 248 330 269Q388 240 457 215.5Q526 191 618 191Q704 191 762 219.5Q820 248 849.5 291.5Q879 335 879 380Q879 414 867.5 441Q856 468 840.5 487Q825 506 811.5 516Q798 526 793 526Q787 526 787 521Q787 517 794 509Q801 501 807.5 485.5Q814 470 814 445Q814 393 784 350.5Q754 308 697.5 282.5Q641 257 563 257Q472 257 406 280.5Q340 304 283 331Q317 368 354 406.5Q391 445 428.5 478Q466 511 503.5 531Q541 551 576 551Q604 551 613.5 534Q623 517 623 501Q623 478 609.5 458.5Q596 439 575 427Q554 415 531 415Q522 415 517.5 416.5Q513 418 509 418Q507 418 507 416Q507 411 517.5 398.5Q528 386 535 382Q544 376 556.5 370.5Q569 365 585 365Q614 365 642 387.5Q670 410 670 455Q670 496 648 530.5Q626 565 593.5 585Q561 605 530 605ZM43 297Q43 317 61.5 331.5Q80 346 111 346Q130 346 148.5 343Q167 340 185 335Q153 304 126.5 284Q100 264 80 264Q65 264 54 275Q43 286 43 297Z`;

/** Height over width of the song icon. */
export const SONG_ICON_ASPECT = 605 / 879;

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
 * The song icon, `width` em wide. Kobo's Adobe renderer ignores CSS width and
 * height on inline SVG and uses these attributes; modern.css overrides them
 * for other readers.
 */
function songIcon(width: number): string {
	const em = (value: number) => `${Math.round(value * 1000) / 1000}em`;
	return `<svg xmlns="http://www.w3.org/2000/svg" class="song-icon" viewBox="0 0 879 605" width="${em(width)}" height="${em(width * SONG_ICON_ASPECT)}" fill="#000000" aria-hidden="true"><path d="${SONG_ICON_PATH}"/></svg>`;
}

/**
 * The song title with its icon, `iconWidth` em wide. Title lines are split
 * with `<br/>`, which doesn't depend on the stylesheet, and an empty line
 * between them.
 */
function songHeading(titleLines: string[], iconWidth: number): string {
	const lines = titleLines.map(escapeXml).join('<br/>\n<br/>\n');
	return `<div class="song-heading">\n<div class="icon">${songIcon(iconWidth)}</div>\n<h1 class="song-title">${lines}</h1>\n</div>`;
}

function sectionHeading(name: string): string {
	return `<h2 class="section-title">${escapeXml(name)}</h2>`;
}

// One <div> per line: unlike <p>, a div has no default margins, and readers
// that override paragraph spacing (Kobo) leave it alone. Tab blocks are a
// single <pre>, its lines split by newlines; nothing may follow the opening
// tag, since XHTML keeps a leading newline that HTML would drop. With
// `monospace`, the lines are set in the monospace font and keep their spaces.
function content(lines: Line[], monospace: boolean): string {
	const rows = lines
		.map((line) => {
			if (typeof line === 'object') {
				return `<pre class="tab">${line.tab.map(escapeXml).join('\n')}</pre>`;
			}
			return line === ''
				? '<div class="line gap">&#160;</div>'
				: `<div class="line">${escapeXml(line)}</div>`;
		})
		.join('\n');
	return `<div class="${monospace ? 'content mono' : 'content'}">\n${rows}\n</div>`;
}

/** The song title alone, centered on the page, opening the song's chapter. */
export function songTitlePage(
	language: string,
	title: string,
	titleLines: string[],
	iconWidth: number,
): string {
	return page(
		language,
		title,
		'class="page title-page" epub:type="chapter"',
		songHeading(titleLines, iconWidth),
	);
}

/** A section title alone, centered on the page. */
export function sectionTitlePage(language: string, title: string, name: string): string {
	return page(language, title, 'class="page title-page"', sectionHeading(name));
}

/** One section's content on its own page. */
export function sectionContentPage(
	language: string,
	title: string,
	lines: Line[],
	monospace: boolean,
): string {
	return page(language, title, 'class="page content-page"', content(lines, monospace));
}

/** Sections running together, each title followed by its content. */
export function runningPage(
	language: string,
	title: string,
	sections: Section[],
	monospace: boolean,
): string {
	const body = sections.map(
		(section) =>
			`<div class="section">\n${sectionHeading(section.name)}\n${content(section.lines, monospace)}\n</div>`,
	);
	return page(language, title, 'class="song"', body.join('\n'));
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
