package com.example.skmusic.ui.main

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.skmusic.NavigationKey
import com.example.skmusic.data.model.Track
import com.example.skmusic.player.MusicPlaybackService
import com.example.skmusic.ui.components.NativeMiniPlayerBar
import com.example.skmusic.ui.screens.NativeHomeScreen
import com.example.skmusic.ui.screens.NativeLibraryScreen
import com.example.skmusic.ui.screens.NativeSearchScreen
import com.example.skmusic.ui.screens.NativeYtMusicScreen

enum class NativeTab {
    HOME, SEARCH, YT_MUSIC, LIBRARY
}

@Composable
fun MainScreen(
    onItemClick: (NavigationKey) -> Unit,
    modifier: Modifier = Modifier
) {
    var selectedTab by remember { mutableStateOf(NativeTab.HOME) }
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
        // Active Screen Content
        when (selectedTab) {
            NativeTab.HOME -> NativeHomeScreen(onTrackSelected = { currentTrack = it })
            NativeTab.SEARCH -> NativeSearchScreen(onTrackSelected = { currentTrack = it })
            NativeTab.YT_MUSIC -> NativeYtMusicScreen(onTrackSelected = { currentTrack = it })
            NativeTab.LIBRARY -> NativeLibraryScreen()
        }

        // Native ExoPlayer MiniPlayer overlay
        NativeMiniPlayerBar(
            currentTrack = currentTrack,
            isPlaying = isPlaying,
            onTogglePlayPause = {
                MusicPlaybackService.instance?.togglePlayPause()
            },
            onNext = {
                MusicPlaybackService.instance?.skipToNext()
            },
            onPrevious = {
                MusicPlaybackService.instance?.skipToPrevious()
            },
            modifier = Modifier
                .align(androidx.compose.ui.Alignment.BottomCenter)
                .padding(bottom = 68.dp)
        )

        // Native Bottom Navigation Bar
        NavigationBar(
            containerColor = Color(0xFF121212),
            contentColor = Color.White,
            modifier = Modifier.align(androidx.compose.ui.Alignment.BottomCenter)
        ) {
            NavigationBarItem(
                selected = selectedTab == NativeTab.HOME,
                onClick = { selectedTab = NativeTab.HOME },
                label = { Text("Home") },
                icon = { Text("🏠", fontSize = 18.dp.value.sp) },
                colors = NavigationBarItemDefaults.colors(
                    selectedIconColor = Color(0xFF1DB954),
                    selectedTextColor = Color(0xFF1DB954),
                    unselectedIconColor = Color.Gray,
                    unselectedTextColor = Color.Gray,
                    indicatorColor = Color.Transparent
                )
            )
            NavigationBarItem(
                selected = selectedTab == NativeTab.SEARCH,
                onClick = { selectedTab = NativeTab.SEARCH },
                label = { Text("Search") },
                icon = { Text("🔍", fontSize = 18.dp.value.sp) },
                colors = NavigationBarItemDefaults.colors(
                    selectedIconColor = Color(0xFF1DB954),
                    selectedTextColor = Color(0xFF1DB954),
                    unselectedIconColor = Color.Gray,
                    unselectedTextColor = Color.Gray,
                    indicatorColor = Color.Transparent
                )
            )
            NavigationBarItem(
                selected = selectedTab == NativeTab.YT_MUSIC,
                onClick = { selectedTab = NativeTab.YT_MUSIC },
                label = { Text("YT Music") },
                icon = { Text("🎵", fontSize = 18.dp.value.sp) },
                colors = NavigationBarItemDefaults.colors(
                    selectedIconColor = Color.Red,
                    selectedTextColor = Color.Red,
                    unselectedIconColor = Color.Gray,
                    unselectedTextColor = Color.Gray,
                    indicatorColor = Color.Transparent
                )
            )
            NavigationBarItem(
                selected = selectedTab == NativeTab.LIBRARY,
                onClick = { selectedTab = NativeTab.LIBRARY },
                label = { Text("Library") },
                icon = { Text("📚", fontSize = 18.dp.value.sp) },
                colors = NavigationBarItemDefaults.colors(
                    selectedIconColor = Color(0xFF1DB954),
                    selectedTextColor = Color(0xFF1DB954),
                    unselectedIconColor = Color.Gray,
                    unselectedTextColor = Color.Gray,
                    indicatorColor = Color.Transparent
                )
            )
        }
    }
}
