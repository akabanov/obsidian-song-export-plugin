import { App, PluginSettingTab, SettingDefinitionItem } from 'obsidian';
import type SongbookMakerPlugin from '../main';
import { SONGBOOK_ICON } from './icon';
import { PropertyNameSuggest, PropertyValueListSuggest } from './property-suggest';
import { TagListSuggest } from './tag-suggest';
import {
	DEFAULT_SETTINGS,
	LANGUAGES,
	MAX_MONO_TEXT_SIZE,
	MAX_SCALE,
	MAX_TEXT_SIZE,
	MIN_MONO_TEXT_SIZE,
	MIN_SCALE,
	MIN_TEXT_SIZE,
	SongbookMakerSettings,
} from '../settings';

const KOBO_HELP_URL =
	'https://github.com/akabanov/obsidian-songbook-maker-plugin#reading-on-a-kobo';

type Key = keyof SongbookMakerSettings;

/** Language names in alphabetical order, keyed by code. */
const LANGUAGE_OPTIONS: Record<string, string> = Object.fromEntries(
	Object.entries(LANGUAGES).sort(([, a], [, b]) => a.localeCompare(b)),
);

const percent = (value: number) => `${value}%`;
const times = (value: number) => `${value}×`;

/** The settings, declared for Obsidian to render and index for search. */
export class SongbookMakerSettingTab extends PluginSettingTab {
	constructor(
		app: App,
		private readonly plugin: SongbookMakerPlugin,
	) {
		super(app, plugin);
		this.icon = SONGBOOK_ICON;
	}

	getControlValue(key: string): unknown {
		return this.plugin.settings[key as Key];
	}

	async setControlValue(key: string, value: unknown): Promise<void> {
		(this.plugin.settings as unknown as Record<string, unknown>)[key] = value;
		await this.plugin.saveSettings();
		// The cover image path is shown only for a custom cover, and the group
		// settings only with a group property.
		if (key === 'coverImage' || key === 'groupProperty') this.refreshDomState();
	}

	getSettingDefinitions(): SettingDefinitionItem<Key>[] {
		const settings = () => this.plugin.settings;
		const grouped = () => settings().groupProperty.trim() !== '';
		return [
			{
				type: 'group',
				items: [
					{
						name: 'Songs directory',
						desc: 'Vault folder searched recursively for song notes. Empty means the vault root.',
						control: { type: 'folder', key: 'songsDirectory', includeRoot: true },
					},
					{
						name: 'Excluded tags',
						desc: 'Notes with any of these tags, or tags nested under them, are left out. Separate with commas or spaces.',
						// A text field with completion from the vault's tags.
						render: (setting) => {
							let suggest: TagListSuggest | undefined;
							setting.addText((text) => {
								text
									.setPlaceholder(DEFAULT_SETTINGS.excludedTags)
									.setValue(settings().excludedTags)
									.onChange((value) => this.setControlValue('excludedTags', value));
								suggest = new TagListSuggest(this.app, text.inputEl);
							});
							return () => suggest?.close();
						},
					},
					{
						name: 'Code block name',
						desc: 'Notes with code blocks of this type are songs; only their contents are exported. Chord Sheets uses chords.',
						control: {
							type: 'text',
							key: 'codeBlockName',
							placeholder: DEFAULT_SETTINGS.codeBlockName,
						},
					},
					{
						name: 'Output file',
						desc: 'Absolute path of the EPUB file. A leading ~ expands to your home directory.',
						control: {
							type: 'text',
							key: 'outputFile',
							placeholder: DEFAULT_SETTINGS.outputFile,
						},
					},
					{
						name: 'Show in folder after export',
						desc: "Opens your system's file manager with the EPUB file selected.",
						control: { type: 'toggle', key: 'showInFolder' },
					},
				],
			},
			{
				type: 'group',
				heading: 'Groups',
				items: [
					{
						name: 'Group by property',
						desc: 'Songs are grouped by the values of this note property, each group opening with a title page, and the book ends with an index. Leave empty to list all songs without groups.',
						// A text field with completion from the vault's properties.
						render: (setting) => {
							let suggest: PropertyNameSuggest | undefined;
							setting.addText((text) => {
								text
									.setValue(settings().groupProperty)
									.onChange((value) => this.setControlValue('groupProperty', value));
								suggest = new PropertyNameSuggest(this.app, text.inputEl);
							});
							return () => suggest?.close();
						},
					},
					{
						name: 'Groups',
						desc: 'Property values to include, in book order, separated by commas. Songs with none of them are left out. Leave empty to include every value, in alphabetical order.',
						aliases: ['group order'],
						visible: grouped,
						// A text field with completion from the property's values.
						render: (setting) => {
							let suggest: PropertyValueListSuggest | undefined;
							setting.addText((text) => {
								text
									.setValue(settings().groups)
									.onChange((value) => this.setControlValue('groups', value));
								suggest = new PropertyValueListSuggest(
									this.app,
									text.inputEl,
									() => settings().groupProperty,
								);
							});
							return () => suggest?.close();
						},
					},
				],
			},
			{
				type: 'group',
				heading: 'Book',
				items: [
					{
						name: 'Book title',
						desc: 'Shown by e-book readers.',
						control: {
							type: 'text',
							key: 'bookTitle',
							placeholder: DEFAULT_SETTINGS.bookTitle,
						},
					},
					{
						name: 'Book author',
						desc: 'Leave empty to omit.',
						control: {
							type: 'text',
							key: 'bookAuthor',
							placeholder: DEFAULT_SETTINGS.bookAuthor,
						},
					},
					{
						name: 'Book language',
						desc: 'Your reader uses it to pick a dictionary and a text-to-speech voice; songs in other languages still show just fine.',
						control: { type: 'dropdown', key: 'bookLanguage', options: LANGUAGE_OPTIONS },
					},
					{
						name: 'Cover image',
						desc: createFragment((desc) => {
							desc.appendText('Kobo may keep showing an old cover. ');
							desc.createEl('a', { text: 'How to fix it', href: KOBO_HELP_URL });
						}),
						control: {
							type: 'dropdown',
							key: 'coverImage',
							options: { none: 'None', default: 'Default', custom: 'Custom image' },
						},
					},
					{
						name: 'Cover image path',
						desc: 'JPEG, PNG or WebP. A vault path, or an absolute path starting with / or ~.',
						visible: () => settings().coverImage === 'custom',
						control: { type: 'text', key: 'coverImagePath' },
					},
				],
			},
			{
				type: 'group',
				heading: 'Layout',
				items: [
					{
						name: 'Title split sequence',
						desc: 'The song title is split into two lines at the first occurrence of this text. Leave empty to never split.',
						// Not trimmed: surrounding spaces are part of the sequence.
						control: { type: 'text', key: 'titleSplitSequence' },
					},
					{
						name: 'Flashcard-style sections',
						desc: 'Each section title gets a page, and its content follows on the next, for drilling one part at a time. Turn off for a regular songbook layout.',
						control: { type: 'toggle', key: 'sectionTitleOwnPage' },
					},
					{
						name: 'Use regular font',
						desc: "Songs use your reader's font. Its letters aren't all the same width, so spaces can't line chords up over their syllables anyway: extra spaces are dropped, and each chord line shows just the chords, in order, above its lyric line. Easier to read on a small screen. Turn off to keep the spacing from your notes, in a monospaced font.",
						aliases: ['monospace', 'chord alignment'],
						control: { type: 'toggle', key: 'regularFont' },
					},
					{
						name: 'Text size',
						desc: "Percent of your reader's font size. Titles scale with it.",
						control: {
							type: 'slider',
							key: 'textSize',
							min: MIN_TEXT_SIZE,
							max: MAX_TEXT_SIZE,
							step: 5,
							displayFormat: percent,
						},
					},
					{
						name: 'Monospace text size',
						desc: 'Percent of the text size, for guitar tabs, and for all song content with the regular font off.',
						control: {
							type: 'slider',
							key: 'monoTextSize',
							min: MIN_MONO_TEXT_SIZE,
							max: MAX_MONO_TEXT_SIZE,
							step: 5,
							displayFormat: percent,
						},
					},
					{
						name: 'Section title size',
						desc: 'Multiplier of the content text size.',
						control: {
							type: 'slider',
							key: 'sectionTitleScale',
							min: MIN_SCALE,
							max: MAX_SCALE,
							step: 0.25,
							displayFormat: times,
						},
					},
					{
						name: 'Song title size',
						desc: 'Multiplier of the section title size.',
						control: {
							type: 'slider',
							key: 'songTitleScale',
							min: MIN_SCALE,
							max: MAX_SCALE,
							step: 0.25,
							displayFormat: times,
						},
					},
					{
						name: 'Group title size',
						desc: 'Multiplier of the song title size.',
						visible: grouped,
						control: {
							type: 'slider',
							key: 'groupTitleScale',
							min: MIN_SCALE,
							max: MAX_SCALE,
							step: 0.25,
							displayFormat: times,
						},
					},
				],
			},
		];
	}
}
