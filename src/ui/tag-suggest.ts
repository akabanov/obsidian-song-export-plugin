import { AbstractInputSuggest, App, getAllTags } from 'obsidian';
import { collectTagNames, completeTagList, suggestTags } from '../utils/tags';

/**
 * Completes the tag being typed in a comma-separated tag list from the tags
 * used in the vault.
 */
export class TagListSuggest extends AbstractInputSuggest<string> {
	private readonly vaultTags: string[];

	constructor(
		app: App,
		private readonly tagInputEl: HTMLInputElement,
	) {
		super(app, tagInputEl);
		const { vault, metadataCache } = app;
		this.vaultTags = collectTagNames(
			vault.getMarkdownFiles().map((file) => {
				const cache = metadataCache.getFileCache(file);
				return (cache && getAllTags(cache)) ?? [];
			}),
		);
	}

	protected getSuggestions(query: string): string[] {
		return suggestTags(this.vaultTags, query);
	}

	renderSuggestion(tag: string, el: HTMLElement): void {
		el.setText(`#${tag}`);
	}

	selectSuggestion(tag: string): void {
		this.setValue(completeTagList(this.getValue(), tag));
		// Let the text component see the change and save it.
		this.tagInputEl.dispatchEvent(new Event('input'));
		this.close();
	}
}
