package com.nova.tnpsc.ui.screens.home

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavHostController
import com.nova.tnpsc.TnpscApplication
import com.nova.tnpsc.data.plan.PlanResponse
import com.nova.tnpsc.data.profile.ProfileResponse
import com.nova.tnpsc.navigation.DEFAULT_PRACTICE_TOPIC
import com.nova.tnpsc.navigation.practiceRoute
import com.nova.tnpsc.ui.components.Eyebrow
import com.nova.tnpsc.ui.components.NovaCard
import com.nova.tnpsc.ui.components.NovaStat
import com.nova.tnpsc.ui.theme.NovaInkMuted
import com.nova.tnpsc.ui.theme.NovaSuccess
import com.nova.tnpsc.ui.theme.NovaWarmAccent
import java.time.LocalTime

private fun greeting(hour: Int): String = when {
    hour < 5 -> "Good night"
    hour < 12 -> "Good morning"
    hour < 17 -> "Good afternoon"
    hour < 21 -> "Good evening"
    else -> "Good night"
}

@Composable
fun HomeScreen(navController: NavHostController) {
    val app = LocalContext.current.applicationContext as TnpscApplication
    var plan by remember { mutableStateOf<PlanResponse?>(null) }
    var profile by remember { mutableStateOf<ProfileResponse?>(null) }
    var error by remember { mutableStateOf<String?>(null) }

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
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            val name = profile?.name ?: "there"
            Text(
                "${greeting(LocalTime.now().hour)}, $name.",
                style = MaterialTheme.typography.displayLarge,
            )
            Spacer(Modifier.height(8.dp))
            when {
                error != null -> Text("Could not load today's plan: $error", color = NovaWarmAccent, style = MaterialTheme.typography.bodyMedium)
                plan == null -> Text("Loading today's plan…", color = NovaInkMuted, style = MaterialTheme.typography.bodyMedium)
            }
        }

        if (plan != null) {
            item {
                val p = plan!!
                NovaCard {
                    when (p.primaryAction) {
                        "MEMORY_ECHO" -> {
                            Eyebrow("✦ Memory echo", color = MaterialTheme.colorScheme.secondary)
                            Spacer(Modifier.height(8.dp))
                            Text(p.reason, style = MaterialTheme.typography.headlineMedium)
                            Spacer(Modifier.height(16.dp))
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                                Button(
                                    onClick = { navController.navigate(practiceRoute(mode = "REVISION")) },
                                    shape = RoundedCornerShape(10.dp),
                                ) { Text("Review now") }
                                Text("${p.estimatedMinutes} minutes", color = NovaInkMuted)
                            }
                        }
                        "PRACTICE" -> {
                            Eyebrow("Next small win", color = NovaWarmAccent)
                            Spacer(Modifier.height(8.dp))
                            Text(p.reason, style = MaterialTheme.typography.headlineMedium)
                            Spacer(Modifier.height(16.dp))
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                                Button(
                                    onClick = { navController.navigate(practiceRoute(topic = p.topicId ?: DEFAULT_PRACTICE_TOPIC)) },
                                    shape = RoundedCornerShape(10.dp),
                                ) { Text("Continue") }
                                Text("${p.estimatedMinutes} minutes", color = NovaInkMuted)
                            }
                        }
                        else -> {
                            Eyebrow("Ready when you are")
                            Spacer(Modifier.height(8.dp))
                            Text("A full syllabus is waiting.", style = MaterialTheme.typography.headlineMedium)
                            Spacer(Modifier.height(16.dp))
                            Button(
                                onClick = { navController.navigate(practiceRoute()) },
                                shape = RoundedCornerShape(10.dp),
                            ) { Text("Start") }
                        }
                    }
                }
            }
        }

        if (profile != null) {
            item {
                val pr = profile!!
                NovaCard {
                    Eyebrow("Your progress")
                    Spacer(Modifier.height(14.dp))
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        NovaStat(pr.questionsSolved.toString(), "questions solved")
                        NovaStat(pr.topicsMastered.toString(), "topics mastered")
                    }
                    Spacer(Modifier.height(20.dp))
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        NovaStat(pr.streak.toString(), "day streak", color = NovaWarmAccent)
                        NovaStat(pr.testsCompleted.toString(), "tests completed", color = NovaSuccess)
                    }
                }
            }
        }
    }
}
