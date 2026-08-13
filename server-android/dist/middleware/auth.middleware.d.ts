import { Request, Response, NextFunction } from 'express';
/**
 * Extend Express Request to include user
 * Use interface merging to add our User properties to Express.User
 */
declare global {
    namespace Express {
        interface User {
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
            createdAt: string;
            updatedAt: string;
        }
    }
}
/**
 * Middleware to check if user is authenticated
 * Supports both session-based auth and JWT Bearer tokens.
 * When using JWT, hydrates the full user from Firestore so downstream
 * middleware (e.g. hasSpotifyConnected) has all user fields.
 */
export declare const isAuthenticated: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Middleware to check if user has connected Spotify
 */
export declare const hasSpotifyConnected: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=auth.middleware.d.ts.map