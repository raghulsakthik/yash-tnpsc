package com.nova.tnpsc.ui.screens.learn

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.nova.tnpsc.data.subjects
import com.nova.tnpsc.ui.components.NovaCard
import com.nova.tnpsc.ui.components.NovaProgressBar
import com.nova.tnpsc.ui.components.StatusBadge
import com.nova.tnpsc.ui.theme.NovaInkMuted
import com.nova.tnpsc.ui.theme.NovaPrimary

@Composable
fun LearnScreen(navController: NavHostController) {
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
            Text(
                "Ten subjects, one path at a time. Mathematics is where you are building right now.",
                style = MaterialTheme.typography.bodyLarge,
                color = NovaInkMuted,
            )
            Spacer(Modifier.height(6.dp))
        }

        items(subjects) { subject ->
            NovaCard(
                modifier = Modifier.clickable { navController.navigate("learn/${subject.slug}") },
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.Top,
                ) {
                    Text(subject.name, style = MaterialTheme.typography.titleLarge)
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
