package com.nova.tnpsc.ui.screens.onboarding

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.nova.tnpsc.TnpscApplication
import com.nova.tnpsc.data.platform.OnboardingPreferencesRequest
import com.nova.tnpsc.ui.components.NovaCard
import com.nova.tnpsc.ui.theme.NovaInkMuted

private val PROGRAMMES = listOf("TNPSC", "UPSC", "SSC", "Banking", "Railways")
private val EXAM_TRACKS = listOf("TNPSC Group 2 & 2A", "TNPSC Group 4", "TNPSC VAO")
private val PROFICIENCY_LEVELS = listOf("Beginner", "Developing", "Strong", "Mastered")
private val DEFAULT_SUBJECTS = linkedMapOf(
    "General Studies" to "Developing",
    "Aptitude & Mental Ability" to "Beginner",
    "Indian Polity & Constitution" to "Beginner",
    "History & Culture of Tamil Nadu" to "Strong",
    "General English / Tamil" to "Strong",
    "Current Events & Administration" to "Developing",
)
private val EMOJI_OPTIONS = listOf(
    "🦉" to "Scholar Owl", "🦁" to "Brave Lion", "🐯" to "Agile Tiger", "🦅" to "Sharp Eagle",
    "🚀" to "Aspirant Rocket", "⚡" to "Lightning Mind", "🎯" to "Target Bullseye", "🌟" to "Starlight",
    "🧠" to "Concept Brain", "🏆" to "Trophy Champion", "📚" to "Book Maven", "🌺" to "Tamil Lotus",
)

/**
 * Mirrors OnboardingModal.tsx's 4-step wizard: programme/exam track,
 * subject self-rated proficiency, contact & alerts, emoji avatar + goal.
 * Same reality as web: this is a preference signal only, not a fabricated
 * diagnostic -- only name, phone, language and dailyGoalMinutes are
 * actually sent to the backend (POST /api/onboarding/preferences,
 * see handleCompleteOnboarding in App.tsx); programme, exam track, subject
 * self-ratings, email and the emoji avatar are kept client-side on web
 * too, so they're not persisted here either.
 */
@OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)
@Composable
fun OnboardingScreen(onComplete: () -> Unit) {
    val app = LocalContext.current.applicationContext as TnpscApplication
    var step by remember { mutableIntStateOf(1) }

    // Step 1
    var programme by remember { mutableStateOf("TNPSC") }
    var examTrack by remember { mutableStateOf(EXAM_TRACKS.first()) }

    // Step 2
    val proficiencies = remember { mutableStateMapOf<String, String>().apply { putAll(DEFAULT_SUBJECTS) } }

    // Step 3
    var name by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var emailNotifications by remember { mutableStateOf(true) }
    var smsNotifications by remember { mutableStateOf(false) }

    // Step 4
    var selectedEmoji by remember { mutableStateOf("🦉") }
    var language by remember { mutableStateOf("en") }
    var goal by remember { mutableIntStateOf(30) }

    var saving by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text("Welcome to YASH", style = MaterialTheme.typography.displaySmall)
        Text("Step $step of 4", color = NovaInkMuted, style = MaterialTheme.typography.labelMedium)
        LinearProgressIndicator(progress = { step / 4f }, modifier = Modifier.fillMaxWidth())

        when (step) {
            1 -> NovaCard {
                Text("Programme & exam track", fontWeight = FontWeight.SemiBold)
                Text("Choose what you're preparing for.", color = NovaInkMuted, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 4.dp, bottom = 10.dp))
                FlowRowChips(PROGRAMMES, programme) { programme = it }
                Spacer(Modifier.height(12.dp))
                Text("Exam track", fontWeight = FontWeight.SemiBold)
                Spacer(Modifier.height(8.dp))
                FlowRowChips(EXAM_TRACKS, examTrack) { examTrack = it }
            }
            2 -> NovaCard {
                Text("Rate yourself per subject", fontWeight = FontWeight.SemiBold)
                Text("A preference signal only -- your real diagnostic comes from actual practice, not this self-rating.", color = NovaInkMuted, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 4.dp, bottom = 10.dp))
                proficiencies.keys.toList().forEach { subject ->
                    Column(Modifier.padding(bottom = 12.dp)) {
                        Text(subject, style = MaterialTheme.typography.bodyMedium)
                        Spacer(Modifier.height(6.dp))
                        FlowRowChips(PROFICIENCY_LEVELS, proficiencies[subject] ?: "Beginner") { proficiencies[subject] = it }
                    }
                }
            }
            3 -> NovaCard {
                Text("Contact & alerts", fontWeight = FontWeight.SemiBold)
                Spacer(Modifier.height(10.dp))
                OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Full name") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                Spacer(Modifier.height(10.dp))
                OutlinedTextField(value = email, onValueChange = { email = it }, label = { Text("Email (optional)") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                Spacer(Modifier.height(10.dp))
                OutlinedTextField(value = phone, onValueChange = { phone = it }, label = { Text("Phone (optional)") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                Spacer(Modifier.height(10.dp))
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                    Text("Email reminders", modifier = Modifier.weight(1f))
                    Switch(checked = emailNotifications, onCheckedChange = { emailNotifications = it })
                }
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                    Text("SMS reminders", modifier = Modifier.weight(1f))
                    Switch(checked = smsNotifications, onCheckedChange = { smsNotifications = it })
                }
            }
            4 -> {
                NovaCard {
                    Text("Pick your study character", fontWeight = FontWeight.SemiBold)
                    Spacer(Modifier.height(10.dp))
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        EMOJI_OPTIONS.forEach { (emoji, label) ->
                            FilterChip(selected = selectedEmoji == emoji, onClick = { selectedEmoji = emoji }, label = { Text("$emoji $label") })
                        }
                    }
                }
                NovaCard {
                    Text("Language")
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 10.dp)) {
                        FilterChip(selected = language == "en", onClick = { language = "en" }, label = { Text("English") })
                        FilterChip(selected = language == "ta", onClick = { language = "ta" }, label = { Text("Tamil") })
                    }
                }
                NovaCard {
                    Text("Daily goal: $goal minutes")
                    Slider(value = goal.toFloat(), onValueChange = { goal = it.toInt() }, valueRange = 15f..120f, steps = 6)
                }
            }
        }

        error?.let { Text(it, color = MaterialTheme.colorScheme.error) }

        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            if (step > 1) {
                OutlinedButton(enabled = !saving, onClick = { step -= 1 }, modifier = Modifier.weight(1f)) { Text("Back") }
            }
            Button(
                enabled = !saving,
                onClick = { if (step < 4) step += 1 else saving = true },
                modifier = Modifier.weight(1f),
            ) { Text(if (saving) "Saving…" else if (step < 4) "Next" else "Start learning") }
        }
    }

    if (saving) {
        LaunchedEffect(Unit) {
            val response = app.platformApi.saveOnboarding(
                OnboardingPreferencesRequest(
                    name = name.trim().ifBlank { null },
                    phone = phone.trim().ifBlank { null },
                    language = language,
                    dailyGoalMinutes = goal,
                ),
            )
            if (response.isSuccessful) onComplete() else { error = "Could not save preferences"; saving = false }
        }
    }
}

@OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)
@Composable
private fun FlowRowChips(options: List<String>, selected: String, onSelect: (String) -> Unit) {
    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        options.forEach { option ->
            FilterChip(selected = selected == option, onClick = { onSelect(option) }, label = { Text(option) })
        }
    }
}
