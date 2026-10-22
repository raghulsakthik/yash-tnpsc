package com.nova.tnpsc.ui.screens.learn

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.nova.tnpsc.TnpscApplication
import com.nova.tnpsc.data.learn.SubjectSummary
import com.nova.tnpsc.ui.components.NovaCard
import com.nova.tnpsc.ui.components.NovaProgressBar
import com.nova.tnpsc.ui.components.StatusBadge
import com.nova.tnpsc.ui.theme.NovaInkMuted
import com.nova.tnpsc.ui.theme.NovaPrimary
import com.nova.tnpsc.ui.theme.NovaWarmAccent

@Composable
fun LearnScreen(navController: NavHostController) {
    val app = LocalContext.current.applicationContext as TnpscApplication
    var subjects by remember { mutableStateOf<List<SubjectSummary>?>(null) }
    var error by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        try {
            val res = app.learnApi.subjects()
            if (res.isSuccessful) subjects = res.body()?.subjects ?: emptyList()
            else error = "Could not load subjects"
        } catch (e: Exception) {
            error = e.message ?: "Could not reach the server"
        }
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            Text("TNPSC GROUP 2 · CCSE-II", style = MaterialTheme.typography.labelMedium, color = NovaInkMuted)
            Spacer(Modifier.height(10.dp))
            Text("Learn", style = MaterialTheme.typography.displayLarge)
            Spacer(Modifier.height(8.dp))
            when {
                error != null -> Text(error!!, color = NovaWarmAccent, style = MaterialTheme.typography.bodyMedium)
                subjects == null -> Text("Loading…", color = NovaInkMuted, style = MaterialTheme.typography.bodyMedium)
                else -> Text(
                    "${subjects!!.size} subjects, each a real path through real content.",
                    style = MaterialTheme.typography.bodyLarge,
                    color = NovaInkMuted,
                )
            }
            Spacer(Modifier.height(6.dp))
        }

        items(subjects ?: emptyList(), key = { it.slug }) { subject ->
            NovaCard(
                modifier = Modifier.clickable { navController.navigate("learn/${subject.slug}") },
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        subject.name,
                        style = MaterialTheme.typography.titleLarge,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f, fill = false),
                    )
                    Spacer(Modifier.width(8.dp))
                    StatusBadge(subject.status)
                }
                Spacer(Modifier.height(8.dp))
                Text(
                    "${subject.topics} topics · ${subject.mastered} mastered" +
                        if (subject.revisionDue > 0) " · ${subject.revisionDue} revision due" else "",
                    style = MaterialTheme.typography.bodySmall,
                    color = NovaInkMuted,
                )
                Spacer(Modifier.height(14.dp))
                NovaProgressBar(subject.mastery)
                Spacer(Modifier.height(10.dp))
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("${subject.mastery}% mastery", style = MaterialTheme.typography.bodyMedium)
                    Text(
                        if (subject.mastery == 0) "Start →" else "Open →",
                        color = NovaPrimary,
                        style = MaterialTheme.typography.bodyMedium,
                    )
                }
            }
        }
    }
}
