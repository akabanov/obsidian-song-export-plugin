import { App, PluginSettingTab, Setting } from 'obsidian';
import SongExportPlugin from './main';

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

export interface SongExportSettings {
	songsDirectory: string;
	codeBlockName: string;
	outputFile: string;
	bookTitle: string;
	bookAuthor: string;
	bookLanguage: Language;
	titleSplitSequence: string;
	coverImage: CoverImage;
	coverImagePath: string;
	titleFont: FontName;
	contentFont: FontName;
	sectionTitleScale: number;
	songTitleScale: number;
}

export const DEFAULT_SETTINGS: SongExportSettings = {
	songsDirectory: '',
	codeBlockName: 'chords',
	outputFile: '~/Documents/my-songs.epub',
	bookTitle: 'My Songbook',
	bookAuthor: 'Obsidian',
	bookLanguage: 'en',
	titleSplitSequence: ' - ',
	coverImage: 'default',
	coverImagePath: '',
	titleFont: 'Playfair Display',
	contentFont: 'Lora',
	sectionTitleScale: 2,
	songTitleScale: 2,
};

export class SongExportSettingTab extends PluginSettingTab {
	plugin: SongExportPlugin;

	constructor(app: App, plugin: SongExportPlugin) {
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

		this.addFont(
			'Title font',
			'Used for song and section titles.',
			'titleFont',
		);
		this.addFont('Content font', 'Used for song content.', 'contentFont');

		this.addScale(
			'Section title size',
			'Multiplier of the content font size.',
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

	private addFont(
		name: string,
		desc: string,
		key: 'titleFont' | 'contentFont',
	): void {
		new Setting(this.containerEl)
			.setName(name)
			.setDesc(desc)
			.addDropdown((dropdown) => {
				for (const font of FONTS) dropdown.addOption(font, font);
				dropdown
					.setValue(this.plugin.settings[key])
					.onChange(async (value) => {
						this.plugin.settings[key] = value as FontName;
						await this.plugin.saveSettings();
					});
			});
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
					.setLimits(1, 5, 0.25)
					.setValue(this.plugin.settings[key])
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings[key] = value;
						await this.plugin.saveSettings();
					}),
			);
	}
}
