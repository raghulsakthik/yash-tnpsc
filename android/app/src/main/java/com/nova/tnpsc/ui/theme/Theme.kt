package com.nova.tnpsc.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

// NOVA is a calm, paper-and-ink reading surface by design — one light palette,
// used consistently, rather than a separate dark theme (matches the web prototype).
private val NovaColorScheme = lightColorScheme(
    primary = NovaPrimary,
    onPrimary = NovaPaperRaised,
    primaryContainer = NovaPrimaryTint,
    onPrimaryContainer = NovaPrimary,
    secondary = NovaSecondary,
    onSecondary = NovaPaperRaised,
    secondaryContainer = NovaSecondaryTint,
    onSecondaryContainer = NovaSecondary,
    tertiary = NovaWarmAccent,
    onTertiary = NovaPaperRaised,
    tertiaryContainer = NovaWarmTint,
    onTertiaryContainer = NovaWarmAccent,
    background = NovaGround,
    onBackground = NovaInk,
    surface = NovaPaperRaised,
    onSurface = NovaInk,
    surfaceVariant = NovaPaperSunk,
    onSurfaceVariant = NovaInkMuted,
    outline = NovaBorder,
    error = NovaWarmAccent,
    onError = NovaPaperRaised,
    errorContainer = NovaWarmTint,
    onErrorContainer = NovaWarmAccent,
)

@Composable
fun NovaTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    MaterialTheme(
        colorScheme = NovaColorScheme,
        typography = NovaTypography,
        shapes = NovaShapes,
        content = content,
    )
}
