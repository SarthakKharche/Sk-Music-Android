package com.example.skmusic.data.model

import com.google.gson.annotations.SerializedName

data class Artist(
    val id: String? = null,
    val name: String = "Unknown Artist"
)

data class Album(
    val id: String? = null,
    val name: String = "Unknown Album",
    val imageUrl: String? = null,
    val images: List<SpotifyImage>? = null
)

data class SpotifyImage(
    val url: String,
    val height: Int? = null,
    val width: Int? = null
)

data class Track(
    val id: String,
    val name: String,
    val artists: List<Artist> = emptyList(),
    val album: Album = Album(),
    val durationMs: Long = 0L,
    val spotifyUrl: String? = null,
    val isrc: String? = null,
    val isOfflinePreferred: Boolean = false
) {
    val artistName: String
        get() = if (artists.isNotEmpty()) artists.joinToString(", ") { it.name } else "Unknown Artist"

    val artworkUrl: String
        get() = album.imageUrl ?: album.images?.firstOrNull()?.url ?: ""
}

data class Playlist(
    val id: String,
    val name: String,
    val description: String? = null,
    val imageUrl: String? = null,
    val trackCount: Int = 0,
    val isPublic: Boolean = false,
    val spotifyUrl: String? = null
)

data class User(
    val uid: String,
    val email: String,
    val name: String? = null,
    val picture: String? = null,
    val spotifyConnected: Boolean = false,
    val spotifyUserId: String? = null
)

data class AudioSource(
    val url: String,
    val quality: String? = null,
    val format: String? = null,
    val youtubeId: String? = null,
    val trackId: String? = null
)

data class AudioResolveResponse(
    val sources: List<AudioSource> = emptyList()
)

data class PlaylistsResponse(
    val playlists: List<Playlist> = emptyList()
)

data class TracksResponse(
    val tracks: List<Track> = emptyList()
)

data class PlaylistDetailResponse(
    val playlist: Playlist? = null,
    val tracks: List<Track> = emptyList()
)

data class SearchResponse(
    val tracks: List<Track> = emptyList(),
    val albums: List<Album> = emptyList(),
    val artists: List<Artist> = emptyList(),
    val playlists: List<Playlist> = emptyList()
)

data class VerifyTokenResponse(
    val valid: Boolean,
    val user: User? = null
)
