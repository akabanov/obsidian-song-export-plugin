import { FontFormat, FontName, FontWeight } from './catalog';

/**
 * Google Fonts picks the file format from the User-Agent. Browsers get WOFF2
 * split into unicode-range subsets; any other agent gets one complete TTF,
 * which is what an EPUB needs.
 */
export const GOOGLE_FONTS_USER_AGENT = 'Obsidian Song Export';

export function googleFontsCssUrl(family: FontName, weight: FontWeight): string {
	const name = encodeURIComponent(family).replace(/%20/g, '+');
	return `https://fonts.googleapis.com/css2?family=${name}:wght@${weight}`;
}

/**
 * Returns the URL and format of the single font file in a Google Fonts
 * stylesheet. Throws if the stylesheet splits the font into subsets, since
 * embedding one of them would leave glyphs missing.
 */
export function parseGoogleFontsCss(css: string): {
	url: string;
	format: FontFormat;
} {
	const faces = css.match(/@font-face\s*{[^}]*}/g) ?? [];
	if (faces.length !== 1) {
		throw new Error(
			`Expected one font file from Google Fonts, got ${faces.length}`,
		);
	}
	const url = /url\(\s*['"]?([^'")\s]+)['"]?\s*\)/.exec(faces[0] ?? '')?.[1];
	if (!url) throw new Error('No font URL in the Google Fonts response');
	const extension = /\.(ttf|woff2)(?:[?#]|$)/i.exec(url)?.[1]?.toLowerCase();
	if (extension !== 'ttf' && extension !== 'woff2') {
		throw new Error(`Unsupported font file: ${url}`);
	}
	return { url, format: extension };
}
