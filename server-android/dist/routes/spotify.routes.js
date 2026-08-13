"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const spotify_service_1 = require("../services/spotify.service");
const firebase_1 = require("../config/firebase");
const router = (0, express_1.Router)();
const spotifyService = new spotify_service_1.SpotifyService();
/**
 * GET /api/spotify/playlists
 * Get all user playlists (sync from Spotify if needed)
 */
router.get('/playlists', auth_middleware_1.isAuthenticated, auth_middleware_1.hasSpotifyConnected, async (req, res) => {
    try {
        const user = req.user;
        const db = (0, firebase_1.getFirestore)();
        // Sync playlists from Spotify
        await spotifyService.syncUserPlaylists(user.uid);
        // Fetch from Firestore
        const playlistsSnapshot = await db
            .collection('playlists')
            .where('userId', '==', user.uid)
            .orderBy('lastSyncedAt', 'desc')
            .get();
        const playlists = playlistsSnapshot.docs.map((doc) => doc.data());
        res.json({ playlists });
    }
    catch (error) {
        console.error('Error fetching playlists:', error);
        res.status(500).json({ error: 'Failed to fetch playlists' });
    }
});
/**
 * GET /api/spotify/playlists/:playlistId
 * Get a single playlist by ID (for curated sections)
 */
router.get('/playlists/:playlistId', auth_middleware_1.isAuthenticated, auth_middleware_1.hasSpotifyConnected, async (req, res) => {
    try {
        const user = req.user;
        const { playlistId } = req.params;
        console.log(`[Spotify] Fetching playlist ${playlistId} for user ${user.uid}`);
        const spotifyPlaylist = await spotifyService.getPlaylistById(user.uid, playlistId);
        if (!spotifyPlaylist) {
            console.log(`[Spotify] Playlist ${playlistId} not found`);
            return res.status(404).json({ error: 'Playlist not found' });
        }
        const playlist = {
            id: spotifyPlaylist.id,
            name: spotifyPlaylist.name,
            description: spotifyPlaylist.description,
            imageUrl: spotifyPlaylist.images?.[0]?.url,
            trackCount: spotifyPlaylist.tracks?.total || 0,
            owner: {
                id: spotifyPlaylist.owner?.id,
                name: spotifyPlaylist.owner?.display_name,
            },
            isSpotifyPlaylist: true,
        };
        console.log(`[Spotify] Successfully fetched playlist: ${playlist.name}`);
        return res.json({ playlist });
    }
    catch (error) {
        const axiosError = error;
        console.error('Error fetching playlist:', axiosError.response?.status, axiosError.response?.data || axiosError.message);
        // Handle rate limiting
        if (axiosError.response?.status === 429) {
            return res.status(429).json({ error: 'Rate limited by Spotify. Please try again later.' });
        }
        return res.status(500).json({ error: 'Failed to fetch playlist' });
    }
});
/**
 * GET /api/spotify/playlists/:playlistId/tracks
 * Get tracks for a specific playlist
 */
router.get('/playlists/:playlistId/tracks', auth_middleware_1.isAuthenticated, auth_middleware_1.hasSpotifyConnected, async (req, res) => {
    try {
        const user = req.user;
        const { playlistId } = req.params;
        const db = (0, firebase_1.getFirestore)();
        // Sync tracks from Spotify
        await spotifyService.syncPlaylistTracks(user.uid, playlistId);
        // Fetch from Firestore
        const tracksSnapshot = await db
            .collection('tracks')
            .where('playlistId', '==', playlistId)
            .where('userId', '==', user.uid)
            .get();
        const tracks = tracksSnapshot.docs.map((doc) => doc.data());
        res.json({ tracks });
    }
    catch (error) {
        console.error('Error fetching tracks:', error);
        res.status(500).json({ error: 'Failed to fetch tracks' });
    }
});
/**
 * POST /api/spotify/sync
 * Manually trigger full sync
 */
router.post('/sync', auth_middleware_1.isAuthenticated, auth_middleware_1.hasSpotifyConnected, async (req, res) => {
    try {
        const user = req.user;
        // Sync all playlists
        await spotifyService.syncUserPlaylists(user.uid);
        res.json({ message: 'Sync completed successfully' });
    }
    catch (error) {
        console.error('Error syncing:', error);
        res.status(500).json({ error: 'Sync failed' });
    }
});
/**
 * POST /api/spotify/disconnect
 * Disconnect Spotify account
 */
router.post('/disconnect', auth_middleware_1.isAuthenticated, async (req, res) => {
    try {
        const user = req.user;
        const db = (0, firebase_1.getFirestore)();
        await db.collection('users').doc(user.uid).update({
            spotifyConnected: false,
            spotifyUserId: null,
            spotifyAccessToken: null,
            spotifyRefreshToken: null,
            spotifyTokenExpiry: null,
            updatedAt: new Date().toISOString(),
        });
        res.json({ message: 'Spotify disconnected successfully' });
    }
    catch (error) {
        console.error('Error disconnecting Spotify:', error);
        res.status(500).json({ error: 'Failed to disconnect Spotify' });
    }
});
/**
 * GET /api/spotify/search
 * Search for tracks on Spotify
 */
router.get('/search', auth_middleware_1.isAuthenticated, async (req, res) => {
    try {
        const user = req.user;
        const { q, limit = '20', offset = '0' } = req.query;
        if (!q || typeof q !== 'string') {
            return res.status(400).json({ error: 'Search query is required' });
        }
        let tracks = [];
        let total = 0;
        let hasMore = false;
        if (user.spotifyConnected && user.spotifyAccessToken) {
            try {
                const result = await spotifyService.searchTracks(user.uid, q, parseInt(limit, 10), parseInt(offset, 10));
                tracks = result.tracks.map((track) => ({
                    id: track.id,
                    name: track.name,
                    artists: track.artists.map((artist) => ({
                        id: artist.id,
                        name: artist.name,
                    })),
                    album: {
                        id: track.album.id,
                        name: track.album.name,
                        imageUrl: track.album.images[0]?.url || null,
                        releaseDate: track.album.release_date || null,
                    },
                    durationMs: track.duration_ms,
                    explicit: track.explicit,
                    isrc: track.external_ids?.isrc || null,
                    spotifyUrl: track.external_urls.spotify,
                    previewUrl: track.preview_url || null,
                }));
                total = result.total;
                hasMore = result.next !== null;
            }
            catch (spotifyError) {
                console.warn('[Search] Spotify search failed, falling back to YouTube Music:', spotifyError.message);
            }
        }
        // Fallback to YouTube Music Search if Spotify is not connected or failed
        if (tracks.length === 0) {
            const { youtubeMusicService } = await Promise.resolve().then(() => __importStar(require('../services/youtube-music.service')));
            tracks = await youtubeMusicService.searchTracks(q);
            total = tracks.length;
            hasMore = false;
        }
        return res.json({
            tracks,
            total,
            hasMore,
        });
    }
    catch (error) {
        console.error('Error searching tracks:', error);
        return res.status(500).json({ error: 'Search failed' });
    }
});
/**
 * GET /api/spotify/search/playlists
 * Search for playlists on Spotify
 */
router.get('/search/playlists', auth_middleware_1.isAuthenticated, async (req, res) => {
    try {
        const user = req.user;
        const { q, limit = '10', offset = '0' } = req.query;
        if (!q || typeof q !== 'string') {
            return res.status(400).json({ error: 'Search query is required' });
        }
        let playlists = [];
        let total = 0;
        let hasMore = false;
        if (user.spotifyConnected && user.spotifyAccessToken) {
            try {
                const result = await spotifyService.searchPlaylists(user.uid, q, parseInt(limit, 10), parseInt(offset, 10));
                playlists = result.playlists
                    .filter((playlist) => playlist && playlist.id)
                    .map((playlist) => ({
                    id: playlist.id,
                    name: playlist.name,
                    description: playlist.description,
                    imageUrl: playlist.images?.[0]?.url,
                    trackCount: playlist.tracks?.total || 0,
                    owner: {
                        id: playlist.owner?.id,
                        name: playlist.owner?.display_name,
                    },
                    spotifyUrl: playlist.external_urls?.spotify,
                    isSpotifyPlaylist: true,
                }));
                total = result.total;
                hasMore = result.next !== null;
            }
            catch (spotifyError) {
                console.warn('[Search] Spotify playlist search failed:', spotifyError.message);
            }
        }
        return res.json({
            playlists,
            total,
            hasMore,
        });
    }
    catch (error) {
        console.error('Error searching playlists:', error);
        return res.status(500).json({ error: 'Playlist search failed' });
    }
});
/**
 * GET /api/spotify/browse/featured
 * Get featured playlists from Spotify
 */
router.get('/browse/featured', auth_middleware_1.isAuthenticated, auth_middleware_1.hasSpotifyConnected, async (req, res) => {
    try {
        const user = req.user;
        const { country = 'IN', limit = '20' } = req.query;
        const result = await spotifyService.getFeaturedPlaylists(user.uid, country, parseInt(limit, 10));
        const playlists = result.playlists.map((playlist) => ({
            id: playlist.id,
            name: playlist.name,
            description: playlist.description,
            imageUrl: playlist.images?.[0]?.url,
            trackCount: playlist.tracks?.total || 0,
            owner: {
                id: playlist.owner?.id,
                name: playlist.owner?.display_name,
            },
            spotifyUrl: playlist.external_urls?.spotify,
            isSpotifyPlaylist: true,
        }));
        return res.json({
            message: result.message,
            playlists,
        });
    }
    catch (error) {
        // Handle 404 or other Spotify API errors gracefully
        if (error && typeof error === 'object' && 'response' in error) {
            const axiosError = error;
            console.log('Featured playlists API error:', axiosError.response?.status, axiosError.response?.data);
            if (axiosError.response?.status === 404) {
                console.log('Featured playlists not available, returning empty');
                return res.json({ message: '', playlists: [] });
            }
        }
        console.error('Error fetching featured playlists:', error);
        return res.status(500).json({ error: 'Failed to fetch featured playlists' });
    }
});
/**
 * GET /api/spotify/browse/categories
 * Get browse categories
 */
router.get('/browse/categories', auth_middleware_1.isAuthenticated, auth_middleware_1.hasSpotifyConnected, async (req, res) => {
    try {
        const user = req.user;
        const { country = 'IN', limit = '20' } = req.query;
        const result = await spotifyService.getCategories(user.uid, country, parseInt(limit, 10));
        return res.json({
            categories: result.categories,
        });
    }
    catch (error) {
        console.error('Error fetching categories:', error);
        return res.status(500).json({ error: 'Failed to fetch categories' });
    }
});
/**
 * GET /api/spotify/browse/categories/:categoryId/playlists
 * Get playlists for a category
 */
router.get('/browse/categories/:categoryId/playlists', auth_middleware_1.isAuthenticated, auth_middleware_1.hasSpotifyConnected, async (req, res) => {
    try {
        const user = req.user;
        const { categoryId } = req.params;
        const { country = 'IN', limit = '20' } = req.query;
        const result = await spotifyService.getCategoryPlaylists(user.uid, categoryId, country, parseInt(limit, 10));
        const playlists = result.playlists
            .filter((playlist) => playlist !== null)
            .map((playlist) => ({
            id: playlist.id,
            name: playlist.name,
            description: playlist.description,
            imageUrl: playlist.images?.[0]?.url,
            trackCount: playlist.tracks?.total || 0,
            owner: {
                id: playlist.owner?.id,
                name: playlist.owner?.display_name,
            },
            spotifyUrl: playlist.external_urls?.spotify,
            isSpotifyPlaylist: true,
        }));
        return res.json({ playlists });
    }
    catch (error) {
        // If category not found (404), return empty array instead of error
        if (error && typeof error === 'object' && 'response' in error) {
            const axiosError = error;
            console.log(`Category ${req.params.categoryId} API error:`, axiosError.response?.status, axiosError.response?.data);
            if (axiosError.response?.status === 404) {
                console.log(`Category ${req.params.categoryId} not found, returning empty playlists`);
                return res.json({ playlists: [] });
            }
        }
        console.error('Error fetching category playlists:', error);
        return res.status(500).json({ error: 'Failed to fetch category playlists' });
    }
});
/**
 * GET /api/spotify/browse/new-releases
 * Get new album releases
 */
router.get('/browse/new-releases', auth_middleware_1.isAuthenticated, auth_middleware_1.hasSpotifyConnected, async (req, res) => {
    try {
        const user = req.user;
        const { country = 'IN', limit = '20' } = req.query;
        const result = await spotifyService.getNewReleases(user.uid, country, parseInt(limit, 10));
        return res.json({
            albums: result.albums,
        });
    }
    catch (error) {
        console.error('Error fetching new releases:', error);
        return res.status(500).json({ error: 'Failed to fetch new releases' });
    }
});
/**
 * GET /api/spotify/playlist/:playlistId
 * Get a specific Spotify playlist with tracks
 */
router.get('/playlist/:playlistId', auth_middleware_1.isAuthenticated, auth_middleware_1.hasSpotifyConnected, async (req, res) => {
    try {
        const user = req.user;
        const { playlistId } = req.params;
        // Sync the playlist
        await spotifyService.syncPlaylistTracks(user.uid, playlistId);
        const db = (0, firebase_1.getFirestore)();
        // Get tracks from Firestore
        const tracksSnapshot = await db
            .collection('tracks')
            .where('playlistId', '==', playlistId)
            .where('userId', '==', user.uid)
            .get();
        const tracks = tracksSnapshot.docs.map((doc) => doc.data());
        // Get playlist info
        const playlist = await spotifyService.getPlaylistById(user.uid, playlistId);
        return res.json({
            playlist: {
                id: playlist.id,
                name: playlist.name,
                description: playlist.description,
                imageUrl: playlist.images?.[0]?.url,
                trackCount: playlist.tracks?.total || tracks.length,
                owner: {
                    id: playlist.owner?.id,
                    name: playlist.owner?.display_name,
                },
            },
            tracks,
        });
    }
    catch (error) {
        console.error('Error fetching playlist:', error);
        return res.status(500).json({ error: 'Failed to fetch playlist' });
    }
});
exports.default = router;
//# sourceMappingURL=spotify.routes.js.map