"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("./config/env");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_session_1 = __importDefault(require("express-session"));
const passport_1 = __importDefault(require("passport"));
const firebase_1 = require("./config/firebase");
require("./config/passport");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const spotify_routes_1 = __importDefault(require("./routes/spotify.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const audio_routes_1 = __importDefault(require("./routes/audio.routes"));
const madeForYou_routes_1 = __importDefault(require("./routes/madeForYou.routes"));
const youtube_music_routes_1 = __importDefault(require("./routes/youtube-music.routes"));
const errorHandler_1 = require("./middleware/errorHandler");
const rateLimiter_1 = require("./middleware/rateLimiter");
// Environment variables loaded via import 'dotenv/config'
const app = (0, express_1.default)();
const PREFERRED_PORT = Number(process.env.PORT) || 5000;
// Initialize Firebase
(0, firebase_1.initializeFirebase)();
const radio_routes_1 = __importDefault(require("./routes/radio.routes"));
// Security middleware
app.use((0, helmet_1.default)({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
// Trust proxy headers (needed for secure cookies behind reverse proxies)
app.set('trust proxy', 1);
// CORS configuration - Allow all origins for seamless audio streaming & downloads
app.use((0, cors_1.default)({
    origin: true,
    credentials: true,
}));
// Body parsing middleware
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cookie_parser_1.default)());
// Session configuration
app.use((0, express_session_1.default)({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000,
    },
}));
// Passport initialization
app.use(passport_1.default.initialize());
app.use(passport_1.default.session());
// Routes
app.use('/api/auth', auth_routes_1.default);
app.use('/api/spotify', rateLimiter_1.rateLimiter, spotify_routes_1.default);
app.use('/api/user', rateLimiter_1.rateLimiter, user_routes_1.default);
app.use('/api/audio', rateLimiter_1.rateLimiter, audio_routes_1.default);
app.use('/api/radio', rateLimiter_1.rateLimiter, radio_routes_1.default);
app.use('/api/made-for-you', rateLimiter_1.rateLimiter, madeForYou_routes_1.default);
app.use('/api/youtube-music', rateLimiter_1.rateLimiter, youtube_music_routes_1.default);
// API Health Check
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'sk-music-android-server' });
});
// Handle uncaught errors
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
// Error handler (must be last)
app.use(errorHandler_1.errorHandler);
// Start server
console.log('Starting server...');
app.listen(PREFERRED_PORT, () => {
    console.log(`🚀 Server running on port ${PREFERRED_PORT}`);
    console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
});
//# sourceMappingURL=index.js.map