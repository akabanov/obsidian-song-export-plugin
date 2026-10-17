import defaultCover from '../assets/default-cover.jpg';
import { BookCover, CoverMediaType } from './epub/book';

export const DEFAULT_COVER: BookCover = {
	bytes: defaultCover,
	mediaType: 'image/jpeg',
};

/** Detects JPEG, PNG and WebP images by their magic bytes. */
export function detectImageType(bytes: Uint8Array): CoverMediaType | null {
	const startsWith = (signature: number[], at = 0) =>
		signature.every((byte, i) => bytes[at + i] === byte);
	if (startsWith([0xff, 0xd8, 0xff])) return 'image/jpeg';
	if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
	// "RIFF" <size> "WEBP"
	if (startsWith([0x52, 0x49, 0x46, 0x46]) && startsWith([0x57, 0x45, 0x42, 0x50], 8)) {
		return 'image/webp';
	}
	return null;
}
