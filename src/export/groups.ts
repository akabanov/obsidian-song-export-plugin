import { BookGroup, BookSong } from '../epub/book';
import { compareSongTitles } from '../song/song';

/** A song with the values of its group property. */
export interface GroupedSong extends BookSong {
	groups: string[];
}

export interface SongGroups {
	groups: BookGroup[];
	/** Every song in at least one group, once each, in title order. */
	songs: BookSong[];
	/** How many songs are in none of the groups. */
	ungrouped: number;
	/** Names of listed groups with no songs, left out of the book. */
	emptyGroups: string[];
}

/**
 * The values of `property` in a note's frontmatter, as trimmed non-empty
 * strings. A list gives one value per item. The property name matches
 * ignoring case, as Obsidian's properties do.
 */
export function propertyValues(
	frontmatter: Record<string, unknown> | undefined,
	property: string,
): string[] {
	if (!frontmatter || !property) return [];
	const name = property.toLowerCase();
	const key = Object.keys(frontmatter).find((k) => k.toLowerCase() === name);
	if (key === undefined) return [];
	const value = frontmatter[key];
	const items = Array.isArray(value) ? (value as unknown[]) : [value];
	return items
		.filter((item) => ['string', 'number', 'boolean'].includes(typeof item))
		.map((item) => String(item as string | number | boolean).trim())
		.filter((item) => item !== '');
}

/**
 * A group's title, from the property value: dashes and underscores become
 * spaces, and the first letter is capitalized. `in-progress` → `In progress`.
 */
export function groupTitle(value: string): string {
	const text = value.replace(/[-_\s]+/g, ' ').trim();
	return text.charAt(0).toLocaleUpperCase() + text.slice(1);
}

/** Group keys match ignoring case and surrounding spaces. */
const groupKey = (value: string) => value.trim().toLowerCase();

/**
 * Puts `songs` (in title order) into groups. With `listed` groups, those are
 * the groups, in that order; otherwise every value of the group property
 * is a group, in alphabetical order. A song with more than one value goes
 * into each of its groups.
 */
export function groupSongs(songs: GroupedSong[], listed: string[]): SongGroups {
	const members = new Map<string, { value: string; songs: GroupedSong[] }>();
	for (const value of listed) {
		const key = groupKey(value);
		if (!members.has(key)) members.set(key, { value, songs: [] });
	}
	for (const song of songs) {
		for (const value of song.groups) {
			const key = groupKey(value);
			let group = members.get(key);
			if (!group) {
				if (listed.length > 0) continue;
				group = { value, songs: [] };
				members.set(key, group);
			}
			if (!group.songs.includes(song)) group.songs.push(song);
		}
	}

	let entries = [...members.values()];
	if (listed.length === 0) {
		entries.sort((a, b) => compareSongTitles(groupTitle(a.value), groupTitle(b.value)));
	}
	const emptyGroups = entries.filter((g) => g.songs.length === 0).map((g) => groupTitle(g.value));
	entries = entries.filter((g) => g.songs.length > 0);

	const included = new Set(entries.flatMap((g) => g.songs));
	return {
		groups: entries.map((g) => ({ title: groupTitle(g.value), songs: g.songs })),
		songs: songs.filter((song) => included.has(song)),
		ungrouped: songs.length - included.size,
		emptyGroups,
	};
}
