import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_SETTINGS, Language, normalizeSettings, trimSettings } from './settings';

describe('normalizeSettings', () => {
	it('fills in defaults and drops unknown languages', () => {
		const settings = normalizeSettings({ bookLanguage: 'xx' as Language, monoTextSize: 10 });
		assert.equal(settings.bookLanguage, 'en');
		assert.equal(settings.monoTextSize, 50);
		assert.equal(settings.excludedTags, 'template');
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
