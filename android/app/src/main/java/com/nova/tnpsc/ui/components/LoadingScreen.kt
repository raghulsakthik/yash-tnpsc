package com.nova.tnpsc.ui.components

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * The branded cold-start loading state -- shown while [AuthRepository]
 * checks a saved session cookie against the real backend (see NovaApp's
 * AuthState.Unknown branch). Replaces a bare CircularProgressIndicator with
 * the same black-and-glass language as the launcher icon, so there's no
 * jarring handoff from the native splash screen into a generic spinner.
 * A gently breathing sparkle, not a spinner -- it reads as "the app is
 * alive," not "something is stuck," during what's normally a sub-second check.
 */
@Composable
fun YashLoadingScreen() {
    val transition = rememberInfiniteTransition(label = "yash-loading")

    val sparkleScale by transition.animateFloat(
        initialValue = 0.85f,
        targetValue = 1.15f,
        animationSpec = infiniteRepeatable(
            animation = tween(1100, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "sparkle-scale",
    )
    val sparkleRotation by transition.animateFloat(
        initialValue = -8f,
        targetValue = 8f,
        animationSpec = infiniteRepeatable(
            animation = tween(1600, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "sparkle-rotation",
    )
    val wordmarkAlpha by transition.animateFloat(
        initialValue = 0.55f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(1100, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "wordmark-alpha",
    )

    Box(
        modifier = Modifier.fillMaxSize().background(Color.Black),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                "✦",
                color = Color.White,
                fontSize = 40.sp,
                modifier = Modifier
                    .scale(sparkleScale)
                    .rotate(sparkleRotation),
            )
            Spacer(Modifier.height(10.dp))
            Text(
                "Yash",
                color = Color.White.copy(alpha = wordmarkAlpha),
                fontFamily = FontFamily.Serif,
                fontWeight = FontWeight.SemiBold,
                fontSize = 32.sp,
            )
        }
    }
}
