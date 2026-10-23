import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { GroupedSong, groupSongs, groupTitle, propertyValues } from './groups';

const song = (title: string, ...groups: string[]): GroupedSong => ({
	title,
	titleLines: [title],
	sections: [],
	groups,
});

const titles = (songs: { title: string }[]) => songs.map((s) => s.title);

describe('propertyValues', () => {
	it('reads text, lists and numbers, matching the name ignoring case', () => {
		assert.deepEqual(propertyValues({ 'Song-Status': [' learning ', '', null, 3] }, 'song-status'), ['learning', '3']);
		assert.deepEqual(propertyValues({ genre: 'blues' }, 'genre'), ['blues']);
		assert.deepEqual(propertyValues({ genre: null }, 'genre'), []);
		assert.deepEqual(propertyValues({ genre: { a: 1 } }, 'genre'), []);
		assert.deepEqual(propertyValues(undefined, 'genre'), []);
		assert.deepEqual(propertyValues({ genre: 'blues' }, ''), []);
	});
});

describe('groupTitle', () => {
	it('turns dashes and underscores into spaces and capitalizes', () => {
		assert.equal(groupTitle('in-progress'), 'In progress');
		assert.equal(groupTitle('hip_hop  -- soul'), 'Hip hop soul');
		assert.equal(groupTitle('élan'), 'Élan');
		assert.equal(groupTitle('AC/DC'), 'AC/DC');
	});
});

describe('groupSongs', () => {
	const songs = [
		song('A', 'learning'),
		song('B', 'Polishing', 'learning'),
		song('C'),
		song('D', 'done'),
	];

	it('makes every value a group, alphabetically, when none are listed', () => {
		const grouped = groupSongs(songs, []);
		assert.deepEqual(
			grouped.groups.map((g) => [g.title, titles(g.songs)]),
			[
				['Done', ['D']],
				['Learning', ['A', 'B']],
				['Polishing', ['B']],
			],
		);
		assert.deepEqual(titles(grouped.songs), ['A', 'B', 'D']);
		assert.equal(grouped.ungrouped, 1);
		assert.deepEqual(grouped.emptyGroups, []);
	});

	it('keeps only listed groups, in order, ignoring case, and reports empty ones', () => {
		const grouped = groupSongs(songs, ['polishing', 'on-hold', 'Learning', 'LEARNING']);
		assert.deepEqual(
			grouped.groups.map((g) => [g.title, titles(g.songs)]),
			[
				['Polishing', ['B']],
				['Learning', ['A', 'B']],
			],
		);
		assert.deepEqual(titles(grouped.songs), ['A', 'B']);
		assert.equal(grouped.ungrouped, 2);
		assert.deepEqual(grouped.emptyGroups, ['On hold']);
	});

	it('puts a song in a group once even with a repeated value', () => {
		const grouped = groupSongs([song('A', 'x', 'X')], []);
		assert.deepEqual(titles(grouped.groups[0]?.songs ?? []), ['A']);
	});
});
