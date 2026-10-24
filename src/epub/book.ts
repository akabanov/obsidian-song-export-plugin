import monoFont from '../../assets/mono.ttf';
import { Section } from '../song/sections';
import { imageSize } from './image-size';
import { indexPage } from './index-page';
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
	groupTitlePage,
	runningPage,
	sectionContentPage,
	sectionTitlePage,
	songTitlePage,
} from './pages';
import {
	bookStylesheet,
	groupIconWidth,
	MONO_STYLESHEET,
	modernStylesheet,
	songIconWidth,
} from './stylesheet';
import { createZip, Deflate, ZipEntry } from './zip';

export interface BookSong {
	title: string;
	titleLines: string[];
	sections: Section[];
}

export interface BookGroup {
	title: string;
	songs: BookSong[];
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
	/** Every song once, in book order without groups, in the index with them. */
	songs: BookSong[];
	/**
	 * Songs by group, each group opened by a title page; a song may be in more
	 * than one. The index lists `songs`, linking to each one's first page.
	 * Null: `songs` alone, with no index.
	 */
	groups: BookGroup[] | null;
	/** Percent of the reader's font size. */
	textSize: number;
	/** Percent of the content text size, for monospace text. */
	monoTextSize: number;
	sectionTitleScale: number;
	songTitleScale: number;
	groupTitleScale: number;
}

const COVER_EXTENSIONS: Record<CoverMediaType, string> = {
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/webp': 'webp',
};

const XHTML = 'application/xhtml+xml';

/** The index's title in the book's language, English by default. */
const INDEX_TITLES: Record<string, string> = {
	cs: 'Rejstřík',
	de: 'Register',
	en: 'Index',
	es: 'Índice',
	fr: 'Index',
	it: 'Indice',
	ja: '索引',
	ko: '색인',
	nl: 'Register',
	pl: 'Indeks',
	pt: 'Índice',
	ru: 'Указатель',
	sv: 'Register',
	uk: 'Покажчик',
	zh: '索引',
};

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
		groupTitleScale: book.groupTitleScale,
	};
	const iconWidth = songIconWidth(styles);
	let songCount = 0;
	/** Adds the song's pages and returns the path of its title page. */
	const addSong = (song: BookSong): string => {
		const songId = `song-${pad(++songCount, 3)}`;
		const songPath = `text/${songId}.xhtml`;
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
			return songPath;
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
		return songPath;
	};

	if (book.groups) {
		// The index comes first, after the cover, but links to song pages
		// added below: it is written last and moved to this spine position.
		const indexPosition = spine.length;
		const firstPaths = new Map<BookSong, string>();
		book.groups.forEach((group, i) => {
			const groupId = `group-${pad(i + 1, 2)}`;
			const groupPath = `text/${groupId}.xhtml`;
			// The group title page holds the inline SVG floret.
			addPage(
				groupId,
				groupPath,
				groupTitlePage(lang, group.title, groupIconWidth(styles)),
				'svg',
			);
			const children = group.songs.map((song) => {
				const href = addSong(song);
				if (!firstPaths.has(song)) firstPaths.set(song, href);
				return { title: song.title, href };
			});
			toc.push({ title: group.title, href: groupPath, children });
		});

		const indexTitle = INDEX_TITLES[lang] ?? 'Index';
		const entries = book.songs.flatMap((song) => {
			const path = firstPaths.get(song);
			// Paths relative to the index page, which is in text/ too.
			return path ? [{ title: song.title, href: path.replace(/^text\//, '') }] : [];
		});
		addPage('index', 'text/index.xhtml', indexPage(lang, indexTitle, entries));
		spine.splice(indexPosition, 0, ...spine.splice(-1));
		toc.unshift({ title: indexTitle, href: 'text/index.xhtml' });
	} else {
		for (const song of book.songs) toc.push({ title: song.title, href: addSong(song) });
	}

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
