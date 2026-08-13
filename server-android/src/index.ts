import './config/env';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import passport from 'passport';
import { initializeFirebase } from './config/firebase';
import './config/passport';
import authRoutes from './routes/auth.routes';
import spotifyRoutes from './routes/spotify.routes';
import userRoutes from './routes/user.routes';
import audioRoutes from './routes/audio.routes';
import madeForYouRoutes from './routes/madeForYou.routes';
import youtubeMusicRoutes from './routes/youtube-music.routes';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';

// Environment variables loaded via import 'dotenv/config'

const app = express();
const PREFERRED_PORT = Number(process.env.PORT) || 5000;

// Initialize Firebase
initializeFirebase();

import radioRoutes from './routes/radio.routes';

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// Trust proxy headers (needed for secure cookies behind reverse proxies)
app.set('trust proxy', 1);

// CORS configuration - Allow all origins for seamless audio streaming & downloads
app.use(cors({
  origin: true,
  credentials: true,
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session configuration
app.use(session({
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
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/spotify', rateLimiter, spotifyRoutes);
app.use('/api/user', rateLimiter, userRoutes);
app.use('/api/audio', rateLimiter, audioRoutes);
app.use('/api/radio', rateLimiter, radioRoutes);
app.use('/api/made-for-you', rateLimiter, madeForYouRoutes);
app.use('/api/youtube-music', rateLimiter, youtubeMusicRoutes);

import path from 'path';
import fs from 'fs';

// Candidate client dist paths depending on runtime folder structure
const possibleDistPaths = [
  path.resolve(__dirname, '../../client/dist'),
  path.resolve(__dirname, '../../../client/dist'),
  path.resolve(process.cwd(), '../client/dist'),
  path.resolve(process.cwd(), 'client/dist'),
  '/home/ubuntu/Sk-Music-Android/client/dist',
];

let activeClientDist = '';
for (const p of possibleDistPaths) {
  if (fs.existsSync(path.join(p, 'index.html'))) {
    activeClientDist = p;
    break;
  }
}

const hasClientDist = activeClientDist !== '';

if (hasClientDist) {
  console.log(`[Server] ✅ Serving static web client from: ${activeClientDist}`);
  app.use(express.static(activeClientDist));
} else {
  console.warn(`[Server] ⚠️ WARNING: client/dist/index.html not found in candidate paths:`, possibleDistPaths);
}

// API Health Check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'sk-music-android-server' });
});

// Fallback all non-API GET requests to web app index.html for SPA routing
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path === '/health') {
    return next();
  }
  if (hasClientDist) {
    return res.sendFile(path.join(activeClientDist, 'index.html'));
  }
  res.status(404).send('Web app client build missing. Run npm run build in client directory.');
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Error handler (must be last)
app.use(errorHandler);

// Start server
console.log('Starting server...');

app.listen(PREFERRED_PORT, () => {
  console.log(`🚀 Server running on port ${PREFERRED_PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
});
