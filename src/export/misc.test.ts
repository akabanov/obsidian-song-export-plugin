import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_COVER, detectImageType } from '../cover';
import { expandHome, isFilesystemPath } from '../utils/paths';

describe('expandHome', () => {
	it('expands a leading ~ only', () => {
		assert.equal(expandHome('~/Documents/my-songs.epub', '/home/a'), '/home/a/Documents/my-songs.epub');
		assert.equal(expandHome('~', '/home/a'), '/home/a');
		assert.equal(expandHome('~\\Books', 'C:\\Users\\a'), 'C:\\Users\\a\\Books');
		assert.equal(expandHome('/srv/~/x', '/home/a'), '/srv/~/x');
		assert.equal(expandHome('~bob/x', '/home/a'), '~bob/x');
	});
});

describe('isFilesystemPath', () => {
	it('treats / and ~ paths as filesystem paths', () => {
		assert.ok(isFilesystemPath('/tmp/cover.png'));
		assert.ok(isFilesystemPath('~/cover.png'));
		assert.ok(!isFilesystemPath('Attachments/cover.png'));
	});
});

describe('detectImageType', () => {
	it('recognises the bundled cover and other formats', () => {
		assert.equal(detectImageType(DEFAULT_COVER.bytes), 'image/jpeg');
		const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]);
		assert.equal(detectImageType(png), 'image/png');
		const webp = new TextEncoder().encode('RIFF\0\0\0\0WEBPVP8 ');
		assert.equal(detectImageType(webp), 'image/webp');
		assert.equal(detectImageType(new TextEncoder().encode('GIF89a')), null);
		assert.equal(detectImageType(new Uint8Array()), null);
	});
});
