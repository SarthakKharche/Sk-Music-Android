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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasSpotifyConnected = exports.isAuthenticated = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const firebase_1 = require("../config/firebase");
/**
 * Middleware to check if user is authenticated
 * Supports both session-based auth and JWT Bearer tokens.
 * When using JWT, hydrates the full user from Firestore so downstream
 * middleware (e.g. hasSpotifyConnected) has all user fields.
 */
const isAuthenticated = async (req, res, next) => {
    // First, check session-based auth
    if (req.isAuthenticated()) {
        return next();
    }
    // Then, check for JWT Bearer token
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            // Hydrate full user from Firestore so spotifyConnected etc. are available
            try {
                const db = (0, firebase_1.getFirestore)();
                const userDoc = await db.collection('users').doc(decoded.uid).get();
                if (userDoc.exists) {
                    req.user = userDoc.data();
                }
                else {
                    req.user = {
                        uid: decoded.uid,
                        email: decoded.email,
                        name: decoded.email ? decoded.email.split('@')[0] : 'User',
                        provider: 'google',
                        spotifyConnected: false,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    };
                }
            }
            catch (dbError) {
                req.user = {
                    uid: decoded.uid,
                    email: decoded.email,
                    name: decoded.email ? decoded.email.split('@')[0] : 'User',
                    provider: 'google',
                    spotifyConnected: false,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
            }
            return next();
        }
        catch (error) {
            // Token invalid, fall through to unauthorized
        }
    }
    res.status(401).json({ error: 'Unauthorized. Please login.' });
};
exports.isAuthenticated = isAuthenticated;
/**
 * Middleware to check if user has connected Spotify
 */
const hasSpotifyConnected = async (req, res, next) => {
    const user = req.user;
    if (!user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    if (!user.spotifyConnected || !user.spotifyAccessToken) {
        res.status(403).json({ error: 'Spotify account not connected' });
        return;
    }
    try {
        const { SpotifyService } = await Promise.resolve().then(() => __importStar(require('../services/spotify.service')));
        const spotifyService = new SpotifyService();
        // Pre-emptively fetch/refresh token to handle auth errors gracefully
        await spotifyService.getUserAccessToken(user.uid);
        next();
    }
    catch (error) {
        console.error('[Middleware] Spotify auth token validation failed:', error.message);
        res.status(403).json({ error: 'Spotify session expired. Please reconnect your Spotify account.' });
    }
};
exports.hasSpotifyConnected = hasSpotifyConnected;
//# sourceMappingURL=auth.middleware.js.map