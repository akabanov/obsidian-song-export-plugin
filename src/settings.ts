/** Book languages, by code, with the names shown in the settings. */
export const LANGUAGES = {
	cs: 'Czech',
	de: 'German',
	en: 'English',
	es: 'Spanish',
	fr: 'French',
	it: 'Italian',
	ja: 'Japanese',
	ko: 'Korean',
	nl: 'Dutch',
	pl: 'Polish',
	pt: 'Portuguese',
	ru: 'Russian',
	sv: 'Swedish',
	uk: 'Ukrainian',
	zh: 'Chinese',
} as const;

export type Language = keyof typeof LANGUAGES;

export type CoverImage = 'none' | 'default' | 'custom';

export interface SongbookMakerSettings {
	songsDirectory: string;
	/** Comma- or space-separated tags; notes with one are left out. */
	excludedTags: string;
	/** Comma-separated info strings of the code blocks that hold songs. */
	codeBlockNames: string;
	/** Frontmatter property to group songs by. Empty: no groups. */
	groupProperty: string;
	/** Comma-separated values of the group property, in book order. Empty: all. */
	groups: string;
	outputFile: string;
	showInFolder: boolean;
	bookTitle: string;
	bookAuthor: string;
	bookLanguage: Language;
	titleSplitSequence: string;
	coverImage: CoverImage;
	coverImagePath: string;
	sectionTitleOwnPage: boolean;
	/** Off: song content keeps its spacing, in the monospace font. */
	regularFont: boolean;
	/** Percent of the reader's font size. */
	textSize: number;
	/** Percent of the content text size, for monospace text. */
	monoTextSize: number;
	sectionTitleScale: number;
	songTitleScale: number;
	groupTitleScale: number;
	/** Stable EPUB identifier, generated on first load. Not shown in the UI. */
	bookId: string;
}

export const DEFAULT_SETTINGS: SongbookMakerSettings = {
	songsDirectory: '',
	excludedTags: 'template',
	codeBlockNames: 'chords, chordlyrics',
	groupProperty: '',
	groups: '',
	outputFile: '~/Documents/my-songbook.epub',
	showInFolder: false,
	bookTitle: 'My Songbook',
	bookAuthor: 'Obsidian',
	bookLanguage: 'en',
	titleSplitSequence: ' - ',
	coverImage: 'default',
	coverImagePath: '',
	sectionTitleOwnPage: true,
	regularFont: true,
	textSize: 100,
	monoTextSize: 70,
	sectionTitleScale: 1.25,
	songTitleScale: 1.25,
	groupTitleScale: 1.25,
	bookId: '',
};

/**
 * Fills in defaults for missing settings and brings numbers and the language
 * back into range.
 */
export function normalizeSettings(
	data: Partial<SongbookMakerSettings> | null,
): SongbookMakerSettings {
	const settings = { ...DEFAULT_SETTINGS, ...data };
	settings.textSize = clamp(settings.textSize, MIN_TEXT_SIZE, MAX_TEXT_SIZE);
	settings.monoTextSize = clamp(settings.monoTextSize, MIN_MONO_TEXT_SIZE, MAX_MONO_TEXT_SIZE);
	settings.sectionTitleScale = clamp(settings.sectionTitleScale, MIN_SCALE, MAX_SCALE);
	settings.songTitleScale = clamp(settings.songTitleScale, MIN_SCALE, MAX_SCALE);
	settings.groupTitleScale = clamp(settings.groupTitleScale, MIN_SCALE, MAX_SCALE);
	if (!(settings.bookLanguage in LANGUAGES)) settings.bookLanguage = DEFAULT_SETTINGS.bookLanguage;
	return settings;
}

/** Text settings whose surrounding whitespace means nothing. */
const TRIMMED_SETTINGS = [
	'songsDirectory',
	'excludedTags',
	'codeBlockNames',
	'groupProperty',
	'groups',
	'outputFile',
	'bookTitle',
	'bookAuthor',
	'coverImagePath',
] as const;

/**
 * A copy of `settings` with text settings trimmed. They are trimmed when used
 * rather than as they're typed, so that typing a space isn't undone.
 * *Title split sequence* isn't trimmed: its spaces are part of it.
 */
export function trimSettings(settings: SongbookMakerSettings): SongbookMakerSettings {
	const trimmed = { ...settings };
	for (const key of TRIMMED_SETTINGS) trimmed[key] = trimmed[key].trim();
	return trimmed;
}

/** Text size ranges from 65% to 130% of the reader's font size. */
export const MIN_TEXT_SIZE = 65;
export const MAX_TEXT_SIZE = 130;

/** Monospace text ranges from 50% to 100% of the content text size. */
export const MIN_MONO_TEXT_SIZE = 50;
export const MAX_MONO_TEXT_SIZE = 100;

/** Title size multipliers range from 1 to 3. */
export const MIN_SCALE = 1;
export const MAX_SCALE = 3;

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}
