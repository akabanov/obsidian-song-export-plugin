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

export interface SongExportSettings {
	songsDirectory: string;
	outputFile: string;
	bookTitle: string;
	bookAuthor: string;
	bookLanguage: string;
	titleFont: FontName;
	contentFont: FontName;
	sectionTitleScale: number;
	songTitleScale: number;
}

export const DEFAULT_SETTINGS: SongExportSettings = {
	songsDirectory: '',
	outputFile: '~/Documents/my-songs.epub',
	bookTitle: 'My Songs',
	bookAuthor: '',
	bookLanguage: 'en',
	titleFont: 'Playfair Display',
	contentFont: 'Lora',
	sectionTitleScale: 2,
	songTitleScale: 3,
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
			'Output file',
			'Absolute path of the EPUB file. A leading ~ expands to your home directory.',
			'outputFile',
		);
		this.addText('Book title', 'Shown by e-book readers.', 'bookTitle');
		this.addText('Book author', 'Optional.', 'bookAuthor');
		this.addText('Book language', 'Language code, e.g. en.', 'bookLanguage');

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
			| 'outputFile'
			| 'bookTitle'
			| 'bookAuthor'
			| 'bookLanguage',
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
