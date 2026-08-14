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
                updateForegroundNotification()
                android.util.Log.d("MusicPlaybackService", "[MEDIA3_STATE] onIsPlayingChanged: $isPlayingNow, playbackState: ${player.playbackState}")
            }

            override fun onPlaybackStateChanged(playbackState: Int) {
                val stateName = when (playbackState) {
                    Player.STATE_IDLE -> "STATE_IDLE"
                    Player.STATE_BUFFERING -> "STATE_BUFFERING"
                    Player.STATE_READY -> "STATE_READY"
                    Player.STATE_ENDED -> "STATE_ENDED"
                    else -> "UNKNOWN"
                }
                updateForegroundNotification()
                android.util.Log.d("MusicPlaybackService", "[MEDIA3_STATE] onPlaybackStateChanged: $stateName ($playbackState), playWhenReady: ${player.playWhenReady}")
            }

            override fun onPlayerError(error: androidx.media3.common.PlaybackException) {
                android.util.Log.e("MusicPlaybackService", "[MEDIA3_ERROR] Player Error!", error)
            }

            override fun onMediaItemTransition(mediaItem: MediaItem?, reason: Int) {
                android.util.Log.d("MusicPlaybackService", "[MEDIA3_STATE] onMediaItemTransition: ${mediaItem?.mediaMetadata?.title}, reason: $reason")
                updateForegroundNotification()
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

        // 1. Create explicit NotificationChannel with IMPORTANCE_DEFAULT for active Media3 controls
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                "sk_music_playback_channel",
                getString(com.example.skmusic.R.string.app_name),
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "SK Music Media Playback Controls"
                setSound(null, null)
                setShowBadge(true)
            }
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }

        // 2. Configure Media3 DefaultMediaNotificationProvider so Media3 displays rich system media controls
        try {
            val notificationProvider = androidx.media3.session.DefaultMediaNotificationProvider.Builder(this)
                .setNotificationId(1001)
                .setChannelId("sk_music_playback_channel")
                .setChannelName(com.example.skmusic.R.string.app_name)
                .build()
            setMediaNotificationProvider(notificationProvider)
            android.util.Log.d("MusicPlaybackService", "[NOTIF] DefaultMediaNotificationProvider attached successfully")
        } catch (e: Throwable) {
            android.util.Log.e("MusicPlaybackService", "[NOTIF_ERROR] Failed to set DefaultMediaNotificationProvider", e)
        }

        instance = this
        android.util.Log.d("MusicPlaybackService", "Media3 Service onCreate: ExoPlayer and MediaLibrarySession initialized")
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        android.util.Log.d("MusicPlaybackService", "onTaskRemoved called, keeping foreground service active for background media playback")
    }

    override fun onDestroy() {
        mediaLibrarySession?.run {
            player.release()
            release()
            mediaLibrarySession = null
        }
        serviceScope.cancel()
        instance = null
        android.util.Log.d("MusicPlaybackService", "Service destroyed and session released")
        super.onDestroy()
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
        val directAudioUrl = "http://13.203.231.53:5000/api/audio/saavn-search?trackId=${track.id}&query=${java.net.URLEncoder.encode(track.name + " " + track.artistName, "UTF-8")}"

        val metadata = MediaMetadata.Builder()
            .setTitle(track.name)
            .setArtist(track.artistName)
            .setAlbumTitle(track.album.name)
            .setArtworkUri(if (track.artworkUrl.isNotEmpty()) android.net.Uri.parse(track.artworkUrl) else null)
            .build()

        val mediaItem = MediaItem.Builder()
            .setMediaId(track.id)
            .setUri(directAudioUrl)
            .setMediaMetadata(metadata)
            .build()

        serviceScope.launch(Dispatchers.Main) {
            try {
                player.setMediaItem(mediaItem)
                player.prepare()
                player.playWhenReady = true
                player.play()
                android.util.Log.d("MusicPlaybackService", "playSingleTrack: MediaItem set on ExoPlayer for track ${track.name}, playWhenReady = true")
            } catch (e: Throwable) {
                android.util.Log.e("MusicPlaybackService", "Error preparing ExoPlayer in playSingleTrack", e)
            }
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        android.util.Log.d("MusicPlaybackService", "onStartCommand received action: ${intent?.action}")
        
        var notifTitle = "SK Music"
        var notifArtist = "Playing..."
        
        if (intent?.action == "ACTION_PLAY_TRACK") {
            val jsonTrack = intent.getStringExtra("EXTRA_JSON_TRACK")
            if (!jsonTrack.isNullOrEmpty()) {
                try {
                    val jsonObj = org.json.JSONObject(jsonTrack)
                    notifTitle = jsonObj.optString("name", "SK Music")
                    notifArtist = jsonObj.optString("artistName", "SK Music")
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        } else if (_currentTrack.value != null) {
            notifTitle = _currentTrack.value!!.name
            notifArtist = _currentTrack.value!!.artistName
        }
        
        // Satisfy Android 14 ForegroundServiceDidNotStartInTimeException immediately with actual track metadata & MediaStyle controls
        try {
            val sessionToken = mediaLibrarySession?.sessionCompatToken
            val mediaStyle = androidx.media.app.NotificationCompat.MediaStyle()
            if (sessionToken != null) {
                mediaStyle.setMediaSession(sessionToken as android.support.v4.media.session.MediaSessionCompat.Token)
                mediaStyle.setShowActionsInCompactView(0, 1, 2)
            }

            val prevIntent = PendingIntent.getService(this, 1, Intent(this, MusicPlaybackService::class.java).apply { action = "ACTION_PREVIOUS" }, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
            val toggleIntent = PendingIntent.getService(this, 2, Intent(this, MusicPlaybackService::class.java).apply { action = "ACTION_TOGGLE_PLAY" }, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
            val nextIntent = PendingIntent.getService(this, 3, Intent(this, MusicPlaybackService::class.java).apply { action = "ACTION_NEXT" }, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)

            val initialNotif = androidx.core.app.NotificationCompat.Builder(this, "sk_music_playback_channel")
                .setContentTitle(notifTitle)
                .setContentText(notifArtist)
                .setSmallIcon(com.example.skmusic.R.mipmap.ic_launcher)
                .setPriority(androidx.core.app.NotificationCompat.PRIORITY_DEFAULT)
                .setOngoing(true)
                .setStyle(mediaStyle)
                .addAction(android.R.drawable.ic_media_previous, "Previous", prevIntent)
                .addAction(if (player.isPlaying) android.R.drawable.ic_media_pause else android.R.drawable.ic_media_play, "Play/Pause", toggleIntent)
                .addAction(android.R.drawable.ic_media_next, "Next", nextIntent)
                .build()
                
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(1001, initialNotif, android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK)
            } else {
                startForeground(1001, initialNotif)
            }
            android.util.Log.d("MusicPlaybackService", "[FOREGROUND] startForeground promoted service to foreground in onStartCommand for: $notifTitle - $notifArtist")
        } catch (e: Throwable) {
            android.util.Log.e("MusicPlaybackService", "[FOREGROUND_ERROR] Failed to call startForeground in onStartCommand", e)
        }

        when (intent?.action) {
            "ACTION_PLAY_TRACK" -> {
                val jsonTrack = intent.getStringExtra("EXTRA_JSON_TRACK")
                if (!jsonTrack.isNullOrEmpty()) {
                    try {
                        val jsonObj = org.json.JSONObject(jsonTrack)
                        val artistName = jsonObj.optString("artistName", "SK Music")
                        val artworkUrl = jsonObj.optString("artworkUrl", "")
                        val track = com.example.skmusic.data.model.Track(
                            id = jsonObj.optString("id"),
                            name = jsonObj.optString("name", "Unknown Song"),
                            artists = listOf(com.example.skmusic.data.model.Artist(name = artistName)),
                            album = com.example.skmusic.data.model.Album(imageUrl = artworkUrl),
                            durationMs = jsonObj.optLong("durationMs", 180000L)
                        )
                        playSingleTrack(track)
                    } catch (e: Exception) {
                        android.util.Log.e("MusicPlaybackService", "Error parsing jsonTrack in onStartCommand", e)
                    }
                }
            }
            "ACTION_PAUSE" -> {
                player.pause()
                updateForegroundNotification()
                com.example.skmusic.ui.components.sendNativeEventToJS("PAUSE")
            }
            "ACTION_RESUME" -> {
                player.playWhenReady = true
                player.play()
                updateForegroundNotification()
                com.example.skmusic.ui.components.sendNativeEventToJS("RESUME")
            }
            "ACTION_PREVIOUS" -> {
                skipToPrevious()
                com.example.skmusic.ui.components.sendNativeEventToJS("PREVIOUS")
            }
            "ACTION_TOGGLE_PLAY" -> {
                togglePlayPause()
                com.example.skmusic.ui.components.sendNativeEventToJS(if (player.isPlaying) "PAUSE" else "RESUME")
            }
            "ACTION_NEXT" -> {
                skipToNext()
                com.example.skmusic.ui.components.sendNativeEventToJS("NEXT")
            }
        }
        return START_STICKY
    }

    private fun updateForegroundNotification() {
        val track = _currentTrack.value ?: return
        try {
            val sessionToken = mediaLibrarySession?.sessionCompatToken
            val mediaStyle = androidx.media.app.NotificationCompat.MediaStyle()
            if (sessionToken != null) {
                mediaStyle.setMediaSession(sessionToken as android.support.v4.media.session.MediaSessionCompat.Token)
                mediaStyle.setShowActionsInCompactView(0, 1, 2)
            }

            val prevIntent = PendingIntent.getService(this, 1, Intent(this, MusicPlaybackService::class.java).apply { action = "ACTION_PREVIOUS" }, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
            val toggleIntent = PendingIntent.getService(this, 2, Intent(this, MusicPlaybackService::class.java).apply { action = "ACTION_TOGGLE_PLAY" }, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
            val nextIntent = PendingIntent.getService(this, 3, Intent(this, MusicPlaybackService::class.java).apply { action = "ACTION_NEXT" }, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)

            val isCurrentlyActive = player.isPlaying || player.playWhenReady
            val notification = androidx.core.app.NotificationCompat.Builder(this, "sk_music_playback_channel")
                .setContentTitle(track.name)
                .setContentText(track.artistName)
                .setSmallIcon(com.example.skmusic.R.mipmap.ic_launcher)
                .setPriority(androidx.core.app.NotificationCompat.PRIORITY_DEFAULT)
                .setOngoing(isCurrentlyActive)
                .setStyle(mediaStyle)
                .addAction(android.R.drawable.ic_media_previous, "Previous", prevIntent)
                .addAction(if (isCurrentlyActive) android.R.drawable.ic_media_pause else android.R.drawable.ic_media_play, "Play/Pause", toggleIntent)
                .addAction(android.R.drawable.ic_media_next, "Next", nextIntent)
                .build()

            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.notify(1001, notification)
            android.util.Log.d("MusicPlaybackService", "[NOTIF_UPDATE] Notification updated for: ${track.name}, isPlaying = ${player.isPlaying}")
        } catch (e: Throwable) {
            android.util.Log.e("MusicPlaybackService", "Error updating foreground notification", e)
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
