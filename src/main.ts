import { Plugin } from 'obsidian';
import { exportSongs } from './export/exporter';
import { normalizeSettings, SongbookMakerSettings } from './settings';
import { registerIcon, SONGBOOK_ICON } from './ui/icon';
import { SongbookMakerSettingTab } from './ui/settings-tab';

export default class SongbookMakerPlugin extends Plugin {
	settings!: SongbookMakerSettings;
	private exporting = false;

	async onload() {
		await this.loadSettings();

		registerIcon();
		this.addRibbonIcon(SONGBOOK_ICON, 'Export songs to EPUB', () => {
			void this.exportSongs();
		});

		this.addCommand({
			id: 'export-songs-to-epub',
			name: 'Export songs to EPUB',
			callback: () => {
				void this.exportSongs();
			},
		});

		this.addSettingTab(new SongbookMakerSettingTab(this.app, this));
	}

	async exportSongs() {
		if (this.exporting) return;
		this.exporting = true;
		try {
			await exportSongs(this.app, this.settings);
		} finally {
			this.exporting = false;
		}
	}

	async loadSettings() {
		this.settings = normalizeSettings(
			(await this.loadData()) as Partial<SongbookMakerSettings> | null,
		);
		if (!this.settings.bookId) {
			this.settings.bookId = crypto.randomUUID();
			await this.saveSettings();
		}
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
