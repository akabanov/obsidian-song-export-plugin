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
	/** Percent of the reader's font size. */
	textSize: number;
	sectionTitleScale: number;
	songTitleScale: number;
	/** Stable EPUB identifier, generated on first load. Not shown in the UI. */
	bookId: string;
}

export const DEFAULT_SETTINGS: SongbookMakerSettings = {
	songsDirectory: '',
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
	textSize: 100,
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
	settings.sectionTitleScale = clamp(settings.sectionTitleScale, MIN_SCALE, MAX_SCALE);
	settings.songTitleScale = clamp(settings.songTitleScale, MIN_SCALE, MAX_SCALE);
	return settings;
}

/** Text size ranges from 65% to 130% of the reader's font size. */
export const MIN_TEXT_SIZE = 65;
export const MAX_TEXT_SIZE = 130;

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

		new Setting(this.containerEl)
			.setName('Text size')
			.setDesc("Percent of your reader's font size. Titles scale with it.")
			.addSlider((slider) =>
				slider
					.setLimits(MIN_TEXT_SIZE, MAX_TEXT_SIZE, 5)
					.setValue(this.plugin.settings.textSize)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.textSize = value;
						await this.plugin.saveSettings();
					}),
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
		key: 'showInFolder' | 'sectionTitleOwnPage',
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
