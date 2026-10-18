import { App, PluginSettingTab, Setting } from 'obsidian';
import { PageLayout } from './epub/book';
import { FontName, FONTS } from './fonts/catalog';
import type SongbookMakerPlugin from './main';
import { FontPreview } from './ui/font-preview';

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
	bookTitle: string;
	bookAuthor: string;
	bookLanguage: Language;
	titleSplitSequence: string;
	coverImage: CoverImage;
	coverImagePath: string;
	pageLayout: PageLayout;
	titleFont: FontName;
	contentFont: FontName;
	sectionTitleScale: number;
	songTitleScale: number;
	/** Stable EPUB identifier, generated on first load. Not shown in the UI. */
	bookId: string;
}

export const DEFAULT_SETTINGS: SongbookMakerSettings = {
	songsDirectory: '',
	codeBlockName: 'chords',
	outputFile: '~/Documents/my-songs.epub',
	bookTitle: 'My Songbook',
	bookAuthor: 'Obsidian',
	bookLanguage: 'en',
	titleSplitSequence: ' - ',
	coverImage: 'default',
	coverImagePath: '',
	pageLayout: 'cards',
	titleFont: 'Playfair Display',
	contentFont: 'Lora',
	sectionTitleScale: 2,
	songTitleScale: 2,
	bookId: '',
};

export class SongbookMakerSettingTab extends PluginSettingTab {
	plugin: SongbookMakerPlugin;
	private preview: FontPreview | null = null;

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
						void this.preview?.render();
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

		new Setting(containerEl)
			.setName('Page layout')
			.setDesc(
				'Flash cards put every song title, section title and section on its own page. Book starts each song on a new page and runs its titles and content together.',
			)
			.addDropdown((dropdown) =>
				dropdown
					.addOption('cards', 'Flash cards')
					.addOption('book', 'Book')
					.setValue(this.plugin.settings.pageLayout)
					.onChange(async (value) => {
						this.plugin.settings.pageLayout = value as PageLayout;
						await this.plugin.saveSettings();
					}),
			);

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

		this.preview = new FontPreview(
			containerEl,
			this.plugin.previewFonts,
			() => this.plugin.settings,
		);
		void this.preview.render();
	}

	hide(): void {
		this.preview = null;
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
						void this.preview?.render();
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
						void this.preview?.render();
						await this.plugin.saveSettings();
					}),
			);
	}
}
