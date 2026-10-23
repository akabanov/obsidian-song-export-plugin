import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { completeCommaList, parseCommaList, suggestListItems, uniqueSorted } from './lists';

describe('parseCommaList', () => {
	it('splits at commas only, trimming items', () => {
		assert.deepEqual(parseCommaList(' learning, rock and roll,,  '), ['learning', 'rock and roll']);
		assert.deepEqual(parseCommaList(''), []);
	});
});

describe('completeCommaList', () => {
	it('replaces the item being typed', () => {
		assert.equal(completeCommaList('', 'learning'), 'learning, ');
		assert.equal(completeCommaList('learning, pol', 'polishing'), 'learning, polishing, ');
		assert.equal(completeCommaList('learning,pol', 'polishing'), 'learning, polishing, ');
	});
});

describe('suggestListItems', () => {
	const values = ['done', 'learning', 'polishing'];

	it('suggests values containing the item being typed, not yet listed', () => {
		assert.deepEqual(suggestListItems(values, ''), values);
		assert.deepEqual(suggestListItems(values, 'learning, IN'), ['polishing']);
		assert.deepEqual(suggestListItems(values, 'learning, '), ['done', 'polishing']);
	});
});

describe('uniqueSorted', () => {
	it('keeps the first spelling of each value', () => {
		assert.deepEqual(uniqueSorted([['b', 'A'], ['a', 'c']]), ['A', 'b', 'c']);
	});
});
