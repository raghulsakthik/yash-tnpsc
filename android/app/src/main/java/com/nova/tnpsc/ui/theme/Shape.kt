package com.nova.tnpsc.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Shapes
import androidx.compose.ui.unit.dp

// Radius scale from the design board: 10 / 14 / 20 / pill.
val RadiusSmall = 10.dp
val RadiusMedium = 14.dp
val RadiusLarge = 20.dp

val NovaShapes = Shapes(
    extraSmall = RoundedCornerShape(RadiusSmall),
    small = RoundedCornerShape(RadiusSmall),
    medium = RoundedCornerShape(RadiusMedium),
    large = RoundedCornerShape(RadiusLarge),
    extraLarge = RoundedCornerShape(RadiusLarge),
)
