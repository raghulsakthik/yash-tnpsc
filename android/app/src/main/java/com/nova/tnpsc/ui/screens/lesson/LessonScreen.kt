package com.nova.tnpsc.ui.screens.lesson

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.nova.tnpsc.TnpscApplication
import com.nova.tnpsc.data.lesson.LessonResponse
import com.nova.tnpsc.navigation.practiceRoute
import com.nova.tnpsc.ui.components.Base64Image
import com.nova.tnpsc.ui.components.Eyebrow
import com.nova.tnpsc.ui.components.NovaCard
import com.nova.tnpsc.ui.theme.NovaInkMuted
import com.nova.tnpsc.ui.theme.NovaPrimary
import com.nova.tnpsc.ui.theme.NovaSecondary
import com.nova.tnpsc.ui.theme.NovaSecondaryTint
import com.nova.tnpsc.ui.theme.NovaWarmAccent
import com.nova.tnpsc.ui.theme.NovaWarmTint
import kotlinx.coroutines.launch

/**
 * The concept + worked example for a topic, same content as the web
 * lesson page (GET /api/lesson/:topic) -- admin-editable via /admin/lessons,
 * so an edit there shows up here on next load, no app update needed.
 */
@Composable
fun LessonScreen(topic: String, navController: NavHostController) {
    val app = LocalContext.current.applicationContext as TnpscApplication
    var lesson by remember { mutableStateOf<LessonResponse?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var aiText by remember { mutableStateOf<String?>(null) }
    var aiLearnerName by remember { mutableStateOf<String?>(null) }
    var aiLoading by remember { mutableStateOf(false) }
    var aiUnavailable by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(topic) {
        try {
            val res = app.lessonApi.lesson(topic)
            if (res.isSuccessful) lesson = res.body()
            else error = res.body()?.message ?: "No lesson for this topic yet"
        } catch (e: Exception) {
            error = e.message ?: "Could not reach the server"
        }
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background),
        contentPadding = PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        if (error != null) {
            item {
                NovaCard(background = NovaWarmTint, border = NovaWarmAccent) {
                    Text(error!!)
                }
            }
            item {
                Button(onClick = { navController.navigate(practiceRoute(topic = topic)) }) { Text("Practice this now") }
            }
            return@LazyColumn
        }

        val l = lesson
        if (l == null) {
            item { Text("Loading…", color = NovaInkMuted) }
            return@LazyColumn
        }

        l.concept?.let { concept ->
            item {
                Eyebrow("The idea", color = NovaWarmAccent)
                Spacer(Modifier.height(10.dp))
                Text(l.title ?: topic, style = MaterialTheme.typography.displayLarge)
                Spacer(Modifier.height(10.dp))
                Text(concept, style = MaterialTheme.typography.bodyLarge)
            }
        }

        l.example?.let { example ->
            item {
                NovaCard(background = NovaSecondaryTint, border = NovaSecondary) {
                    Eyebrow("Worked example", color = NovaSecondary)
                    Spacer(Modifier.height(10.dp))
                    Text(example.problem, fontWeight = FontWeight.SemiBold)
                    Spacer(Modifier.height(8.dp))
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        example.steps.forEach { step -> Text("• $step") }
                    }
                    Spacer(Modifier.height(10.dp))
                    Text("Answer: ${example.answer}", color = NovaPrimary, fontWeight = FontWeight.Bold)
                }
            }
        }

        l.tip?.let { tip ->
            item {
                NovaCard(background = NovaWarmTint, border = NovaWarmAccent) {
                    Eyebrow("Common mistake", color = NovaWarmAccent)
                    Spacer(Modifier.height(8.dp))
                    Text(tip)
                }
            }
        }

        if (l.resources.isNotEmpty()) {
            item { Eyebrow("Study notes", color = NovaPrimary) }
            items(l.resources, key = { it.title }) { resource ->
                NovaCard {
                    Text(resource.title, fontWeight = FontWeight.SemiBold)
                    Spacer(Modifier.height(8.dp))
                    Text(resource.body)
                    resource.imageData?.let { img ->
                        Spacer(Modifier.height(10.dp))
                        Base64Image(img)
                    }
                }
            }
        }

        if (aiText == null && !aiUnavailable) {
            item {
                OutlinedButton(
                    onClick = {
                        aiLoading = true
                        scope.launch {
                            try {
                                val res = app.lessonApi.explain(topic)
                                val body = res.body()
                                if (res.isSuccessful && body?.available == true) {
                                    aiText = body.text
                                    aiLearnerName = body.learnerName
                                } else {
                                    aiUnavailable = true
                                }
                            } catch (e: Exception) {
                                aiUnavailable = true
                            } finally {
                                aiLoading = false
                            }
                        }
                    },
                    enabled = !aiLoading,
                ) {
                    if (aiLoading) {
                        CircularProgressIndicator(modifier = Modifier.height(16.dp))
                    } else {
                        Text("✦ Explain this differently")
                    }
                }
            }
        }

        aiText?.let { text ->
            item {
                NovaCard(background = NovaSecondaryTint, border = NovaSecondary) {
                    Eyebrow(
                        if (aiLearnerName != null) "✦ $aiLearnerName, here's another angle" else "Another angle",
                        color = NovaSecondary,
                    )
                    Spacer(Modifier.height(10.dp))
                    Text(text)
                }
            }
        }

        item {
            Button(onClick = { navController.navigate(practiceRoute(topic = topic)) }) { Text("Practice this now") }
        }
    }
}
