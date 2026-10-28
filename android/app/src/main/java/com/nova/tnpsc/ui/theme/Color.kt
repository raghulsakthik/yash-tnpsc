package com.nova.tnpsc.ui.theme

import androidx.compose.ui.graphics.Color

// Real tokens from the Android design package (stone neutrals + amber/orange
// accent -- Tailwind's stone-*/orange-*/amber-* scale), not an approximation.
// Replaces the earlier indigo-based guess once the actual design package
// (android-app/components/*.tsx, Tailwind classes like bg-orange-500,
// text-stone-900, border-stone-200) was available to read exact values from.
val NovaGround = Color(0xFFFAFAF9) // stone-50
val NovaPaperRaised = Color(0xFFFFFFFF)
val NovaPaperSunk = Color(0xFFF5F5F4) // stone-100
val NovaBorder = Color(0xFFE7E5E4) // stone-200
val NovaInk = Color(0xFF1C1917) // stone-900
val NovaInkMuted = Color(0xFF78716C) // stone-500

val NovaPrimary = Color(0xFFF97316) // orange-500 -- the design's one real accent color
val NovaPrimaryTint = Color(0xFFFFF7ED) // orange-50
val NovaSecondary = Color(0xFFF59E0B) // amber-500
val NovaSecondaryTint = Color(0xFFFFFBEB) // amber-50
val NovaWarmAccent = Color(0xFFB45309) // amber-700
val NovaWarmTint = Color(0xFFFEF3C7) // amber-100
val NovaSuccess = Color(0xFF059669) // emerald-600
val NovaSuccessTint = Color(0xFFECFDF5) // emerald-50
val NovaWarning = Color(0xFF92400E) // amber-800
val NovaWarningTint = Color(0xFFFEF3C7) // amber-100
