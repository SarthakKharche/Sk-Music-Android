package com.example.skmusic.data.api

import android.content.Context
import android.content.SharedPreferences
import com.example.skmusic.data.model.AudioSource
import com.example.skmusic.data.model.Track
import com.example.skmusic.data.model.User
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

class NetworkManager(private val context: Context) {

    private val prefs: SharedPreferences =
        context.getSharedPreferences("sk_music_prefs", Context.MODE_PRIVATE)

    init {
        prefs.edit().remove("custom_api_url").apply()
    }

    private val _authToken = MutableStateFlow<String?>(prefs.getString("auth_token", null))
    val authToken: StateFlow<String?> = _authToken

    private val _currentUser = MutableStateFlow<User?>(null)
    val currentUser: StateFlow<User?> = _currentUser

    // Default base URL pointing to new AWS EC2 Android server
    var baseUrl: String = "http://13.203.231.53:5000/api/"
        set(value) {
            field = if (value.endsWith("/")) value else "$value/"
            prefs.edit().putString("custom_api_url", field).apply()
            rebuildApi()
        }

    private val okHttpClient: OkHttpClient by lazy {
        OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(20, TimeUnit.SECONDS)
            .addInterceptor { chain ->
                val original = chain.request()
                val requestBuilder = original.newBuilder()
                val token = _authToken.value
                if (!token.isNullOrEmpty()) {
                    requestBuilder.header("Authorization", "Bearer $token")
                }
                chain.proceed(requestBuilder.build())
            }
            .addInterceptor(HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BASIC
            })
            .build()
    }

    private var _apiService: SkMusicApiService? = null

    val apiService: SkMusicApiService
        get() {
            if (_apiService == null) {
                rebuildApi()
            }
            return _apiService!!
        }

    private fun rebuildApi() {
        val retrofit = Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
        _apiService = retrofit.create(SkMusicApiService::class.java)
    }

    fun setAuthToken(token: String?) {
        _authToken.value = token
        if (token != null) {
            prefs.edit().putString("auth_token", token).apply()
            decodeAndSetUser(token)
        } else {
            prefs.edit().remove("auth_token").apply()
            _currentUser.value = null
        }
    }

    private fun decodeAndSetUser(token: String) {
        try {
            val parts = token.split(".")
            if (parts.size >= 2) {
                val payload = String(android.util.Base64.decode(parts[1], android.util.Base64.URL_SAFE or android.util.Base64.NO_PADDING or android.util.Base64.NO_WRAP))
                val json = org.json.JSONObject(payload)
                val uid = json.optString("uid", "user_${System.currentTimeMillis()}")
                val email = json.optString("email", "user@skmusic.com")
                _currentUser.value = User(
                    uid = uid,
                    email = email,
                    name = if (email.contains("@")) email.substringBefore("@") else "User",
                    picture = "",
                    spotifyConnected = true
                )
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    suspend fun resolveAudio(track: Track): AudioSource? {
        return try {
            val payload = mapOf(
                "trackId" to track.id,
                "trackName" to track.name,
                "artistName" to track.artistName,
                "albumName" to track.album.name,
                "durationMs" to track.durationMs,
                "isrc" to track.isrc
            )
            val res = apiService.resolveAudio(payload)
            if (res.isSuccessful) {
                val sources = res.body()?.sources ?: emptyList()
                sources.firstOrNull { it.quality == "high" }
                    ?: sources.firstOrNull { it.quality == "medium" }
                    ?: sources.firstOrNull()
            } else {
                fallbackSaavnSource(track)
            }
        } catch (e: Exception) {
            e.printStackTrace()
            fallbackSaavnSource(track)
        }
    }

    private fun fallbackSaavnSource(track: Track): AudioSource {
        val streamUrl = "${baseUrl}audio/saavn-search?query=${encode(track.name + " " + track.artistName)}&trackId=${track.id}"
        return AudioSource(url = streamUrl, quality = "medium", trackId = track.id)
    }

    private fun encode(s: String): String = java.net.URLEncoder.encode(s, "UTF-8")

    companion object {
        @Volatile
        private var INSTANCE: NetworkManager? = null

        fun getInstance(context: Context): NetworkManager {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: NetworkManager(context.applicationContext).also { INSTANCE = it }
            }
        }
    }
}
