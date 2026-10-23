import { AbstractInputSuggest, App } from 'obsidian';
import { propertyValues } from '../export/groups';
import { completeCommaList, suggestListItems, uniqueSorted } from '../utils/lists';

function frontmatters(app: App): Record<string, unknown>[] {
	const { vault, metadataCache } = app;
	return vault
		.getMarkdownFiles()
		.map((file) => metadataCache.getFileCache(file)?.frontmatter)
		.filter((frontmatter) => frontmatter !== undefined);
}

/** Completes a property name from the properties used in the vault. */
export class PropertyNameSuggest extends AbstractInputSuggest<string> {
	private readonly names: string[];

	constructor(
		app: App,
		private readonly nameInputEl: HTMLInputElement,
	) {
		super(app, nameInputEl);
		this.names = uniqueSorted(frontmatters(app).map(Object.keys));
	}

	protected getSuggestions(query: string): string[] {
		const text = query.trim().toLowerCase();
		return this.names.filter((name) => name.toLowerCase().includes(text));
	}

	renderSuggestion(name: string, el: HTMLElement): void {
		el.setText(name);
	}

	selectSuggestion(name: string): void {
		this.setValue(name);
		// Let the text component see the change and save it.
		this.nameInputEl.dispatchEvent(new Event('input'));
		this.close();
	}
}

/**
 * Completes the value being typed in a comma-separated list from the values
 * of a property used in the vault.
 */
export class PropertyValueListSuggest extends AbstractInputSuggest<string> {
	/** Values of the property they were read for, read on first use. */
	private values: { property: string; values: string[] } | undefined;

	constructor(
		app: App,
		private readonly listInputEl: HTMLInputElement,
		private readonly property: () => string,
	) {
		super(app, listInputEl);
	}

	protected getSuggestions(query: string): string[] {
		const property = this.property().trim();
		if (this.values?.property !== property) {
			const values = frontmatters(this.app).map((fm) => propertyValues(fm, property));
			this.values = { property, values: uniqueSorted(values) };
		}
		return suggestListItems(this.values.values, query);
	}

	renderSuggestion(value: string, el: HTMLElement): void {
		el.setText(value);
	}

	selectSuggestion(value: string): void {
		this.setValue(completeCommaList(this.getValue(), value));
		// Let the text component see the change and save it.
		this.listInputEl.dispatchEvent(new Event('input'));
		this.close();
	}
}
