package com.example.skmusic

import androidx.navigation3.runtime.NavKey
import kotlinx.serialization.Serializable

typealias NavigationKey = NavKey

@Serializable data object Main : NavKey

