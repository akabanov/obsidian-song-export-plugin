import { escapeXml } from './xml';

export const CONTAINER_XML = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
<rootfiles>
<rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
</rootfiles>
</container>
`;

export interface ManifestItem {
	id: string;
	href: string;
	mediaType: string;
	properties?: string;
}

export interface TocEntry {
	title: string;
	href: string;
}

export interface PackageOptions {
	id: string;
	title: string;
	author: string;
	language: string;
	modified: Date;
	/** Manifest id of the cover image, if any. */
	coverImageId: string | null;
	manifest: ManifestItem[];
	/** Manifest ids in reading order. */
	spine: string[];
}

export function packageDocument(options: PackageOptions): string {
	const metadata = [
		`<dc:identifier id="book-id">urn:uuid:${escapeXml(options.id)}</dc:identifier>`,
		`<dc:title>${escapeXml(options.title)}</dc:title>`,
		options.author ? `<dc:creator>${escapeXml(options.author)}</dc:creator>` : '',
		`<dc:language>${options.language}</dc:language>`,
		`<meta property="dcterms:modified">${w3cDateTime(options.modified)}</meta>`,
		options.coverImageId ? `<meta name="cover" content="${options.coverImageId}"/>` : '',
	].filter(Boolean);
	const manifest = options.manifest.map(
		(item) =>
			`<item id="${item.id}" href="${escapeXml(item.href)}" media-type="${item.mediaType}"` +
			(item.properties ? ` properties="${item.properties}"` : '') +
			'/>',
	);
	const spine = options.spine.map((id) => `<itemref idref="${id}"/>`);

	return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id" xml:lang="${options.language}">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
${metadata.join('\n')}
</metadata>
<manifest>
${manifest.join('\n')}
</manifest>
<spine toc="ncx">
${spine.join('\n')}
</spine>
</package>
`;
}

export function navDocument(language: string, title: string, toc: TocEntry[]): string {
	const items = toc.map(
		(entry) =>
			`<li><a href="${escapeXml(entry.href)}">${escapeXml(entry.title)}</a></li>`,
	);
	return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${language}" lang="${language}">
<head>
<meta charset="UTF-8"/>
<title>${escapeXml(title)}</title>
</head>
<body>
<nav epub:type="toc" id="toc">
<h1>${escapeXml(title)}</h1>
<ol>
${items.join('\n')}
</ol>
</nav>
</body>
</html>
`;
}

/** The EPUB 2 table of contents, for older readers. */
export function ncxDocument(id: string, title: string, toc: TocEntry[]): string {
	const points = toc.map(
		(entry, i) => `<navPoint id="nav-${i + 1}" playOrder="${i + 1}">
<navLabel><text>${escapeXml(entry.title)}</text></navLabel>
<content src="${escapeXml(entry.href)}"/>
</navPoint>`,
	);
	return `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
<head>
<meta name="dtb:uid" content="urn:uuid:${escapeXml(id)}"/>
<meta name="dtb:depth" content="1"/>
<meta name="dtb:totalPageCount" content="0"/>
<meta name="dtb:maxPageNumber" content="0"/>
</head>
<docTitle><text>${escapeXml(title)}</text></docTitle>
<navMap>
${points.join('\n')}
</navMap>
</ncx>
`;
}

/** `2026-10-17T20:04:00Z`: the form `dcterms:modified` requires. */
export function w3cDateTime(date: Date): string {
	return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}
