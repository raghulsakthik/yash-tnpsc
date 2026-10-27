package com.nova.tnpsc.ui.screens.courses

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.nova.tnpsc.TnpscApplication
import com.nova.tnpsc.data.courses.CourseChapter
import com.nova.tnpsc.data.courses.CoursesResponse
import com.nova.tnpsc.ui.components.Eyebrow
import com.nova.tnpsc.ui.components.NovaCard
import com.nova.tnpsc.ui.components.NovaProgressBar
import com.nova.tnpsc.ui.theme.NovaInkMuted
import com.nova.tnpsc.ui.theme.NovaPrimary
import com.nova.tnpsc.ui.theme.NovaWarmAccent
import com.nova.tnpsc.ui.theme.NovaWarmTint

/**
 * Mirrors .nova-zip-ui/src/components/CoursesView.tsx -- the real web
 * Courses view (GET /api/courses), browsable by subject and search, one
 * card per curriculum chapter. Opening a chapter (CourseDetailScreen)
 * lists its lessons; opening a lesson reuses the existing LessonScreen
 * (same /api/lesson/:topic content + "Practice this now" the web's
 * StructuredLessonPlayerModal also drives its Learn/Practice tabs from).
 * The web modal's extra PYQ and Assessment sub-tabs, and its separate
 * confetti-driven step-completion UI, are not ported in this pass.
 */
@Composable
fun CoursesScreen(nav: NavHostController) {
    val app = LocalContext.current.applicationContext as TnpscApplication
    var data by remember { mutableStateOf<CoursesResponse?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var subjectFilter by remember { mutableStateOf("All") }
    var query by remember { mutableStateOf("") }

    LaunchedEffect(Unit) {
        runCatching { app.coursesApi.courses() }
            .onSuccess { if (it.isSuccessful) data = it.body() else error = it.body()?.message ?: "Could not load courses" }
            .onFailure { error = it.message }
    }

    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        Column(Modifier.fillMaxWidth().padding(20.dp, 20.dp, 20.dp, 8.dp)) {
            Eyebrow("Courses")
            Text("Your TNPSC curriculum", style = MaterialTheme.typography.displaySmall)

            data?.let { d ->
                Row(Modifier.fillMaxWidth().padding(top = 12.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("${d.overallCompletion}% complete", color = NovaPrimary, fontWeight = FontWeight.SemiBold)
                    Text("${d.completedUnits} / ${d.totalUnits} units", color = NovaInkMuted, style = MaterialTheme.typography.bodySmall)
                }
                NovaProgressBar(value = d.overallCompletion, modifier = Modifier.padding(top = 8.dp))
            }

            OutlinedTextField(
                value = query,
                onValueChange = { query = it },
                label = { Text("Search chapters") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth().padding(top = 14.dp),
            )

            data?.let { d ->
                val subjectNames = listOf("All") + d.subjects.map { it.name }
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.padding(top = 10.dp),
                ) {
                    subjectNames.take(4).forEach { name ->
                        FilterChip(selected = subjectFilter == name, onClick = { subjectFilter = name }, label = { Text(name) })
                    }
                }
            }
        }

        error?.let {
            NovaCard(background = NovaWarmTint, border = NovaWarmAccent, modifier = Modifier.padding(horizontal = 20.dp)) { Text(it) }
        }

        val d = data
        if (d == null && error == null) {
            Text("Loading…", color = NovaInkMuted, modifier = Modifier.padding(20.dp))
        }

        if (d != null) {
            val rows = d.subjects
                .filter { subjectFilter == "All" || it.name == subjectFilter }
                .flatMap { subject -> subject.chapters.map { subject.name to it } }
                .filter { (_, chapter) -> query.isBlank() || chapter.name.contains(query, ignoreCase = true) }

            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(20.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                if (rows.isEmpty()) {
                    item { Text("No chapters match this filter.", color = NovaInkMuted) }
                }
                items(rows, key = { it.second.id }) { (subjectName, chapter) ->
                    ChapterCard(subjectName, chapter) { nav.navigate("course/${chapter.id}") }
                }
            }
        }
    }
}

@Composable
private fun ChapterCard(subjectName: String, chapter: CourseChapter, onOpen: () -> Unit) {
    NovaCard {
        Eyebrow(subjectName)
        Text(chapter.name, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 6.dp))
        Text("${chapter.lessons.size} lessons · ${chapter.completion}% complete", color = NovaInkMuted, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 4.dp))
        NovaProgressBar(value = chapter.completion, modifier = Modifier.padding(top = 10.dp))
        Button(onClick = onOpen, modifier = Modifier.padding(top = 10.dp)) { Text("Open chapter") }
    }
}
