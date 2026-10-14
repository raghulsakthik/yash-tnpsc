package com.nova.tnpsc.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.nova.tnpsc.ui.theme.NovaBorder
import com.nova.tnpsc.ui.theme.NovaInk
import com.nova.tnpsc.ui.theme.NovaInkMuted
import com.nova.tnpsc.ui.theme.NovaPaperRaised
import com.nova.tnpsc.ui.theme.NovaPaperSunk
import com.nova.tnpsc.ui.theme.NovaPrimary
import com.nova.tnpsc.ui.theme.NovaSecondary
import com.nova.tnpsc.ui.theme.NovaSecondaryTint
import com.nova.tnpsc.ui.theme.NovaSuccess
import com.nova.tnpsc.ui.theme.NovaSuccessTint
import com.nova.tnpsc.ui.theme.NovaWarmAccent
import com.nova.tnpsc.ui.theme.NovaWarmTint
import com.nova.tnpsc.ui.theme.RadiusLarge

/** The one raised-paper surface every screen is built from. */
@Composable
fun NovaCard(
    modifier: Modifier = Modifier,
    background: Color = NovaPaperRaised,
    border: Color? = NovaBorder,
    content: @Composable androidx.compose.foundation.layout.ColumnScope.() -> Unit,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(RadiusLarge))
            .background(background)
            .then(if (border != null) Modifier.border(1.dp, border, RoundedCornerShape(RadiusLarge)) else Modifier)
            .padding(20.dp),
        content = content,
    )
}

@Composable
fun Eyebrow(text: String, color: Color = NovaInkMuted) {
    Text(
        text = text.uppercase(),
        color = color,
        fontWeight = FontWeight.SemiBold,
        fontSize = 11.sp,
        letterSpacing = 1.sp,
    )
}

private val statusColors: Map<String, Pair<Color, Color>> = mapOf(
    "not-started" to (NovaPaperSunk to NovaInkMuted),
    "learning" to (NovaSecondaryTint to NovaPrimary),
    "practising" to (NovaSecondaryTint to NovaPrimary),
    "improving" to (NovaWarmTint to NovaWarmAccent),
    "near-mastery" to (NovaWarmTint to NovaWarmAccent),
    "mastered" to (NovaSuccessTint to NovaSuccess),
    "revision-due" to (NovaSecondaryTint to NovaSecondary),
    "retained" to (NovaSuccessTint to NovaSuccess),
)

private val statusLabels: Map<String, String> = mapOf(
    "not-started" to "Not started",
    "learning" to "Learning",
    "practising" to "Practising",
    "improving" to "Improving",
    "near-mastery" to "Near mastery",
    "mastered" to "Mastered",
    "revision-due" to "Revision due",
    "retained" to "Retained",
)

@Composable
fun StatusBadge(status: String) {
    val (bg, fg) = statusColors[status] ?: (NovaPaperSunk to NovaInkMuted)
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(50))
            .background(bg)
            .padding(horizontal = 12.dp, vertical = 4.dp),
    ) {
        Text(statusLabels[status] ?: status, color = fg, fontWeight = FontWeight.SemiBold, fontSize = 12.sp)
    }
}

@Composable
fun NovaProgressBar(value: Int, color: Color = NovaPrimary, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(8.dp)
            .clip(RoundedCornerShape(50))
            .background(NovaPaperSunk),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth(value.coerceIn(0, 100) / 100f)
                .height(8.dp)
                .clip(RoundedCornerShape(50))
                .background(color),
        )
    }
}

@Composable
fun NovaStat(value: String, label: String, color: Color = NovaInk) {
    Column {
        Text(value, style = MaterialTheme.typography.headlineMedium, color = color)
        Text(label, style = MaterialTheme.typography.bodySmall, color = NovaInkMuted)
    }
}

@Composable
fun OptionRow(
    letter: String,
    text: String,
    state: OptionState,
    onClick: () -> Unit,
) {
    val (bg, border, dotBg, dotFg) = when (state) {
        OptionState.Default -> OptionColors(NovaPaperRaised, NovaBorder, NovaPaperSunk, NovaInkMuted)
        OptionState.Selected -> OptionColors(NovaSecondaryTint, NovaPrimary, NovaPrimary, NovaPaperRaised)
        OptionState.Correct -> OptionColors(NovaSuccessTint, NovaSuccess, NovaSuccess, NovaPaperRaised)
        OptionState.Incorrect -> OptionColors(NovaWarmTint, NovaWarmAccent, NovaWarmAccent, NovaPaperRaised)
    }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(bg)
            .border(1.dp, border, RoundedCornerShape(14.dp))
            .clickable(onClick = onClick)
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier.size(32.dp).clip(CircleShape).background(dotBg),
            contentAlignment = Alignment.Center,
        ) {
            Text(letter, color = dotFg, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
        }
        Spacer(Modifier.width(14.dp))
        Text(text, style = MaterialTheme.typography.bodyLarge, color = NovaInk)
    }
}

enum class OptionState { Default, Selected, Correct, Incorrect }

private data class OptionColors(val background: Color, val border: Color, val dotBackground: Color, val dotForeground: Color)
