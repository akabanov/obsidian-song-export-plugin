import { Notice, Plugin } from 'obsidian';
import {
	DEFAULT_SETTINGS,
	SongExportSettings,
	SongExportSettingTab,
} from './settings';

export default class SongExportPlugin extends Plugin {
	settings!: SongExportSettings;

	async onload() {
		await this.loadSettings();

		this.addRibbonIcon('book-open', 'Export songs to EPUB', () => {
			void this.exportSongs();
		});

		this.addCommand({
			id: 'export-songs-to-epub',
			name: 'Export songs to EPUB',
			callback: () => {
				void this.exportSongs();
			},
		});

		this.addSettingTab(new SongExportSettingTab(this.app, this));
	}

	async exportSongs() {
		// TODO: implement the export described in SPEC.md.
		new Notice('Song export is not implemented yet.');
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<SongExportSettings>,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
