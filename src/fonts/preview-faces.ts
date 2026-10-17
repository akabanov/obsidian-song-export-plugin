import { FontCache } from './cache';
import { fontFileStem, FontName, FontWeight } from './catalog';

/**
 * Loads cached font files into the document with the FontFace API so the
 * settings preview shows exactly the files the export embeds. Each face gets
 * a private family name so it can't clash with fonts the theme provides.
 */
export class PreviewFonts {
	private readonly faces = new Map<string, Promise<FontFace>>();
	private readonly added: { doc: Document; face: FontFace }[] = [];

	constructor(private readonly cache: FontCache) {}

	/** The CSS family name the face is registered under. */
	familyName(family: FontName, weight: FontWeight): string {
		return `Song Export ${fontFileStem(family, weight)}`;
	}

	/** Loads the face (downloading the font if needed) into `doc`. */
	async load(doc: Document, family: FontName, weight: FontWeight): Promise<string> {
		const name = this.familyName(family, weight);
		let face = this.faces.get(name);
		if (!face) {
			face = this.create(doc, family, weight, name);
			this.faces.set(name, face);
			face.catch(() => this.faces.delete(name));
		}
		await face;
		return name;
	}

	/** Removes every loaded face from its document. */
	unload(): void {
		for (const { doc, face } of this.added) doc.fonts.delete(face);
		this.added.length = 0;
		this.faces.clear();
	}

	private async create(
		doc: Document,
		family: FontName,
		weight: FontWeight,
		name: string,
	): Promise<FontFace> {
		const file = await this.cache.get(family, weight);
		const face = new FontFace(name, file.bytes.slice(0), { weight: String(weight) });
		await face.load();
		doc.fonts.add(face);
		this.added.push({ doc, face });
		return face;
	}
}
