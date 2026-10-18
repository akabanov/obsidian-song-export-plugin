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
	songTitleOwnPage: boolean;
	sectionTitleOwnPage: boolean;
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
	songTitleOwnPage: true,
	sectionTitleOwnPage: true,
	sectionTitleScale: 1.25,
	songTitleScale: 1.25,
	bookId: '',
};

/** Settings of 0.1.0-beta.1 that no longer exist, dropped from saved data on load. */
const REMOVED_SETTINGS = ['pageLayout', 'titleFont', 'contentFont'];

/**
 * Fills in defaults for missing settings and carries the old *Page layout*
 * choice over to the two title page toggles.
 */
export function migrateSettings(
	data: Record<string, unknown> | null,
): SongbookMakerSettings {
	const saved = { ...data };
	if (saved.pageLayout === 'book' && !('songTitleOwnPage' in saved)) {
		saved.songTitleOwnPage = false;
		saved.sectionTitleOwnPage = false;
	}
	for (const key of REMOVED_SETTINGS) delete saved[key];
	const settings = { ...DEFAULT_SETTINGS, ...(saved as Partial<SongbookMakerSettings>) };
	settings.sectionTitleScale = clampScale(settings.sectionTitleScale);
	settings.songTitleScale = clampScale(settings.songTitleScale);
	return settings;
}

/** Title size multipliers range from 1 to 3; older versions allowed up to 5. */
export const MIN_SCALE = 1;
export const MAX_SCALE = 3;

function clampScale(value: number): number {
	return Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));
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
			'Song title on its own page',
			'Otherwise the song content starts right below the song title.',
			'songTitleOwnPage',
		);
		this.addToggle(
			'Section title on its own page',
			'Each section title gets a page, and the section content starts on the next one. Otherwise sections run together.',
			'sectionTitleOwnPage',
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
		key: 'showInFolder' | 'songTitleOwnPage' | 'sectionTitleOwnPage',
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
