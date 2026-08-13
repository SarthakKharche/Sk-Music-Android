/**
 * Audio source metadata (NOT the audio file itself)
 */
export interface AudioSource {
    trackId: string;
    sourceUrl: string;
    quality: 'low' | 'medium' | 'high';
    format: string;
    durationMs: number;
    resolvedAt: string;
    expiresAt?: string;
    youtubeId?: string;
    title?: string;
    thumbnail?: string;
}
/**
 * Audio resolver request
 */
export interface AudioResolveRequest {
    trackId?: string;
    trackName: string;
    artistName: string;
    albumName?: string;
    durationMs?: number;
    isrc?: string;
}
/**
 * Audio resolver response from external service
 */
export interface AudioResolveResponse {
    success: boolean;
    sources?: Array<{
        url: string;
        quality: 'low' | 'medium' | 'high';
        format: string;
        bitrate?: number;
        durationMs?: number;
    }>;
    error?: string;
}
//# sourceMappingURL=audio.types.d.ts.map