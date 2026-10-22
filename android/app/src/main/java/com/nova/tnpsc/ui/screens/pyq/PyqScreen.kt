package com.nova.tnpsc.ui.screens.pyq

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.nova.tnpsc.TnpscApplication
import com.nova.tnpsc.data.pyq.PyqStatsResponse
import com.nova.tnpsc.ui.components.Eyebrow
import com.nova.tnpsc.ui.components.NovaCard
import com.nova.tnpsc.ui.theme.NovaInkMuted
import com.nova.tnpsc.ui.theme.NovaPrimary
import com.nova.tnpsc.ui.theme.NovaSecondary
import com.nova.tnpsc.ui.theme.NovaSecondaryTint
import com.nova.tnpsc.ui.theme.NovaWarmAccent
import com.nova.tnpsc.ui.theme.NovaWarmTint

/**
 * Real transcribed questions from real TNPSC papers, tagged to the same
 * topics as the lessons -- same content GET /api/pyqs/stats and
 * GET /api/pyqs/next serve on web. An attempt here counts toward the same
 * mastery as regular practice, not a separate scoreboard.
 */
@Composable
fun PyqScreen(navController: NavHostController) {
    val app = LocalContext.current.applicationContext as TnpscApplication
    var stats by remember { mutableStateOf<PyqStatsResponse?>(null) }
    var error by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        try {
            val res = app.pyqApi.stats()
            if (res.isSuccessful) stats = res.body() else error = res.body()?.message ?: "Could not load PYQ stats"
        } catch (e: Exception) {
            error = e.message ?: "Could not reach the server"
        }
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background),
        contentPadding = PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            Eyebrow("Previous year questions")
            Spacer(Modifier.height(10.dp))
            Text("What they have actually asked", style = MaterialTheme.typography.displayLarge)
            Spacer(Modifier.height(10.dp))
            Text(
                "Real transcribed questions from real papers, tagged to the same topics as your lessons. " +
                    "Every attempt counts towards the same mastery -- these are not a separate scoreboard.",
                color = NovaInkMuted,
            )
        }

        if (error != null) {
            item { NovaCard(background = NovaWarmTint, border = NovaWarmAccent) { Text(error!!) } }
        } else if (stats == null) {
            item { Text("Loading…", color = NovaInkMuted) }
        } else {
            val s = stats!!

            item {
                Text("${s.attempted}", style = MaterialTheme.typography.displayLarge, color = NovaPrimary)
                Text("of ${s.totalQuestions} real past-year questions attempted", color = NovaInkMuted)
            }

            item {
                NovaCard(
                    background = NovaSecondaryTint,
                    border = NovaSecondary,
                    modifier = Modifier.clickable { navController.navigate("pyq/practice") },
                ) {
                    Text("All years, all topics", style = MaterialTheme.typography.titleLarge)
                    Spacer(Modifier.height(8.dp))
                    Text("Mixed, exam-style -- the broadest real practice.", color = NovaInkMuted)
                    Spacer(Modifier.height(10.dp))
                    Text("Start →", color = NovaPrimary, fontWeight = FontWeight.SemiBold)
                }
            }

            if (s.byTopic.isNotEmpty()) {
                item { Eyebrow("Top topics", color = NovaPrimary) }
            }
            s.byTopic.take(5).forEach { t ->
                item {
                    NovaCard(modifier = Modifier.clickable { navController.navigate("pyq/practice?topic=${t.topicId}") }) {
                        Text(t.topicName, style = MaterialTheme.typography.titleMedium)
                        Spacer(Modifier.height(6.dp))
                        Text("${t.total} real question${if (t.total == 1) "" else "s"} across every year on record.", color = NovaInkMuted)
                    }
                }
            }

            if (s.byYear.isNotEmpty()) {
                item { Eyebrow("By year", color = NovaPrimary) }
                item {
                    NovaCard {
                        s.byYear.forEach { y ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { navController.navigate("pyq/practice?year=${y.year}") },
                                horizontalArrangement = Arrangement.SpaceBetween,
                            ) {
                                Text("${y.year}", fontWeight = FontWeight.SemiBold)
                                Text("${y.attempted} of ${y.total} attempted", color = NovaInkMuted)
                            }
                            Spacer(Modifier.height(12.dp))
                        }
                    }
                }
            }
        }
    }
}
