import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { hasExcludedTag, parseTagList } from './tags';

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
