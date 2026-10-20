import { App, PluginSettingTab, Setting } from 'obsidian';
import type SongbookMakerPlugin from './main';

export const LANGUAGES = [
	'cs',
	'de',
	'en',
	'es',
	'fr',
	'it',
	'ja',
	'ko',
	'nl',
	'pl',
	'pt',
	'ru',
	'sv',
	'uk',
	'zh',
] as const;

export type Language = (typeof LANGUAGES)[number];

export type CoverImage = 'none' | 'default' | 'custom';

export interface SongbookMakerSettings {
	songsDirectory: string;
	/** Comma- or space-separated tags; notes with one are left out. */
	excludedTags: string;
	codeBlockName: string;
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
	/** Stable EPUB identifier, generated on first load. Not shown in the UI. */
	bookId: string;
}

export const DEFAULT_SETTINGS: SongbookMakerSettings = {
	songsDirectory: '',
	excludedTags: 'template',
	codeBlockName: 'chords',
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
	bookId: '',
};

/** Settings that no longer exist, dropped from saved data on load. */
const REMOVED_SETTINGS = ['pageLayout', 'titleFont', 'contentFont', 'songTitleOwnPage'];

/**
 * Fills in defaults for missing settings and carries the old *Page layout*
 * choice over to the section title page toggle.
 */
export function migrateSettings(
	data: Record<string, unknown> | null,
): SongbookMakerSettings {
	const saved = { ...data };
	if (saved.pageLayout === 'book' && !('sectionTitleOwnPage' in saved)) {
		saved.sectionTitleOwnPage = false;
	}
	for (const key of REMOVED_SETTINGS) delete saved[key];
	const settings = { ...DEFAULT_SETTINGS, ...(saved as Partial<SongbookMakerSettings>) };
	settings.textSize = clamp(settings.textSize, MIN_TEXT_SIZE, MAX_TEXT_SIZE);
	settings.monoTextSize = clamp(settings.monoTextSize, MIN_MONO_TEXT_SIZE, MAX_MONO_TEXT_SIZE);
	settings.sectionTitleScale = clamp(settings.sectionTitleScale, MIN_SCALE, MAX_SCALE);
	settings.songTitleScale = clamp(settings.songTitleScale, MIN_SCALE, MAX_SCALE);
	return settings;
}

const KOBO_HELP_URL =
	'https://github.com/akabanov/obsidian-songbook-maker-plugin#reading-on-a-kobo';

/** Text size ranges from 65% to 130% of the reader's font size. */
export const MIN_TEXT_SIZE = 65;
export const MAX_TEXT_SIZE = 130;

/** Monospace text ranges from 50% to 100% of the content text size. */
export const MIN_MONO_TEXT_SIZE = 50;
export const MAX_MONO_TEXT_SIZE = 100;

/** Title size multipliers range from 1 to 3; older versions allowed up to 5. */
export const MIN_SCALE = 1;
export const MAX_SCALE = 3;

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

export class SongbookMakerSettingTab extends PluginSettingTab {
	plugin: SongbookMakerPlugin;

	constructor(app: App, plugin: SongbookMakerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		this.addText(
			'Songs directory',
			'Vault folder searched recursively for song notes. Empty means the vault root.',
			'songsDirectory',
		);
		this.addText(
			'Excluded tags',
			'Notes with any of these tags, or tags nested under them, are left out. Separate with commas or spaces.',
			'excludedTags',
		);
		this.addText(
			'Code block name',
			'Notes with code blocks of this type are songs; only their contents are exported.',
			'codeBlockName',
		);
		this.addText(
			'Output file',
			'Absolute path of the EPUB file. A leading ~ expands to your home directory.',
			'outputFile',
		);
		this.addToggle(
			'Show in folder after export',
			"Opens your system's file manager with the EPUB file selected.",
			'showInFolder',
		);
		this.addText('Book title', 'Shown by e-book readers.', 'bookTitle');
		this.addText('Book author', 'Leave empty to omit.', 'bookAuthor');

		new Setting(containerEl)
			.setName('Book language')
			.addDropdown((dropdown) => {
				for (const lang of LANGUAGES) {
					dropdown.addOption(lang, lang.toUpperCase());
				}
				dropdown
					.setValue(this.plugin.settings.bookLanguage)
					.onChange(async (value) => {
						this.plugin.settings.bookLanguage = value as Language;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Title split sequence')
			.setDesc(
				'The song title is split into two lines at the first occurrence of this text. Leave empty to never split.',
			)
			.addText((text) =>
				text
					.setValue(this.plugin.settings.titleSplitSequence)
					.onChange(async (value) => {
						// Not trimmed: surrounding spaces are part of the sequence.
						this.plugin.settings.titleSplitSequence = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Cover image')
			.setDesc(
				createFragment((desc) => {
					desc.appendText('Kobo may keep showing an old cover. ');
					desc.createEl('a', { text: 'How to fix it', href: KOBO_HELP_URL });
				}),
			)
			.addDropdown((dropdown) =>
				dropdown
					.addOption('none', 'None')
					.addOption('default', 'Default')
					.addOption('custom', 'Custom image')
					.setValue(this.plugin.settings.coverImage)
					.onChange(async (value) => {
						this.plugin.settings.coverImage = value as CoverImage;
						await this.plugin.saveSettings();
						this.display();
					}),
			);
		if (this.plugin.settings.coverImage === 'custom') {
			this.addText(
				'Cover image path',
				'JPEG, PNG or WebP. A vault path, or an absolute path starting with / or ~.',
				'coverImagePath',
			);
		}

		this.addToggle(
			'Flashcard-style sections',
			'Each section title gets a page, and its content follows on the next, for drilling one part at a time. Turn off for a regular songbook layout.',
			'sectionTitleOwnPage',
		);
		this.addToggle(
			'Use regular font',
			"Songs use your reader's font. Its letters aren't all the same width, so spaces can't line chords up over their syllables anyway: extra spaces are dropped, and each chord line shows just the chords, in order, above its lyric line. Easier to read on a small screen. Turn off to keep the spacing from your notes, in a monospaced font.",
			'regularFont',
		);

		this.addPercent(
			'Text size',
			"Percent of your reader's font size. Titles scale with it.",
			'textSize',
			MIN_TEXT_SIZE,
			MAX_TEXT_SIZE,
		);
		this.addPercent(
			'Monospace text size',
			'Percent of the text size, for guitar tabs, and for all song content with the regular font off.',
			'monoTextSize',
			MIN_MONO_TEXT_SIZE,
			MAX_MONO_TEXT_SIZE,
		);
		this.addScale(
			'Section title size',
			'Multiplier of the content text size.',
			'sectionTitleScale',
		);
		this.addScale(
			'Song title size',
			'Multiplier of the section title size.',
			'songTitleScale',
		);
	}

	private addText(
		name: string,
		desc: string,
		key:
			| 'songsDirectory'
			| 'excludedTags'
			| 'codeBlockName'
			| 'outputFile'
			| 'coverImagePath'
			| 'bookTitle'
			| 'bookAuthor',
	): void {
		new Setting(this.containerEl)
			.setName(name)
			.setDesc(desc)
			.addText((text) =>
				text
					.setPlaceholder(DEFAULT_SETTINGS[key])
					.setValue(this.plugin.settings[key])
					.onChange(async (value) => {
						this.plugin.settings[key] = value.trim();
						await this.plugin.saveSettings();
					}),
			);
	}

	private addToggle(
		name: string,
		desc: string,
		key: 'showInFolder' | 'sectionTitleOwnPage' | 'regularFont',
	): void {
		new Setting(this.containerEl)
			.setName(name)
			.setDesc(desc)
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings[key]).onChange(async (value) => {
					this.plugin.settings[key] = value;
					await this.plugin.saveSettings();
				}),
			);
	}

	private addPercent(
		name: string,
		desc: string,
		key: 'textSize' | 'monoTextSize',
		min: number,
		max: number,
	): void {
		new Setting(this.containerEl)
			.setName(name)
			.setDesc(desc)
			.addSlider((slider) =>
				slider
					.setLimits(min, max, 5)
					.setValue(this.plugin.settings[key])
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings[key] = value;
						await this.plugin.saveSettings();
					}),
			);
	}

	private addScale(
		name: string,
		desc: string,
		key: 'sectionTitleScale' | 'songTitleScale',
	): void {
		new Setting(this.containerEl)
			.setName(name)
			.setDesc(desc)
			.addSlider((slider) =>
				slider
					.setLimits(MIN_SCALE, MAX_SCALE, 0.25)
					.setValue(this.plugin.settings[key])
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings[key] = value;
						await this.plugin.saveSettings();
					}),
			);
	}
}
