import { Section } from '../song/sections';
import { imageSize } from './image-size';
import {
	CONTAINER_XML,
	ManifestItem,
	navDocument,
	ncxDocument,
	packageDocument,
	TocEntry,
} from './package';
import {
	coverPage,
	runningPage,
	sectionContentPage,
	sectionHeading,
	songHeading,
	titlePage,
} from './pages';
import { bookStylesheet, modernStylesheet, songIconWidth } from './stylesheet';
import { createZip, Deflate, ZipEntry } from './zip';

export interface BookSong {
	title: string;
	titleLines: string[];
	sections: Section[];
}

/** Which titles get a page to themselves. Every song starts on a new page. */
export interface PageLayout {
	songTitleOwnPage: boolean;
	sectionTitleOwnPage: boolean;
}

export type CoverMediaType = 'image/jpeg' | 'image/png' | 'image/webp';

export interface BookCover {
	bytes: Uint8Array;
	mediaType: CoverMediaType;
}

export interface Book {
	id: string;
	title: string;
	author: string;
	language: string;
	modified: Date;
	cover: BookCover | null;
	layout: PageLayout;
	songs: BookSong[];
	sectionTitleScale: number;
	songTitleScale: number;
}

const COVER_EXTENSIONS: Record<CoverMediaType, string> = {
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/webp': 'webp',
};

const XHTML = 'application/xhtml+xml';

/** Builds the EPUB 3 file (with an EPUB 2 NCX) for the book. */
export function buildEpub(book: Book, deflate: Deflate): Uint8Array {
	const encoder = new TextEncoder();
	const files: ZipEntry[] = [];
	const manifest: ManifestItem[] = [];
	const spine: string[] = [];
	const toc: TocEntry[] = [];
	const lang = book.language;

	const addText = (path: string, text: string) =>
		files.push({ path: `OEBPS/${path}`, data: encoder.encode(text) });
	const addPage = (id: string, path: string, xhtml: string, properties?: string) => {
		addText(path, xhtml);
		manifest.push({ id, href: path, mediaType: XHTML, properties });
		spine.push(id);
	};

	manifest.push({ id: 'nav', href: 'nav.xhtml', mediaType: XHTML, properties: 'nav' });
	manifest.push({ id: 'ncx', href: 'toc.ncx', mediaType: 'application/x-dtbncx+xml' });
	manifest.push({ id: 'css', href: 'styles/book.css', mediaType: 'text/css' });
	manifest.push({ id: 'css-modern', href: 'styles/modern.css', mediaType: 'text/css' });

	let coverImageId: string | null = null;
	if (book.cover) {
		coverImageId = 'cover-image';
		const image = `images/cover.${COVER_EXTENSIONS[book.cover.mediaType]}`;
		files.push({ path: `OEBPS/${image}`, data: book.cover.bytes, compress: false });
		manifest.push({
			id: coverImageId,
			href: image,
			mediaType: book.cover.mediaType,
			properties: 'cover-image',
		});
		const size = imageSize(book.cover.bytes, book.cover.mediaType);
		addPage(
			'cover',
			'text/cover.xhtml',
			coverPage(lang, book.title, image, size),
			size ? 'svg' : undefined,
		);
	}

	const { songTitleOwnPage, sectionTitleOwnPage } = book.layout;
	const scales = {
		sectionTitleScale: book.sectionTitleScale,
		songTitleScale: book.songTitleScale,
	};
	const iconWidth = songIconWidth(scales);
	book.songs.forEach((song, i) => {
		const songId = `song-${pad(i + 1, 3)}`;
		const songPath = `text/${songId}.xhtml`;
		toc.push({ title: song.title, href: songPath });
		const heading = songHeading(song.titleLines, false, iconWidth);
		const ownPageHeading = songHeading(song.titleLines, true, iconWidth);
		// Pages with the song heading hold the inline SVG icon.
		const addSongPage = (xhtml: string) => addPage(songId, songPath, xhtml, 'svg');

		if (!sectionTitleOwnPage) {
			if (songTitleOwnPage) {
				addSongPage(titlePage(lang, song.title, ownPageHeading, true));
				addPage(
					`${songId}-content`,
					`text/${songId}-content.xhtml`,
					runningPage(lang, song.title, song.sections, null),
				);
			} else {
				addSongPage(runningPage(lang, song.title, song.sections, heading));
			}
			return;
		}

		if (songTitleOwnPage) addSongPage(titlePage(lang, song.title, ownPageHeading, true));
		song.sections.forEach((section, j) => {
			const sectionId = `${songId}-${pad(j + 1, 2)}`;
			const title = `${song.title}: ${section.name}`;
			if (j === 0 && !songTitleOwnPage) {
				// The song title shares the first section title's page.
				addSongPage(
					titlePage(lang, song.title, `${heading}\n${sectionHeading(section.name)}`, true),
				);
			} else {
				addPage(
					sectionId,
					`text/${sectionId}.xhtml`,
					titlePage(lang, title, sectionHeading(section.name), false),
				);
			}
			addPage(
				`${sectionId}-content`,
				`text/${sectionId}-content.xhtml`,
				sectionContentPage(lang, title, section.lines),
			);
		});
	});

	addText(
		'styles/book.css',
		bookStylesheet(scales),
	);
	addText('styles/modern.css', modernStylesheet(scales));
	addText('nav.xhtml', navDocument(lang, book.title, toc));
	addText('toc.ncx', ncxDocument(book.id, book.title, toc));
	addText(
		'content.opf',
		packageDocument({
			id: book.id,
			title: book.title,
			author: book.author,
			language: lang,
			modified: book.modified,
			coverImageId,
			manifest,
			spine,
		}),
	);

	return createZip(
		[
			{ path: 'mimetype', data: encoder.encode('application/epub+zip'), compress: false },
			{ path: 'META-INF/container.xml', data: encoder.encode(CONTAINER_XML) },
			...files,
		],
		deflate,
		book.modified,
	);
}

function pad(n: number, width: number): string {
	return String(n).padStart(width, '0');
}
