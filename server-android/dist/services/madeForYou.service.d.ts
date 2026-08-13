/**
 * Made For You — Service Layer
 *
 * Orchestrates the full lifecycle of personalised playlists:
 *  1. Import seed playlists from Spotify (read-only, one-time snapshot).
 *  2. Record in-app listening events to Firestore.
 *  3. Periodically regenerate playlists via the recommendation engine.
 *  4. CRUD operations for the frontend to consume.
 *
 * Design principles:
 *  - Never writes to Spotify. All mutations are local.
 *  - Audio blobs are never stored in the backend.
 *  - Playlists are fully decoupled from Spotify after the initial seed.
 */
import type { MadeForYouPlaylist, ImportMadeForYouResponse, RecordListeningEventRequest, RegenerateResponse } from '../types/madeForYou.types';
export declare class MadeForYouService {
    private spotifyService;
    constructor();
    /**
     * Fetch the user's "Made For You" playlists from Spotify, snapshot their
     * tracks, and persist local copies.  Spotify is never modified.
     *
     * Idempotent: if `skipIfExists` is true and playlists already exist,
     * the import is skipped.
     */
    importFromSpotify(userId: string, skipIfExists?: boolean): Promise<ImportMadeForYouResponse>;
    /**
     * Create seed playlists using the user's Spotify listening data
     * (top tracks, recently played, saved tracks) when no "Made For You"
     * playlists are found in their library.
     */
    private createSeededPlaylists;
    /**
     * Record a single listening event (play, skip, or completion).
     * These events drive the recommendation engine.
     */
    recordListeningEvent(userId: string, req: RecordListeningEventRequest): Promise<void>;
    /**
     * Batch-record multiple events (useful for offline sync).
     */
    recordListeningEventsBatch(userId: string, events: RecordListeningEventRequest[]): Promise<void>;
    /**
     * Regenerate all expired personalised playlists for a user.
     * Called by a scheduled job or on-demand via API.
     *
     * Flow:
     *  1. Load all user events from Firestore.
     *  2. Load all known tracks for the user.
     *  3. Aggregate → score → generate playlists via recommendation engine.
     *  4. Overwrite playlist tracks in Firestore.
     */
    regenerateExpired(userId: string): Promise<RegenerateResponse>;
    /**
     * Force regeneration of all playlists regardless of expiry.
     */
    forceRegenerate(userId: string): Promise<RegenerateResponse>;
    /**
     * Get all personalised playlists for a user.
     * Triggers regeneration of expired playlists before returning.
     */
    getUserPlaylists(userId: string): Promise<MadeForYouPlaylist[]>;
    /**
     * Get a specific playlist by ID.
     */
    getPlaylistById(userId: string, playlistId: string): Promise<MadeForYouPlaylist | null>;
    /**
     * Get listening stats summary for the user.
     */
    getListeningStats(userId: string): Promise<{
        totalEvents: number;
        totalPlays: number;
        totalSkips: number;
        totalCompletes: number;
        topArtists: Array<{
            name: string;
            playCount: number;
        }>;
        avgCompletion: number;
    }>;
    /**
     * Delete all Made-For-You data for a user (playlists + events).
     */
    deleteUserData(userId: string): Promise<void>;
}
export declare const madeForYouService: MadeForYouService;
//# sourceMappingURL=madeForYou.service.d.ts.map