/**
 * Made For You — API Routes
 *
 * All endpoints require authentication via `isAuthenticated` middleware.
 * Spotify-connected check (`hasSpotifyConnected`) is only required for
 * the initial import; all other operations work independently.
 *
 * Route summary:
 *  POST /api/made-for-you/import           – Import seed playlists from Spotify
 *  GET  /api/made-for-you/playlists        – List all personalised playlists
 *  GET  /api/made-for-you/playlists/:id    – Get a single playlist with tracks
 *  POST /api/made-for-you/regenerate       – Force-regenerate all playlists
 *  POST /api/made-for-you/events           – Record a listening event
 *  POST /api/made-for-you/events/batch     – Batch-record events (offline sync)
 *  GET  /api/made-for-you/stats            – Get listening analytics
 *  DELETE /api/made-for-you/data           – Delete all Made-For-You data
 */
declare const router: import("express-serve-static-core").Router;
export default router;
//# sourceMappingURL=madeForYou.routes.d.ts.map