import { Platform } from 'obsidian';

export interface NodeApis {
	fs: typeof import('fs');
	path: typeof import('path');
	os: typeof import('os');
	zlib: typeof import('zlib');
	/** Opens the system file manager with the file selected. */
	showItemInFolder: (path: string) => void;
}

interface ElectronShell {
	shell: { showItemInFolder: (path: string) => void };
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
		showItemInFolder: (path) =>
			(require('electron') as ElectronShell).shell.showItemInFolder(path),
	};
	/* eslint-enable @typescript-eslint/no-require-imports -- end of lazy loads */
}
