/**
 * Splits a tag list typed in the settings at commas and whitespace. A leading
 * # is optional. Tags are lowercased, since Obsidian matches them ignoring case.
 */
export function parseTagList(text: string): string[] {
	return text
		.split(/[\s,]+/)
		.map((tag) => tag.replace(/^#+/, '').toLowerCase())
		.filter((tag) => tag !== '');
}

/**
 * Whether one of `tags` (as Obsidian lists them, with a leading #) is one of
 * `excluded` or nested under one: `template` also matches `template/song`.
 */
export function hasExcludedTag(tags: string[], excluded: string[]): boolean {
	return tags.some((tag) => {
		const name = tag.replace(/^#/, '').toLowerCase();
		return excluded.some((ex) => name === ex || name.startsWith(`${ex}/`));
	});
}

/** The tag being typed: the text after the last comma or whitespace. */
export function lastTagToken(text: string): string {
	return text.slice(text.search(/[^\s,]*$/));
}

/** Replaces the tag being typed with `tag`, ready for the next one. */
export function completeTagList(text: string, tag: string): string {
	return `${text.slice(0, text.search(/[^\s,]*$/))}${tag}, `;
}

/**
 * Tags worth suggesting for `text`: those containing the tag being typed
 * (ignoring case and a leading #) that aren't in the list already.
 */
export function suggestTags(vaultTags: string[], text: string): string[] {
	const query = lastTagToken(text).replace(/^#+/, '').toLowerCase();
	const listed = new Set(parseTagList(text.slice(0, text.length - lastTagToken(text).length)));
	return vaultTags.filter((tag) => {
		const name = tag.toLowerCase();
		return name.includes(query) && !listed.has(name);
	});
}

/**
 * Every tag in `tagLists` (as Obsidian lists them, with a leading #) and every
 * parent of a nested one, without the #, once each ignoring case, sorted.
 */
export function collectTagNames(tagLists: string[][]): string[] {
	const names = new Map<string, string>();
	for (const tags of tagLists) {
		for (const tag of tags) {
			const parts = tag.replace(/^#/, '').split('/');
			for (let i = 1; i <= parts.length; i++) {
				const name = parts.slice(0, i).join('/');
				if (!names.has(name.toLowerCase())) names.set(name.toLowerCase(), name);
			}
		}
	}
	return [...names.values()].sort((a, b) => a.localeCompare(b));
}
