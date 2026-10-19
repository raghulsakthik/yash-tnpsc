package com.nova.tnpsc.ui.screens.tests

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
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.nova.tnpsc.TnpscApplication
import com.nova.tnpsc.data.tests.TestDetailResponse
import com.nova.tnpsc.ui.components.Eyebrow
import com.nova.tnpsc.ui.components.NovaCard
import com.nova.tnpsc.ui.theme.NovaInkMuted
import com.nova.tnpsc.ui.theme.NovaPrimary
import com.nova.tnpsc.ui.theme.NovaWarmAccent
import com.nova.tnpsc.ui.theme.NovaWarmTint

/** Real score + question count for a completed test, read back from GET /api/tests/:id once status is COMPLETED. */
@Composable
fun TestResultScreen(testId: String, navController: NavHostController) {
    val app = LocalContext.current.applicationContext as TnpscApplication
    var detail by remember { mutableStateOf<TestDetailResponse?>(null) }
    var error by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(testId) {
        try {
            val res = app.testsApi.get(testId)
            if (res.isSuccessful) detail = res.body()
            else error = res.body()?.message ?: "Could not load this result"
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
            item { NovaCard(background = NovaWarmTint, border = NovaWarmAccent) { Text(error!!) } }
        } else if (detail == null) {
            item { Text("Loading…", color = NovaInkMuted) }
        } else {
            val d = detail!!
            val correctCount = d.questions.count { it.selectedIndex != null && it.selectedIndex == it.correctIndex }
            item {
                NovaCard {
                    Eyebrow("Test complete")
                    Spacer(Modifier.height(10.dp))
                    Text("${d.score ?: 0}%", style = MaterialTheme.typography.displayLarge, color = NovaPrimary)
                    Spacer(Modifier.height(6.dp))
                    Text("$correctCount of ${d.questionCount} correct", color = NovaInkMuted)
                }
            }

            items(d.questions, key = { it.questionId }) { q ->
                NovaCard {
                    Text(q.prompt)
                    Spacer(Modifier.height(8.dp))
                    val wasCorrect = q.selectedIndex != null && q.selectedIndex == q.correctIndex
                    Text(
                        if (q.selectedIndex == null) "Not answered" else if (wasCorrect) "Correct" else "Not quite",
                        color = if (wasCorrect) NovaPrimary else NovaWarmAccent,
                    )
                    q.explanation?.let {
                        Spacer(Modifier.height(6.dp))
                        Text(it, color = NovaInkMuted, style = MaterialTheme.typography.bodySmall)
                    }
                }
            }

            item {
                Button(onClick = { navController.navigate("tests") { popUpTo("tests") { inclusive = true } } }) {
                    Text("Back to Tests")
                }
            }
        }
    }
}
