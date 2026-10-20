import { extractCodeBlocks } from './code-blocks';
import { parseSections, Section } from './sections';

export interface Song {
	title: string;
	sections: Section[];
}

export type ParseResult =
	| { kind: 'song'; song: Song }
	| { kind: 'skipped'; reason: string }
	| { kind: 'not-a-song' };

/**
 * Parses a note into a song. Notes without a code block named `blockName`
 * aren't songs; songs with no non-empty sections are skipped. With
 * `keepSpacing`, lines keep their whitespace (see `parseSections`).
 */
export function parseSong(
	title: string,
	markdown: string,
	blockName: string,
	keepSpacing = false,
): ParseResult {
	const blocks = extractCodeBlocks(markdown, blockName);
	if (blocks.length === 0) return { kind: 'not-a-song' };

	const sections = parseSections(blocks.join('\n'), keepSpacing);
	if (sections.length === 0) {
		return {
			kind: 'skipped',
			reason: 'no sections with content',
		};
	}
	return { kind: 'song', song: { title, sections } };
}

/**
 * Splits a song title into display lines at the first occurrence of
 * `separator`. Returns a single line when the separator is empty, missing,
 * or would leave one of the lines empty.
 */
export function splitTitle(title: string, separator: string): string[] {
	const at = separator ? title.indexOf(separator) : -1;
	if (at < 0) return [title];
	const first = title.slice(0, at).trim();
	const second = title.slice(at + separator.length).trim();
	return first && second ? [first, second] : [title];
}

/** Orders songs by title: case-insensitive and locale-aware. */
export function compareSongTitles(a: string, b: string): number {
	return a.localeCompare(b, undefined, { sensitivity: 'accent' });
}
