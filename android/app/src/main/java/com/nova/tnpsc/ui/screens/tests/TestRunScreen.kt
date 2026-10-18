package com.nova.tnpsc.ui.screens.tests

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.nova.tnpsc.TnpscApplication
import com.nova.tnpsc.data.tests.AnswerRequest
import com.nova.tnpsc.data.tests.TestQuestion
import com.nova.tnpsc.ui.components.Base64Image
import com.nova.tnpsc.ui.components.NovaCard
import com.nova.tnpsc.ui.components.OptionRow
import com.nova.tnpsc.ui.components.OptionState
import com.nova.tnpsc.ui.theme.NovaInkMuted
import com.nova.tnpsc.ui.theme.NovaWarmAccent
import com.nova.tnpsc.ui.theme.NovaWarmTint
import kotlinx.coroutines.launch

private val LETTERS = listOf("A", "B", "C", "D", "E", "F")

private data class LocalAnswer(val selectedIndex: Int? = null, val markedForReview: Boolean = false)

/** Free navigation, mark-for-review, nothing revealed until submit -- mirrors src/app/_components/LiveTest.js. */
@Composable
fun TestRunScreen(testId: String, navController: NavHostController) {
    val app = LocalContext.current.applicationContext as TnpscApplication
    val scope = rememberCoroutineScope()

    var questions by remember { mutableStateOf<List<TestQuestion>?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var current by remember { mutableIntStateOf(0) }
    var submitting by remember { mutableStateOf(false) }
    val answers = remember { mutableStateMapOf<String, LocalAnswer>() }
    var shownAt by remember { mutableStateOf(System.currentTimeMillis()) }

    LaunchedEffect(testId) {
        try {
            val res = app.testsApi.get(testId)
            val body = res.body()
            if (res.isSuccessful && body != null) {
                questions = body.questions
                body.questions.forEach { q ->
                    answers[q.questionId] = LocalAnswer(q.selectedIndex, q.markedForReview)
                }
                shownAt = System.currentTimeMillis()
            } else {
                error = body?.message ?: "Could not load this test"
            }
        } catch (e: Exception) {
            error = e.message ?: "Could not reach the server"
        }
    }

    fun saveAnswer(questionId: String, patch: LocalAnswer) {
        answers[questionId] = patch
        scope.launch {
            try {
                app.testsApi.answer(
                    testId,
                    AnswerRequest(questionId, patch.selectedIndex, patch.markedForReview, System.currentTimeMillis() - shownAt),
                )
            } catch (_: Exception) {
                // Best-effort -- a dropped answer save isn't fatal, submit still sends final state.
            }
        }
    }

    if (error != null) {
        NovaCard(background = NovaWarmTint, border = NovaWarmAccent, modifier = Modifier.fillMaxSize()) {
            Text(error!!)
        }
        return
    }

    val qs = questions
    if (qs == null) {
        Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
            Text("Loading…", color = NovaInkMuted, modifier = Modifier.fillMaxSize())
        }
        return
    }

    val answered = answers.values.count { it.selectedIndex != null }
    val q = qs[current]

    LazyColumn(
        modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background),
        contentPadding = PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            Text("Question ${current + 1} of ${qs.size} · $answered answered", color = NovaInkMuted)
        }

        item { Text(q.prompt, style = MaterialTheme.typography.headlineLarge) }

        q.imageData?.let { item { Base64Image(it) } }

        item {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                q.options.forEachIndexed { index, text ->
                    val a = answers[q.questionId]
                    val state = if (a?.selectedIndex == index) OptionState.Selected else OptionState.Default
                    OptionRow(LETTERS.getOrElse(index) { (index + 1).toString() }, text, state) {
                        saveAnswer(q.questionId, (a ?: LocalAnswer()).copy(selectedIndex = index))
                    }
                }
            }
        }

        item {
            Row(verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
                Checkbox(
                    checked = answers[q.questionId]?.markedForReview == true,
                    onCheckedChange = { checked -> saveAnswer(q.questionId, (answers[q.questionId] ?: LocalAnswer()).copy(markedForReview = checked)) },
                )
                Text("Mark for review", color = NovaInkMuted)
            }
        }

        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedButton(enabled = current > 0, onClick = { current -= 1 }) { Text("← Previous") }
                OutlinedButton(enabled = current < qs.size - 1, onClick = { current += 1 }) { Text("Next →") }
            }
        }

        item {
            Button(
                enabled = !submitting,
                onClick = {
                    submitting = true
                    scope.launch {
                        try {
                            val res = app.testsApi.submit(testId)
                            if (res.isSuccessful) {
                                navController.navigate("tests/$testId/result") {
                                    popUpTo("tests") { inclusive = false }
                                }
                            } else {
                                error = res.body()?.message ?: "Could not submit the test"
                            }
                        } catch (e: Exception) {
                            error = e.message ?: "Could not reach the server"
                        } finally {
                            submitting = false
                        }
                    }
                },
            ) { Text(if (submitting) "Submitting…" else "Submit test") }
        }
    }
}
