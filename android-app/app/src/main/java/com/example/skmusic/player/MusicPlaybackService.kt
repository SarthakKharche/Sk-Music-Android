package com.example.skmusic.player

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.drawable.BitmapDrawable
import android.os.Build
import android.os.Bundle
import androidx.annotation.OptIn
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.session.LibraryResult
import androidx.media3.session.MediaLibraryService
import androidx.media3.session.MediaSession
import androidx.media3.session.SessionCommand
import androidx.media3.session.SessionResult
import com.example.skmusic.MainActivity
import com.example.skmusic.data.api.NetworkManager
import com.example.skmusic.data.model.Track
import com.google.common.collect.ImmutableList
import com.google.common.util.concurrent.Futures
import com.google.common.util.concurrent.ListenableFuture
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.net.URL

@OptIn(UnstableApi::class)
class MusicPlaybackService : MediaLibraryService() {

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private var mediaLibrarySession: MediaLibrarySession? = null
    private lateinit var player: ExoPlayer
    private lateinit var networkManager: NetworkManager

    private val _currentTrack = MutableStateFlow<Track?>(null)
    val currentTrack: StateFlow<Track?> = _currentTrack

    private val _isPlaying = MutableStateFlow(false)
    val isPlaying: StateFlow<Boolean> = _isPlaying

    private val _playlistQueue = MutableStateFlow<List<Track>>(emptyList())
    val playlistQueue: StateFlow<List<Track>> = _playlistQueue

    private val _queueIndex = MutableStateFlow(-1)
    val queueIndex: StateFlow<Int> = _queueIndex

    override fun onCreate() {
        super.onCreate()
        networkManager = NetworkManager.getInstance(applicationContext)

        val audioAttributes = AudioAttributes.Builder()
            .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
            .setUsage(C.USAGE_MEDIA)
            .build()

        val dataSourceFactory = DefaultHttpDataSource.Factory()
            .setAllowCrossProtocolRedirects(true)
            .setConnectTimeoutMs(15000)
            .setReadTimeoutMs(15000)

        player = ExoPlayer.Builder(this)
            .setMediaSourceFactory(DefaultMediaSourceFactory(dataSourceFactory))
            .setAudioAttributes(audioAttributes, true)
            .setHandleAudioBecomingNoisy(true)
            .build()

        player.addListener(object : Player.Listener {
            override fun onIsPlayingChanged(isPlayingNow: Boolean) {
                _isPlaying.value = isPlayingNow
            }

            override fun onMediaItemTransition(mediaItem: MediaItem?, reason: Int) {
                mediaItem?.mediaId?.let { trackId ->
                    val idx = _playlistQueue.value.indexOfFirst { it.id == trackId }
                    if (idx != -1) {
                        _queueIndex.value = idx
                        _currentTrack.value = _playlistQueue.value[idx]
                    }
                }
            }
        })

        val intent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        mediaLibrarySession = MediaLibrarySession.Builder(this, player, LibraryCallback())
            .setSessionActivity(pendingIntent)
            .build()

        instance = this
    }

    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaLibrarySession? {
        return mediaLibrarySession
    }

    fun playTrackList(tracks: List<Track>, startIndex: Int = 0) {
        if (tracks.isEmpty()) return
        _playlistQueue.value = tracks
        _queueIndex.value = startIndex.coerceIn(0, tracks.size - 1)
        val track = tracks[_queueIndex.value]
        playSingleTrack(track)
    }

    fun playSingleTrack(track: Track) {
        _currentTrack.value = track
        serviceScope.launch {
            val source = networkManager.resolveAudio(track)
            val audioUrl = source?.url ?: return@launch

            val metadata = MediaMetadata.Builder()
                .setTitle(track.name)
                .setArtist(track.artistName)
                .setAlbumTitle(track.album.name)
                .setArtworkUri(android.net.Uri.parse(track.artworkUrl))
                .build()

            val mediaItem = MediaItem.Builder()
                .setMediaId(track.id)
                .setUri(audioUrl)
                .setMediaMetadata(metadata)
                .build()

            withContext(Dispatchers.Main) {
                player.setMediaItem(mediaItem)
                player.prepare()
                player.play()
            }
        }
    }

    fun togglePlayPause() {
        if (player.isPlaying) {
            player.pause()
        } else {
            player.play()
        }
    }

    fun skipToNext() {
        val queue = _playlistQueue.value
        val nextIdx = _queueIndex.value + 1
        if (queue.isNotEmpty() && nextIdx in queue.indices) {
            _queueIndex.value = nextIdx
            playSingleTrack(queue[nextIdx])
        }
    }

    fun skipToPrevious() {
        val queue = _playlistQueue.value
        val prevIdx = _queueIndex.value - 1
        if (queue.isNotEmpty() && prevIdx in queue.indices) {
            _queueIndex.value = prevIdx
            playSingleTrack(queue[prevIdx])
        }
    }

    fun seekTo(positionMs: Long) {
        player.seekTo(positionMs)
    }

    override fun onDestroy() {
        mediaLibrarySession?.run {
            player.release()
            release()
            mediaLibrarySession = null
        }
        serviceScope.cancel()
        instance = null
        super.onDestroy()
    }

    private inner class LibraryCallback : MediaLibrarySession.Callback {

        override fun onGetLibraryRoot(
            session: MediaLibrarySession,
            browser: MediaSession.ControllerInfo,
            params: MediaLibraryService.LibraryParams?
        ): ListenableFuture<LibraryResult<MediaItem>> {
            val rootItem = MediaItem.Builder()
                .setMediaId("ROOT")
                .setMediaMetadata(
                    MediaMetadata.Builder()
                        .setTitle("SK Music")
                        .setIsBrowsable(true)
                        .setIsPlayable(false)
                        .setFolderType(MediaMetadata.FOLDER_TYPE_MIXED)
                        .build()
                )
                .build()
            return Futures.immediateFuture(LibraryResult.ofItem(rootItem, params))
        }

        override fun onGetChildren(
            session: MediaLibrarySession,
            browser: MediaSession.ControllerInfo,
            parentId: String,
            page: Int,
            pageSize: Int,
            params: MediaLibraryService.LibraryParams?
        ): ListenableFuture<LibraryResult<ImmutableList<MediaItem>>> {
            return serviceScope.asyncFuture {
                val children = mutableListOf<MediaItem>()

                when (parentId) {
                    "ROOT" -> {
                        children.add(buildFolderItem("SONGS", "Songs", MediaMetadata.FOLDER_TYPE_TITLES))
                        children.add(buildFolderItem("PLAYLISTS", "Playlists", MediaMetadata.FOLDER_TYPE_PLAYLISTS))
                        children.add(buildFolderItem("MADE_FOR_YOU", "Made For You", MediaMetadata.FOLDER_TYPE_PLAYLISTS))
                    }
                    "SONGS" -> {
                        try {
                            val res = networkManager.apiService.getOfflinePreferences()
                            val tracks = res.body()?.tracks ?: emptyList()
                            tracks.forEach { track ->
                                children.add(buildTrackMediaItem(track))
                            }
                        } catch (e: Exception) {
                            e.printStackTrace()
                        }
                    }
                    "PLAYLISTS" -> {
                        try {
                            val res = networkManager.apiService.getSpotifyPlaylists()
                            val playlists = res.body()?.playlists ?: emptyList()
                            playlists.forEach { pl ->
                                children.add(buildFolderItem("PL_${pl.id}", pl.name, MediaMetadata.FOLDER_TYPE_PLAYLISTS))
                            }
                        } catch (e: Exception) {
                            e.printStackTrace()
                        }
                    }
                    "MADE_FOR_YOU" -> {
                        try {
                            val res = networkManager.apiService.getMadeForYouPlaylists()
                            val playlists = res.body() ?: emptyList()
                            playlists.forEach { pl ->
                                children.add(buildFolderItem("MFY_${pl.id}", pl.name, MediaMetadata.FOLDER_TYPE_PLAYLISTS))
                            }
                        } catch (e: Exception) {
                            e.printStackTrace()
                        }
                    }
                    else -> {
                        if (parentId.startsWith("PL_")) {
                            val plId = parentId.removePrefix("PL_")
                            try {
                                val res = networkManager.apiService.getSpotifyPlaylistDetail(plId)
                                val tracks = res.body()?.tracks ?: emptyList()
                                tracks.forEach { children.add(buildTrackMediaItem(it)) }
                            } catch (e: Exception) {
                                e.printStackTrace()
                            }
                        } else if (parentId.startsWith("MFY_")) {
                            val plId = parentId.removePrefix("MFY_")
                            try {
                                val res = networkManager.apiService.getMadeForYouPlaylistDetail(plId)
                                val tracks = res.body()?.tracks ?: emptyList()
                                tracks.forEach { children.add(buildTrackMediaItem(it)) }
                            } catch (e: Exception) {
                                e.printStackTrace()
                            }
                        }
                    }
                }
                LibraryResult.ofItemList(ImmutableList.copyOf(children), params)
            }
        }

        override fun onAddMediaItems(
            mediaSession: MediaSession,
            controller: MediaSession.ControllerInfo,
            mediaItems: MutableList<MediaItem>
        ): ListenableFuture<MutableList<MediaItem>> {
            val updatedMediaItems = mediaItems.map { mediaItem ->
                if (mediaItem.requestMetadata.searchQuery != null) {
                    mediaItem
                } else {
                    val uriString = mediaItem.requestMetadata.mediaUri?.toString() ?: mediaItem.mediaId
                    mediaItem.buildUpon()
                        .setUri(android.net.Uri.parse(uriString))
                        .build()
                }
            }.toMutableList()
            return Futures.immediateFuture(updatedMediaItems)
        }
    }

    private fun buildFolderItem(id: String, title: String, folderType: Int): MediaItem {
        return MediaItem.Builder()
            .setMediaId(id)
            .setMediaMetadata(
                MediaMetadata.Builder()
                    .setTitle(title)
                    .setIsBrowsable(true)
                    .setIsPlayable(false)
                    .setFolderType(folderType)
                    .build()
            )
            .build()
    }

    private fun buildTrackMediaItem(track: Track): MediaItem {
        return MediaItem.Builder()
            .setMediaId(track.id)
            .setMediaMetadata(
                MediaMetadata.Builder()
                    .setTitle(track.name)
                    .setArtist(track.artistName)
                    .setAlbumTitle(track.album.name)
                    .setArtworkUri(android.net.Uri.parse(track.artworkUrl))
                    .setIsBrowsable(false)
                    .setIsPlayable(true)
                    .build()
            )
            .build()
    }

    companion object {
        var instance: MusicPlaybackService? = null
    }
}

fun <T> CoroutineScope.asyncFuture(block: suspend () -> T): ListenableFuture<T> {
    val future = com.google.common.util.concurrent.SettableFuture.create<T>()
    launch {
        try {
            future.set(block())
        } catch (e: Throwable) {
            future.setException(e)
        }
    }
    return future
}
