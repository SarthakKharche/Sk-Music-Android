"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpotifyService = void 0;
const axios_1 = __importDefault(require("axios"));
const crypto_js_1 = __importDefault(require("crypto-js"));
const firebase_1 = require("../config/firebase");
/**
 * Spotify API service
 * Handles OAuth, token refresh, and API calls
 */
class SpotifyService {
    constructor() {
        this.spotifyApiUrl = 'https://api.spotify.com/v1';
        this.spotifyAccountsUrl = 'https://accounts.spotify.com';
        this.clientId = process.env.SPOTIFY_CLIENT_ID;
        this.clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
        this.redirectUri = process.env.SPOTIFY_REDIRECT_URI;
    }
    /**
     * Generate Spotify authorization URL
     */
    getAuthorizationUrl(scopes, state) {
        const params = new URLSearchParams({
            client_id: this.clientId,
            response_type: 'code',
            redirect_uri: this.redirectUri,
            scope: scopes.join(' '),
            state,
        });
        return `${this.spotifyAccountsUrl}/authorize?${params.toString()}`;
    }
    /**
     * Exchange authorization code for access token
     */
    async exchangeCodeForToken(code) {
        const params = new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: this.redirectUri,
        });
        const response = await axios_1.default.post(`${this.spotifyAccountsUrl}/api/token`, params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
            },
        });
        return response.data;
    }
    /**
     * Refresh Spotify access token
     */
    async refreshAccessToken(refreshToken) {
        const params = new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
        });
        const response = await axios_1.default.post(`${this.spotifyAccountsUrl}/api/token`, params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
            },
        });
        return response.data;
    }
    /**
     * Get user's access token (refresh if expired)
     */
    async getUserAccessToken(userId) {
        const db = (0, firebase_1.getFirestore)();
        const userDoc = await db.collection('users').doc(userId).get();
        const user = userDoc.data();
        if (!user.spotifyAccessToken || !user.spotifyRefreshToken) {
            throw new Error('Spotify not connected');
        }
        // Check if token is expired
        const expiryDate = new Date(user.spotifyTokenExpiry);
        const now = new Date();
        if (now >= expiryDate) {
            try {
                // Decrypt refresh token before using it
                const decryptedRefreshToken = this.decryptToken(user.spotifyRefreshToken);
                // Refresh token
                const tokenData = await this.refreshAccessToken(decryptedRefreshToken);
                const newExpiry = new Date(now.getTime() + tokenData.expires_in * 1000);
                // Encrypt tokens before storing
                const encryptedAccessToken = this.encryptToken(tokenData.access_token);
                const encryptedRefreshToken = tokenData.refresh_token
                    ? this.encryptToken(tokenData.refresh_token)
                    : user.spotifyRefreshToken;
                await db.collection('users').doc(userId).update({
                    spotifyAccessToken: encryptedAccessToken,
                    spotifyRefreshToken: encryptedRefreshToken,
                    spotifyTokenExpiry: newExpiry.toISOString(),
                    updatedAt: new Date().toISOString(),
                });
                return tokenData.access_token;
            }
            catch (error) {
                // Token refresh failed - clear Spotify connection and require re-auth
                const axiosError = error;
                const isAuthError = axiosError.response && (axiosError.response.status === 400 || axiosError.response.status === 401);
                if (isAuthError) {
                    console.log('Spotify refresh token or credentials invalid. Clearing Spotify connection for user:', userId);
                    if (axiosError.response?.data?.error === 'invalid_client') {
                        console.error('CRITICAL: Spotify client credentials (SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET) in .env are invalid or unauthorized.');
                    }
                    await db.collection('users').doc(userId).update({
                        spotifyConnected: false,
                        spotifyAccessToken: null,
                        spotifyRefreshToken: null,
                        spotifyTokenExpiry: null,
                        updatedAt: new Date().toISOString(),
                    });
                    throw new Error('Spotify session expired. Please reconnect your Spotify account.');
                }
                throw error;
            }
        }
        // Decrypt and return existing token
        return this.decryptToken(user.spotifyAccessToken);
    }
    /**
     * Handle Spotify OAuth callback
     */
    async handleCallback(code, userId) {
        const db = (0, firebase_1.getFirestore)();
        const tokenData = await this.exchangeCodeForToken(code);
        const expiryDate = new Date(Date.now() + tokenData.expires_in * 1000);
        // Get Spotify user profile
        const profile = await this.getUserProfile(tokenData.access_token);
        // Encrypt tokens before storing
        const encryptedAccessToken = this.encryptToken(tokenData.access_token);
        const encryptedRefreshToken = this.encryptToken(tokenData.refresh_token);
        // Update user with Spotify connection
        await db.collection('users').doc(userId).update({
            spotifyConnected: true,
            spotifyUserId: profile.id,
            spotifyAccessToken: encryptedAccessToken,
            spotifyRefreshToken: encryptedRefreshToken,
            spotifyTokenExpiry: expiryDate.toISOString(),
            updatedAt: new Date().toISOString(),
        });
    }
    /**
     * Get Spotify user profile
     */
    async getUserProfile(accessToken) {
        const response = await axios_1.default.get(`${this.spotifyApiUrl}/me`, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        return response.data;
    }
    /**
     * Get user's playlists
     */
    async getUserPlaylists(userId) {
        const accessToken = await this.getUserAccessToken(userId);
        const playlists = [];
        const fetchPage = async (url) => {
            const res = await axios_1.default.get(url, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            return res.data;
        };
        let nextUrl = `${this.spotifyApiUrl}/me/playlists?limit=50`;
        while (nextUrl) {
            const page = await fetchPage(nextUrl);
            playlists.push(...page.items);
            nextUrl = page.next;
        }
        return playlists;
    }
    /**
     * Get playlist tracks
     */
    async getPlaylistTracks(userId, playlistId) {
        const accessToken = await this.getUserAccessToken(userId);
        const tracks = [];
        const fetchPage = async (url) => {
            const res = await axios_1.default.get(url, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            return res.data;
        };
        let nextUrl = `${this.spotifyApiUrl}/playlists/${playlistId}/tracks?limit=100`;
        while (nextUrl) {
            const page = await fetchPage(nextUrl);
            const validTracks = page.items
                .filter((item) => item.track && item.track.id)
                .map((item) => item.track);
            tracks.push(...validTracks);
            nextUrl = page.next;
        }
        return tracks;
    }
    /**
     * Sync user's playlists to Firestore
     */
    async syncUserPlaylists(userId) {
        const db = (0, firebase_1.getFirestore)();
        const playlists = await this.getUserPlaylists(userId);
        for (const playlist of playlists) {
            const playlistData = {
                id: playlist.id,
                userId,
                name: playlist.name,
                description: playlist.description,
                imageUrl: playlist.images[0]?.url,
                trackCount: playlist.tracks.total,
                isPublic: playlist.public,
                owner: {
                    id: playlist.owner.id,
                    name: playlist.owner.display_name,
                },
                spotifyUrl: playlist.external_urls.spotify,
                lastSyncedAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
            };
            await db
                .collection('playlists')
                .doc(playlist.id)
                .set(playlistData, { merge: true });
        }
    }
    /**
     * Sync playlist tracks to Firestore
     */
    async syncPlaylistTracks(userId, playlistId) {
        const db = (0, firebase_1.getFirestore)();
        const tracks = await this.getPlaylistTracks(userId, playlistId);
        const batch = db.batch();
        for (const track of tracks) {
            const trackData = {
                id: track.id,
                playlistId,
                userId,
                name: track.name,
                artists: track.artists.map((artist) => ({
                    id: artist.id,
                    name: artist.name,
                })),
                album: {
                    id: track.album.id,
                    name: track.album.name,
                    imageUrl: track.album.images[0]?.url,
                    releaseDate: track.album.release_date,
                },
                durationMs: track.duration_ms,
                explicit: track.explicit,
                isrc: track.external_ids?.isrc,
                spotifyUrl: track.external_urls.spotify,
                previewUrl: track.preview_url || undefined,
                isOfflinePreferred: false,
                addedAt: new Date().toISOString(),
            };
            const trackRef = db.collection('tracks').doc(track.id);
            batch.set(trackRef, trackData, { merge: true });
        }
        await batch.commit();
    }
    /**
     * Encrypt token using AES
     */
    encryptToken(token) {
        const secret = process.env.JWT_SECRET;
        return crypto_js_1.default.AES.encrypt(token, secret).toString();
    }
    /**
     * Decrypt token using AES
     */
    decryptToken(encryptedToken) {
        const secret = process.env.JWT_SECRET;
        const bytes = crypto_js_1.default.AES.decrypt(encryptedToken, secret);
        return bytes.toString(crypto_js_1.default.enc.Utf8);
    }
    /**
     * Search for tracks on Spotify
     */
    async searchTracks(userId, query, limit = 20, offset = 0) {
        const accessToken = await this.getUserAccessToken(userId);
        const params = new URLSearchParams({
            q: query,
            type: 'track',
            limit: limit.toString(),
            offset: offset.toString(),
        });
        const response = await axios_1.default.get(`${this.spotifyApiUrl}/search?${params.toString()}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        return {
            tracks: response.data.tracks.items,
            total: response.data.tracks.total,
            next: response.data.tracks.next,
        };
    }
    /**
     * Search for playlists on Spotify
     */
    async searchPlaylists(userId, query, limit = 10, offset = 0) {
        const accessToken = await this.getUserAccessToken(userId);
        const params = new URLSearchParams({
            q: query,
            type: 'playlist',
            limit: limit.toString(),
            offset: offset.toString(),
        });
        const response = await axios_1.default.get(`${this.spotifyApiUrl}/search?${params.toString()}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        return {
            playlists: response.data.playlists.items,
            total: response.data.playlists.total,
            next: response.data.playlists.next,
        };
    }
    /**
     * Get Spotify featured playlists
     */
    async getFeaturedPlaylists(userId, country = 'IN', limit = 20) {
        const accessToken = await this.getUserAccessToken(userId);
        const params = new URLSearchParams({
            country,
            limit: limit.toString(),
        });
        const response = await axios_1.default.get(`${this.spotifyApiUrl}/browse/featured-playlists?${params.toString()}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        return {
            playlists: response.data.playlists.items,
            message: response.data.message,
        };
    }
    /**
     * Get Spotify browse categories
     */
    async getCategories(userId, country = 'IN', limit = 20) {
        const accessToken = await this.getUserAccessToken(userId);
        const params = new URLSearchParams({
            country,
            limit: limit.toString(),
        });
        const response = await axios_1.default.get(`${this.spotifyApiUrl}/browse/categories?${params.toString()}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        return {
            categories: response.data.categories.items,
        };
    }
    /**
     * Get playlists for a category
     */
    async getCategoryPlaylists(userId, categoryId, country = 'IN', limit = 20) {
        const accessToken = await this.getUserAccessToken(userId);
        const params = new URLSearchParams({
            country,
            limit: limit.toString(),
        });
        const response = await axios_1.default.get(`${this.spotifyApiUrl}/browse/categories/${categoryId}/playlists?${params.toString()}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        return {
            playlists: response.data.playlists.items,
        };
    }
    /**
     * Get new releases
     */
    async getNewReleases(userId, country = 'IN', limit = 20) {
        const accessToken = await this.getUserAccessToken(userId);
        const params = new URLSearchParams({
            country,
            limit: limit.toString(),
        });
        const response = await axios_1.default.get(`${this.spotifyApiUrl}/browse/new-releases?${params.toString()}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        return {
            albums: response.data.albums.items,
        };
    }
    /**
     * Get a public playlist by ID (doesn't require user auth for public playlists)
     */
    async getPlaylistById(userId, playlistId) {
        const accessToken = await this.getUserAccessToken(userId);
        const response = await axios_1.default.get(`${this.spotifyApiUrl}/playlists/${playlistId}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        return response.data;
    }
    // ─── User listening data endpoints (for Made For You seeding) ─────────
    /**
     * Get user's top tracks from Spotify.
     * @param timeRange 'short_term' (~4 weeks), 'medium_term' (~6 months), 'long_term' (all time)
     */
    async getTopTracks(userId, timeRange = 'medium_term', limit = 50) {
        const accessToken = await this.getUserAccessToken(userId);
        const params = new URLSearchParams({
            time_range: timeRange,
            limit: Math.min(limit, 50).toString(),
        });
        const response = await axios_1.default.get(`${this.spotifyApiUrl}/me/top/tracks?${params.toString()}`, { headers: { Authorization: `Bearer ${accessToken}` } });
        return response.data.items;
    }
    /**
     * Get user's recently played tracks from Spotify.
     */
    async getRecentlyPlayed(userId, limit = 50) {
        const accessToken = await this.getUserAccessToken(userId);
        const params = new URLSearchParams({
            limit: Math.min(limit, 50).toString(),
        });
        const response = await axios_1.default.get(`${this.spotifyApiUrl}/me/player/recently-played?${params.toString()}`, { headers: { Authorization: `Bearer ${accessToken}` } });
        return response.data.items.map((item) => item.track).filter((t) => t && t.id);
    }
    /**
     * Get user's saved/liked tracks from Spotify.
     */
    async getSavedTracks(userId, limit = 50) {
        const accessToken = await this.getUserAccessToken(userId);
        const params = new URLSearchParams({
            limit: Math.min(limit, 50).toString(),
        });
        const response = await axios_1.default.get(`${this.spotifyApiUrl}/me/tracks?${params.toString()}`, { headers: { Authorization: `Bearer ${accessToken}` } });
        return response.data.items.map((item) => item.track).filter((t) => t && t.id);
    }
}
exports.SpotifyService = SpotifyService;
//# sourceMappingURL=spotify.service.js.map