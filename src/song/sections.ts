/** Consecutive tab lines, kept verbatim to be shown in a monospace font. */
export interface TabBlock {
	tab: string[];
}

/** A text line, empty for a gap, or a block of tab lines. */
export type Line = string | TabBlock;

export interface Section {
	name: string;
	lines: Line[];
}

const SECTION_HEADER = /^\s*\[([^[\]]+)\]\s*$/;
const LINE_END_HINTS = /(^|\s+)(%[A-Za-z]\s*)+$/;
const DASH_LINE = /^-{2,}$/;
const TAB_LINE = /^[A-Ga-g][#b]?\|/;

/**
 * Returns the section name if `line` is a section header such as `[Verse 2]`,
 * otherwise null. A header whose name is only whitespace is a regular line.
 */
export function parseSectionHeader(line: string): string | null {
	const name = SECTION_HEADER.exec(line)?.[1]?.trim();
	return name ? name : null;
}

/**
 * Splits song content into sections and pre-processes each one. Text before
 * the first section header is discarded, and so are sections left empty.
 */
export function parseSections(content: string): Section[] {
	const sections: { name: string; lines: string[] }[] = [];
	let current: { name: string; lines: string[] } | null = null;
	for (const line of content.split(/\r\n|\r|\n/)) {
		const name = parseSectionHeader(line);
		if (name !== null) {
			current = { name, lines: [] };
			sections.push(current);
		} else if (current) {
			current.lines.push(line);
		}
	}
	return sections
		.map((section) => ({
			name: section.name,
			lines: preprocessSection(section.lines),
		}))
		.filter((section) => section.lines.length > 0);
}

/** Applies the section pre-processing steps from SPEC.md, in order. */
export function preprocessSection(lines: string[]): Line[] {
	const kept: Line[] = [];
	for (const raw of lines) {
		const line = raw.trim().replace(LINE_END_HINTS, '');
		if (DASH_LINE.test(line)) continue;
		if (TAB_LINE.test(line)) {
			const previous = kept[kept.length - 1];
			if (typeof previous === 'object') previous.tab.push(line);
			else kept.push({ tab: [line] });
			continue;
		}
		kept.push(line.replace(/\s+/g, ' '));
	}

	const result: Line[] = [];
	for (const line of kept) {
		const isGap = line === '';
		if (isGap && (result.length === 0 || result[result.length - 1] === '')) {
			continue;
		}
		result.push(line);
	}
	if (result[result.length - 1] === '') result.pop();
	return result;
}
