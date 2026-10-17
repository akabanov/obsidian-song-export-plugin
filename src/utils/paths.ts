/** Expands a leading `~` (alone or followed by a separator) to `home`. */
export function expandHome(path: string, home: string): string {
	if (path === '~') return home;
	if (/^~[/\\]/.test(path)) return home + path.slice(1);
	return path;
}

/** Whether a cover image path points outside the vault. */
export function isFilesystemPath(path: string): boolean {
	return path.startsWith('/') || path.startsWith('~');
}
