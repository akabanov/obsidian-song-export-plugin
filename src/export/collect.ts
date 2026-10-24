import { App, getAllTags, normalizePath, TFile, TFolder } from 'obsidian';
import { compareSongTitles, parseSong, splitTitle } from '../song/song';
import { hasExcludedTag } from '../utils/tags';
import { GroupedSong, propertyValues } from './groups';

export interface SkippedSong {
	path: string;
	reason: string;
}

export interface CollectedSongs {
	songs: GroupedSong[];
	skipped: SkippedSong[];
}

export interface CollectOptions {
	directory: string;
	/** Info strings of the code blocks that hold song content. */
	blockNames: string[];
	titleSplitSequence: string;
	/** Notes with one of these tags, or a tag nested under one, are left out. */
	excludedTags: string[];
	/** Frontmatter property whose values are each song's groups. */
	groupProperty: string;
	/** Keep the whitespace in song lines, for a monospace font. */
	keepSpacing: boolean;
}

/**
 * Reads every song note under `options.directory` (recursively), in title
 * order.
 */
export async function collectSongs(app: App, options: CollectOptions): Promise<CollectedSongs> {
	const { vault, metadataCache } = app;
	const root = normalizePath(options.directory || '/');
	let files: TFile[];
	if (root === '/') {
		files = vault.getMarkdownFiles();
	} else {
		if (!(vault.getAbstractFileByPath(root) instanceof TFolder)) {
			throw new Error(`Songs directory not found: ${root}`);
		}
		files = vault.getMarkdownFiles().filter((f) => f.path.startsWith(`${root}/`));
	}

	const songs: GroupedSong[] = [];
	const skipped: SkippedSong[] = [];
	for (const file of files) {
		const cache = metadataCache.getFileCache(file);
		const tags = cache ? (getAllTags(cache) ?? []) : [];
		if (hasExcludedTag(tags, options.excludedTags)) continue;

		const result = parseSong(
			file.basename,
			await vault.cachedRead(file),
			options.blockNames,
			options.keepSpacing,
		);
		if (result.kind === 'skipped') {
			skipped.push({ path: file.path, reason: result.reason });
		} else if (result.kind === 'song') {
			songs.push({
				...result.song,
				titleLines: splitTitle(result.song.title, options.titleSplitSequence),
				groups: propertyValues(cache?.frontmatter, options.groupProperty),
			});
		}
	}
	songs.sort((a, b) => compareSongTitles(a.title, b.title));
	return { songs, skipped };
}
