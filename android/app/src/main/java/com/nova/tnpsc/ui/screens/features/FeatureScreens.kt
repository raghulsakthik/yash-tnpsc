package com.nova.tnpsc.ui.screens.features

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.nova.tnpsc.TnpscApplication
import com.nova.tnpsc.data.features.*
import com.nova.tnpsc.ui.components.*
import com.nova.tnpsc.ui.theme.*
import com.nova.tnpsc.navigation.practiceRoute
import java.time.LocalDate
import kotlinx.coroutines.launch

@Composable
fun FeatureHub(nav: NavHostController) = FeaturePage("NOVA feature library", "Everything you can do on Web") {
    Text("The Android app uses the same backend and exposes the same learner capabilities.", color = NovaInkMuted)
    FeatureCard("🔖", "Bookmarks", "Saved questions and answers") { nav.navigate("bookmarks") }
    FeatureCard("🔔", "Notifications", "Achievements and learning nudges") { nav.navigate("notifications") }
    FeatureCard("✦", "Achievements", "Unlocked and upcoming milestones") { nav.navigate("achievements") }
    FeatureCard("↻", "Mistakes", "Review unresolved mistakes") { nav.navigate("mistakes") }
    FeatureCard("⌕", "Search", "Find topics, lessons and questions") { nav.navigate("search") }
    FeatureCard("◌", "Progress", "Activity calendar and topic status") { nav.navigate("progress") }
    FeatureCard("▣", "Weekly review", "Review the week's evidence") { nav.navigate("weekly-review") }
    FeatureCard("◆", "Milestones", "Streak and learning milestones") { nav.navigate("milestones") }
    FeatureCard("📝", "Notes", "Your own written study notes") { nav.navigate("notes") }
    FeatureCard("⭳", "Resources", "Real admin-uploaded downloadable files") { nav.navigate("resources") }
}

@Composable private fun FeatureCard(icon: String, title: String, body: String, onClick: () -> Unit) {
    NovaCard { Row(horizontalArrangement = Arrangement.spacedBy(14.dp), modifier = Modifier.fillMaxWidth()) { Text(icon, style = MaterialTheme.typography.headlineMedium); Column(Modifier.weight(1f)) { Text(title, fontWeight = FontWeight.SemiBold); Text(body, color = NovaInkMuted, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 4.dp)) }; TextButton(onClick = onClick) { Text("Open") } } }
}

@Composable fun BookmarksScreen(nav: NavHostController) {
    val app = LocalContext.current.applicationContext as TnpscApplication; var data by remember { mutableStateOf<BookmarksResponse?>(null) }; var error by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(Unit) { runCatching { app.featureApi.bookmarks() }.onSuccess { if (it.isSuccessful) data = it.body() else error = "Could not load bookmarks" }.onFailure { error = it.message } }
    FeaturePage("Saved for later", "Bookmarked questions") { error?.let { Text(it, color = NovaWarmAccent) }; if (data == null && error == null) Text("Loading…", color = NovaInkMuted); if (data?.bookmarks?.isEmpty() == true) Text("Nothing saved yet. Star a question during practice.", color = NovaInkMuted); data?.bookmarks?.forEach { b -> var revealed by remember(b.questionId) { mutableStateOf(false) }; NovaCard { Eyebrow(b.topicName); Text(b.prompt, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 8.dp)); if (revealed) { b.options.forEachIndexed { i, o -> Text("${('A'.code + i).toChar()}. $o", fontWeight = if (i == b.correctIndex) FontWeight.Bold else FontWeight.Normal, modifier = Modifier.padding(top = 4.dp)) }; b.explanation?.let { Text(it, color = NovaInkMuted, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 8.dp)) } } else TextButton(onClick = { revealed = true }) { Text("Show answer") }; Button(onClick = { nav.navigate(practiceRoute(b.topicId)) }) { Text("Practise this topic") } } } }
}

@Composable fun NotificationsScreen() {
    val app = LocalContext.current.applicationContext as TnpscApplication; var data by remember { mutableStateOf<NotificationsResponse?>(null) }; var error by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(Unit) { runCatching { app.featureApi.notifications() }.onSuccess { if (it.isSuccessful) data = it.body() else error = "Could not load notifications" }.onFailure { error = it.message } }
    FeaturePage("Notifications", "Everything, in one place") { error?.let { Text(it, color = NovaWarmAccent) }; if (data == null && error == null) Text("Loading…", color = NovaInkMuted); if (data?.items?.isEmpty() == true) Text("Nothing yet.", color = NovaInkMuted); data?.items?.forEach { n -> NovaCard { Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) { Text(n.icon, style = MaterialTheme.typography.headlineSmall); Column { Text(n.title, fontWeight = FontWeight.SemiBold); n.body?.let { Text(it, color = NovaInkMuted, modifier = Modifier.padding(top = 4.dp)) }; n.at?.let { Text(it, color = NovaInkMuted, style = MaterialTheme.typography.labelSmall, modifier = Modifier.padding(top = 6.dp)) } } } } } }
}

@Composable fun AchievementsScreen() {
    val app = LocalContext.current.applicationContext as TnpscApplication; var data by remember { mutableStateOf<AchievementsResponse?>(null) }; var error by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(Unit) { runCatching { app.featureApi.achievements() }.onSuccess { if (it.isSuccessful) data = it.body() else error = "Could not load achievements" }.onFailure { error = it.message } }
    FeaturePage("Achievements", "Evidence, not empty badges") { data?.let { Text("${it.unlockedCount} / ${it.totalCount} unlocked", color = NovaInkMuted) }; error?.let { Text(it, color = NovaWarmAccent) }; data?.achievements?.forEach { a -> NovaCard { Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) { Text(a.icon, style = MaterialTheme.typography.headlineMedium); Column { Text(a.name, fontWeight = FontWeight.SemiBold); Text(a.description, color = NovaInkMuted, modifier = Modifier.padding(top = 4.dp)); Text(if (a.unlocked) "UNLOCKED" else "IN PROGRESS", color = if (a.unlocked) NovaSuccess else NovaInkMuted, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.labelSmall, modifier = Modifier.padding(top = 8.dp)) } } } } }
}

@Composable fun MistakesScreen(nav: NavHostController) {
    val app = LocalContext.current.applicationContext as TnpscApplication; var q by remember { mutableStateOf<MistakeResponse?>(null) }; var error by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(Unit) { runCatching { app.featureApi.nextMistake() }.onSuccess { if (it.isSuccessful) q = it.body() else error = it.body()?.message ?: "No open mistakes right now" }.onFailure { error = it.message } }
    FeaturePage("Mistakes", "Fix the thing that went wrong") { error?.let { NovaCard { Text(it, color = NovaInkMuted) } }; q?.let { m -> NovaCard { Eyebrow(m.topicName ?: "Mistake review"); Text(m.prompt, style = MaterialTheme.typography.headlineSmall, modifier = Modifier.padding(vertical = 12.dp)); m.options.forEachIndexed { i, o -> OptionRow(('A'.code + i).toChar().toString(), o, OptionState.Default) {}; }; Button(onClick = { nav.navigate(practiceRoute(m.topicId, "MISTAKES")) }, modifier = Modifier.padding(top = 12.dp)) { Text("Open full review") } } } }
}

@Composable fun SearchScreen(nav: NavHostController) {
    val app = LocalContext.current.applicationContext as TnpscApplication; var query by remember { mutableStateOf("") }; var data by remember { mutableStateOf<SearchResponse?>(null) }; var error by remember { mutableStateOf<String?>(null) }
    FeaturePage("Search", "Topics, lessons and questions") { OutlinedTextField(query, { query = it }, label = { Text("Search") }, modifier = Modifier.fillMaxWidth(), singleLine = true); LaunchedEffect(query) { if (query.trim().length >= 2) { kotlinx.coroutines.delay(250); runCatching { app.featureApi.search(query.trim()) }.onSuccess { if (it.isSuccessful) data = it.body() else error = "Search failed" }.onFailure { error = it.message } } }; error?.let { Text(it, color = NovaWarmAccent) }; data?.topics?.forEach { t -> NovaCard { Text(t.name, fontWeight = FontWeight.SemiBold); Text("${t.subjectName} · ${t.chapterName}", color = NovaInkMuted); TextButton(onClick = { nav.navigate(practiceRoute(t.topicId)) }) { Text("Practise") } } }; data?.lessons?.forEach { l -> NovaCard { Text(l.title, fontWeight = FontWeight.SemiBold); Text(l.snippet, color = NovaInkMuted, modifier = Modifier.padding(top = 4.dp)); TextButton(onClick = { nav.navigate("lesson/${l.topicId}") }) { Text("Open lesson") } } }; data?.questions?.forEach { q -> NovaCard { Eyebrow(q.topicName); Text(q.prompt, modifier = Modifier.padding(top = 6.dp)) } } }
}

@Composable fun ProgressScreen() {
    val app = LocalContext.current.applicationContext as TnpscApplication; var calendar by remember { mutableStateOf<CalendarResponse?>(null) }; var status by remember { mutableStateOf<StatusBreakdownResponse?>(null) }; var day by remember { mutableStateOf<DayProgressResponse?>(null) }; var error by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(Unit) { runCatching { Triple(app.featureApi.calendar(), app.featureApi.statusBreakdown(), app.featureApi.day(LocalDate.now().toString())) }.onSuccess { (c,s,d) -> calendar=c.body(); status=s.body(); day=d.body() }.onFailure { error=it.message } }
    FeaturePage("Progress", "Your real activity and topic status") { error?.let { Text(it, color=NovaWarmAccent) }; day?.let { NovaCard { Eyebrow("Today"); Text("${it.totalQuestions} questions · ${it.correctCount} correct", style=MaterialTheme.typography.headlineSmall); it.topics.forEach { t -> Text("${t.topicName}: ${t.correct}/${t.attempts}", color=NovaInkMuted, modifier=Modifier.padding(top=6.dp)) } } }; status?.let { NovaCard { Eyebrow("Topic status"); it.breakdown.forEach { s -> Row(Modifier.fillMaxWidth().padding(vertical=5.dp), horizontalArrangement=Arrangement.SpaceBetween) { Text(s.status); Text(s.count.toString(), fontWeight=FontWeight.Bold) } } } }; calendar?.let { NovaCard { Eyebrow("Activity calendar"); Text("${it.year}-${it.month.toString().padStart(2,'0')}", fontWeight=FontWeight.Bold, modifier=Modifier.padding(top=8.dp)); Text("${it.days.count { d -> d.count > 0 }} active days · ${it.days.sumOf { d -> d.count }} questions", color=NovaInkMuted, modifier=Modifier.padding(top=4.dp)); it.days.takeLast(14).forEach { d -> Text("${d.date}: ${d.count}", color=NovaInkMuted, style=MaterialTheme.typography.bodySmall) } } } }
}

@Composable fun WeeklyReviewScreen() {
    val app = LocalContext.current.applicationContext as TnpscApplication
    var analytics by remember { mutableStateOf<com.nova.tnpsc.data.platform.AnalyticsResponse?>(null) }
    var readiness by remember { mutableStateOf<com.nova.tnpsc.data.platform.ReadinessResponse?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(Unit) { runCatching { Pair(app.platformApi.analytics(), app.platformApi.readiness()) }.onSuccess { (a,r) -> analytics=a.body(); readiness=r.body() }.onFailure { error=it.message } }
    FeaturePage("Weekly review", "Evidence from the same learning system") {
        error?.let { Text(it, color=NovaWarmAccent) }
        analytics?.let { a -> NovaCard { Eyebrow("This week"); Text("${(a.accuracy*100).toInt()}% accuracy", style=MaterialTheme.typography.headlineMedium); Text("${a.attempts} attempts · ${a.studyMinutes} study minutes · ${a.streak} day streak", color=NovaInkMuted, modifier=Modifier.padding(top=6.dp)) } }
        readiness?.let { r -> NovaCard { Eyebrow("Readiness"); Text("${(r.readiness*100).toInt()}%", style=MaterialTheme.typography.displaySmall); r.probability?.let { Text("Estimated pass probability: ${(it*100).toInt()}%", color=NovaInkMuted) }; if (r.weakTopics.isNotEmpty()) { Text("Focus next", fontWeight=FontWeight.SemiBold, modifier=Modifier.padding(top=12.dp)); r.weakTopics.take(5).forEach { Text("• $it", color=NovaInkMuted, modifier=Modifier.padding(top=4.dp)) } } } }
    }
}

@Composable fun MilestonesScreen() { val app=LocalContext.current.applicationContext as TnpscApplication; var p by remember { mutableStateOf<com.nova.tnpsc.data.profile.ProfileResponse?>(null) }; LaunchedEffect(Unit){ p=app.profileApi.get().body() }; FeaturePage("Milestones", "Streaks and meaningful progress") { NovaCard { NovaStat(p?.streak?.toString() ?: "—", "current streak", NovaWarmAccent); Spacer(Modifier.height(12.dp)); NovaStat(p?.longestStreak?.toString() ?: "—", "longest streak"); Text("Milestones are based on real sessions and learning evidence, not app opens.", color=NovaInkMuted, modifier=Modifier.padding(top=12.dp)) }; NovaCard { NovaStat(p?.questionsSolved?.toString() ?: "—", "questions solved"); Spacer(Modifier.height(12.dp)); NovaStat(p?.topicsMastered?.toString() ?: "—", "topics mastered"); Spacer(Modifier.height(12.dp)); NovaStat(p?.testsCompleted?.toString() ?: "—", "tests completed") } } }

@Composable fun NotesScreen() {
    val app = LocalContext.current.applicationContext as TnpscApplication
    val scope = rememberCoroutineScope()
    var notes by remember { mutableStateOf<List<NoteItem>>(emptyList()) }
    var error by remember { mutableStateOf<String?>(null) }
    var title by remember { mutableStateOf("") }
    var content by remember { mutableStateOf("") }
    var saving by remember { mutableStateOf(false) }

    fun reload() { scope.launch { runCatching { app.featureApi.notes() }.onSuccess { if (it.isSuccessful) notes = it.body()?.notes ?: emptyList() else error = "Could not load notes" }.onFailure { error = it.message } } }
    LaunchedEffect(Unit) { reload() }

    FeaturePage("Your notes", "Real notes, saved against your account") {
        error?.let { Text(it, color = NovaWarmAccent) }
        NovaCard {
            Eyebrow("New note")
            OutlinedTextField(value = title, onValueChange = { title = it }, label = { Text("Title") }, singleLine = true, modifier = Modifier.fillMaxWidth().padding(top = 8.dp))
            OutlinedTextField(value = content, onValueChange = { content = it }, label = { Text("Content") }, modifier = Modifier.fillMaxWidth().padding(top = 8.dp))
            Button(
                onClick = {
                    if (title.isBlank() || content.isBlank() || saving) return@Button
                    saving = true
                    scope.launch {
                        runCatching { app.featureApi.createNote(CreateNoteRequest(title = title.trim(), content = content.trim())) }
                            .onSuccess { if (it.isSuccessful) { title = ""; content = ""; reload() } else error = it.body()?.message ?: "Could not save note" }
                            .onFailure { error = it.message }
                        saving = false
                    }
                },
                modifier = Modifier.padding(top = 12.dp),
            ) { Text(if (saving) "Saving…" else "Save note") }
        }
        if (notes.isEmpty() && error == null) Text("No notes yet. Write your first one above.", color = NovaInkMuted)
        notes.forEach { n ->
            NovaCard {
                Text(n.title, fontWeight = FontWeight.SemiBold)
                Text(n.content, color = NovaInkMuted, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 6.dp))
                Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth().padding(top = 8.dp)) {
                    Text(n.date, color = NovaInkMuted, style = MaterialTheme.typography.labelSmall)
                    TextButton(onClick = { scope.launch { runCatching { app.featureApi.deleteNote(n.id) }.onSuccess { reload() } } }) { Text("Delete") }
                }
            }
        }
    }
}

@Composable fun ResourcesScreen() {
    val context = LocalContext.current
    val app = context.applicationContext as TnpscApplication
    val scope = rememberCoroutineScope()
    var resources by remember { mutableStateOf<List<ResourceItem>>(emptyList()) }
    var error by remember { mutableStateOf<String?>(null) }
    var downloadingId by remember { mutableStateOf<String?>(null) }
    var status by remember { mutableStateOf<String?>(null) }
    var pendingDownload by remember { mutableStateOf<ResourceItem?>(null) }

    val permissionLauncher = androidx.activity.compose.rememberLauncherForActivityResult(
        androidx.activity.result.contract.ActivityResultContracts.RequestPermission()
    ) { granted ->
        val r = pendingDownload
        pendingDownload = null
        if (granted && r != null) {
            scope.launch { downloadResource(app, context, r) { downloadingId = it }.let { status = it } }
        } else if (r != null) {
            status = "Storage permission is needed to save the file."
        }
    }

    fun beginDownload(r: ResourceItem) {
        if (android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.Q &&
            androidx.core.content.ContextCompat.checkSelfPermission(context, android.Manifest.permission.WRITE_EXTERNAL_STORAGE) != android.content.pm.PackageManager.PERMISSION_GRANTED
        ) {
            pendingDownload = r
            permissionLauncher.launch(android.Manifest.permission.WRITE_EXTERNAL_STORAGE)
            return
        }
        scope.launch { status = downloadResource(app, context, r) { downloadingId = it } }
    }

    LaunchedEffect(Unit) {
        runCatching { app.featureApi.resources() }
            .onSuccess { if (it.isSuccessful) resources = it.body()?.resources ?: emptyList() else error = "Could not load resources" }
            .onFailure { error = it.message }
    }

    FeaturePage("Resources", "Real files uploaded by an admin") {
        error?.let { Text(it, color = NovaWarmAccent) }
        status?.let { Text(it, color = NovaInkMuted, modifier = Modifier.padding(bottom = 4.dp)) }
        if (resources.isEmpty() && error == null) Text("No resources have been uploaded yet.", color = NovaInkMuted)
        resources.forEach { r ->
            NovaCard {
                Text(r.title, fontWeight = FontWeight.SemiBold)
                r.description?.let { Text(it, color = NovaInkMuted, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 4.dp)) }
                Text("${r.category} · ${r.sizeBytes / 1024} KB", color = NovaInkMuted, style = MaterialTheme.typography.labelSmall, modifier = Modifier.padding(top = 4.dp))
                Button(onClick = { beginDownload(r) }, enabled = downloadingId != r.id, modifier = Modifier.padding(top = 8.dp)) {
                    Text(if (downloadingId == r.id) "Downloading…" else "Download")
                }
            }
        }
    }
}

private suspend fun downloadResource(app: TnpscApplication, context: android.content.Context, r: ResourceItem, setDownloading: (String?) -> Unit): String {
    setDownloading(r.id)
    return try {
        val response = app.featureApi.downloadResource(r.id)
        val body = response.body()
        if (!response.isSuccessful || body == null) {
            "Download failed."
        } else {
            val saved = com.nova.tnpsc.data.features.ResourceDownloader.save(context, body, r.title, r.contentType.ifBlank { "application/octet-stream" })
            if (saved) "Saved \"${r.title}\" to Downloads." else "Could not save the file."
        }
    } catch (e: Exception) {
        e.message ?: "Download failed."
    } finally {
        setDownloading(null)
    }
}

@Composable private fun FeaturePage(eyebrow: String, title: String, content: @Composable ColumnScope.() -> Unit) { Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background).verticalScroll(rememberScrollState()).padding(20.dp), verticalArrangement=Arrangement.spacedBy(12.dp)) { Eyebrow(eyebrow); Text(title, style=MaterialTheme.typography.displaySmall, modifier=Modifier.padding(top=8.dp)); content() } }
