import { page } from './pages';
import { escapeXml } from './xml';

export interface IndexEntry {
	title: string;
	href: string;
}

export interface IndexSection {
	/** The initial letter, or # for titles that don't start with one. */
	letter: string;
	entries: IndexEntry[];
}

/** A title's initial letter, uppercase and without accents, or #. */
function initial(title: string, language: string): string {
	const first = [...title.trim()][0] ?? '';
	if (!/\p{L}/u.test(first)) return '#';
	const letter = first.toLocaleUpperCase(language);
	// É files under E, but a letter of its own in the language, such as
	// Russian Й, keeps its mark.
	const base = letter.normalize('NFD').replace(/\p{M}/gu, '');
	return base && sameLetter(base, letter, language) ? base : letter;
}

function sameLetter(a: string, b: string, language: string): boolean {
	return a.localeCompare(b, language, { sensitivity: 'base' }) === 0;
}

/**
 * Splits `entries` (in title order) by initial letter, as in a printed
 * index. Titles starting with a digit or a symbol go under #.
 */
export function indexSections(entries: IndexEntry[], language: string): IndexSection[] {
	const sections: IndexSection[] = [];
	for (const entry of entries) {
		const letter = initial(entry.title, language);
		const last = sections[sections.length - 1];
		if (last && sameLetter(last.letter, letter, language)) {
			last.entries.push(entry);
		} else {
			sections.push({ letter, entries: [entry] });
		}
	}
	return sections;
}

/** Every song, alphabetically under its initial letter, linking to it. */
export function indexPage(language: string, title: string, entries: IndexEntry[]): string {
	const sections = indexSections(entries, language).map((section) => {
		const links = section.entries.map(
			(entry) =>
				`<div class="index-entry"><a href="${escapeXml(entry.href)}">${escapeXml(entry.title)}</a></div>`,
		);
		return `<div class="index-section">\n<h2 class="index-letter">${escapeXml(section.letter)}</h2>\n${links.join('\n')}\n</div>`;
	});
	return page(
		language,
		title,
		'class="index" epub:type="index"',
		`<h1 class="index-title">${escapeXml(title)}</h1>\n${sections.join('\n')}`,
	);
}
