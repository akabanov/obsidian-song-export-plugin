import type { CoverMediaType } from './book';

export interface ImageSize {
	width: number;
	height: number;
}

/**
 * Reads the pixel size from a JPEG, PNG or WebP header. Returns null when the
 * header can't be parsed.
 */
export function imageSize(bytes: Uint8Array, type: CoverMediaType): ImageSize | null {
	const size =
		type === 'image/jpeg' ? jpegSize(bytes) : type === 'image/png' ? pngSize(bytes) : webpSize(bytes);
	return size && size.width > 0 && size.height > 0 ? size : null;
}

function jpegSize(bytes: Uint8Array): ImageSize | null {
	const u16 = (at: number) => ((bytes[at] ?? 0) << 8) | (bytes[at + 1] ?? 0);
	let pos = 2;
	while (pos + 9 < bytes.length) {
		if (bytes[pos] !== 0xff) return null;
		const marker = bytes[pos + 1] ?? 0;
		if (marker === 0xff) {
			pos++; // fill byte
			continue;
		}
		// Standalone markers carry no length.
		if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) {
			pos += 2;
			continue;
		}
		// SOF0–SOF15, except DHT (C4), JPG (C8) and DAC (CC).
		if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
			return { height: u16(pos + 5), width: u16(pos + 7) };
		}
		pos += 2 + u16(pos + 2);
	}
	return null;
}

function pngSize(bytes: Uint8Array): ImageSize | null {
	if (bytes.length < 24) return null;
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	return { width: view.getUint32(16), height: view.getUint32(20) };
}

function webpSize(bytes: Uint8Array): ImageSize | null {
	if (bytes.length < 30) return null;
	const b = (at: number) => bytes[at] ?? 0;
	const chunk = String.fromCharCode(b(12), b(13), b(14), b(15));
	if (chunk === 'VP8 ') {
		return {
			width: (b(26) | (b(27) << 8)) & 0x3fff,
			height: (b(28) | (b(29) << 8)) & 0x3fff,
		};
	}
	if (chunk === 'VP8L') {
		return {
			width: 1 + (((b(22) & 0x3f) << 8) | b(21)),
			height: 1 + (((b(24) & 0x0f) << 10) | (b(23) << 2) | ((b(22) & 0xc0) >> 6)),
		};
	}
	if (chunk === 'VP8X') {
		return {
			width: 1 + (b(24) | (b(25) << 8) | (b(26) << 16)),
			height: 1 + (b(27) | (b(28) << 8) | (b(29) << 16)),
		};
	}
	return null;
}
