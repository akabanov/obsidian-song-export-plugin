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
