"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const youtube_music_service_1 = require("../services/youtube-music.service");
const router = (0, express_1.Router)();
router.get('/home', auth_middleware_1.isAuthenticated, async (req, res) => {
    try {
        const userId = req.user.uid;
        const { params } = req.query;
        const result = await youtube_music_service_1.youtubeMusicService.fetchHomeFeed(userId, params);
        res.json(result);
    }
    catch (error) {
        console.error('[YouTubeMusic] Route error:', error.message);
        res.status(500).json({ error: error.message || 'Failed to fetch YouTube Music feed' });
    }
});
router.get('/playlists/:playlistId', auth_middleware_1.isAuthenticated, async (req, res) => {
    try {
        const { playlistId } = req.params;
        const { title } = req.query;
        const playlist = await youtube_music_service_1.youtubeMusicService.fetchPlaylist(playlistId, title);
        res.json(playlist);
    }
    catch (error) {
        console.error('[YouTubeMusic] Route error fetching playlist:', error.message);
        res.status(500).json({ error: error.message || 'Failed to fetch YouTube Music playlist' });
    }
});
exports.default = router;
//# sourceMappingURL=youtube-music.routes.js.map