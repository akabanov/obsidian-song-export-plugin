import { normalizePath, TFile, TFolder, Vault } from 'obsidian';
import { BookSong } from '../epub/book';
import { compareSongTitles, parseSong, splitTitle } from '../song/song';

export interface SkippedSong {
	path: string;
	reason: string;
}

export interface CollectedSongs {
	songs: BookSong[];
	skipped: SkippedSong[];
}

/**
 * Reads every song note under `directory` (recursively), in title order.
 */
export async function collectSongs(
	vault: Vault,
	directory: string,
	blockName: string,
	titleSplitSequence: string,
): Promise<CollectedSongs> {
	const root = normalizePath(directory || '/');
	let files: TFile[];
	if (root === '/') {
		files = vault.getMarkdownFiles();
	} else {
		if (!(vault.getAbstractFileByPath(root) instanceof TFolder)) {
			throw new Error(`Songs directory not found: ${root}`);
		}
		files = vault.getMarkdownFiles().filter((f) => f.path.startsWith(`${root}/`));
	}

	const songs: BookSong[] = [];
	const skipped: SkippedSong[] = [];
	for (const file of files) {
		const result = parseSong(file.basename, await vault.cachedRead(file), blockName);
		if (result.kind === 'skipped') {
			skipped.push({ path: file.path, reason: result.reason });
		} else if (result.kind === 'song') {
			songs.push({
				...result.song,
				titleLines: splitTitle(result.song.title, titleSplitSequence),
			});
		}
	}
	songs.sort((a, b) => compareSongTitles(a.title, b.title));
	return { songs, skipped };
}
