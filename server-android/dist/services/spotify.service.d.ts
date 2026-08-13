import type { SpotifyTokenResponse, SpotifyUserProfile, SpotifyPlaylistResponse, SpotifyTrack } from '../types/spotify.types';
/**
 * Spotify API service
 * Handles OAuth, token refresh, and API calls
 */
export declare class SpotifyService {
    private clientId;
    private clientSecret;
    private redirectUri;
    private spotifyApiUrl;
    private spotifyAccountsUrl;
    constructor();
    /**
     * Generate Spotify authorization URL
     */
    getAuthorizationUrl(scopes: string[], state: string): string;
    /**
     * Exchange authorization code for access token
     */
    exchangeCodeForToken(code: string): Promise<SpotifyTokenResponse>;
    /**
     * Refresh Spotify access token
     */
    refreshAccessToken(refreshToken: string): Promise<SpotifyTokenResponse>;
    /**
     * Get user's access token (refresh if expired)
     */
    getUserAccessToken(userId: string): Promise<string>;
    /**
     * Handle Spotify OAuth callback
     */
    handleCallback(code: string, userId: string): Promise<void>;
    /**
     * Get Spotify user profile
     */
    getUserProfile(accessToken: string): Promise<SpotifyUserProfile>;
    /**
     * Get user's playlists
     */
    getUserPlaylists(userId: string): Promise<SpotifyPlaylistResponse[]>;
    /**
     * Get playlist tracks
     */
    getPlaylistTracks(userId: string, playlistId: string): Promise<SpotifyTrack[]>;
    /**
     * Sync user's playlists to Firestore
     */
    syncUserPlaylists(userId: string): Promise<void>;
    /**
     * Sync playlist tracks to Firestore
     */
    syncPlaylistTracks(userId: string, playlistId: string): Promise<void>;
    /**
     * Encrypt token using AES
     */
    private encryptToken;
    /**
     * Decrypt token using AES
     */
    private decryptToken;
    /**
     * Search for tracks on Spotify
     */
    searchTracks(userId: string, query: string, limit?: number, offset?: number): Promise<{
        tracks: SpotifyTrack[];
        total: number;
        next: string | null;
    }>;
    /**
     * Search for playlists on Spotify
     */
    searchPlaylists(userId: string, query: string, limit?: number, offset?: number): Promise<{
        playlists: SpotifyPlaylistResponse[];
        total: number;
        next: string | null;
    }>;
    /**
     * Get Spotify featured playlists
     */
    getFeaturedPlaylists(userId: string, country?: string, limit?: number): Promise<{
        playlists: SpotifyPlaylistResponse[];
        message: string;
    }>;
    /**
     * Get Spotify browse categories
     */
    getCategories(userId: string, country?: string, limit?: number): Promise<{
        categories: Array<{
            id: string;
            name: string;
            icons: Array<{
                url: string;
            }>;
        }>;
    }>;
    /**
     * Get playlists for a category
     */
    getCategoryPlaylists(userId: string, categoryId: string, country?: string, limit?: number): Promise<{
        playlists: SpotifyPlaylistResponse[];
    }>;
    /**
     * Get new releases
     */
    getNewReleases(userId: string, country?: string, limit?: number): Promise<{
        albums: Array<{
            id: string;
            name: string;
            images: Array<{
                url: string;
            }>;
            artists: Array<{
                name: string;
            }>;
        }>;
    }>;
    /**
     * Get a public playlist by ID (doesn't require user auth for public playlists)
     */
    getPlaylistById(userId: string, playlistId: string): Promise<SpotifyPlaylistResponse>;
    /**
     * Get user's top tracks from Spotify.
     * @param timeRange 'short_term' (~4 weeks), 'medium_term' (~6 months), 'long_term' (all time)
     */
    getTopTracks(userId: string, timeRange?: 'short_term' | 'medium_term' | 'long_term', limit?: number): Promise<SpotifyTrack[]>;
    /**
     * Get user's recently played tracks from Spotify.
     */
    getRecentlyPlayed(userId: string, limit?: number): Promise<SpotifyTrack[]>;
    /**
     * Get user's saved/liked tracks from Spotify.
     */
    getSavedTracks(userId: string, limit?: number): Promise<SpotifyTrack[]>;
}
//# sourceMappingURL=spotify.service.d.ts.map