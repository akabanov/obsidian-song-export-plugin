export interface ZipEntry {
	path: string;
	data: Uint8Array;
	/** Defaults to true. Already-compressed data (images) is better stored. */
	compress?: boolean;
}

/** Raw DEFLATE (no zlib header), e.g. Node's `zlib.deflateRawSync`. */
export type Deflate = (data: Uint8Array) => Uint8Array;

const STORED = 0;
const DEFLATED = 8;
const UTF8_NAMES = 0x0800;

/**
 * Writes a ZIP archive with the entries in the given order, which EPUB needs:
 * its `mimetype` entry must come first and be stored uncompressed.
 */
export function createZip(
	entries: ZipEntry[],
	deflate: Deflate,
	modified: Date,
): Uint8Array {
	const encoder = new TextEncoder();
	const { time, date } = dosDateTime(modified);
	const chunks: Uint8Array[] = [];
	const central: Uint8Array[] = [];
	let offset = 0;

	for (const entry of entries) {
		const name = encoder.encode(entry.path);
		const crc = crc32(entry.data);
		let method = STORED;
		let data = entry.data;
		if (entry.compress !== false && entry.data.length > 0) {
			const deflated = deflate(entry.data);
			if (deflated.length < entry.data.length) {
				method = DEFLATED;
				data = deflated;
			}
		}
		const flags = /[^\x20-\x7e]/.test(entry.path) ? UTF8_NAMES : 0;

		const local = new Header(30 + name.length);
		local.u32(0x04034b50).u16(20).u16(flags).u16(method).u16(time).u16(date);
		local.u32(crc).u32(data.length).u32(entry.data.length);
		local.u16(name.length).u16(0).bytes(name);
		chunks.push(local.buf, data);

		const header = new Header(46 + name.length);
		header.u32(0x02014b50).u16(20).u16(20).u16(flags).u16(method);
		header.u16(time).u16(date).u32(crc).u32(data.length).u32(entry.data.length);
		header.u16(name.length).u16(0).u16(0).u16(0).u16(0).u32(0).u32(offset);
		header.bytes(name);
		central.push(header.buf);

		offset += local.buf.length + data.length;
	}

	const centralSize = central.reduce((sum, chunk) => sum + chunk.length, 0);
	const end = new Header(22);
	end.u32(0x06054b50).u16(0).u16(0).u16(entries.length).u16(entries.length);
	end.u32(centralSize).u32(offset).u16(0);

	return concat([...chunks, ...central, end.buf]);
}

class Header {
	readonly buf: Uint8Array;
	private readonly view: DataView;
	private pos = 0;

	constructor(size: number) {
		this.buf = new Uint8Array(size);
		this.view = new DataView(this.buf.buffer);
	}

	u16(value: number): this {
		this.view.setUint16(this.pos, value, true);
		this.pos += 2;
		return this;
	}

	u32(value: number): this {
		this.view.setUint32(this.pos, value, true);
		this.pos += 4;
		return this;
	}

	bytes(value: Uint8Array): this {
		this.buf.set(value, this.pos);
		this.pos += value.length;
		return this;
	}
}

function dosDateTime(d: Date): { time: number; date: number } {
	const year = Math.max(d.getFullYear(), 1980);
	return {
		time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
		date: ((year - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
	};
}

function concat(chunks: Uint8Array[]): Uint8Array {
	const out = new Uint8Array(chunks.reduce((sum, c) => sum + c.length, 0));
	let pos = 0;
	for (const chunk of chunks) {
		out.set(chunk, pos);
		pos += chunk.length;
	}
	return out;
}

let crcTable: Uint32Array | null = null;

export function crc32(data: Uint8Array): number {
	if (!crcTable) {
		crcTable = new Uint32Array(256);
		for (let n = 0; n < 256; n++) {
			let c = n;
			for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
			crcTable[n] = c >>> 0;
		}
	}
	let crc = 0xffffffff;
	for (const byte of data) {
		crc = (crcTable[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
	}
	return (crc ^ 0xffffffff) >>> 0;
}
