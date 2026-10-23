/**
 * Splits a comma-separated list typed in the settings. Items are trimmed but
 * may contain spaces.
 */
export function parseCommaList(text: string): string[] {
	return text
		.split(',')
		.map((item) => item.trim())
		.filter((item) => item !== '');
}

/** Where the item being typed starts: after the last comma and spaces. */
function lastItemStart(text: string): number {
	const comma = text.lastIndexOf(',') + 1;
	return comma + (text.slice(comma).length - text.slice(comma).trimStart().length);
}

/** Replaces the item being typed with `value`, ready for the next one. */
export function completeCommaList(text: string, value: string): string {
	const start = lastItemStart(text);
	const separator = start > 0 && !/\s$/.test(text.slice(0, start)) ? ' ' : '';
	return `${text.slice(0, start)}${separator}${value}, `;
}

/**
 * Values worth suggesting for `text`: those containing the item being typed,
 * ignoring case, that aren't in the list already.
 */
export function suggestListItems(values: string[], text: string): string[] {
	const start = lastItemStart(text);
	const query = text.slice(start).toLowerCase();
	const listed = new Set(parseCommaList(text.slice(0, start)).map((item) => item.toLowerCase()));
	return values.filter((value) => {
		const name = value.toLowerCase();
		return name.includes(query) && !listed.has(name);
	});
}

/** Every value in `lists`, once each ignoring case, sorted. */
export function uniqueSorted(lists: string[][]): string[] {
	const names = new Map<string, string>();
	for (const list of lists) {
		for (const value of list) {
			if (!names.has(value.toLowerCase())) names.set(value.toLowerCase(), value);
		}
	}
	return [...names.values()].sort((a, b) => a.localeCompare(b));
}
