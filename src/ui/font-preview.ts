import { CONTENT_WEIGHT, FontName, FontWeight, TITLE_WEIGHT } from '../fonts/catalog';
import { PreviewFonts } from '../fonts/preview-faces';
import { SongExportSettings } from '../settings';
import { preprocessSection } from '../song/sections';
import { splitTitle } from '../song/song';

// Amazing Grace, lyrics by John Newton (1779), public domain.
const SAMPLE_TITLE = 'John Newton - Amazing Grace';
const SAMPLE_SECTION = 'Verse 1';
const SAMPLE_LINES = [
	'   G              G7       C     G',
	'Amazing grace! How sweet the sound',
];

/**
 * A sample song page in the selected fonts and sizes, shown in the settings
 * tab. Fonts not cached yet are downloaded as soon as they are selected.
 */
export class FontPreview {
	private readonly el: HTMLElement;
	private readonly statusEl: HTMLElement;
	private readonly songTitleEl: HTMLElement;
	private renderId = 0;

	constructor(
		parent: HTMLElement,
		private readonly fonts: PreviewFonts,
		private readonly settings: () => SongExportSettings,
	) {
		this.el = parent.createDiv({ cls: 'song-export-preview' });
		this.statusEl = this.el.createDiv({ cls: 'song-export-preview-status' });
		this.setStatus('');
		const page = this.el.createDiv({ cls: 'song-export-preview-page' });
		this.songTitleEl = page.createDiv({ cls: 'song-export-preview-song-title' });
		page.createDiv({
			cls: 'song-export-preview-section-title',
			text: SAMPLE_SECTION,
		});
		const content = page.createDiv({ cls: 'song-export-preview-content' });
		for (const line of preprocessSection(SAMPLE_LINES)) {
			content.createDiv({ text: line });
		}
	}

	/** Redraws with the current settings and loads the fonts they need. */
	async render(): Promise<void> {
		const id = ++this.renderId;
		const {
			titleFont,
			contentFont,
			sectionTitleScale,
			songTitleScale,
			titleSplitSequence,
		} = this.settings();

		this.songTitleEl.empty();
		for (const line of splitTitle(SAMPLE_TITLE, titleSplitSequence)) {
			this.songTitleEl.createDiv({ text: line });
		}
		this.el.setCssProps({
			'--song-export-section-scale': String(sectionTitleScale),
			'--song-export-song-scale': String(songTitleScale),
		});

		const doc = this.el.doc;
		const load = (family: FontName, weight: FontWeight) =>
			this.fonts.load(doc, family, weight).then(
				(name) => ({ family, name }),
				() => ({ family, name: null }),
			);
		// Cached fonts load almost instantly; only announce real downloads.
		const loading = window.setTimeout(() => {
			if (id === this.renderId) this.setStatus('Loading font…');
		}, 200);
		const [title, content] = await Promise.all([
			load(titleFont, TITLE_WEIGHT),
			load(contentFont, CONTENT_WEIGHT),
		]);
		window.clearTimeout(loading);
		if (id !== this.renderId) return;

		this.el.setCssProps({
			'--song-export-title-font': cssFontFamily(title.name),
			'--song-export-content-font': cssFontFamily(content.name),
		});
		const failed = [title, content]
			.filter((font) => font.name === null)
			.map((font) => font.family);
		this.setStatus(
			failed.length > 0
				? `Couldn't load ${[...new Set(failed)].join(' and ')}. The export will try again.`
				: '',
		);
	}

	private setStatus(text: string): void {
		this.statusEl.setText(text);
		this.statusEl.toggleClass('is-hidden', text === '');
	}
}

/** A quoted family name, or the theme font when the face couldn't be loaded. */
function cssFontFamily(name: string | null): string {
	return name ? `"${name}", var(--font-text)` : 'var(--font-text)';
}
