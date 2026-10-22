package com.nova.tnpsc.ui.screens.pyq

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
import androidx.compose.runtime.rememberCoroutineScope
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
import com.nova.tnpsc.data.pyq.PyqQuestionResponse
import com.nova.tnpsc.ui.components.Base64Image
import com.nova.tnpsc.ui.components.Eyebrow
import com.nova.tnpsc.ui.components.NovaCard
import com.nova.tnpsc.ui.components.OptionRow
import com.nova.tnpsc.ui.components.OptionState
import com.nova.tnpsc.ui.theme.NovaInkMuted
import com.nova.tnpsc.ui.theme.NovaSuccess
import com.nova.tnpsc.ui.theme.NovaSuccessTint
import com.nova.tnpsc.ui.theme.NovaWarmAccent
import com.nova.tnpsc.ui.theme.NovaWarmTint
import java.util.UUID
import kotlinx.coroutines.launch
import retrofit2.Response

private val LETTERS = listOf("A", "B", "C", "D", "E", "F")

/**
 * The same question/answer/feedback loop as PracticeScreen, against
 * GET /api/pyqs/next?year=&topic= instead of /api/questions/next --
 * restricted to real past-year questions. Grading still goes through the
 * shared POST /api/attempts, so a PYQ attempt feeds the exact same
 * mastery/revision model as regular practice, never a separate scoreboard.
 *
 * @param year optional filter, e.g. from the "By year" list on PyqScreen
 * @param topic optional filter, e.g. from the "Top topics" list
 */
@Composable
fun PyqPracticeScreen(year: Int?, topic: String?) {
    val app = LocalContext.current.applicationContext as TnpscApplication

    var question by remember { mutableStateOf<PyqQuestionResponse?>(null) }
    var selected by remember { mutableStateOf<Int?>(null) }
    var result by remember { mutableStateOf<AttemptResponse?>(null) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var empty by remember { mutableStateOf(false) }
    var answered by remember { mutableIntStateOf(0) }
    var correctCount by remember { mutableIntStateOf(0) }
    var shownAt by remember { mutableLongStateOf(System.currentTimeMillis()) }
    var reloadKey by remember { mutableIntStateOf(0) }

    suspend fun loadNext() {
        loading = true
        error = null
        empty = false
        selected = null
        result = null
        try {
            val res: Response<PyqQuestionResponse> = app.pyqApi.next(year = year, topic = topic)
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

    LaunchedEffect(year, topic, reloadKey) { loadNext() }

    LazyColumn(
        modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text(
                    "${question?.topicName ?: "Previous year questions"}${question?.sourceYear?.let { " · $it" } ?: ""}",
                    style = MaterialTheme.typography.titleMedium,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
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
                    Text("No past-year questions here yet", style = MaterialTheme.typography.headlineMedium)
                    Spacer(Modifier.height(10.dp))
                    Text("This topic/year combination has no real transcribed questions on record.", color = NovaInkMuted)
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
                    val scope = rememberCoroutineScope()
                    Button(
                        enabled = selected != null,
                        onClick = {
                            val idx = selected ?: return@Button
                            val timeTakenMs = System.currentTimeMillis() - shownAt
                            scope.launch {
                                try {
                                    val res = app.practiceApi.submit(
                                        AttemptRequest(
                                            attemptId = UUID.randomUUID().toString(),
                                            questionId = q.questionId,
                                            selectedIndex = idx,
                                            timeTakenMs = timeTakenMs,
                                            mode = "PRACTICE",
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
                    item { PyqAchievementBanner(r.newAchievements) }
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
private fun PyqAchievementBanner(achievements: List<AchievementUnlock>) {
    NovaCard(background = NovaWarmTint, border = NovaWarmAccent) {
        Eyebrow(if (achievements.size == 1) "Achievement unlocked!" else "${achievements.size} achievements unlocked!", color = NovaWarmAccent)
        Spacer(Modifier.height(8.dp))
        achievements.forEach { a ->
            Text("${a.icon}  ${a.name}", fontWeight = FontWeight.SemiBold)
        }
    }
}
