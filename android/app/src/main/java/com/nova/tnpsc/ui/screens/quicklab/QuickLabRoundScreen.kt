package com.nova.tnpsc.ui.screens.quicklab

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.nova.tnpsc.TnpscApplication
import com.nova.tnpsc.data.quicklab.QuickLabQuestion
import com.nova.tnpsc.data.quicklab.QuickLabSubmitRequest
import com.nova.tnpsc.ui.components.Eyebrow
import com.nova.tnpsc.ui.components.NovaCard
import com.nova.tnpsc.ui.components.OptionRow
import com.nova.tnpsc.ui.components.OptionState
import com.nova.tnpsc.ui.theme.NovaInkMuted
import com.nova.tnpsc.ui.theme.NovaSuccess
import com.nova.tnpsc.ui.theme.NovaSuccessTint
import com.nova.tnpsc.ui.theme.NovaWarmAccent
import com.nova.tnpsc.ui.theme.NovaWarmTint
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private const val ROUND_LENGTH = 10
private const val MEMORIZE_MS = 1800L
private val LETTERS = listOf("A", "B", "C", "D", "E", "F")

/** One 10-question round -- mirrors src/app/quick-lab/[mode]/GameRound.js. Not graded content: answers log as analytics only. */
@Composable
fun QuickLabRoundScreen(mode: String, navController: NavHostController) {
    val app = LocalContext.current.applicationContext as TnpscApplication

    var question by remember { mutableStateOf<QuickLabQuestion?>(null) }
    var phase by remember { mutableStateOf("loading") } // loading | memorize | answer | feedback | error | done
    var picked by remember { mutableStateOf<Int?>(null) }
    var feedback by remember { mutableStateOf<Pair<Boolean, Int>?>(null) }
    var index by remember { mutableIntStateOf(0) }
    var correctCount by remember { mutableIntStateOf(0) }
    var startedAt by remember { mutableStateOf(0L) }

    suspend fun loadNext() {
        picked = null
        feedback = null
        phase = "loading"
        try {
            val res = app.quickLabApi.next(mode)
            if (res.isSuccessful) {
                question = res.body()
                startedAt = System.currentTimeMillis()
                phase = if (res.body()?.memorize == true) "memorize" else "answer"
            } else {
                phase = "error"
            }
        } catch (e: Exception) {
            phase = "error"
        }
    }

    LaunchedEffect(mode) { loadNext() }

    LaunchedEffect(phase) {
        if (phase == "memorize") {
            delay(MEMORIZE_MS)
            phase = "answer"
        }
    }

    suspend fun pick(optionIndex: Int) {
        if (phase != "answer") return
        picked = optionIndex
        val q = question ?: return
        val timeTakenMs = System.currentTimeMillis() - startedAt
        try {
            val res = app.quickLabApi.submit(QuickLabSubmitRequest(q.token, optionIndex, mode, timeTakenMs))
            if (res.isSuccessful) {
                val body = res.body()
                val correct = body?.correct == true
                if (correct) correctCount += 1
                feedback = correct to (body?.correctIndex ?: -1)
                phase = "feedback"
            }
        } catch (e: Exception) {
            phase = "error"
        }
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background),
        contentPadding = PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            Text("Question ${(index + 1).coerceAtMost(ROUND_LENGTH)} of $ROUND_LENGTH · $correctCount correct", color = NovaInkMuted)
        }

        when (phase) {
            "error" -> item {
                NovaCard(background = NovaWarmTint, border = NovaWarmAccent) { Text("Could not load the next question.") }
            }
            "done" -> item {
                NovaCard {
                    Eyebrow("Round complete")
                    Spacer(Modifier.height(10.dp))
                    Text("$correctCount of $ROUND_LENGTH correct", style = MaterialTheme.typography.headlineLarge)
                    Spacer(Modifier.height(14.dp))
                    Button(onClick = { navController.popBackStack() }) { Text("Back to Quick Lab") }
                }
            }
            "loading" -> item { Text("Loading…", color = NovaInkMuted) }
            "memorize" -> item {
                NovaCard {
                    Text(question?.revealPrompt ?: "", style = MaterialTheme.typography.displayLarge)
                }
            }
            else -> {
                val q = question
                if (q != null) {
                    item { Text(q.prompt, style = MaterialTheme.typography.headlineLarge) }
                    q.hint?.let { item { Text(it, color = NovaInkMuted, style = MaterialTheme.typography.bodySmall) } }

                    item {
                        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            q.options.forEachIndexed { i, text ->
                                val fb = feedback
                                val state = when {
                                    fb != null && i == fb.second -> OptionState.Correct
                                    fb != null && i == picked -> OptionState.Incorrect
                                    picked == i -> OptionState.Selected
                                    else -> OptionState.Default
                                }
                                val scope = androidx.compose.runtime.rememberCoroutineScope()
                                OptionRow(LETTERS.getOrElse(i) { (i + 1).toString() }, text, state) {
                                    scope.launch { pick(i) }
                                }
                            }
                        }
                    }

                    if (phase == "feedback") {
                        item {
                            val scope = androidx.compose.runtime.rememberCoroutineScope()
                            Button(onClick = {
                                scope.launch {
                                    if (index + 1 >= ROUND_LENGTH) {
                                        phase = "done"
                                    } else {
                                        index += 1
                                        loadNext()
                                    }
                                }
                            }) { Text(if (index + 1 >= ROUND_LENGTH) "Finish" else "Next") }
                        }
                    }
                }
            }
        }
    }
}
