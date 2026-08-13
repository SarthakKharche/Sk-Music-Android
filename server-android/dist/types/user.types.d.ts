/**
 * User model representing authenticated users
 */
export interface User {
    uid: string;
    email: string;
    name: string;
    picture?: string;
    provider: 'google';
    spotifyConnected: boolean;
    spotifyUserId?: string;
    spotifyAccessToken?: string;
    spotifyRefreshToken?: string;
    spotifyTokenExpiry?: string;
    googleAccessToken?: string;
    googleRefreshToken?: string;
    googleTokenExpiry?: string;
    createdAt: string;
    updatedAt: string;
}
/**
 * Spotify playlist metadata (cloud storage)
 */
export interface Playlist {
    id: string;
    userId: string;
    name: string;
    description?: string;
    imageUrl?: string;
    trackCount: number;
    isPublic: boolean;
    owner: {
        id: string;
        name: string;
    };
    spotifyUrl: string;
    lastSyncedAt: string;
    createdAt: string;
}
/**
 * Track metadata (cloud storage)
 */
export interface Track {
    id: string;
    playlistId: string;
    userId: string;
    name: string;
    artists: Array<{
        id: string;
        name: string;
    }>;
    album: {
        id: string;
        name: string;
        imageUrl?: string;
        releaseDate?: string;
    };
    durationMs: number;
    explicit: boolean;
    isrc?: string;
    spotifyUrl: string;
    previewUrl?: string;
    isOfflinePreferred: boolean;
    addedAt: string;
}
/**
 * Offline preference sync record
 */
export interface OfflinePreference {
    userId: string;
    trackId: string;
    playlistId: string;
    isOfflinePreferred: boolean;
    markedAt: string;
}
//# sourceMappingURL=user.types.d.ts.map