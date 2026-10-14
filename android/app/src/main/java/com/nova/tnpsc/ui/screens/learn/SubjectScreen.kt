package com.nova.tnpsc.ui.screens.learn

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.nova.tnpsc.data.mathematicsPath
import com.nova.tnpsc.ui.components.Eyebrow
import com.nova.tnpsc.ui.components.NovaCard
import com.nova.tnpsc.ui.theme.NovaBorder
import com.nova.tnpsc.ui.theme.NovaInkMuted
import com.nova.tnpsc.ui.theme.NovaPaperSunk
import com.nova.tnpsc.ui.theme.NovaPrimary
import com.nova.tnpsc.ui.theme.NovaSecondary
import com.nova.tnpsc.ui.theme.NovaSecondaryTint
import com.nova.tnpsc.ui.theme.NovaSuccess
import com.nova.tnpsc.ui.theme.NovaSuccessTint

@Composable
fun SubjectScreen(subject: String) {
    val isMath = subject == "mathematics"
    val title = subject.replaceFirstChar { it.uppercase() }

    LazyColumn(
        modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        item {
            Text("Learn / $title", color = NovaInkMuted, style = MaterialTheme.typography.bodyMedium)
            Spacer(Modifier.height(10.dp))
            Text(title, style = MaterialTheme.typography.displayLarge)
            Spacer(Modifier.height(8.dp))
            if (isMath) {
                Text(
                    "Nineteen topics, ordered so each one only asks for what you already have. You are eight steps in.",
                    style = MaterialTheme.typography.bodyLarge,
                    color = NovaInkMuted,
                )
            }
            Spacer(Modifier.height(10.dp))
            Eyebrow("The path · each step unlocks the next")
            Spacer(Modifier.height(10.dp))
        }

        if (isMath) {
            items(mathematicsPath) { t ->
                val (bg, accent) = when (t.state) {
                    "mastered" -> NovaSuccessTint to NovaSuccess
                    "in-progress" -> NovaSecondaryTint to NovaPrimary
                    "revision-due" -> NovaSecondaryTint to NovaSecondary
                    else -> NovaPaperSunk to NovaBorder
                }
                NovaCard(background = bg, border = accent) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        val dotLabel = when (t.state) {
                            "mastered" -> "✓"
                            "revision-due" -> "↻"
                            else -> t.n.toString()
                        }
                        Box(
                            modifier = Modifier.size(32.dp).clip(CircleShape).background(if (t.state == "locked") NovaBorder else accent),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(dotLabel, color = Color.White, fontWeight = FontWeight.SemiBold)
                        }
                        Spacer(Modifier.width(14.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(t.name, fontWeight = FontWeight.SemiBold)
                            Text(t.note, style = MaterialTheme.typography.bodySmall, color = NovaInkMuted)
                        }
                        if (t.state == "in-progress") Text("Continue →", color = NovaPrimary, fontWeight = FontWeight.SemiBold)
                        if (t.state == "revision-due") Text("Review", color = NovaSecondary, fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        } else {
            item {
                NovaCard {
                    Text(
                        "This subject follows the same path structure as Mathematics — topics unlock in order, each resting on the one before it.",
                        color = NovaInkMuted,
                    )
                }
            }
        }
    }
}
