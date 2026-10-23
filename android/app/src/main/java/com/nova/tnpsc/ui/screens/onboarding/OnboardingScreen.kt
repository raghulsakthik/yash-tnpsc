package com.nova.tnpsc.ui.screens.onboarding
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.platform.LocalContext
import com.nova.tnpsc.TnpscApplication
import com.nova.tnpsc.data.platform.OnboardingPreferencesRequest
import com.nova.tnpsc.ui.components.NovaCard

@Composable
fun OnboardingScreen(onComplete: () -> Unit) {
    val app = LocalContext.current.applicationContext as TnpscApplication
    var language by remember { mutableStateOf("en") }
    var goal by remember { mutableStateOf(30) }
    var saving by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    Column(Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text("Welcome to NOVA", style = MaterialTheme.typography.displaySmall)
        Text("Set your learning rhythm. Diagnostic performance is not fabricated; it will be learned from your real attempts.")
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
        error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
        Button(enabled = !saving, onClick = {
            saving = true
        }, modifier = Modifier.fillMaxWidth()) { Text(if (saving) "Saving…" else "Start learning") }
    }
    if (saving) {
        LaunchedEffect(language, goal) {
            val response = app.platformApi.saveOnboarding(OnboardingPreferencesRequest(language = language, dailyGoalMinutes = goal))
            if (response.isSuccessful) onComplete() else { error = response.body()?.toString() ?: "Could not save preferences"; saving = false }
        }
    }
}
