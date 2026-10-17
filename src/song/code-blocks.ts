const OPENING_FENCE = /^( {0,3})(`{3,}|~{3,})(.*)$/;

/**
 * Returns the contents of the fenced code blocks whose info string is `name`,
 * in order of appearance. Follows CommonMark: a block is closed by a fence of
 * the same character that is at least as long as the opening one, and an
 * unclosed block runs to the end of the document. Blocks of other types are
 * skipped as a whole, so a fence inside them doesn't count.
 */
export function extractCodeBlocks(markdown: string, name: string): string[] {
	const lines = markdown.split(/\r\n|\r|\n/);
	const blocks: string[] = [];
	let i = 0;
	while (i < lines.length) {
		const open = OPENING_FENCE.exec(lines[i] ?? '');
		i++;
		if (!open) continue;
		const indent = open[1]?.length ?? 0;
		const fence = open[2] ?? '';
		const info = (open[3] ?? '').trim();
		// Backtick fences can't have backticks in their info string.
		if (fence.startsWith('`') && info.includes('`')) continue;

		const body: string[] = [];
		while (i < lines.length) {
			const line = lines[i] ?? '';
			i++;
			if (isClosingFence(line, fence)) break;
			body.push(stripIndent(line, indent));
		}
		if (info.split(/\s+/)[0] === name) blocks.push(body.join('\n'));
	}
	return blocks;
}

function isClosingFence(line: string, fence: string): boolean {
	const match = /^ {0,3}(`{3,}|~{3,})\s*$/.exec(line);
	const closing = match?.[1];
	return (
		closing !== undefined &&
		closing[0] === fence[0] &&
		closing.length >= fence.length
	);
}

/** Removes up to `indent` leading spaces, as CommonMark does for fenced code. */
function stripIndent(line: string, indent: number): string {
	let n = 0;
	while (n < indent && line[n] === ' ') n++;
	return line.slice(n);
}
