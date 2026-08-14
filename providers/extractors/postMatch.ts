import { type Media, type SerieMedia, calculateMatchScore, extractYearFromText } from 'grabit-engine';

/**
 * Shared search-result matching for the hdhub4u-family sites (hdhub4u, 4khdhub,
 * moviesmod, …), whose post titles are noisy ("Download X (2020) Hindi 1080p …")
 * and which index one post per season. Picks the post that best matches the
 * requested media, steering series toward the correct season.
 */

/** Strips download/quality/language noise so the fuzzy scorer sees a clean title. */
export function cleanTitle(raw: string): string {
	return raw
		.replace(/\(.*?\)/g, ' ')
		.replace(/\[.*?\]/g, ' ')
		.replace(
			/\b(480p|720p|1080p|2160p|4k|hd|web[- ]?dl|webrip|bluray|hevc|x264|x265|hindi|english|dual audio|dubbed|season\s*\d+|s\d+|complete|full movie)\b/gi,
			' ',
		)
		.replace(/[-_.]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

/** Extracts a season number from noisy titles ("Season 1", "S01", "S1"). Returns null if absent/ambiguous. */
export function getSeasonFromText(text: string): number | null {
	const m = text.match(/\bseason\s*(\d{1,2})\b/i) || text.match(/\bs(\d{1,2})(?:\b|e)/i);
	return m ? Number(m[1]) : null;
}

/** Lower-cased title tokens (length >= 3) used to guard fuzzy file recovery. */
export function titleTokens(title: string): string[] {
	return cleanTitle(title)
		.toLowerCase()
		.split(/\s+/)
		.filter((t) => t.length >= 3);
}

/**
 * Scores every post and returns the best one, or null if none clears `minScore`.
 * A wrong title is worse than no result, so the threshold is deliberately applied.
 */
export function pickBestPost<T extends { title: string }>(
	posts: T[],
	media: Media,
	minScore = 45,
): { post: T; score: number } | null {
	const wantSeason = media.type === 'serie' ? Number((media as SerieMedia).season) : null;
	const scored = posts
		.map((post) => {
			const year = extractYearFromText(post.title)?.toString() || '';
			let score = calculateMatchScore({ title: cleanTitle(post.title), year }, media);
			// Season awareness: these sites index one post per season. Steer toward the
			// requested season and away from an explicitly different one.
			if (wantSeason != null) {
				const postSeason = getSeasonFromText(post.title);
				if (postSeason != null) score += postSeason === wantSeason ? 25 : -60;
			}
			return { post, score };
		})
		.sort((a, b) => b.score - a.score);
	const top = scored[0];
	if (!top || top.score < minScore) return null;
	return top;
}
