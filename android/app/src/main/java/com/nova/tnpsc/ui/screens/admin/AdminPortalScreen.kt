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
import kotlinx.coroutines.launch

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

            if (activeSlug != "notifications") {
                item {
                    NovaCard(background = NovaWarmTint, border = NovaWarmAccent) {
                        Text(
                            "Design preview: ${activeSection.title}'s data is local/mock, not yet wired to the real backend -- same disclosure the web admin portal shows for most sections.",
                            color = NovaWarmAccent,
                            style = MaterialTheme.typography.bodySmall,
                        )
                    }
                }
            }

            when (activeSlug) {
                "dashboard" -> item { DashboardBody() }
                "learners" -> items(MOCK_LEARNERS) { LearnerRowCard(it) }
                "notifications" -> item { NotificationsAdminBody() }
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

/**
 * Mirrors NotificationsAdminView in GenericAdminViews.tsx -- the one admin
 * section with a real "send": POST /api/admin/notifications/broadcast fans
 * the message out to every real learner account as a real
 * /api/notifications feed entry plus a best-effort push, instead of only
 * updating local state.
 */
@Composable
private fun NotificationsAdminBody() {
    val context = androidx.compose.ui.platform.LocalContext.current
    val app = context.applicationContext as com.nova.tnpsc.TnpscApplication
    val scope = androidx.compose.runtime.rememberCoroutineScope()

    var title by remember { mutableStateOf("") }
    var message by remember { mutableStateOf("") }
    var sending by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var history by remember { mutableStateOf<List<com.nova.tnpsc.data.admin.AdminBroadcastItem>>(emptyList()) }

    fun refresh() {
        scope.launch {
            runCatching { app.adminNotificationsApi.broadcasts() }
                .onSuccess { if (it.isSuccessful) history = it.body()?.broadcasts ?: emptyList() }
        }
    }

    androidx.compose.runtime.LaunchedEffect(Unit) { refresh() }

    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        NovaCard {
            Text("Dispatch announcement", fontWeight = FontWeight.SemiBold)
            Text("Reaches every real learner account -- a real feed entry plus a best-effort push.", color = NovaInkMuted, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 4.dp, bottom = 10.dp))
            androidx.compose.material3.OutlinedTextField(value = title, onValueChange = { title = it; error = null }, label = { Text("Notification title") }, singleLine = true, modifier = Modifier.fillMaxWidth())
            androidx.compose.foundation.layout.Spacer(Modifier.padding(top = 10.dp))
            androidx.compose.material3.OutlinedTextField(value = message, onValueChange = { message = it; error = null }, label = { Text("Message body") }, modifier = Modifier.fillMaxWidth())
            error?.let { Text(it, color = NovaWarmAccent, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 8.dp)) }
            androidx.compose.material3.Button(
                enabled = !sending,
                onClick = {
                    if (title.isBlank() || message.isBlank()) { error = "Title and message are required."; return@Button }
                    sending = true
                    scope.launch {
                        runCatching { app.adminNotificationsApi.sendBroadcast(com.nova.tnpsc.data.admin.AdminBroadcastRequest(title.trim(), message.trim())) }
                            .onSuccess {
                                if (it.isSuccessful) { title = ""; message = ""; refresh() }
                                else error = it.body()?.message ?: "Could not send this notification"
                            }
                            .onFailure { error = it.message }
                        sending = false
                    }
                },
                modifier = Modifier.padding(top = 12.dp),
            ) { Text(if (sending) "Sending…" else "Dispatch broadcast") }
        }

        Text("Broadcast history (${history.size})", fontWeight = FontWeight.SemiBold)
        if (history.isEmpty()) {
            Text("Nothing sent yet.", color = NovaInkMuted)
        }
        history.forEach { b ->
            NovaCard {
                Text(b.title, fontWeight = FontWeight.SemiBold)
                Text(b.message, color = NovaInkMuted, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 4.dp))
                Text("${b.recipientCount} recipient(s) · ${b.targetAudience}", color = NovaInkMuted, style = MaterialTheme.typography.labelSmall, modifier = Modifier.padding(top = 6.dp))
            }
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
