package com.example.skmusic.ui.main

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.example.skmusic.NavigationKey
import com.example.skmusic.data.api.NetworkManager
import com.example.skmusic.data.model.Track
import com.example.skmusic.player.MusicPlaybackService
import com.example.skmusic.ui.components.NativeMiniPlayerBar
import com.example.skmusic.ui.components.PwaWebViewContainer

@Composable
fun MainScreen(
    onItemClick: (NavigationKey) -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val networkManager = remember { NetworkManager.getInstance(context) }

    var currentTrack by remember { mutableStateOf<Track?>(null) }
    var isPlaying by remember { mutableStateOf(false) }

    // Monitor playback service state
    LaunchedEffect(Unit) {
        kotlinx.coroutines.delay(500)
        MusicPlaybackService.instance?.let { service ->
            snapshotFlow { service.currentTrack.value }.collect { track ->
                currentTrack = track
            }
        }
    }
    LaunchedEffect(Unit) {
        kotlinx.coroutines.delay(500)
        MusicPlaybackService.instance?.let { service ->
            snapshotFlow { service.isPlaying.value }.collect { playing ->
                isPlaying = playing
            }
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF121212))
    ) {
        // Full PWA UI Container loaded directly from AWS EC2 server
        PwaWebViewContainer(
            baseUrl = "http://13.203.231.53:5000/",
            modifier = Modifier.fillMaxSize(),
            onTokenExtracted = { token ->
                networkManager.setAuthToken(token)
            }
        )
    }
}
