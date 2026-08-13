/**
 * Recommendation Engine
 *
 * Pure-logic module that scores and selects tracks for personalised playlists.
 * No I/O — operates entirely on the aggregated data passed in.
 *
 * Algorithm overview:
 *  1. Score each candidate track using weighted signals.
 *  2. Apply recency decay so stale favourites don't dominate.
 *  3. Penalise frequently-skipped tracks.
 *  4. Boost tracks by artists / genres the user already likes.
 *  5. Sort by final score, deduplicate, and return top-N.
 */
import type { ListeningEvent, TrackScore, MadeForYouTrackEntry } from '../types/madeForYou.types';
import type { Track } from '../types/user.types';
/**
 * Aggregate raw listening events into per-track score objects.
 *
 * @param events  – all ListeningEvents for a given user
 * @param allTracks – full track metadata catalogue (for enrichment)
 * @returns Map<trackId, TrackScore>
 */
export declare function aggregateEvents(events: ListeningEvent[], allTracks: Map<string, Track>): Map<string, TrackScore>;
/**
 * Compute final normalised scores for all candidate tracks.
 *
 * @param candidates  – aggregated TrackScores
 * @param artistAffinity – Map<artistName, affinityScore 0-1>
 */
export declare function computeScores(candidates: Map<string, TrackScore>, artistAffinity: Map<string, number>): TrackScore[];
/**
 * Build an artist-affinity map from aggregated track scores.
 * Artists who appear in highly-scored tracks receive higher affinity.
 */
export declare function buildArtistAffinity(scores: Map<string, TrackScore>): Map<string, number>;
/**
 * Select top tracks for a Discover Weekly playlist.
 *
 * Strategy: mix high-scoring familiar tracks (60%) with exploration
 * tracks from liked artists that the user hasn't played much (40%).
 */
export declare function generateDiscoverWeekly(rankedScores: TrackScore[], allTracks: Map<string, Track>, artistAffinity: Map<string, number>): MadeForYouTrackEntry[];
/**
 * Select top tracks for a Daily Mix playlist.
 *
 * Strategy: take tracks that the user played recently and completed,
 * biasing towards a consistent genre/artist cluster.
 */
export declare function generateDailyMix(rankedScores: TrackScore[], mixNumber: number): MadeForYouTrackEntry[];
//# sourceMappingURL=recommendation.engine.d.ts.map