package com.nova.tnpsc.ui.screens.learn

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.nova.tnpsc.TnpscApplication
import com.nova.tnpsc.data.learn.SubjectDetailResponse
import com.nova.tnpsc.data.learn.TopicSummary
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
import com.nova.tnpsc.ui.theme.NovaWarmAccent

private fun colorsFor(state: String): Pair<Color, Color> = when (state) {
    "mastered", "retained" -> NovaSuccessTint to NovaSuccess
    "near-mastery", "practising" -> NovaSecondaryTint to NovaPrimary
    "revision-due" -> NovaSecondaryTint to NovaSecondary
    "not-started" -> NovaPaperSunk to NovaBorder
    else -> NovaPaperSunk to NovaBorder
}

@Composable
fun SubjectScreen(subject: String, navController: NavHostController) {
    val app = LocalContext.current.applicationContext as TnpscApplication
    var detail by remember { mutableStateOf<SubjectDetailResponse?>(null) }
    var error by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(subject) {
        try {
            val res = app.learnApi.subject(subject)
            if (res.isSuccessful) detail = res.body()
            else error = res.body()?.message ?: "Could not load this subject"
        } catch (e: Exception) {
            error = e.message ?: "Could not reach the server"
        }
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        item {
            val title = detail?.name ?: subject.replaceFirstChar { it.uppercase() }
            Text("Learn / $title", color = NovaInkMuted, style = MaterialTheme.typography.bodyMedium)
            Spacer(Modifier.height(10.dp))
            Text(title, style = MaterialTheme.typography.displayLarge)
            Spacer(Modifier.height(10.dp))
            when {
                error != null -> Text(error!!, color = NovaWarmAccent, style = MaterialTheme.typography.bodyMedium)
                detail == null -> Text("Loading…", color = NovaInkMuted, style = MaterialTheme.typography.bodyMedium)
                else -> Eyebrow("The path · each topic shows your real mastery")
            }
            Spacer(Modifier.height(10.dp))
        }

        items(detail?.topics ?: emptyList()) { t: TopicSummary ->
            val (bg, accent) = colorsFor(t.state)
            NovaCard(
                background = bg,
                border = accent,
                modifier = Modifier.clickable { navController.navigate("lesson/${t.slug}") },
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    val dotLabel = when (t.state) {
                        "mastered", "retained" -> "✓"
                        "revision-due" -> "↻"
                        else -> t.n.toString()
                    }
                    Box(
                        modifier = Modifier.size(32.dp).clip(CircleShape).background(if (t.state == "not-started") NovaBorder else accent),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(dotLabel, color = Color.White, fontWeight = FontWeight.SemiBold)
                    }
                    Spacer(Modifier.width(14.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(t.name, fontWeight = FontWeight.SemiBold)
                        Text(
                            if (t.attemptCount == 0) "Not started yet" else "${t.mastery}% mastery · ${t.attemptCount} question${if (t.attemptCount == 1) "" else "s"} answered",
                            style = MaterialTheme.typography.bodySmall,
                            color = NovaInkMuted,
                        )
                    }
                    if (t.state == "revision-due") Text("Review", color = NovaSecondary, fontWeight = FontWeight.SemiBold)
                    else if (t.attemptCount > 0) Text("Continue →", color = NovaPrimary, fontWeight = FontWeight.SemiBold)
                    else Text("Start →", color = NovaPrimary, fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }
}
