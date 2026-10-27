package com.nova.tnpsc.ui.screens.admin

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.nova.tnpsc.ui.components.Eyebrow
import com.nova.tnpsc.ui.components.NovaCard
import com.nova.tnpsc.ui.components.NovaStat
import com.nova.tnpsc.ui.theme.NovaInkMuted
import com.nova.tnpsc.ui.theme.NovaPrimary
import com.nova.tnpsc.ui.theme.NovaWarmAccent
import com.nova.tnpsc.ui.theme.NovaWarmTint

/**
 * Mirrors .nova-zip-ui/src/components/admin/AdminPortal.tsx: same nav
 * sections, same role simulator, same "this section's data is local/mock"
 * disclosure the web admin portal already carries for most of its views
 * (see AdminPortal.tsx's own comment on that). Dashboard and Learners show
 * the web's real seed data (Yashika) so both platforms preview identically;
 * every other section renders a representative list under the same banner
 * rather than silently differing from the web shell.
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun AdminPortalScreen(sessionRole: String, onReturnToLearnerHub: () -> Unit) {
    var role by remember {
        mutableStateOf(if (sessionRole == "SUPER_ADMIN") AdminRole.SUPER_ADMIN else AdminRole.ADMIN)
    }
    var activeSlug by remember { mutableStateOf("dashboard") }

    val sections = remember(role) { visibleSectionsFor(role) }
    val activeSection = sections.firstOrNull { it.slug == activeSlug } ?: sections.first().also { activeSlug = it.slug }

    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        Column(Modifier.fillMaxWidth().padding(20.dp, 20.dp, 20.dp, 8.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Column {
                    Eyebrow("Admin Portal")
                    Text("YASH Admin", style = MaterialTheme.typography.displaySmall)
                }
                TextButton(onClick = onReturnToLearnerHub) { Text("Exit") }
            }

            Text(
                "Role simulator -- same as the web portal's role switcher, seeded from your real session role ($sessionRole).",
                color = NovaInkMuted,
                style = MaterialTheme.typography.bodySmall,
                modifier = Modifier.padding(top = 12.dp),
            )
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 8.dp)) {
                AdminRole.entries.forEach { r ->
                    FilterChip(selected = role == r, onClick = { role = r }, label = { Text(r.label) })
                }
            }
        }

        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = androidx.compose.foundation.layout.PaddingValues(20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            item {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    sections.groupBy { it.category }.forEach { (category, items) ->
                        Eyebrow(category)
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            items.forEach { section ->
                                SectionChip(section, selected = section.slug == activeSlug) { activeSlug = section.slug }
                            }
                        }
                    }
                }
            }

            item {
                NovaCard(background = NovaWarmTint, border = NovaWarmAccent) {
                    Text(
                        "Design preview: ${activeSection.title}'s data is local/mock, not yet wired to the real backend -- same disclosure the web admin portal shows for most sections.",
                        color = NovaWarmAccent,
                        style = MaterialTheme.typography.bodySmall,
                    )
                }
            }

            when (activeSlug) {
                "dashboard" -> item { DashboardBody() }
                "learners" -> items(MOCK_LEARNERS) { LearnerRowCard(it) }
                else -> {
                    val rows = MOCK_SECTION_ROWS[activeSlug] ?: emptyList()
                    if (rows.isEmpty()) {
                        item { NovaCard { Text("Nothing to show yet for ${activeSection.title}.", color = NovaInkMuted) } }
                    } else {
                        items(rows) { row ->
                            NovaCard {
                                Text(row.title, fontWeight = FontWeight.SemiBold)
                                if (row.subtitle.isNotBlank()) Text(row.subtitle, color = NovaInkMuted, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 4.dp))
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SectionChip(section: AdminNavSection, selected: Boolean, onClick: () -> Unit) {
    FilterChip(
        selected = selected,
        onClick = onClick,
        label = { Text("${section.icon} ${section.title}" + (section.badge?.let { " · $it" } ?: "")) },
    )
}

@Composable
private fun DashboardBody() {
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        NovaCard {
            Text("Overview", fontWeight = FontWeight.SemiBold)
            Row(Modifier.fillMaxWidth().padding(top = 12.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                DASHBOARD_STATS.forEach { stat -> NovaStat(stat.value, stat.label) }
            }
        }
        NovaCard {
            Text("Recent activity", fontWeight = FontWeight.SemiBold)
            Text("Yashika completed Weekly Mock #5 -- score 68/100.", color = NovaInkMuted, modifier = Modifier.padding(top = 8.dp))
            Text("Content Admin published \"The Preamble\" lesson.", color = NovaInkMuted, modifier = Modifier.padding(top = 4.dp))
        }
    }
}

@Composable
private fun LearnerRowCard(learner: AdminLearnerRow) {
    NovaCard {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Column {
                Text(learner.name, fontWeight = FontWeight.SemiBold)
                Text(learner.handle, color = NovaInkMuted, style = MaterialTheme.typography.bodySmall)
            }
            Column(horizontalAlignment = androidx.compose.ui.Alignment.End) {
                Text("Phase ${learner.phase}", color = NovaPrimary, fontWeight = FontWeight.SemiBold)
                Text(learner.status, color = NovaInkMuted, style = MaterialTheme.typography.labelSmall)
            }
        }
    }
}
