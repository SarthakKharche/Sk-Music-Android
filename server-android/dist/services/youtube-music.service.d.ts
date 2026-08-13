export interface YtShelfItem {
    type: 'track' | 'playlist' | 'album';
    id: string;
    title: string;
    subtitle: string;
    thumbnail: string;
    durationSec?: number;
}
export interface YtShelf {
    title: string;
    strapline?: string;
    items: YtShelfItem[];
}
export declare class YoutubeMusicService {
    private innerTubeUrl;
    private apiKey;
    private decryptToken;
    private encryptToken;
    refreshGoogleAccessToken(userId: string, refreshTokenDecrypted: string): Promise<string>;
    getGoogleAccessToken(userId: string): Promise<string>;
    private findAllChips;
    fetchHomeFeed(_userId: string, params?: string): Promise<{
        shelves: YtShelf[];
        chips: {
            text: string;
            params: string;
        }[];
    }>;
    private parseHomeFeed;
    private findAllTracks;
    fetchPlaylist(playlistId: string, overrideTitle?: string): Promise<{
        name: string;
        description: string;
        imageUrl: string;
        tracks: any[];
    }>;
    searchPlaylists(query: string): Promise<any[]>;
    searchTracks(query: string): Promise<any[]>;
}
export declare const youtubeMusicService: YoutubeMusicService;
//# sourceMappingURL=youtube-music.service.d.ts.map