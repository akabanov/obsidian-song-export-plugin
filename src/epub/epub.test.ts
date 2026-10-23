import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { deflateRawSync, inflateRawSync } from 'node:zlib';
import { DEFAULT_COVER } from '../cover';
import { Book, buildEpub } from './book';
import { indexSections } from './index-page';
import { escapeXml } from './xml';
import { createZip, crc32 } from './zip';

const deflate = (data: Uint8Array) => new Uint8Array(deflateRawSync(data));
const decoder = new TextDecoder();

interface ReadEntry {
	path: string;
	method: number;
	data: Uint8Array;
}

/** Reads a ZIP through its central directory, checking every CRC. */
function readZip(zip: Uint8Array): ReadEntry[] {
	const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
	const end = zip.length - 22;
	assert.equal(view.getUint32(end, true), 0x06054b50);
	const count = view.getUint16(end + 10, true);
	let pos = view.getUint32(end + 16, true);
	const entries: ReadEntry[] = [];
	for (let i = 0; i < count; i++) {
		assert.equal(view.getUint32(pos, true), 0x02014b50);
		const method = view.getUint16(pos + 10, true);
		const crc = view.getUint32(pos + 16, true);
		const size = view.getUint32(pos + 24, true);
		const nameLength = view.getUint16(pos + 28, true);
		const offset = view.getUint32(pos + 42, true);
		const path = decoder.decode(zip.subarray(pos + 46, pos + 46 + nameLength));
		pos += 46 + nameLength;

		assert.equal(view.getUint32(offset, true), 0x04034b50);
		const localName = view.getUint16(offset + 26, true);
		const localExtra = view.getUint16(offset + 28, true);
		const start = offset + 30 + localName + localExtra;
		const stored = zip.subarray(start, start + view.getUint32(offset + 18, true));
		const data = method === 8 ? new Uint8Array(inflateRawSync(stored)) : stored;
		assert.equal(data.length, size, path);
		assert.equal(crc32(data), crc, path);
		entries.push({ path, method, data });
	}
	return entries;
}

function textOf(entries: ReadEntry[], path: string): string {
	const entry = entries.find((e) => e.path === path);
	assert.ok(entry, `missing ${path}`);
	return decoder.decode(entry.data);
}

const BOOK: Book = {
	id: '6f1c2a52-8d0e-4c51-9b7e-0d3c2b1a9f00',
	title: 'My Songbook',
	author: 'Obsidian',
	language: 'en',
	modified: new Date('2026-10-17T12:34:56.789Z'),
	cover: { bytes: new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]), mediaType: 'image/jpeg' },
	sectionTitleOwnPage: true,
	monospace: false,
	songs: [
		{
			title: 'Armstrong - What a Wonderful World',
			titleLines: ['Armstrong', 'What a Wonderful World'],
			sections: [
				{ name: 'Verse 1', lines: ['C Em', 'I see trees of green', '', 'F <Em>'] },
				{ name: 'Chorus', lines: ['G', { tab: ['e|-<0>-|', 'B|--1--|'] }] },
			],
		},
		{
			title: 'Tom & Jerry',
			titleLines: ['Tom & Jerry'],
			sections: [{ name: 'Intro', lines: ['A'] }],
		},
	],
	groups: null,
	textSize: 80,
	monoTextSize: 70,
	sectionTitleScale: 2,
	songTitleScale: 1.5,
	groupTitleScale: 1.25,
};

describe('crc32', () => {
	it('matches the standard check value', () => {
		assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926);
	});
});

describe('createZip', () => {
	it('round-trips stored and deflated entries in order', () => {
		const text = new TextEncoder().encode('hello '.repeat(100));
		const zip = createZip(
			[
				{ path: 'a.txt', data: text, compress: false },
				{ path: 'dir/b.txt', data: text },
				{ path: 'empty', data: new Uint8Array() },
			],
			deflate,
			new Date(2026, 9, 17, 20, 4, 0),
		);
		const entries = readZip(zip);
		assert.deepEqual(
			entries.map((e) => [e.path, e.method]),
			[
				['a.txt', 0],
				['dir/b.txt', 8],
				['empty', 0],
			],
		);
		assert.deepEqual(entries[1]?.data, text);
	});
});

describe('escapeXml', () => {
	it('escapes markup and drops invalid control characters', () => {
		assert.equal(escapeXml(`<a href="x">Tom & 'J'</a>\u0007`), '&lt;a href=&quot;x&quot;&gt;Tom &amp; &apos;J&apos;&lt;/a&gt;');
	});
});

describe('buildEpub', () => {
	const entries = readZip(buildEpub(BOOK, deflate));
	const opf = textOf(entries, 'OEBPS/content.opf');

	it('starts with an uncompressed mimetype entry', () => {
		assert.equal(entries[0]?.path, 'mimetype');
		assert.equal(entries[0]?.method, 0);
		assert.equal(decoder.decode(entries[0]?.data), 'application/epub+zip');
		assert.match(textOf(entries, 'META-INF/container.xml'), /full-path="OEBPS\/content.opf"/);
	});

	it('writes the metadata', () => {
		assert.match(opf, /<dc:identifier id="book-id">urn:uuid:6f1c2a52-8d0e-4c51-9b7e-0d3c2b1a9f00</);
		assert.match(opf, /<dc:title>My Songbook<\/dc:title>/);
		assert.match(opf, /<dc:creator>Obsidian<\/dc:creator>/);
		assert.match(opf, /<dc:language>en<\/dc:language>/);
		assert.match(opf, /<meta property="dcterms:modified">2026-10-17T12:34:56Z<\/meta>/);
		assert.match(opf, /<meta name="cover" content="cover-image"\/>/);
	});

	it('omits the creator when the author is empty', () => {
		const book = { ...BOOK, author: '' };
		const opf = textOf(readZip(buildEpub(book, deflate)), 'OEBPS/content.opf');
		assert.doesNotMatch(opf, /dc:creator/);
	});

	it('puts the cover, then each song and its sections in the spine', () => {
		const spine = [...opf.matchAll(/<itemref idref="([^"]+)"/g)].map((m) => m[1]);
		assert.deepEqual(spine, [
			'cover',
			'song-001',
			'song-001-01',
			'song-001-01-content',
			'song-001-02',
			'song-001-02-content',
			'song-002',
			'song-002-01',
			'song-002-01-content',
		]);
		assert.match(
			opf,
			/<item id="cover-image" href="images\/cover.jpg" media-type="image\/jpeg" properties="cover-image"\/>/,
		);
		assert.match(opf, /<item id="song-001" href="text\/song-001.xhtml" media-type="application\/xhtml\+xml" properties="svg"\/>/);
	});

	it('has no cover when there is none', () => {
		const entries = readZip(buildEpub({ ...BOOK, cover: null }, deflate));
		const opf = textOf(entries, 'OEBPS/content.opf');
		assert.doesNotMatch(opf, /cover/);
		assert.ok(!entries.some((e) => e.path.includes('cover')));
	});

	it('lists only song titles in both tables of contents', () => {
		const nav = textOf(entries, 'OEBPS/nav.xhtml');
		const navLinks = [...nav.matchAll(/<a href="([^"]+)">([^<]+)</g)].map((m) => [m[1], m[2]]);
		assert.deepEqual(navLinks, [
			['text/song-001.xhtml', 'Armstrong - What a Wonderful World'],
			['text/song-002.xhtml', 'Tom &amp; Jerry'],
		]);
		const ncx = textOf(entries, 'OEBPS/toc.ncx');
		assert.equal([...ncx.matchAll(/<navPoint /g)].length, 2);
		assert.match(ncx, /<meta name="dtb:uid" content="urn:uuid:6f1c2a52/);
	});

	it('renders the song title on two lines', () => {
		const page = textOf(entries, 'OEBPS/text/song-001.xhtml');
		assert.match(page, /<h1 class="song-title">Armstrong<br\/>\n<br\/>\nWhat a Wonderful World<\/h1>/);
		assert.match(page, /<svg [^>]*viewBox="0 0 879 605" width="7.68em" height="5.286em"/);
		assert.match(page, /<path d="M[\d .MQZ]+"\/><\/svg>/);
		assert.match(page, /<body class="page title-page" epub:type="chapter">/);
		assert.match(page, /<svg /);
		assert.match(page, /xml:lang="en"/);
	});

	it('renders section titles and escaped content lines with gaps', () => {
		assert.match(
			textOf(entries, 'OEBPS/text/song-001-01.xhtml'),
			/<h2 class="section-title">Verse 1<\/h2>/,
		);
		const content = textOf(entries, 'OEBPS/text/song-001-01-content.xhtml');
		assert.match(
			content,
			/<div class="line">C Em<\/div>\n<div class="line">I see trees of green<\/div>\n<div class="line gap">&#160;<\/div>\n<div class="line">F &lt;Em&gt;<\/div>/,
		);
	});

	it('renders a tab block as one escaped pre', () => {
		assert.match(
			textOf(entries, 'OEBPS/text/song-001-02-content.xhtml'),
			/<div class="line">G<\/div>\n<pre class="tab">e\|-&lt;0&gt;-\|\nB\|--1--\|<\/pre>\n<\/div>/,
		);
	});

	it('embeds the monospace font for tabs in a stylesheet of its own', () => {
		assert.match(opf, /<item id="font-mono" href="fonts\/mono.ttf" media-type="application\/vnd.ms-opentype"\/>/);
		const font = entries.find((entry) => entry.path === 'OEBPS/fonts/mono.ttf');
		assert.deepEqual([...(font?.data.slice(0, 4) ?? [])], [0, 1, 0, 0]);
		const css = textOf(entries, 'OEBPS/styles/mono.css');
		assert.match(css, /src: url\(..\/fonts\/mono.ttf\);/);
		assert.match(css, /\.tab, \.mono \.line \{\n\tfont-family: "Songbook Mono", monospace !important;/);
	});

	it('sizes titles from the multipliers in a stylesheet Adobe RMSDK can parse', () => {
		const css = textOf(entries, 'OEBPS/styles/book.css');
		assert.match(css, /body \{\n\tfont-size: 80%;/);
		assert.match(css, /\.song-title \{\n\tfont-size: 3em;/);
		assert.match(css, /\.section-title \{\n\tfont-size: 2em;/);
		assert.doesNotMatch(css, /calc\(|vh\b|flex|@font-face/);
		// Only monospace text sets a font family, at the monospace size.
		assert.deepEqual(css.match(/font-family/g), ['font-family']);
		assert.match(css, /\.tab, \.mono \.line \{\n\tfont-family: monospace;\n\tfont-size: 0.7em;/);
		assert.match(css, /\.icon \{\n\tmargin: 0 0 3.6em;/);
		const modern = textOf(entries, 'OEBPS/styles/modern.css');
		assert.match(modern, /min-height: calc\(100vh - 2em\)/);
		assert.match(modern, /\.song-icon \{\n\twidth: 5.76em;\n\theight: 3.965em;/);
		assert.match(opf, /<item id="css-modern" href="styles\/modern.css" media-type="text\/css"\/>/);
		const page = textOf(entries, 'OEBPS/text/song-001-01.xhtml');
		assert.match(page, /href="..\/styles\/book.css"\/>\n<link rel="stylesheet" type="text\/css" href="..\/styles\/modern.css"\/>\n<link rel="stylesheet" type="text\/css" href="..\/styles\/mono.css"\/>/);
	});

	it('falls back to an <img> cover when the image size is unknown', () => {
		const cover = textOf(entries, 'OEBPS/text/cover.xhtml');
		assert.match(cover, /<img src="..\/images\/cover.jpg" alt="My Songbook"/);
		assert.match(opf, /<item id="cover" href="text\/cover.xhtml" media-type="application\/xhtml\+xml"\/>/);
	});
});

describe('buildEpub with the default cover', () => {
	const entries = readZip(buildEpub({ ...BOOK, cover: DEFAULT_COVER }, deflate));

	it('scales the cover to the page with an SVG wrapper', () => {
		const cover = textOf(entries, 'OEBPS/text/cover.xhtml');
		assert.match(cover, /<svg [^>]*width="100%" height="100%" viewBox="0 0 1440 1929" preserveAspectRatio="xMidYMid meet"><image width="1440" height="1929" xlink:href="..\/images\/cover.jpg"\/><\/svg>/);
		assert.match(cover, /@page \{ margin: 0; padding: 0; \}/);
		const opf = textOf(entries, 'OEBPS/content.opf');
		assert.match(opf, /<item id="cover" href="text\/cover.xhtml" media-type="application\/xhtml\+xml" properties="svg"\/>/);
	});
});

const spineOf = (book: Book) =>
	[...textOf(readZip(buildEpub(book, deflate)), 'OEBPS/content.opf').matchAll(/<itemref idref="([^"]+)"/g)].map((m) => m[1]);

describe('buildEpub with sections running together', () => {
	const book = { ...BOOK, sectionTitleOwnPage: false };
	const entries = readZip(buildEpub(book, deflate));

	it('puts the song title alone, then runs the sections together', () => {
		assert.deepEqual(spineOf(book), ['cover', 'song-001', 'song-001-content', 'song-002', 'song-002-content']);
		assert.ok(!entries.some((e) => e.path.includes('song-001-01')));
		assert.match(textOf(entries, 'OEBPS/text/song-001.xhtml'), /<body class="page title-page" epub:type="chapter">/);
		const content = textOf(entries, 'OEBPS/text/song-001-content.xhtml');
		assert.match(content, /<body class="song">\n<div class="section">\n<h2 class="section-title">Verse 1<\/h2>\n<div class="content">\n<div class="line">C Em<\/div>/);
		assert.match(content, /<h2 class="section-title">Chorus<\/h2>\n<div class="content">\n<div class="line">G<\/div>/);
	});

	it('marks content as monospace when the regular font is off', () => {
		const mono = readZip(buildEpub({ ...book, monospace: true }, deflate));
		const content = textOf(mono, 'OEBPS/text/song-001-content.xhtml');
		assert.match(content, /<h2 class="section-title">Verse 1<\/h2>\n<div class="content mono">\n/);
		assert.match(textOf(mono, 'OEBPS/styles/book.css'), /\.mono \.line \{\n\twhite-space: pre-wrap;/);
	});

	it('keeps the table of contents pointing at the songs', () => {
		const nav = textOf(entries, 'OEBPS/nav.xhtml');
		assert.match(nav, /<a href="text\/song-001.xhtml">/);
		assert.match(nav, /<a href="text\/song-002.xhtml">/);
	});
});

describe('buildEpub with groups', () => {
	const [armstrong, tom] = BOOK.songs as [Book['songs'][0], Book['songs'][0]];
	const book: Book = {
		...BOOK,
		sectionTitleOwnPage: false,
		groups: [
			{ title: 'Learning', songs: [tom] },
			{ title: 'Polishing', songs: [armstrong, tom] },
		],
	};
	const entries = readZip(buildEpub(book, deflate));

	it('opens each group with a title page and ends with the index', () => {
		assert.deepEqual(spineOf(book), [
			'cover',
			'group-01',
			'song-001',
			'song-001-content',
			'group-02',
			'song-002',
			'song-002-content',
			'song-003',
			'song-003-content',
			'index',
		]);
		const page = textOf(entries, 'OEBPS/text/group-01.xhtml');
		assert.match(page, /<body class="page title-page" epub:type="part">/);
		assert.match(page, /<svg [^>]*class="group-icon" viewBox="0 0 838 779" width="6em" height="5.578em"/);
		assert.match(page, /<\/svg><\/div>\n<h1 class="group-title">Learning<\/h1>/);
		assert.match(textOf(entries, 'OEBPS/content.opf'), /<item id="group-01" href="text\/group-01.xhtml" media-type="application\/xhtml\+xml" properties="svg"\/>/);
	});

	it('nests the songs under their groups in both tables of contents', () => {
		const nav = textOf(entries, 'OEBPS/nav.xhtml');
		assert.match(nav, /<li><a href="text\/group-01.xhtml">Learning<\/a>\n<ol>\n<li><a href="text\/song-001.xhtml">Tom &amp; Jerry<\/a><\/li>\n<\/ol>\n<\/li>/);
		assert.match(nav, /<li><a href="text\/index.xhtml">Index<\/a><\/li>\n<\/ol>\n<\/nav>/);
		const ncx = textOf(entries, 'OEBPS/toc.ncx');
		assert.match(ncx, /<meta name="dtb:depth" content="2"\/>/);
		assert.match(ncx, /<navPoint id="nav-1" playOrder="1">\n<navLabel><text>Learning<\/text><\/navLabel>\n<content src="text\/group-01.xhtml"\/>\n<navPoint id="nav-2" playOrder="2">/);
		assert.equal([...ncx.matchAll(/<navPoint /g)].length, 6);
	});

	it('lists each song once in the index, linking to its first page', () => {
		const index = textOf(entries, 'OEBPS/text/index.xhtml');
		assert.match(index, /<body class="index" epub:type="index">\n<h1 class="index-title">Index<\/h1>/);
		assert.match(index, /<h2 class="index-letter">A<\/h2>\n<div class="index-entry"><a href="song-002.xhtml">Armstrong - What a Wonderful World<\/a><\/div>/);
		assert.match(index, /<h2 class="index-letter">T<\/h2>\n<div class="index-entry"><a href="song-001.xhtml">Tom &amp; Jerry<\/a><\/div>/);
	});

	it('names the index in the book language', () => {
		const de = readZip(buildEpub({ ...book, language: 'de' }, deflate));
		assert.match(textOf(de, 'OEBPS/text/index.xhtml'), /<h1 class="index-title">Register<\/h1>/);
	});

	it('sizes the group title from the song title size', () => {
		const css = textOf(entries, 'OEBPS/styles/book.css');
		assert.match(css, /\.group-title \{\n\tfont-size: 3.75em;/);
		assert.match(css, /\.group-heading \.icon \{\n\tmargin-bottom: 4.5em;/);
		const modern = textOf(entries, 'OEBPS/styles/modern.css');
		assert.match(modern, /\.group-icon \{\n\twidth: 4.5em;\n\theight: 4.183em;/);
	});
});

describe('indexSections', () => {
	const entry = (title: string) => ({ title, href: `${title}.xhtml` });
	const letters = (titles: string[], language = 'en') =>
		indexSections(titles.map(entry), language).map((s) => [s.letter, s.entries.map((e) => e.title)]);

	it('splits titles by initial letter, accents folded, symbols under #', () => {
		assert.deepEqual(letters(['42', "'Round Midnight", 'apple', 'Banana', 'École', 'eleven']), [
			['#', ['42', "'Round Midnight"]],
			['A', ['apple']],
			['B', ['Banana']],
			['E', ['École', 'eleven']],
		]);
	});

	it("keeps a language's own letters apart", () => {
		assert.deepEqual(letters(['Иволга', 'Йога'], 'ru'), [
			['И', ['Иволга']],
			['Й', ['Йога']],
		]);
	});
});
