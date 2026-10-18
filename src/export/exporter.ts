import { App, normalizePath, Notice } from 'obsidian';
import { DEFAULT_COVER, detectImageType } from '../cover';
import { BookCover, buildEpub } from '../epub/book';
import { DEFAULT_SETTINGS, SongbookMakerSettings } from '../settings';
import { confirm } from '../ui/confirm-modal';
import { errorMessage } from '../utils/errors';
import { expandHome, isFilesystemPath } from '../utils/paths';
import { collectSongs } from './collect';
import { NodeApis, nodeApis } from './node';

/**
 * Runs the export described in SPEC.md, reporting progress and the result in
 * notices. Returns without writing anything if the user cancels.
 */
export async function exportSongs(
	app: App,
	settings: SongbookMakerSettings,
): Promise<void> {
	let node: NodeApis;
	let target: string;
	try {
		node = nodeApis();
		target = outputPath(node, settings.outputFile || DEFAULT_SETTINGS.outputFile);
	} catch (error) {
		new Notice(`Songbook export failed: ${errorMessage(error)}`);
		return;
	}

	if (node.fs.existsSync(target)) {
		const overwrite = await confirm(
			app,
			'Overwrite songbook?',
			`${target} already exists. Replace it with a new export?`,
			'Overwrite',
		);
		if (!overwrite) return;
	}

	const progress = new Notice('Exporting songs…', 0);
	try {
		const { songs, skipped } = await collectSongs(
			app.vault,
			settings.songsDirectory,
			settings.codeBlockName || DEFAULT_SETTINGS.codeBlockName,
			settings.titleSplitSequence,
		);
		for (const song of skipped) {
			console.warn(`Songbook Maker: skipped ${song.path}: ${song.reason}`);
		}
		if (songs.length === 0) {
			throw new Error(
				`No songs found in ${settings.songsDirectory || 'the vault'}` +
					(skipped.length > 0 ? ` (${skipped.length} skipped)` : ''),
			);
		}

		const epub = buildEpub(
			{
				id: settings.bookId,
				title: settings.bookTitle || DEFAULT_SETTINGS.bookTitle,
				author: settings.bookAuthor,
				language: settings.bookLanguage,
				modified: new Date(),
				cover: await loadCover(app, node, settings),
				layout: {
					songTitleOwnPage: settings.songTitleOwnPage,
					sectionTitleOwnPage: settings.sectionTitleOwnPage,
				},
				songs,
				sectionTitleScale: settings.sectionTitleScale,
				songTitleScale: settings.songTitleScale,
			},
			(data) => node.zlib.deflateRawSync(data),
		);
		await writeAtomically(node, target, epub);

		progress.hide();
		new Notice(
			`Exported ${count(songs.length, 'song')} to ${target}` +
				(skipped.length > 0
					? `. Skipped ${skipped.length}; see the developer console.`
					: '.'),
		);
		if (settings.showInFolder) showInFolder(node, target);
	} catch (error) {
		progress.hide();
		console.error('Songbook Maker:', error);
		new Notice(`Songbook export failed: ${errorMessage(error)}`, 10000);
	}
}

function outputPath(node: NodeApis, setting: string): string {
	const path = expandHome(setting, node.os.homedir());
	if (!node.path.isAbsolute(path)) {
		throw new Error(`The output file must be an absolute path: ${setting}`);
	}
	return node.path.normalize(path);
}

async function loadCover(
	app: App,
	node: NodeApis,
	settings: SongbookMakerSettings,
): Promise<BookCover | null> {
	if (settings.coverImage === 'none') return null;
	if (settings.coverImage === 'default') return DEFAULT_COVER;

	const setting = settings.coverImagePath;
	if (!setting) throw new Error('No cover image path is set');
	let bytes: Uint8Array;
	try {
		bytes = isFilesystemPath(setting)
			? await node.fs.promises.readFile(expandHome(setting, node.os.homedir()))
			: new Uint8Array(await app.vault.adapter.readBinary(normalizePath(setting)));
	} catch (error) {
		throw new Error(`Couldn't read the cover image ${setting}: ${errorMessage(error)}`);
	}
	const mediaType = detectImageType(bytes);
	if (!mediaType) {
		throw new Error(`The cover image must be JPEG, PNG or WebP: ${setting}`);
	}
	return { bytes, mediaType };
}

/**
 * Writes to a temporary file next to the target and renames it over the
 * target, so a failed export never leaves a partial book behind.
 */
async function writeAtomically(
	node: NodeApis,
	target: string,
	data: Uint8Array,
): Promise<void> {
	const { fs, path } = node;
	const dir = path.dirname(target);
	await fs.promises.mkdir(dir, { recursive: true });
	const temp = path.join(
		dir,
		`.${path.basename(target)}.${Date.now().toString(36)}.tmp`,
	);
	try {
		await fs.promises.writeFile(temp, data);
		await fs.promises.rename(temp, target);
	} catch (error) {
		await fs.promises.rm(temp, { force: true }).catch(() => undefined);
		throw error;
	}
}

/** Best effort: the book is already written, so a failure only warns. */
function showInFolder(node: NodeApis, target: string): void {
	try {
		node.showItemInFolder(target);
	} catch (error) {
		console.warn('Songbook Maker: could not show the book in its folder:', error);
	}
}

function count(n: number, noun: string): string {
	return `${n} ${noun}${n === 1 ? '' : 's'}`;
}
