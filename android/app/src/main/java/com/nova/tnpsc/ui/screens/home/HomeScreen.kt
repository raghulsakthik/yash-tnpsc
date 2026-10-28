package com.nova.tnpsc.ui.screens.home

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.RadioButtonUnchecked
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.nova.tnpsc.TnpscApplication
import com.nova.tnpsc.data.courses.CourseSubject
import com.nova.tnpsc.data.features.CalendarResponse
import com.nova.tnpsc.data.plan.PlanItem
import com.nova.tnpsc.data.plan.PlanResponse
import com.nova.tnpsc.data.platform.DashboardResponse
import com.nova.tnpsc.data.platform.ReadinessResponse
import com.nova.tnpsc.data.platform.StudyTimeRequest
import com.nova.tnpsc.data.profile.ProfileResponse
import com.nova.tnpsc.navigation.DEFAULT_PRACTICE_TOPIC
import com.nova.tnpsc.navigation.practiceRoute
import com.nova.tnpsc.ui.components.Eyebrow
import com.nova.tnpsc.ui.components.NovaCard
import com.nova.tnpsc.ui.components.NovaProgressBar
import com.nova.tnpsc.ui.theme.NovaInkMuted
import com.nova.tnpsc.ui.theme.NovaPrimary
import com.nova.tnpsc.ui.theme.NovaSecondary
import com.nova.tnpsc.ui.theme.NovaSuccess
import com.nova.tnpsc.ui.theme.NovaWarmAccent
import kotlinx.coroutines.launch
import java.time.LocalTime
import java.time.ZoneId

// Hardcoded IST, not the device's local timezone -- matches APP_TIMEZONE
// on the backend (src/lib/timezone.mjs on web) so the greeting is always
// right for an India-based learner regardless of device settings.
private val IST: ZoneId = ZoneId.of("Asia/Kolkata")

private fun greeting(hour: Int): String = when {
    hour < 5 -> "Good night"
    hour < 12 -> "Good morning"
    hour < 17 -> "Good afternoon"
    hour < 21 -> "Good evening"
    else -> "Good night"
}

/**
 * Mirrors the design package's "Today" tab (AndroidAppShell.tsx): Syllabus
 * Sprint pill bar, Continue Learning hero, Today's Learning Queue, Subject
 * Mastery, Weak Areas. All real data -- the design's version of these
 * cards is wired to mock arrays; this one reuses the same real endpoints
 * the rest of the app already calls (plan/today, dashboard, courses,
 * readiness, progress/calendar), nothing fabricated to fill the layout.
 */
@Composable
fun HomeScreen(navController: NavHostController) {
    val app = LocalContext.current.applicationContext as TnpscApplication
    val scope = rememberCoroutineScope()
    var plan by remember { mutableStateOf<PlanResponse?>(null) }
    var profile by remember { mutableStateOf<ProfileResponse?>(null) }
    var dashboard by remember { mutableStateOf<DashboardResponse?>(null) }
    var readiness by remember { mutableStateOf<ReadinessResponse?>(null) }
    var subjects by remember { mutableStateOf<List<CourseSubject>>(emptyList()) }
    var calendar by remember { mutableStateOf<CalendarResponse?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var logging by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        try {
            val planRes = app.planApi.today()
            val profileRes = app.profileApi.get()
            if (planRes.isSuccessful) plan = planRes.body()
            if (profileRes.isSuccessful) profile = profileRes.body()
            if (!planRes.isSuccessful) error = planRes.body()?.message ?: "Could not load today's plan"
        } catch (e: Exception) {
            error = e.message ?: "Could not reach the server"
        }
        runCatching { app.platformApi.dashboard() }.onSuccess { if (it.isSuccessful) dashboard = it.body() }
        runCatching { app.platformApi.readiness() }.onSuccess { if (it.isSuccessful) readiness = it.body() }
        runCatching { app.coursesApi.courses() }.onSuccess { if (it.isSuccessful) subjects = it.body()?.subjects ?: emptyList() }
        runCatching { app.featureApi.calendar() }.onSuccess { if (it.isSuccessful) calendar = it.body() }
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(18.dp),
    ) {
        item {
            val name = profile?.name ?: "there"
            Text("${greeting(LocalTime.now(IST).hour)}, $name.", style = MaterialTheme.typography.displayLarge)
            Spacer(Modifier.height(4.dp))
            Text("TNPSC Group 2 & 2A", color = NovaWarmAccent, fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.bodyMedium)
            if (error != null) Text("Could not load today's plan: $error", color = NovaWarmAccent, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 6.dp))
        }

        // Syllabus Sprint pill bar
        dashboard?.let { d ->
            item {
                val studiedHrs = d.todayLearningMinutes / 60f
                val targetHrs = (if (d.weeklyGoalMinutes > 0) d.weeklyGoalMinutes / 7 else 120) / 60f
                val leftHrs = (targetHrs - studiedHrs).coerceAtLeast(0f)
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(20.dp))
                        .background(Brush.horizontalGradient(listOf(NovaPrimary, NovaSecondary)))
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Box(Modifier.weight(1f)) {
                        androidx.compose.foundation.layout.Column {
                            Text("SYLLABUS SPRINT", color = Color.White.copy(alpha = 0.85f), fontWeight = FontWeight.Black, style = MaterialTheme.typography.labelSmall)
                            Text("%.1f / %.1f hrs studied today".format(studiedHrs, targetHrs), color = Color.White, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 2.dp))
                            Text("%.1f hrs left to achieve daily target".format(leftHrs), color = Color.White.copy(alpha = 0.9f), style = MaterialTheme.typography.labelSmall, modifier = Modifier.padding(top = 2.dp))
                        }
                    }
                    Button(
                        onClick = {
                            if (logging) return@Button
                            logging = true
                            scope.launch {
                                runCatching { app.platformApi.logStudyTime(StudyTimeRequest(30)) }
                                    .onSuccess { if (it.isSuccessful) dashboard = dashboard?.copy(todayLearningMinutes = it.body()?.todayLearningMinutes ?: (dashboard!!.todayLearningMinutes + 30)) }
                                logging = false
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Color.White, contentColor = NovaPrimary),
                    ) { Text(if (logging) "…" else "Log +30m") }
                }
            }
        }

        // Continue Learning hero
        if (plan != null) {
            item {
                Text("Continue Learning", style = MaterialTheme.typography.headlineMedium, modifier = Modifier.padding(bottom = 2.dp))
            }
            item {
                val p = plan!!
                androidx.compose.foundation.layout.Column(
                    Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(24.dp))
                        .background(MaterialTheme.colorScheme.surface)
                        .padding(16.dp),
                ) {
                    Box(
                        Modifier
                            .fillMaxWidth()
                            .aspectRatio(16f / 9f)
                            .clip(RoundedCornerShape(16.dp))
                            .background(Brush.linearGradient(listOf(NovaPrimary, NovaWarmAccent))),
                        contentAlignment = Alignment.Center,
                    ) {
                        IconButton(
                            onClick = { navController.navigate(practiceRoute(topic = p.topicId ?: DEFAULT_PRACTICE_TOPIC, mode = if (p.primaryAction == "MEMORY_ECHO") "REVISION" else "PRACTICE")) },
                            modifier = Modifier.size(56.dp).clip(CircleShape).background(Color.White.copy(alpha = 0.25f)),
                        ) { Icon(Icons.Filled.PlayArrow, contentDescription = "Resume", tint = Color.White) }
                    }
                    Spacer(Modifier.height(14.dp))
                    Text(p.reason.ifBlank { p.topicName() ?: "Adaptive Plan" }, style = MaterialTheme.typography.headlineSmall)
                    Text("${p.estimatedMinutes} min · TNPSC Group 2 & 2A", color = NovaInkMuted, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 4.dp))
                    Spacer(Modifier.height(12.dp))
                    Button(
                        onClick = { navController.navigate(practiceRoute(topic = p.topicId ?: DEFAULT_PRACTICE_TOPIC, mode = if (p.primaryAction == "MEMORY_ECHO") "REVISION" else "PRACTICE")) },
                        modifier = Modifier.fillMaxWidth(),
                    ) { Text("Resume Course") }
                }
            }

            // Today's Learning Queue
            if (plan!!.items.isNotEmpty()) {
                item { Text("Today's Learning Queue", style = MaterialTheme.typography.headlineMedium) }
                items(plan!!.items) { unit -> QueueRow(unit, navController) }
            }
        }

        // Subject Mastery
        if (subjects.isNotEmpty()) {
            item { Text("Subject Mastery", style = MaterialTheme.typography.headlineMedium) }
            item {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    subjects.take(2).forEach { s -> SubjectChip(s, Modifier.weight(1f)) }
                }
            }
            if (subjects.size > 2) {
                item {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        subjects.drop(2).take(2).forEach { s -> SubjectChip(s, Modifier.weight(1f)) }
                    }
                }
            }
        }

        // Weak Areas
        readiness?.weakTopics?.takeIf { it.isNotEmpty() }?.let { weak ->
            item { Text("Focus on weak areas", style = MaterialTheme.typography.headlineMedium) }
            items(weak) { topic ->
                NovaCard {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Text(topic, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
                        Button(onClick = { navController.navigate(practiceRoute(topic = topic)) }) { Text("Practise") }
                    }
                }
            }
        }

        // Activity heatmap (condensed)
        calendar?.days?.takeIf { it.isNotEmpty() }?.let { days ->
            item {
                NovaCard {
                    Eyebrow("Learning activity")
                    Spacer(Modifier.height(10.dp))
                    Text("${days.count { it.count > 0 }} active days this month · ${days.sumOf { it.count }} questions", color = NovaInkMuted, style = MaterialTheme.typography.bodySmall)
                }
            }
        }
    }
}

private fun PlanResponse.topicName(): String? = this.items.firstOrNull()?.topicName

@Composable
private fun QueueRow(unit: PlanItem, navController: NavHostController) {
    NovaCard {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Filled.RadioButtonUnchecked, contentDescription = null, tint = NovaInkMuted)
            androidx.compose.foundation.layout.Column(Modifier.weight(1f).padding(start = 12.dp)) {
                Text(unit.topicName ?: unit.type, fontWeight = FontWeight.SemiBold)
                Text("${unit.type} · ${unit.estimatedMinutes} min", color = NovaInkMuted, style = MaterialTheme.typography.labelSmall, modifier = Modifier.padding(top = 2.dp))
            }
            Button(onClick = { navController.navigate(practiceRoute(topic = unit.topicId ?: DEFAULT_PRACTICE_TOPIC)) }) { Text("Start") }
        }
    }
}

@Composable
private fun SubjectChip(subject: CourseSubject, modifier: Modifier = Modifier) {
    NovaCard(modifier = modifier) {
        Text(subject.name, fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.bodySmall)
        Spacer(Modifier.height(8.dp))
        NovaProgressBar(value = subject.completion, color = if (subject.completion >= 70) NovaSuccess else NovaPrimary)
        Text("${subject.completion}%", color = NovaInkMuted, style = MaterialTheme.typography.labelSmall, modifier = Modifier.padding(top = 4.dp))
    }
}
