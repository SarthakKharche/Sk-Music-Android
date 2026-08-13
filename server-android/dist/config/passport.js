"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("./env");
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const firebase_1 = require("./firebase");
const crypto_js_1 = __importDefault(require("crypto-js"));
/**
 * Configure Passport with Google OAuth 2.0 Strategy
 */
passport_1.default.use(new passport_google_oauth20_1.Strategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_REDIRECT_URI || 'https://sk-music-xi.vercel.app/api/auth/google/callback',
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const db = (0, firebase_1.getFirestore)();
        const userRef = db.collection('users').doc(profile.id);
        const userDoc = await userRef.get();
        const email = profile.emails?.[0]?.value || '';
        const name = profile.displayName || '';
        const picture = profile.photos?.[0]?.value || '';
        const secret = process.env.JWT_SECRET;
        const encryptedAccessToken = crypto_js_1.default.AES.encrypt(accessToken, secret).toString();
        const encryptedRefreshToken = refreshToken
            ? crypto_js_1.default.AES.encrypt(refreshToken, secret).toString()
            : null;
        const tokenExpiry = new Date(Date.now() + 3600 * 1000).toISOString(); // Google access token usually expires in 1 hour
        if (!userDoc.exists) {
            // Create new user
            const newUser = {
                uid: profile.id,
                email,
                name,
                picture,
                provider: 'google',
                spotifyConnected: false,
                googleAccessToken: encryptedAccessToken,
                googleRefreshToken: encryptedRefreshToken || undefined,
                googleTokenExpiry: tokenExpiry,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            await userRef.set(newUser);
            return done(null, newUser);
        }
        else {
            // Update existing user
            const userData = userDoc.data();
            userData.updatedAt = new Date().toISOString();
            const updates = {
                name,
                picture,
                googleAccessToken: encryptedAccessToken,
                googleTokenExpiry: tokenExpiry,
                updatedAt: userData.updatedAt,
            };
            if (encryptedRefreshToken) {
                updates.googleRefreshToken = encryptedRefreshToken;
            }
            await userRef.update(updates);
            return done(null, { ...userData, ...updates });
        }
    }
    catch (error) {
        return done(error);
    }
}));
/**
 * Serialize user for session storage
 */
passport_1.default.serializeUser((user, done) => {
    done(null, user.uid);
});
/**
 * Deserialize user from session
 */
passport_1.default.deserializeUser(async (uid, done) => {
    try {
        const db = (0, firebase_1.getFirestore)();
        const userDoc = await db.collection('users').doc(uid).get();
        if (!userDoc.exists) {
            return done(null, false);
        }
        done(null, userDoc.data());
    }
    catch (error) {
        done(error);
    }
});
exports.default = passport_1.default;
//# sourceMappingURL=passport.js.map