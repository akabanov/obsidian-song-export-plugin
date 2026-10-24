import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { extractCodeBlocks } from './code-blocks';
import { parseSectionHeader, parseSections, preprocessSection } from './sections';
import { compareSongTitles, parseSong, splitTitle } from './song';

describe('extractCodeBlocks', () => {
	it('returns only blocks with the given info string', () => {
		const md = [
			'Intro text',
			'```metronome',
			'bpm: 90',
			'```',
			'```chords',
			'[Verse]',
			'G',
			'```',
		].join('\n');
		assert.deepEqual(extractCodeBlocks(md, ['chords']), ['[Verse]\nG']);
	});

	it('accepts tilde fences and longer closing fences', () => {
		const md = '~~~chords\n[Intro]\nC\n~~~~\n````chords\n[Outro]\n```\nG\n````';
		assert.deepEqual(extractCodeBlocks(md, ['chords']), [
			'[Intro]\nC',
			'[Outro]\n```\nG',
		]);
	});

	it('ignores fences inside blocks of other types', () => {
		const md = '````markdown\n```chords\n[Verse]\n```\n````';
		assert.deepEqual(extractCodeBlocks(md, ['chords']), []);
	});

	it('matches the first word of the info string', () => {
		assert.deepEqual(extractCodeBlocks('``` chords extra\nA\n```', ['chords']), ['A']);
		assert.deepEqual(extractCodeBlocks('```chordsx\nA\n```', ['chords']), []);
	});

	it('runs an unclosed block to the end of the document', () => {
		assert.deepEqual(extractCodeBlocks('```chords\nA\nB', ['chords']), ['A\nB']);
	});

	it('removes the fence indentation from content lines', () => {
		assert.deepEqual(extractCodeBlocks('  ```chords\n    A\n B\n  ```', ['chords']), [
			'  A\nB',
		]);
	});

	it('uses a custom block name', () => {
		const md = '```chords\nA\n```\n```song\nB\n```';
		assert.deepEqual(extractCodeBlocks(md, ['song']), ['B']);
	});

	it('returns blocks of any of several names, in order of appearance', () => {
		const md = '```chordlyrics\nA\n```\n```tab\nB\n```\n```chords\nC\n```';
		assert.deepEqual(extractCodeBlocks(md, ['chords', 'chordlyrics']), ['A', 'C']);
	});
});

describe('parseSectionHeader', () => {
	it('recognises headers and trims the name', () => {
		assert.equal(parseSectionHeader('[Verse]'), 'Verse');
		assert.equal(parseSectionHeader('[Verse 2]'), 'Verse 2');
		assert.equal(parseSectionHeader('  [ Intro ]  '), 'Intro');
	});

	it('treats the examples from the spec as regular lines', () => {
		assert.equal(parseSectionHeader('[1.] 1 1 5 5'), null);
		assert.equal(parseSectionHeader('[Guitar Tabs](https://example.com)'), null);
		assert.equal(parseSectionHeader('[]'), null);
	});

	it('rejects nested brackets and blank names', () => {
		assert.equal(parseSectionHeader('[[Verse]]'), null);
		assert.equal(parseSectionHeader('[a]b]'), null);
		assert.equal(parseSectionHeader('[   ]'), null);
	});
});

describe('preprocessSection', () => {
	it('strips line-end hints', () => {
		assert.deepEqual(preprocessSection(['|b7 6m| |5 4| %t']), ['|b7 6m| |5 4|']);
		assert.deepEqual(preprocessSection(['G C %t %c']), ['G C']);
		assert.deepEqual(preprocessSection(['G C %t%c']), ['G C']);
	});

	it('keeps % tokens that are not line-end hints', () => {
		assert.deepEqual(preprocessSection(['G C%t']), ['G C%t']);
		assert.deepEqual(preprocessSection(['100% sure']), ['100% sure']);
		assert.deepEqual(preprocessSection(['%tc']), ['%tc']);
	});

	it('turns a line of only hints into an empty line', () => {
		assert.deepEqual(preprocessSection(['A', '%t', 'B']), ['A', '', 'B']);
	});

	it('keeps -- lines', () => {
		assert.deepEqual(preprocessSection(['A', '--', ' ----- ', '-', 'B']), [
			'A',
			'--',
			'-----',
			'-',
			'B',
		]);
	});

	it('groups consecutive tab lines into a block kept verbatim', () => {
		const lines = ['e|--0  -1-|', ' B|--3--', 'Eb|---', 'g#|--', 'G C', 'H|--', 'e|-'];
		assert.deepEqual(preprocessSection(lines), [
			{ tab: ['e|--0  -1-|', 'B|--3--', 'Eb|---', 'g#|--'] },
			'G C',
			'H|--',
			{ tab: ['e|-'] },
		]);
	});

	it('strips hints from tab lines', () => {
		assert.deepEqual(preprocessSection(['e|---- %t']), [{ tab: ['e|----'] }]);
	});

	it('splits tab blocks at empty lines', () => {
		assert.deepEqual(preprocessSection(['e|-1-', '', 'e|-2-']), [
			{ tab: ['e|-1-'] },
			'',
			{ tab: ['e|-2-'] },
		]);
	});

	it('collapses whitespace runs', () => {
		assert.deepEqual(preprocessSection(['   G              G7       C     G']), [
			'G G7 C G',
		]);
		assert.deepEqual(preprocessSection(['a\t\tb']), ['a b']);
	});

	it('keeps spacing when asked, trimming only line ends', () => {
		const lines = ['   G    G7  %t', 'Amazing  grace  ', '    ', '  e|-0-  ', '\tC'];
		assert.deepEqual(preprocessSection(lines, true), [
			'   G    G7',
			'Amazing  grace',
			'',
			{ tab: ['e|-0-'] },
			'\tC',
		]);
	});

	it('collapses empty-line runs and trims empty lines at the ends', () => {
		const lines = ['', '  ', 'A', '', '', '   ', 'B', '%t', '', 'C', '', ''];
		assert.deepEqual(preprocessSection(lines), ['A', '', 'B', '', 'C']);
	});

	it('returns nothing for an empty section', () => {
		assert.deepEqual(preprocessSection(['', '%c', '%t', '  ']), []);
	});
});

describe('parseSections', () => {
	it('discards text before the first header and empty sections', () => {
		const content = [
			'Capo 2',
			'[Intro]',
			'%t',
			'[Verse 1]',
			'   G              G7       C     G',
			'Amazing grace! How sweet the sound',
			'',
			'[Outro]',
			'',
		].join('\n');
		assert.deepEqual(parseSections(content), [
			{
				name: 'Verse 1',
				lines: ['G G7 C G', 'Amazing grace! How sweet the sound'],
			},
		]);
	});

	it('keeps regular lines that look like links or numbered bars', () => {
		const content = '[Verse]\n[1.] 1 1 5 5\n[Guitar Tabs](https://x)\n[]';
		assert.deepEqual(parseSections(content), [
			{ name: 'Verse', lines: ['[1.] 1 1 5 5', '[Guitar Tabs](https://x)', '[]'] },
		]);
	});
});

describe('parseSong', () => {
	it('keeps spacing when asked', () => {
		const md = '```chords\n[Verse]\n  G     C\nAmazing grace\n```';
		assert.deepEqual(parseSong('x', md, ['chords'], true), {
			kind: 'song',
			song: { title: 'x', sections: [{ name: 'Verse', lines: ['  G     C', 'Amazing grace'] }] },
		});
	});

	it('joins chords blocks so a section continues into the next block', () => {
		const md = [
			'```chords',
			'ignored',
			'[Verse 1]',
			'G G7',
			'```',
			'',
			'Notes between blocks are ignored.',
			'',
			'```metronome',
			'[Not a section]',
			'```',
			'~~~chords',
			'Amazing grace',
			'[Chorus]',
			'C G',
			'~~~',
		].join('\n');
		assert.deepEqual(parseSong('Amazing Grace', md, ['chords']), {
			kind: 'song',
			song: {
				title: 'Amazing Grace',
				sections: [
					{ name: 'Verse 1', lines: ['G G7', 'Amazing grace'] },
					{ name: 'Chorus', lines: ['C G'] },
				],
			},
		});
	});

	it('reports notes without chords blocks as not songs', () => {
		assert.deepEqual(parseSong('x', '# Just a note', ['chords']), {
			kind: 'not-a-song',
		});
	});

	it('skips songs without non-empty sections', () => {
		assert.equal(parseSong('x', '```chords\nno header\n```', ['chords']).kind, 'skipped');
		assert.equal(parseSong('x', '```chords\n[Verse]\n%t\n```', ['chords']).kind, 'skipped');
	});
});

describe('splitTitle', () => {
	it('splits at the first occurrence of the sequence', () => {
		assert.deepEqual(splitTitle('Armstrong - What a Wonderful World', ' - '), [
			'Armstrong',
			'What a Wonderful World',
		]);
		assert.deepEqual(splitTitle('A - B - C', ' - '), ['A', 'B - C']);
	});

	it('keeps one line when the sequence is missing or empty', () => {
		assert.deepEqual(splitTitle('Amazing Grace', ' - '), ['Amazing Grace']);
		assert.deepEqual(splitTitle('A - B', ''), ['A - B']);
	});

	it('keeps one line when a part would be empty', () => {
		assert.deepEqual(splitTitle(' - Intro', ' - '), [' - Intro']);
	});
});

describe('compareSongTitles', () => {
	it('sorts case-insensitively', () => {
		const titles = ['beta', 'Alpha', 'gamma', 'Beta 2'];
		assert.deepEqual(titles.sort(compareSongTitles), ['Alpha', 'beta', 'Beta 2', 'gamma']);
	});
});
