package com.example.skmusic.ui.components

import android.content.Intent
import android.net.Uri
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import coil.compose.AsyncImage
import com.example.skmusic.data.api.NetworkManager
import com.example.skmusic.data.model.Track
import com.example.skmusic.player.MusicPlaybackService

@Composable
fun PwaWebViewContainer(
    baseUrl: String,
    modifier: Modifier = Modifier,
    onTokenExtracted: (String) -> Unit
) {
    val context = LocalContext.current
    var webViewRef by remember { mutableStateOf<WebView?>(null) }

    AndroidView(
        factory = { ctx ->
            WebView(ctx).apply {
                layoutParams = android.view.ViewGroup.LayoutParams(
                    android.view.ViewGroup.LayoutParams.MATCH_PARENT,
                    android.view.ViewGroup.LayoutParams.MATCH_PARENT
                )
                settings.javaScriptEnabled = true
                settings.domStorageEnabled = true
                settings.databaseEnabled = true
                settings.allowFileAccess = true
                settings.setSupportZoom(false)
                
                // Disable caching to prevent stale Vercel PWA bundle caching
                settings.cacheMode = android.webkit.WebSettings.LOAD_NO_CACHE
                clearCache(true)
                clearHistory()

                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP) {
                    settings.mixedContentMode = android.webkit.WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                }
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.KITKAT) {
                    WebView.setWebContentsDebuggingEnabled(true)
                }

                // Custom Chrome User-Agent so Google OAuth allows login directly inside WebView
                settings.userAgentString = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"

                webChromeClient = object : android.webkit.WebChromeClient() {
                    override fun onConsoleMessage(consoleMessage: android.webkit.ConsoleMessage?): Boolean {
                        consoleMessage?.let {
                            android.util.Log.d("HybridComponents", "[WEB_CONSOLE] ${it.sourceId()}:${it.lineNumber()} -> ${it.message()}")
                        }
                        return super.onConsoleMessage(consoleMessage)
                    }
                }

                activeWebView = this

                addJavascriptInterface(object {
                    @android.webkit.JavascriptInterface
                    fun playTrackNative(jsonTrack: String) {
                        try {
                            android.util.Log.d("AndroidPlayerBridge", "==============================================")
                            android.util.Log.d("AndroidPlayerBridge", "[BRIDGE] playTrackNative RECEIVED: $jsonTrack")
                            
                            val serviceIntent = Intent().apply {
                                setClassName(ctx.packageName, "com.example.skmusic.player.MusicPlaybackService")
                                action = "ACTION_PLAY_TRACK"
                                putExtra("EXTRA_JSON_TRACK", jsonTrack)
                            }
                            
                            android.util.Log.d("AndroidPlayerBridge", "[BRIDGE] Calling ContextCompat.startForegroundService for Component: ${serviceIntent.component}")
                            val comp = androidx.core.content.ContextCompat.startForegroundService(ctx, serviceIntent)
                            android.util.Log.d("AndroidPlayerBridge", "[BRIDGE] startForegroundService returned ComponentName: $comp")
                            android.util.Log.d("AndroidPlayerBridge", "==============================================")
                        } catch (e: Throwable) {
                            android.util.Log.e("AndroidPlayerBridge", "[BRIDGE_ERROR] CRITICAL: Failed to start MusicPlaybackService!", e)
                        }
                    }

                    @android.webkit.JavascriptInterface
                    fun pauseTrackNative() {
                        try {
                            android.util.Log.d("AndroidPlayerBridge", "[BRIDGE] pauseTrackNative RECEIVED")
                            val serviceIntent = Intent().apply {
                                setClassName(ctx.packageName, "com.example.skmusic.player.MusicPlaybackService")
                                action = "ACTION_PAUSE"
                            }
                            ctx.startService(serviceIntent)
                        } catch (e: Throwable) {
                            android.util.Log.e("AndroidPlayerBridge", "[BRIDGE_ERROR] Failed to send pause command!", e)
                        }
                    }

                    @android.webkit.JavascriptInterface
                    fun resumeTrackNative() {
                        try {
                            android.util.Log.d("AndroidPlayerBridge", "[BRIDGE] resumeTrackNative RECEIVED")
                            val serviceIntent = Intent().apply {
                                setClassName(ctx.packageName, "com.example.skmusic.player.MusicPlaybackService")
                                action = "ACTION_RESUME"
                            }
                            ctx.startService(serviceIntent)
                        } catch (e: Throwable) {
                            android.util.Log.e("AndroidPlayerBridge", "[BRIDGE_ERROR] Failed to send resume command!", e)
                        }
                    }

                    @android.webkit.JavascriptInterface
                    fun togglePlayPauseNative() {
                        try {
                            android.util.Log.d("AndroidPlayerBridge", "[BRIDGE] togglePlayPauseNative RECEIVED")
                            val serviceIntent = Intent().apply {
                                setClassName(ctx.packageName, "com.example.skmusic.player.MusicPlaybackService")
                                action = "ACTION_TOGGLE_PLAY"
                            }
                            ctx.startService(serviceIntent)
                        } catch (e: Throwable) {
                            android.util.Log.e("AndroidPlayerBridge", "[BRIDGE_ERROR] Failed to toggle play/pause!", e)
                        }
                    }
                }, "AndroidPlayer")

                webViewClient = object : WebViewClient() {
                    override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                        val url = request?.url?.toString() ?: return false
                        android.util.Log.d("HybridComponents", "[SHOULD_OVERRIDE] Loading URL: $url")
                        
                        if (url.startsWith("https://accounts.spotify.com")) {
                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                            ctx.startActivity(intent)
                            return true
                        }
                        
                        // Prevent WebView from leaving EC2 server to Vercel upon Google OAuth callback
                        if (url.contains("sk-music-xi.vercel.app")) {
                            val rewrittenUrl = url.replace("https://sk-music-xi.vercel.app", baseUrl.removeSuffix("/"))
                            android.util.Log.d("HybridComponents", "[REDIRECT_REWRITE] Rewriting Vercel redirect to EC2: $rewrittenUrl")
                            view?.loadUrl(rewrittenUrl)
                            return true
                        }

                        if (url.contains("token=")) {
                            val token = Uri.parse(url).getQueryParameter("token")
                            if (!token.isNullOrEmpty()) {
                                onTokenExtracted(token)
                            }
                        }
                        return false
                    }

                    override fun onReceivedError(view: WebView?, errorCode: Int, description: String?, failingUrl: String?) {
                        super.onReceivedError(view, errorCode, description, failingUrl)
                        val errorHtml = "<html><body style='background:#121212;color:white;padding:20px;font-family:sans-serif;'>" +
                                "<h2 style='color:#ff5555;'>Failed to load page</h2>" +
                                "<p><b>URL:</b> $failingUrl</p>" +
                                "<p><b>Error:</b> $description (code $errorCode)</p>" +
                                "<button onclick='location.reload()' style='padding:10px 20px;background:#1DB954;border:none;border-radius:20px;color:black;font-weight:bold;'>Retry</button>" +
                                "</body></html>"
                        view?.loadDataWithBaseURL(null, errorHtml, "text/html", "UTF-8", null)
                    }

                    @android.annotation.TargetApi(android.os.Build.VERSION_CODES.M)
                    override fun onReceivedError(view: WebView?, request: WebResourceRequest?, error: android.webkit.WebResourceError?) {
                        super.onReceivedError(view, request, error)
                        if (request?.isForMainFrame == true) {
                            val failingUrl = request.url?.toString() ?: ""
                            val description = error?.description?.toString() ?: "Unknown error"
                            val errorCode = error?.errorCode ?: 0
                            val errorHtml = "<html><body style='background:#121212;color:white;padding:20px;font-family:sans-serif;'>" +
                                    "<h2 style='color:#ff5555;'>Failed to load page</h2>" +
                                    "<p><b>URL:</b> $failingUrl</p>" +
                                    "<p><b>Error:</b> $description (code $errorCode)</p>" +
                                    "<button onclick='location.reload()' style='padding:10px 20px;background:#1DB954;border:none;border-radius:20px;color:black;font-weight:bold;'>Retry</button>" +
                                    "</body></html>"
                            view?.loadDataWithBaseURL(null, errorHtml, "text/html", "UTF-8", null)
                        }
                    }

                    override fun onPageFinished(view: WebView?, url: String?) {
                        super.onPageFinished(view, url)
                        android.util.Log.d("HybridComponents", "[WEBVIEW] Loaded URL: $url")
                        
                        // Force unregister stale Service Worker cache if pointing to old Vercel deployment
                        view?.evaluateJavascript(
                            """
                            if ('serviceWorker' in navigator) {
                                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                                    for (let reg of registrations) {
                                        console.log('[PWA_UNREGISTER] Unregistering service worker:', reg);
                                        reg.unregister();
                                    }
                                });
                            }
                            if ('caches' in window) {
                                caches.keys().then(function(names) {
                                    for (let name of names) {
                                        console.log('[PWA_CACHE_PURGE] Deleting cache:', name);
                                        caches.delete(name);
                                    }
                                });
                            }
                            """.trimIndent(), null
                        )

                        // Inject script to extract token from PWA localStorage if present
                        view?.evaluateJavascript(
                            "(function() { return localStorage.getItem('authToken'); })();"
                        ) { result ->
                            if (result != null && result != "null" && result.length > 10) {
                                val token = result.trim('"')
                                onTokenExtracted(token)
                            }
                        }
                    }
                }
                loadUrl(baseUrl)
                webViewRef = this
            }
        },
        update = { webView ->
            // Keep loaded
        },
        modifier = modifier
    )
}

@Composable
fun NativeMiniPlayerBar(
    currentTrack: Track?,
    isPlaying: Boolean,
    onTogglePlayPause: () -> Unit,
    onNext: () -> Unit,
    onPrevious: () -> Unit,
    modifier: Modifier = Modifier
) {
    AnimatedVisibility(
        visible = currentTrack != null,
        enter = slideInVertically(initialOffsetY = { it }),
        exit = slideOutVertically(targetOffsetY = { it }),
        modifier = modifier
    ) {
        if (currentTrack != null) {
            Surface(
                color = Color(0xFF282828),
                shape = RoundedCornerShape(12.dp),
                tonalElevation = 8.dp,
                shadowElevation = 8.dp,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 8.dp, vertical = 4.dp)
                    .height(64.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 10.dp)
                ) {
                    AsyncImage(
                        model = currentTrack.artworkUrl,
                        contentDescription = currentTrack.name,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier
                            .size(48.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(Color(0xFF333333))
                    )

                    Spacer(modifier = Modifier.width(12.dp))

                    Column(
                        modifier = Modifier.weight(1f)
                    ) {
                        Text(
                            text = currentTrack.name,
                            color = Color.White,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Text(
                            text = currentTrack.artistName,
                            color = Color(0xFFB3B3B3),
                            fontSize = 12.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }

                    IconButton(onClick = onPrevious) {
                        Text("⏮", color = Color.White, fontSize = 20.sp)
                    }

                    IconButton(
                        onClick = onTogglePlayPause,
                        modifier = Modifier
                            .size(40.dp)
                            .background(Color(0xFF1DB954), shape = RoundedCornerShape(20.dp))
                    ) {
                        Text(if (isPlaying) "⏸" else "▶", color = Color.Black, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                    }

                    IconButton(onClick = onNext) {
                        Text("⏭", color = Color.White, fontSize = 20.sp)
                    }
                }
            }
        }
    }
}

var activeWebView: WebView? = null

fun sendNativeEventToJS(action: String) {
    activeWebView?.post {
        activeWebView?.evaluateJavascript("window.onAndroidPlayerCommand && window.onAndroidPlayerCommand('$action');", null)
    }
}
