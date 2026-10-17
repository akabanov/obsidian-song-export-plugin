import { DataAdapter, normalizePath, requestUrl } from 'obsidian';
import { FontFile, FontFormat, fontFileStem, FontName, FontWeight } from './catalog';
import {
	GOOGLE_FONTS_USER_AGENT,
	googleFontsCssUrl,
	parseGoogleFontsCss,
} from './google';
import { errorMessage } from '../utils/errors';

const FORMATS: FontFormat[] = ['ttf', 'woff2'];

/**
 * Font files downloaded from Google Fonts on first use and kept in the
 * plugin's folder, so later exports and previews work offline.
 */
export class FontCache {
	private readonly pending = new Map<string, Promise<FontFile>>();

	constructor(
		private readonly adapter: DataAdapter,
		private readonly dir: string,
	) {}

	/** Returns the font file, downloading it if it isn't cached yet. */
	get(family: FontName, weight: FontWeight): Promise<FontFile> {
		const key = fontFileStem(family, weight);
		let file = this.pending.get(key);
		if (!file) {
			// Only in-flight loads are shared; settled ones are read from disk
			// again, so font bytes aren't kept in memory and failures retry.
			file = this.load(family, weight).finally(() => this.pending.delete(key));
			this.pending.set(key, file);
		}
		return file;
	}

	async isCached(family: FontName, weight: FontWeight): Promise<boolean> {
		return (await this.findCached(family, weight)) !== null;
	}

	private async load(family: FontName, weight: FontWeight): Promise<FontFile> {
		const cached = await this.findCached(family, weight);
		if (cached) {
			const bytes = await this.adapter.readBinary(cached.path);
			return { family, weight, format: cached.format, bytes };
		}

		let file: FontFile;
		try {
			file = await download(family, weight);
		} catch (error) {
			throw new Error(
				`Couldn't download the font ${family} (${weight}): ${errorMessage(error)}`,
			);
		}
		if (!(await this.adapter.exists(this.dir))) {
			await this.adapter.mkdir(this.dir);
		}
		await this.adapter.writeBinary(this.path(family, weight, file.format), file.bytes);
		return file;
	}

	private async findCached(
		family: FontName,
		weight: FontWeight,
	): Promise<{ path: string; format: FontFormat } | null> {
		for (const format of FORMATS) {
			const path = this.path(family, weight, format);
			if (await this.adapter.exists(path)) return { path, format };
		}
		return null;
	}

	private path(family: FontName, weight: FontWeight, format: FontFormat): string {
		return normalizePath(`${this.dir}/${fontFileStem(family, weight)}.${format}`);
	}
}

async function download(family: FontName, weight: FontWeight): Promise<FontFile> {
	const headers = { 'User-Agent': GOOGLE_FONTS_USER_AGENT };
	const css = await requestUrl({ url: googleFontsCssUrl(family, weight), headers });
	const { url, format } = parseGoogleFontsCss(css.text);
	const font = await requestUrl({ url, headers });
	return { family, weight, format, bytes: font.arrayBuffer };
}
