import { Platform } from 'obsidian';

export interface NodeApis {
	fs: typeof import('fs');
	path: typeof import('path');
	os: typeof import('os');
	zlib: typeof import('zlib');
}

/**
 * Node's modules, loaded lazily. The export writes outside the vault, so the
 * plugin is desktop-only (see SPEC.md) and this is the one place it needs
 * Node.
 */
export function nodeApis(): NodeApis {
	if (!Platform.isDesktop) {
		throw new Error('Exporting songs needs the desktop app.');
	}
	/* eslint-disable @typescript-eslint/no-require-imports -- loaded lazily, desktop only */
	return {
		fs: require('fs') as typeof import('fs'),
		path: require('path') as typeof import('path'),
		os: require('os') as typeof import('os'),
		zlib: require('zlib') as typeof import('zlib'),
	};
	/* eslint-enable @typescript-eslint/no-require-imports -- end of lazy loads */
}
