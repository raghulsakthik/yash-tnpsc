package com.nova.tnpsc.ui.screens.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.nova.tnpsc.TnpscApplication
import com.nova.tnpsc.data.auth.AuthRepository
import com.nova.tnpsc.data.profile.ProfileResponse
import com.nova.tnpsc.ui.components.Eyebrow
import com.nova.tnpsc.ui.components.NovaCard
import com.nova.tnpsc.ui.components.NovaStat
import com.nova.tnpsc.ui.theme.NovaInkMuted
import com.nova.tnpsc.ui.theme.NovaPrimary
import com.nova.tnpsc.ui.theme.NovaSecondaryTint
import com.nova.tnpsc.ui.theme.NovaSuccess
import com.nova.tnpsc.ui.theme.NovaWarmAccent
import kotlinx.coroutines.launch

private val EXAM_LABELS = mapOf("tnpsc-prelims-495" to "TNPSC Group 2 · CCSE-II")
private val ROLE_LABELS = mapOf("learner" to "Learner account", "test" to "Test account", "admin" to "Admin account")

@Composable
fun ProfileScreen(authRepository: AuthRepository) {
    val app = LocalContext.current.applicationContext as TnpscApplication
    var profile by remember { mutableStateOf<ProfileResponse?>(null) }
    var error by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        try {
            val res = app.profileApi.get()
            if (res.isSuccessful) profile = res.body()
            else error = "Could not load your profile"
        } catch (e: Exception) {
            error = e.message ?: "Could not reach the server"
        }
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        if (error != null) {
            item { Text(error!!, color = NovaWarmAccent) }
        } else if (profile == null) {
            item { Text("Loading…", color = NovaInkMuted) }
        } else {
            val p = profile!!
            item {
                NovaCard {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier.size(56.dp).clip(CircleShape).background(NovaSecondaryTint),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                p.name.firstOrNull()?.uppercaseChar()?.toString() ?: "Y",
                                color = NovaPrimary,
                                fontWeight = FontWeight.Bold,
                                style = MaterialTheme.typography.headlineMedium,
                            )
                        }
                        Spacer(Modifier.width(16.dp))
                        Column {
                            Text(p.name, style = MaterialTheme.typography.headlineMedium)
                            Text(
                                p.exam?.let { "Preparing for ${EXAM_LABELS[it] ?: it}" } ?: (ROLE_LABELS[p.role] ?: p.role ?: ""),
                                color = NovaInkMuted,
                                style = MaterialTheme.typography.bodyMedium,
                            )
                        }
                    }
                }
            }

            if (p.exam != null) {
                item {
                    NovaCard {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            NovaStat(p.streak.toString(), "day streak", color = NovaWarmAccent)
                            NovaStat(p.longestStreak.toString(), "longest streak")
                        }
                    }
                }

                item {
                    NovaCard {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            NovaStat(p.questionsSolved.toString(), "questions solved")
                            NovaStat(p.topicsMastered.toString(), "topics mastered")
                            NovaStat(p.testsCompleted.toString(), "tests completed", color = NovaSuccess)
                        }
                    }
                }

                item {
                    NovaCard {
                        Eyebrow("How you learn")
                        Spacer(Modifier.height(12.dp))
                        listOf(
                            "Daily goal" to "${p.dailyGoalMinutes} minutes",
                            "Language" to if (p.language == "ta") "Tamil" else "English",
                            "Role" to (ROLE_LABELS[p.role] ?: p.role ?: "—"),
                        ).forEach { (label, value) ->
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text(label)
                                Text(value, color = NovaPrimary, fontWeight = FontWeight.SemiBold)
                            }
                            Spacer(Modifier.height(10.dp))
                        }
                    }
                }
            }
        }

        item {
            // Real logout against POST /api/auth/logout.
            val scope = rememberCoroutineScope()
            var loggingOut by remember { mutableStateOf(false) }
            NovaCard {
                Button(
                    onClick = {
                        if (loggingOut) return@Button
                        loggingOut = true
                        scope.launch { authRepository.logout() }
                    },
                    colors = ButtonDefaults.outlinedButtonColors(),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(if (loggingOut) "Logging out…" else "Log out")
                }
            }
        }
    }
}
