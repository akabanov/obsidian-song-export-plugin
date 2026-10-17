const ENTITIES: Record<string, string> = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&apos;',
};

/** Escapes text for use in XML content and attribute values. */
export function escapeXml(text: string): string {
	// Control characters other than tab and newlines aren't allowed in XML 1.0.
	return text
		// eslint-disable-next-line no-control-regex -- matching control characters is the point
		.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '')
		.replace(/[&<>"']/g, (c) => ENTITIES[c] ?? c);
}
