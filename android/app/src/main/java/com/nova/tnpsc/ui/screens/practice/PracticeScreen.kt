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
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.nova.tnpsc.data.practiceQuestion
import com.nova.tnpsc.ui.components.Eyebrow
import com.nova.tnpsc.ui.components.NovaCard
import com.nova.tnpsc.ui.components.OptionRow
import com.nova.tnpsc.ui.components.OptionState
import com.nova.tnpsc.ui.theme.NovaInkMuted
import com.nova.tnpsc.ui.theme.NovaPaperSunk
import com.nova.tnpsc.ui.theme.NovaSuccess
import com.nova.tnpsc.ui.theme.NovaSuccessTint

@Composable
fun PracticeScreen() {
    val q = practiceQuestion
    var selected by remember { mutableStateOf<String?>(null) }
    var submitted by remember { mutableStateOf(false) }

    LazyColumn(
        modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("${q.topic} · practice", style = MaterialTheme.typography.titleMedium)
                Text(q.difficulty, color = NovaSuccess, fontWeight = androidx.compose.ui.text.font.FontWeight.SemiBold)
            }
            Spacer(Modifier.height(10.dp))
            Eyebrow("Question ${q.index} of ${q.total}")
            Spacer(Modifier.height(8.dp))
            Text(q.question, style = MaterialTheme.typography.headlineLarge)
        }

        item {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                q.options.forEach { opt ->
                    val state = when {
                        submitted && opt.letter == q.correctLetter -> OptionState.Correct
                        submitted && opt.letter == selected -> OptionState.Incorrect
                        selected == opt.letter -> OptionState.Selected
                        else -> OptionState.Default
                    }
                    OptionRow(opt.letter, opt.text, state) { if (!submitted) selected = opt.letter }
                }
            }
        }

        if (!submitted) {
            item {
                Button(onClick = { if (selected != null) submitted = true }, enabled = selected != null) {
                    Text("Submit answer")
                }
            }
        }

        if (submitted) {
            item {
                NovaCard {
                    Text("Let's break it down.", style = MaterialTheme.typography.headlineMedium)
                    Spacer(Modifier.height(14.dp))
                    q.steps.forEach { (label, math) ->
                        Column(modifier = Modifier.padding(bottom = 12.dp)) {
                            Text(label)
                            Text(math, color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.titleMedium)
                        }
                    }
                    Row(
                        modifier = Modifier.fillMaxWidth().background(NovaSuccessTint).padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Text("Answer", color = NovaSuccess, fontWeight = androidx.compose.ui.text.font.FontWeight.SemiBold)
                        Text(q.answer, style = MaterialTheme.typography.headlineMedium)
                    }
                    Spacer(Modifier.height(14.dp))
                    OutlinedButton(onClick = { submitted = false; selected = null }) {
                        Text("Try a similar one")
                    }
                }
            }
        }
    }
}
