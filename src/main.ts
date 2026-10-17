import { addIcon, Notice, Plugin } from 'obsidian';
import {
	DEFAULT_SETTINGS,
	SongExportSettings,
	SongExportSettingTab,
} from './settings';

const RIBBON_ICON = 'song-export-songbook';

// An open songbook: lyric lines on the left page, a music note on the right.
// Drawn on Lucide's 24-unit grid and scaled to Obsidian's 100-unit icon box.
const RIBBON_ICON_SVG = `<g transform="scale(4.1667)" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
	<path d="M12 7v14"/>
	<path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>
	<path d="M5 8h3"/>
	<path d="M5 11h4"/>
	<path d="M5 14h2"/>
	<path d="M18 13V7l2 1"/>
	<circle cx="16.5" cy="13" r="1.5"/>
</g>`;

export default class SongExportPlugin extends Plugin {
	settings!: SongExportSettings;

	async onload() {
		await this.loadSettings();

		addIcon(RIBBON_ICON, RIBBON_ICON_SVG);
		this.addRibbonIcon(RIBBON_ICON, 'Export songs to EPUB', () => {
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
