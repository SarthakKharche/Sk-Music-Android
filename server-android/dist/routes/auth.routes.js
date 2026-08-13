"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const passport_1 = __importDefault(require("passport"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const spotify_service_1 = require("../services/spotify.service");
const firebase_1 = require("../config/firebase");
const router = (0, express_1.Router)();
const spotifyService = new spotify_service_1.SpotifyService();
/**
 * GET /api/auth/google
 * Initiate Google OAuth flow
 */
router.get('/google', passport_1.default.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
}));
/**
 * GET /api/auth/google/callback
 * Google OAuth callback
 */
router.get('/google/callback', (req, res, next) => {
    const host = req.get('host') || '192.168.1.8:5000';
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const targetClient = `${protocol}://${host}`;
    passport_1.default.authenticate('google', { failureRedirect: `${targetClient}/login`, session: false })(req, res, next);
}, (req, res) => {
    const user = req.user;
    const token = jsonwebtoken_1.default.sign({ uid: user.uid, email: user.email }, process.env.JWT_SECRET, { expiresIn: '30d' });
    const host = req.get('host') || '192.168.1.8:5000';
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const targetClient = `${protocol}://${host}`;
    console.log(`[AUTH CALLBACK] Redirecting to: ${targetClient}/auth/callback`);
    res.redirect(`${targetClient}/auth/callback?token=${token}`);
});
/**
 * GET /api/auth/spotify
 * Initiate Spotify OAuth flow
 */
router.get('/spotify', auth_middleware_1.isAuthenticated, (req, res) => {
    const scopes = [
        'playlist-read-private',
        'playlist-read-collaborative',
        'user-read-email',
        'user-read-private',
        'user-top-read',
        'user-read-recently-played',
        'user-library-read',
    ];
    const user = req.user;
    const authUrl = spotifyService.getAuthorizationUrl(scopes, user.uid);
    res.json({ authUrl });
});
/**
 * GET /api/auth/spotify/callback
 * Spotify OAuth callback
 * Note: This route doesn't use isAuthenticated because it's called by Spotify's servers.
 * The user's uid is passed via the state parameter.
 */
router.get('/spotify/callback', async (req, res) => {
    try {
        const { code, state } = req.query;
        const client = process.env.CLIENT_URL || 'https://localhost:5173';
        if (!code || typeof code !== 'string') {
            return res.redirect(`${client}/spotify/error?reason=missing_code`);
        }
        if (!state || typeof state !== 'string') {
            return res.redirect(`${client}/spotify/error?reason=missing_state`);
        }
        // The state parameter contains the user's uid
        const userId = state;
        // Exchange code for tokens
        await spotifyService.handleCallback(code, userId);
        return res.redirect(`${client}/spotify/connected`);
    }
    catch (error) {
        console.error('Spotify callback error:', error);
        const client = process.env.CLIENT_URL || 'https://localhost:5173';
        return res.redirect(`${client}/spotify/error?reason=callback_failed`);
    }
});
/**
 * POST /api/auth/logout
 * Logout user
 */
router.post('/logout', auth_middleware_1.isAuthenticated, (req, res) => {
    req.logout((err) => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed' });
        }
        return res.json({ message: 'Logged out successfully' });
    });
});
/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get('/me', auth_middleware_1.isAuthenticated, async (req, res) => {
    try {
        const user = req.user;
        // Always attempt to fetch fresh data from Firestore
        try {
            const db = (0, firebase_1.getFirestore)();
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                res.json({
                    uid: userData.uid,
                    email: userData.email,
                    name: userData.name,
                    picture: userData.picture,
                    spotifyConnected: userData.spotifyConnected || false,
                    spotifyUserId: userData.spotifyUserId,
                });
                return;
            }
        }
        catch (dbErr) {
            console.warn('Firestore fetch failed, returning session user:', dbErr);
        }
        // Fallback if Firestore doc not found yet
        res.json({
            uid: user.uid,
            email: user.email,
            name: user.name || 'User',
            picture: user.picture || '',
            spotifyConnected: user.spotifyConnected || false,
            spotifyUserId: user.spotifyUserId,
        });
    }
    catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Failed to fetch user data' });
    }
});
/**
 * POST /api/auth/verify-token
 * Verify JWT token
 */
router.post('/verify-token', (req, res) => {
    const { token } = req.body;
    if (!token) {
        return res.status(400).json({ error: 'Token missing' });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        return res.json({ valid: true, user: decoded });
    }
    catch (error) {
        return res.status(401).json({ valid: false, error: 'Invalid token' });
    }
});
exports.default = router;
//# sourceMappingURL=auth.routes.js.map