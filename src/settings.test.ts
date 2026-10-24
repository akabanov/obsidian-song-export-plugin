import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_SETTINGS, migrateSettings, trimSettings } from './settings';

describe('migrateSettings', () => {
	it('fills in defaults and drops unknown languages and removed settings', () => {
		const settings = migrateSettings({ bookLanguage: 'xx', titleFont: 'serif', monoTextSize: 10 });
		assert.equal(settings.bookLanguage, 'en');
		assert.equal(settings.monoTextSize, 50);
		assert.equal(settings.excludedTags, 'template');
		assert.ok(!('titleFont' in settings));
	});

	it('carries a custom code block name over to the code block names', () => {
		const custom = migrateSettings({ codeBlockName: 'song' });
		assert.equal(custom.codeBlockNames, 'song');
		assert.ok(!('codeBlockName' in custom));
		assert.equal(migrateSettings({ codeBlockName: 'chords' }).codeBlockNames, 'chords, chordlyrics');
		assert.equal(migrateSettings({ codeBlockName: 'song', codeBlockNames: 'a, b' }).codeBlockNames, 'a, b');
	});
});

describe('trimSettings', () => {
	it('trims text settings but not the title split sequence', () => {
		const settings = trimSettings({
			...DEFAULT_SETTINGS,
			bookTitle: ' My book ',
			outputFile: ' ~/a.epub\n',
			titleSplitSequence: ' - ',
		});
		assert.equal(settings.bookTitle, 'My book');
		assert.equal(settings.outputFile, '~/a.epub');
		assert.equal(settings.titleSplitSequence, ' - ');
	});
});
