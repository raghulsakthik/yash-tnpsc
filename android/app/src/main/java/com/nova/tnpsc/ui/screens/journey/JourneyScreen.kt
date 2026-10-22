package com.nova.tnpsc.ui.screens.journey

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
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
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.nova.tnpsc.TnpscApplication
import com.nova.tnpsc.data.journey.JourneyResponse
import com.nova.tnpsc.data.features.ActiveCurriculumResponse
import com.nova.tnpsc.data.journey.OrbitPoint
import com.nova.tnpsc.ui.components.Eyebrow
import com.nova.tnpsc.ui.components.NovaCard
import com.nova.tnpsc.ui.theme.NovaBorder
import com.nova.tnpsc.ui.theme.NovaInkMuted
import com.nova.tnpsc.ui.theme.NovaPrimary
import com.nova.tnpsc.ui.theme.NovaSecondary
import com.nova.tnpsc.ui.theme.NovaSuccess
import com.nova.tnpsc.ui.theme.NovaWarmAccent
import kotlin.math.cos
import kotlin.math.sin

private fun ringColor(ring: String): Color = when (ring) {
    "mastered" -> NovaSuccess
    "learning" -> NovaPrimary
    "drifting" -> NovaSecondary
    "struggling" -> NovaWarmAccent
    else -> NovaBorder
}

private fun ringRadius(ring: String): Float = when (ring) {
    "mastered" -> 0.35f
    "learning" -> 0.55f
    "drifting", "struggling" -> 0.72f
    else -> 0.9f
}

@Composable
fun JourneyScreen() {
    val app = LocalContext.current.applicationContext as TnpscApplication
    var journey by remember { mutableStateOf<JourneyResponse?>(null) }
    var curriculum by remember { mutableStateOf<ActiveCurriculumResponse?>(null) }
    var error by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        try {
            val res = app.journeyApi.get()
            if (res.isSuccessful) journey = res.body()
            val curriculumRes = app.featureApi.activeCurriculum()
            if (curriculumRes.isSuccessful) curriculum = curriculumRes.body()
            else error = "Could not load your journey"
        } catch (e: Exception) {
            error = e.message ?: "Could not reach the server"
        }
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            Eyebrow("Journey")
            Spacer(Modifier.height(8.dp))
            Text("Where you started, where you are", style = MaterialTheme.typography.displayLarge)
            Spacer(Modifier.height(8.dp))
            when {
                error != null -> Text(error!!, color = NovaWarmAccent, style = MaterialTheme.typography.bodyLarge)
                journey == null -> Text("Loading…", color = NovaInkMuted, style = MaterialTheme.typography.bodyLarge)
                else -> Text(
                    "Every topic you've touched, placed by how well it's stuck.",
                    color = NovaInkMuted,
                    style = MaterialTheme.typography.bodyLarge,
                )
            }
        }

        if (curriculum?.current != null) {
            val c = curriculum!!
            val current = c.current!!
            item {
                NovaCard {
                    Eyebrow("Current learning path")
                    Spacer(Modifier.height(8.dp))
                    Text(current.phaseName ?: "Current phase", style = MaterialTheme.typography.headlineMedium)
                    Spacer(Modifier.height(4.dp))
                    Text("Week ${current.weekNumber} · Day ${current.dayNumber} · ${current.dayTitle ?: "Today"}", style = MaterialTheme.typography.titleMedium)
                    Spacer(Modifier.height(8.dp))
                    Text(current.weekObjective ?: current.dayPurpose ?: "Continue your adaptive curriculum.", color = NovaInkMuted, style = MaterialTheme.typography.bodyMedium)
                    Spacer(Modifier.height(12.dp))
                    c.units.forEach { unit ->
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(unit.title, style = MaterialTheme.typography.bodyMedium)
                            Text(unit.progressStatus.replace('_', ' '), color = NovaInkMuted, style = MaterialTheme.typography.labelLarge)
                        }
                        Spacer(Modifier.height(6.dp))
                    }
                }
            }
        }

        if (journey != null) {
            val j = journey!!
            item {
                NovaCard {
                    Text("Topics pull inward as they stick", style = MaterialTheme.typography.headlineMedium)
                    Spacer(Modifier.height(14.dp))
                    OrbitCanvas(j.orbit)
                    Spacer(Modifier.height(14.dp))
                    Text(
                        "Every topic you meet enters on the outer ring. Practice moves it in; a failed review pushes it back out.",
                        color = NovaInkMuted,
                        style = MaterialTheme.typography.bodyMedium,
                    )
                }
            }

            item {
                NovaCard {
                    Eyebrow("Personal records · against yourself")
                    Spacer(Modifier.height(12.dp))
                    j.personalRecords.forEach { r ->
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(r.label)
                            Text(r.value, style = MaterialTheme.typography.titleLarge)
                        }
                        Spacer(Modifier.height(8.dp))
                    }
                }
            }
        }
    }
}

@Composable
private fun OrbitCanvas(orbit: List<OrbitPoint>) {
    val mutedStroke = NovaBorder
    Canvas(modifier = Modifier.fillMaxWidth().size(260.dp)) {
        val center = Offset(size.width / 2, size.height / 2)
        val maxR = size.minDimension / 2 * 0.95f

        listOf(0.35f, 0.55f, 0.72f, 0.9f).forEach { frac ->
            drawCircle(
                color = mutedStroke,
                radius = maxR * frac,
                center = center,
                style = Stroke(width = 1.5f, pathEffect = PathEffect.dashPathEffect(floatArrayOf(6f, 6f))),
            )
        }

        drawCircle(color = Color(0xFF1E1B16), radius = maxR * 0.2f, center = center)

        orbit.forEach { point ->
            val r = maxR * ringRadius(point.ring)
            val rad = Math.toRadians(point.angleDeg.toDouble())
            val x = center.x + r * cos(rad).toFloat()
            val y = center.y + r * sin(rad).toFloat()
            drawCircle(color = ringColor(point.ring), radius = 10f, center = Offset(x, y))
        }
    }
}
