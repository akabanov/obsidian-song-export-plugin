import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_COVER, detectImageType } from '../cover';
import { imageSize } from '../epub/image-size';
import { expandHome, isFilesystemPath } from '../utils/paths';

describe('expandHome', () => {
	it('expands a leading ~ only', () => {
		assert.equal(expandHome('~/Documents/my-songbook.epub', '/home/a'), '/home/a/Documents/my-songbook.epub');
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

describe('imageSize', () => {
	it('reads JPEG, PNG and WebP dimensions', () => {
		assert.deepEqual(imageSize(DEFAULT_COVER.bytes, 'image/jpeg'), { width: 1440, height: 1929 });

		const png = new Uint8Array(24);
		png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
		new DataView(png.buffer).setUint32(16, 1264);
		new DataView(png.buffer).setUint32(20, 1680);
		assert.deepEqual(imageSize(png, 'image/png'), { width: 1264, height: 1680 });

		const webp = (chunk: string, header: number[]) => {
			const bytes = new Uint8Array(30);
			bytes.set(new TextEncoder().encode(`RIFF\0\0\0\0WEBP${chunk}`));
			bytes.set(header, 20);
			return bytes;
		};
		// 640×480: 14-bit sizes after the start code.
		const lossy = webp('VP8 ', [0, 0, 0, 0x9d, 0x01, 0x2a, 0x80, 0x02, 0xe0, 0x01]);
		assert.deepEqual(imageSize(lossy, 'image/webp'), { width: 640, height: 480 });
		// 300×200: 14-bit sizes minus one, packed little-endian after 0x2f.
		const lossless = webp('VP8L', [0x2f, 0x2b, 0xc1, 0x31, 0x00]);
		assert.deepEqual(imageSize(lossless, 'image/webp'), { width: 300, height: 200 });
		// 1072×1448: 24-bit sizes minus one, after the flags.
		const extended = webp('VP8X', [0, 0, 0, 0, 0x2f, 0x04, 0x00, 0xa7, 0x05, 0x00]);
		assert.deepEqual(imageSize(extended, 'image/webp'), { width: 1072, height: 1448 });

		assert.equal(imageSize(new Uint8Array([0xff, 0xd8, 0xff]), 'image/jpeg'), null);
	});
});
