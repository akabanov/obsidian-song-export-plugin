import monoFont from '../../assets/mono.ttf';
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
	sectionTitlePage,
	songTitlePage,
} from './pages';
import { bookStylesheet, MONO_STYLESHEET, modernStylesheet, songIconWidth } from './stylesheet';
import { createZip, Deflate, ZipEntry } from './zip';

export interface BookSong {
	title: string;
	titleLines: string[];
	sections: Section[];
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
	/** Each song title gets a page; this gives each section title one too. */
	sectionTitleOwnPage: boolean;
	/** All song content in the monospace font, not only tabs. */
	monospace: boolean;
	songs: BookSong[];
	/** Percent of the reader's font size. */
	textSize: number;
	/** Percent of the content text size, for monospace text. */
	monoTextSize: number;
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
	manifest.push({ id: 'css-mono', href: 'styles/mono.css', mediaType: 'text/css' });
	// An EPUB 3 core media type that Adobe RMSDK (Kobo) also recognizes.
	manifest.push({ id: 'font-mono', href: 'fonts/mono.ttf', mediaType: 'application/vnd.ms-opentype' });
	files.push({ path: 'OEBPS/fonts/mono.ttf', data: monoFont });

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

	const styles = {
		textSize: book.textSize,
		monoTextSize: book.monoTextSize,
		sectionTitleScale: book.sectionTitleScale,
		songTitleScale: book.songTitleScale,
	};
	const iconWidth = songIconWidth(styles);
	book.songs.forEach((song, i) => {
		const songId = `song-${pad(i + 1, 3)}`;
		const songPath = `text/${songId}.xhtml`;
		toc.push({ title: song.title, href: songPath });
		// The song title page holds the inline SVG icon.
		addPage(
			songId,
			songPath,
			songTitlePage(lang, song.title, song.titleLines, iconWidth),
			'svg',
		);

		if (!book.sectionTitleOwnPage) {
			addPage(
				`${songId}-content`,
				`text/${songId}-content.xhtml`,
				runningPage(lang, song.title, song.sections, book.monospace),
			);
			return;
		}

		song.sections.forEach((section, j) => {
			const sectionId = `${songId}-${pad(j + 1, 2)}`;
			const title = `${song.title}: ${section.name}`;
			addPage(
				sectionId,
				`text/${sectionId}.xhtml`,
				sectionTitlePage(lang, title, section.name),
			);
			addPage(
				`${sectionId}-content`,
				`text/${sectionId}-content.xhtml`,
				sectionContentPage(lang, title, section.lines, book.monospace),
			);
		});
	});

	addText('styles/book.css', bookStylesheet(styles));
	addText('styles/modern.css', modernStylesheet(styles));
	addText('styles/mono.css', MONO_STYLESHEET);
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
