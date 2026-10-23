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

// A floret marking group titles: the south west pointing vine leaf (U+1F651)
// from Noto Sans Symbols 2, © Google, SIL Open Font License 1.1.
const GROUP_ICON_PATH = `M90 779Q44 779 22 757Q0 735 0 704Q0 666 32 637Q64 608 120 608Q144 608 168.5 613Q193 618 213 625Q246 584 275.5 545Q305 506 334 462.5Q363 419 395 365Q462 253 494.5 179.5Q527 106 543 62Q548 50 552.5 35.5Q557 21 563.5 10.5Q570 0 579 0Q601 0 625 12Q649 24 669.5 41Q690 58 702.5 75Q715 92 715 102Q715 113 700.5 142Q686 171 665 207Q644 243 622 276Q660 259 702 259Q738 259 769 273Q800 287 819 316.5Q838 346 838 393Q838 458 799 515.5Q760 573 691 616.5Q622 660 533 684.5Q444 709 343 709Q295 709 248 703Q218 731 178 755Q138 779 90 779ZM213 555Q209 555 192 533.5Q175 512 154.5 474Q134 436 119 387Q104 338 104 283Q104 218 127 174Q150 130 188 107Q226 84 271 84Q310 84 340.5 99Q371 114 391.5 135.5Q412 157 422.5 178Q433 199 433 211Q433 217 426.5 230Q420 243 412.5 254Q405 265 402 265Q398 265 390.5 244.5Q383 224 366 201Q352 182 331 169Q310 156 282 156Q245 156 222.5 178.5Q200 201 190 237Q180 273 180 313Q180 371 195.5 415.5Q211 460 226 486.5Q241 513 241 519Q241 522 235.5 531Q230 540 223 547.5Q216 555 213 555ZM660 324Q618 324 565 348Q446 508 301 649H311Q401 649 479.5 630Q558 611 617.5 577Q677 543 711 499Q745 455 745 406Q745 373 726 348.5Q707 324 660 324Z`;

/** Height over width of the group icon. */
export const GROUP_ICON_ASPECT = 779 / 838;

const STYLESHEET_LINKS = STYLESHEETS.map(
	(href) => `<link rel="stylesheet" type="text/css" href="${href}"/>`,
).join('\n');

export function page(
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
 * An ornament from a glyph path, `width` em wide. Kobo's Adobe renderer
 * ignores CSS width and height on inline SVG and uses these attributes;
 * modern.css overrides them for other readers.
 */
function ornament(
	className: string,
	path: string,
	viewWidth: number,
	viewHeight: number,
	width: number,
): string {
	const em = (value: number) => `${Math.round(value * 1000) / 1000}em`;
	const height = (width * viewHeight) / viewWidth;
	return `<svg xmlns="http://www.w3.org/2000/svg" class="${className}" viewBox="0 0 ${viewWidth} ${viewHeight}" width="${em(width)}" height="${em(height)}" fill="#000000" aria-hidden="true"><path d="${path}"/></svg>`;
}

const songIcon = (width: number) => ornament('song-icon', SONG_ICON_PATH, 879, 605, width);
const groupIcon = (width: number) => ornament('group-icon', GROUP_ICON_PATH, 838, 779, width);

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

/**
 * The group title under its floret, `iconWidth` em wide, centered on the
 * page, opening the group's part of the book.
 */
export function groupTitlePage(language: string, title: string, iconWidth: number): string {
	return page(
		language,
		title,
		'class="page title-page" epub:type="part"',
		`<div class="group-heading">\n<div class="icon">${groupIcon(iconWidth)}</div>\n<h1 class="group-title">${escapeXml(title)}</h1>\n</div>`,
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
