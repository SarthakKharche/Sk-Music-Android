package com.example.skmusic.data.api

import com.example.skmusic.data.model.*
import retrofit2.Response
import retrofit2.http.*

interface SkMusicApiService {

    @GET("auth/me")
    suspend fun getMe(): Response<User>

    @POST("auth/verify-token")
    suspend fun verifyToken(@Body body: Map<String, String>): Response<VerifyTokenResponse>

    @POST("auth/logout")
    suspend fun logout(): Response<Map<String, String>>

    @GET("spotify/playlists")
    suspend fun getSpotifyPlaylists(): Response<PlaylistsResponse>

    @GET("spotify/playlists/{playlistId}")
    suspend fun getSpotifyPlaylistDetail(@Path("playlistId") playlistId: String): Response<PlaylistDetailResponse>

    @GET("user/playlists")
    suspend fun getUserPlaylists(): Response<PlaylistsResponse>

    @GET("user/playlists/{playlistId}/tracks")
    suspend fun getPlaylistTracks(@Path("playlistId") playlistId: String): Response<TracksResponse>

    @GET("user/offline-preferences")
    suspend fun getOfflinePreferences(): Response<TracksResponse>

    @POST("user/offline-preferences")
    suspend fun updateOfflinePreferences(@Body body: Map<String, Any>): Response<Map<String, Any>>

    @GET("made-for-you/playlists")
    suspend fun getMadeForYouPlaylists(): Response<List<Playlist>>

    @GET("made-for-you/playlists/{id}")
    suspend fun getMadeForYouPlaylistDetail(@Path("id") id: String): Response<PlaylistDetailResponse>

    @POST("audio/resolve")
    suspend fun resolveAudio(@Body body: Map<String, Any?>): Response<AudioResolveResponse>

    @GET("spotify/search")
    suspend fun searchSpotify(@Query("q") query: String, @Query("limit") limit: Int = 20, @Query("offset") offset: Int = 0): Response<SearchResponse>

    @GET("youtube-music/home")
    suspend fun getYoutubeMusicHome(): Response<Map<String, Any>>
}
