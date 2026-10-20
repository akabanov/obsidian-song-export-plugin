import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	collectTagNames,
	completeTagList,
	hasExcludedTag,
	lastTagToken,
	parseTagList,
	suggestTags,
} from './tags';

describe('parseTagList', () => {
	it('splits at commas and whitespace and drops #', () => {
		assert.deepEqual(parseTagList(' #Template, draft  wip,,'), ['template', 'draft', 'wip']);
		assert.deepEqual(parseTagList(''), []);
	});
});

describe('hasExcludedTag', () => {
	it('matches tags ignoring case, including nested ones', () => {
		assert.ok(hasExcludedTag(['#song', '#Template'], ['template']));
		assert.ok(hasExcludedTag(['#template/song'], ['template']));
		assert.ok(!hasExcludedTag(['#templates', '#my/template'], ['template']));
		assert.ok(!hasExcludedTag(['#template'], []));
	});
});

describe('tag completion', () => {
	it('finds the tag being typed', () => {
		assert.equal(lastTagToken('template, dra'), 'dra');
		assert.equal(lastTagToken('template, '), '');
		assert.equal(lastTagToken('#wip'), '#wip');
	});

	it('replaces the tag being typed', () => {
		assert.equal(completeTagList('template, dra', 'draft'), 'template, draft, ');
		assert.equal(completeTagList('', 'draft'), 'draft, ');
	});

	it('suggests matching tags not listed yet', () => {
		const tags = ['draft', 'Template', 'template/song', 'wip'];
		assert.deepEqual(suggestTags(tags, 'template, #TEMP'), ['template/song']);
		assert.deepEqual(suggestTags(tags, 'wip '), ['draft', 'Template', 'template/song']);
		assert.deepEqual(suggestTags(tags, ''), tags);
	});

	it('collects tag names with their parents', () => {
		assert.deepEqual(
			collectTagNames([['#song', '#Template/song'], ['#template', '#draft']]),
			['draft', 'song', 'Template', 'Template/song'],
		);
	});
});
