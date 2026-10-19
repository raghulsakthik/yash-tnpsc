package com.nova.tnpsc.ui.screens.practice

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.nova.tnpsc.TnpscApplication
import com.nova.tnpsc.data.practice.AchievementUnlock
import com.nova.tnpsc.data.practice.AttemptRequest
import com.nova.tnpsc.data.practice.AttemptResponse
import com.nova.tnpsc.data.practice.HintRequest
import com.nova.tnpsc.data.practice.QuestionResponse
import com.nova.tnpsc.ui.components.Base64Image
import com.nova.tnpsc.ui.components.Eyebrow
import com.nova.tnpsc.ui.components.NovaCard
import com.nova.tnpsc.ui.components.OptionRow
import com.nova.tnpsc.ui.components.OptionState
import com.nova.tnpsc.ui.theme.NovaInkMuted
import com.nova.tnpsc.ui.theme.NovaSecondary
import com.nova.tnpsc.ui.theme.NovaSecondaryTint
import com.nova.tnpsc.ui.theme.NovaSuccess
import com.nova.tnpsc.ui.theme.NovaSuccessTint
import com.nova.tnpsc.ui.theme.NovaWarmAccent
import com.nova.tnpsc.ui.theme.NovaWarmTint
import java.util.UUID
import kotlinx.coroutines.launch
import retrofit2.Response

private val LETTERS = listOf("A", "B", "C", "D", "E", "F")

/**
 * The real question/answer/feedback loop against POST /api/attempts,
 * GET /api/questions/next (and /api/revision/next, /api/mistakes/next for
 * REVISION/MISTAKES mode) -- the same backend LiveQuestion.js drives on
 * the web. Backend decides correctness, the explanation and what unlocked;
 * this only renders what it's given.
 */
@Composable
fun PracticeScreen(topic: String, mode: String) {
    val app = LocalContext.current.applicationContext as TnpscApplication

    var question by remember { mutableStateOf<QuestionResponse?>(null) }
    var selected by remember { mutableStateOf<Int?>(null) }
    var result by remember { mutableStateOf<AttemptResponse?>(null) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var empty by remember { mutableStateOf(false) }
    var answered by remember { mutableIntStateOf(0) }
    var correctCount by remember { mutableIntStateOf(0) }
    var shownAt by remember { mutableLongStateOf(System.currentTimeMillis()) }
    var lastTimeTakenMs by remember { mutableLongStateOf(0L) }
    var reloadKey by remember { mutableIntStateOf(0) }
    var aiHint by remember { mutableStateOf<String?>(null) }
    var aiHintName by remember { mutableStateOf<String?>(null) }
    var aiLoading by remember { mutableStateOf(false) }
    var aiUnavailable by remember { mutableStateOf(false) }

    suspend fun loadNext() {
        loading = true
        error = null
        empty = false
        selected = null
        result = null
        aiHint = null
        aiHintName = null
        aiUnavailable = false
        try {
            val res: Response<QuestionResponse> = when (mode) {
                "REVISION" -> app.practiceApi.nextRevision()
                "MISTAKES" -> app.practiceApi.nextMistake()
                else -> app.practiceApi.nextQuestion(topic)
            }
            if (res.isSuccessful) {
                question = res.body()
                shownAt = System.currentTimeMillis()
            } else if (res.code() == 404) {
                empty = true
            } else {
                error = res.body()?.message ?: "Could not load a question"
            }
        } catch (e: Exception) {
            error = e.message ?: "Could not reach the server"
        } finally {
            loading = false
        }
    }

    LaunchedEffect(topic, mode, reloadKey) { loadNext() }

    LazyColumn(
        modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text(
                    "${question?.topicName ?: topic} · ${mode.lowercase()}",
                    style = MaterialTheme.typography.titleMedium,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    // Long topic names ("Directive Principles of State Policy")
                    // would otherwise push the difficulty badge off-screen
                    // in this SpaceBetween row -- weight lets the title
                    // truncate instead, badge always stays visible and fixed-width.
                    modifier = Modifier.weight(1f, fill = false),
                )
                question?.let {
                    Text(
                        it.difficulty,
                        color = NovaSuccess,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.padding(start = 8.dp),
                    )
                }
            }
        }

        if (error != null) {
            item {
                NovaCard {
                    Text("Something broke", style = MaterialTheme.typography.headlineMedium)
                    Spacer(Modifier.height(10.dp))
                    Text(error!!, color = NovaInkMuted)
                }
            }
        } else if (empty) {
            item {
                NovaCard {
                    Text(
                        when (mode) {
                            "REVISION" -> "Nothing is due for review right now."
                            "MISTAKES" -> "No open mistakes right now."
                            else -> "Nothing here right now."
                        },
                        style = MaterialTheme.typography.headlineMedium,
                    )
                }
            }
        } else if (loading || question == null) {
            item { Text("Loading…", color = NovaInkMuted) }
        } else {
            val q = question!!
            item { Text(q.prompt, style = MaterialTheme.typography.headlineLarge) }

            q.imageData?.let { imageData ->
                item { Base64Image(imageData) }
            }

            item {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    q.options.forEachIndexed { index, text ->
                        val r = result
                        val state = when {
                            r != null && index == r.correctIndex -> OptionState.Correct
                            r != null && index == selected -> OptionState.Incorrect
                            selected == index -> OptionState.Selected
                            else -> OptionState.Default
                        }
                        OptionRow(LETTERS.getOrElse(index) { (index + 1).toString() }, text, state) {
                            if (result == null) selected = index
                        }
                    }
                }
            }

            if (result == null) {
                item {
                    val scope = androidx.compose.runtime.rememberCoroutineScope()
                    Button(
                        enabled = selected != null,
                        onClick = {
                            val idx = selected ?: return@Button
                            val timeTakenMs = System.currentTimeMillis() - shownAt
                            lastTimeTakenMs = timeTakenMs
                            scope.launch {
                                try {
                                    val res = app.practiceApi.submit(
                                        AttemptRequest(
                                            attemptId = UUID.randomUUID().toString(),
                                            questionId = q.questionId,
                                            selectedIndex = idx,
                                            timeTakenMs = timeTakenMs,
                                            mode = mode,
                                        )
                                    )
                                    if (res.isSuccessful) {
                                        result = res.body()
                                        answered += 1
                                        if (res.body()?.correct == true) correctCount += 1
                                    } else {
                                        error = res.body()?.message ?: "Could not record that answer"
                                    }
                                } catch (e: Exception) {
                                    error = e.message ?: "Could not reach the server"
                                }
                            }
                        },
                    ) { Text("Submit answer") }
                }
            }

            val r = result
            if (r != null) {
                item {
                    NovaCard(background = if (r.correct) NovaSuccessTint else NovaWarmTint, border = null) {
                        Eyebrow(if (r.correct) "Correct" else "Not this time", color = if (r.correct) NovaSuccess else NovaWarmAccent)
                        r.explanation?.let {
                            Spacer(Modifier.height(10.dp))
                            Text(it)
                        }
                        r.trap?.let {
                            Spacer(Modifier.height(8.dp))
                            Text(it, color = NovaInkMuted, style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }

                if (r.newAchievements.isNotEmpty()) {
                    item { AchievementBanner(r.newAchievements) }
                }

                if (aiHint == null && !aiUnavailable) {
                    item {
                        val scope = androidx.compose.runtime.rememberCoroutineScope()
                        OutlinedButton(
                            enabled = !aiLoading,
                            onClick = {
                                aiLoading = true
                                scope.launch {
                                    try {
                                        val res = app.practiceApi.hint(
                                            HintRequest(
                                                questionId = q.questionId,
                                                selectedIndex = selected,
                                                mistakeType = r.mistakeType,
                                                timeTakenMs = lastTimeTakenMs,
                                            )
                                        )
                                        val body = res.body()
                                        if (res.isSuccessful && body?.available == true) {
                                            aiHint = body.text
                                            aiHintName = body.learnerName
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
                        ) {
                            if (aiLoading) {
                                CircularProgressIndicator(modifier = Modifier.height(16.dp))
                            } else {
                                Text("✦ Get an AI hint")
                            }
                        }
                    }
                }

                aiHint?.let { text ->
                    item {
                        NovaCard(background = NovaSecondaryTint, border = NovaSecondary) {
                            Eyebrow(
                                if (aiHintName != null) "✦ $aiHintName, here's a hint" else "Hint",
                                color = NovaSecondary,
                            )
                            Spacer(Modifier.height(10.dp))
                            Text(text)
                        }
                    }
                }

                item {
                    OutlinedButton(onClick = { reloadKey += 1 }) { Text("Next question") }
                }
            }
        }

        item {
            Text("$correctCount of $answered correct this session", color = NovaInkMuted, style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
private fun AchievementBanner(achievements: List<AchievementUnlock>) {
    NovaCard(background = NovaWarmTint, border = NovaWarmAccent) {
        Eyebrow(if (achievements.size == 1) "Achievement unlocked!" else "${achievements.size} achievements unlocked!", color = NovaWarmAccent)
        Spacer(Modifier.height(8.dp))
        achievements.forEach { a ->
            Text("${a.icon}  ${a.name}", fontWeight = FontWeight.SemiBold)
        }
    }
}
