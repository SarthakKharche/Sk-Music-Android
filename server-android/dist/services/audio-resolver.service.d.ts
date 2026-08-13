import type { AudioResolveRequest, AudioSource } from '../types/audio.types';
export declare class AudioResolverService {
    /**
     * Resolve audio sources for a track using YouTube search
     */
    resolveAudioSources(request: AudioResolveRequest): Promise<AudioSource[]>;
    /**
     * Search YouTube using YouTube Music service directly (instant)
     */
    private searchYouTube;
    /**
     * Get audio stream info from YouTube video
     */
    getStreamInfo(youtubeId: string): Promise<{
        url: string;
        type: string;
    } | null>;
    /**
     * Get direct audio stream URL for downloading/caching (with 2-hour caching for instant playback)
     */
    getDirectAudioUrl(youtubeId: string): Promise<{
        url: string;
        format: string;
        quality: string;
        durationMs: number;
    } | null>;
    /**
     * Clear stream URL cache for a specific video ID (used when URL expires)
     */
    clearStreamCache(youtubeId: string): void;
}
export declare const audioResolverService: AudioResolverService;
//# sourceMappingURL=audio-resolver.service.d.ts.map