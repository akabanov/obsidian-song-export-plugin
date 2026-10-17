/** The curated Google Fonts from SPEC.md, all under the SIL Open Font License. */
export const FONTS = [
	'Playfair Display',
	'Lora',
	'Merriweather',
	'EB Garamond',
	'Libre Baskerville',
	'Crimson Pro',
	'Source Serif 4',
	'Nunito',
	'Open Sans',
	'Montserrat',
] as const;

export type FontName = (typeof FONTS)[number];

/** Regular for song content, bold for titles. */
export type FontWeight = 400 | 700;

export const CONTENT_WEIGHT: FontWeight = 400;
export const TITLE_WEIGHT: FontWeight = 700;

export type FontFormat = 'ttf' | 'woff2';

export interface FontFile {
	family: FontName;
	weight: FontWeight;
	format: FontFormat;
	bytes: ArrayBuffer;
}

/** `Source Serif 4`, 700 → `source-serif-4-700`. */
export function fontFileStem(family: FontName, weight: FontWeight): string {
	return `${family.toLowerCase().replace(/\s+/g, '-')}-${weight}`;
}
