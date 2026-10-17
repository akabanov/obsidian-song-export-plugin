import { FontFile, fontFileStem } from '../fonts/catalog';
import { Section } from '../song/sections';
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
	sectionContentPage,
	sectionTitlePage,
	songPage,
	songTitlePage,
} from './pages';
import { stylesheet } from './stylesheet';
import { createZip, Deflate, ZipEntry } from './zip';

export interface BookSong {
	title: string;
	titleLines: string[];
	sections: Section[];
}

/**
 * `cards`: flash-card-like, every title and every section's content on its own
 * page. `book`: each song starts on a new page, titles and content run on.
 */
export type PageLayout = 'cards' | 'book';

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
	titleFont: string;
	contentFont: string;
	/** Every font file the stylesheet uses. */
	fonts: FontFile[];
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

	for (const font of book.fonts) {
		const stem = fontFileStem(font.family, font.weight);
		const name = `${stem}.${font.format}`;
		files.push({ path: `OEBPS/fonts/${name}`, data: new Uint8Array(font.bytes) });
		manifest.push({
			id: `font-${stem}`,
			href: `fonts/${name}`,
			mediaType: font.format === 'ttf' ? 'font/ttf' : 'font/woff2',
		});
	}

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
		addPage('cover', 'text/cover.xhtml', coverPage(lang, book.title, image));
	}

	book.songs.forEach((song, i) => {
		const songId = `song-${pad(i + 1, 3)}`;
		const songPath = `text/${songId}.xhtml`;
		toc.push({ title: song.title, href: songPath });
		if (book.layout === 'book') {
			addPage(
				songId,
				songPath,
				songPage(lang, song.title, song.titleLines, song.sections),
				'svg',
			);
			return;
		}

		addPage(songId, songPath, songTitlePage(lang, song.title, song.titleLines), 'svg');

		song.sections.forEach((section, j) => {
			const sectionId = `${songId}-${pad(j + 1, 2)}`;
			addPage(
				sectionId,
				`text/${sectionId}.xhtml`,
				sectionTitlePage(lang, song.title, section.name),
			);
			addPage(
				`${sectionId}-content`,
				`text/${sectionId}-content.xhtml`,
				sectionContentPage(lang, song.title, section.name, section.lines),
			);
		});
	});

	addText(
		'styles/book.css',
		stylesheet({
			fonts: book.fonts.map((font) => ({
				family: font.family,
				weight: font.weight,
				href: `../fonts/${fontFileStem(font.family, font.weight)}.${font.format}`,
				format: font.format === 'ttf' ? 'truetype' : 'woff2',
			})),
			titleFont: book.titleFont,
			contentFont: book.contentFont,
			sectionTitleScale: book.sectionTitleScale,
			songTitleScale: book.songTitleScale,
		}),
	);
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
