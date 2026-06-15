package com.culinaryos.recipeos.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

private val DarkColorScheme = darkColorScheme(
    primary = Accent,
    background = DarkBg,
    surface = SurfaceBg,
    onPrimary = DarkBg,
    onBackground = TextMain,
    onSurface = TextMain
)

@Composable
fun RecipeOSTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = DarkColorScheme,
        typography = Typography,
        content = content
    )
}
