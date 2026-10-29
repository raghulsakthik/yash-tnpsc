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
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.RadioButtonUnchecked
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
import com.nova.tnpsc.data.courses.CourseLesson
import com.nova.tnpsc.ui.components.Eyebrow
import com.nova.tnpsc.ui.components.NovaCard
import com.nova.tnpsc.ui.components.NovaProgressBar
import com.nova.tnpsc.ui.theme.NovaInkMuted
import com.nova.tnpsc.ui.theme.NovaSuccess
import com.nova.tnpsc.ui.theme.NovaWarmAccent
import com.nova.tnpsc.ui.theme.NovaWarmTint

/** The lesson list for one chapter -- mirrors the syllabus tab of CourseModal.tsx/web's chapter detail. */
@Composable
fun CourseDetailScreen(chapterId: String, nav: NavHostController) {
    val app = LocalContext.current.applicationContext as TnpscApplication
    var chapter by remember { mutableStateOf<CourseChapter?>(null) }
    var subjectName by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(chapterId) {
        runCatching { app.coursesApi.courses() }
            .onSuccess { response ->
                val body = response.body()
                if (response.isSuccessful && body != null) {
                    val found = body.subjects.firstNotNullOfOrNull { subject ->
                        subject.chapters.find { it.id == chapterId }?.let { subject.name to it }
                    }
                    if (found != null) {
                        subjectName = found.first
                        chapter = found.second
                    } else {
                        error = "Chapter not found"
                    }
                } else {
                    error = body?.message ?: "Could not load this chapter"
                }
            }
            .onFailure { error = it.message }
    }

    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        error?.let {
            NovaCard(background = NovaWarmTint, border = NovaWarmAccent, modifier = Modifier.padding(20.dp)) { Text(it) }
        }

        val c = chapter
        if (c == null && error == null) {
            Text("Loading…", color = NovaInkMuted, modifier = Modifier.padding(20.dp))
        }

        if (c != null) {
            Column(Modifier.fillMaxWidth().padding(20.dp, 20.dp, 20.dp, 8.dp)) {
                Eyebrow(subjectName)
                Text(c.name, style = MaterialTheme.typography.displaySmall)
                Row(Modifier.fillMaxWidth().padding(top = 10.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("${c.lessons.size} lessons", color = NovaInkMuted, style = MaterialTheme.typography.bodySmall)
                    Text("${c.completion}% complete", color = NovaInkMuted, style = MaterialTheme.typography.bodySmall)
                }
                NovaProgressBar(value = c.completion, modifier = Modifier.padding(top = 8.dp))
            }

            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(20.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                items(c.lessons, key = { it.id }) { lesson ->
                    LessonRow(lesson) { nav.navigate("lesson/${lesson.id}") }
                }
            }
        }
    }
}

@Composable
private fun LessonRow(lesson: CourseLesson, onOpen: () -> Unit) {
    val isComplete = lesson.completion >= 100
    NovaCard {
        Row(Modifier.fillMaxWidth(), verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
            Icon(
                if (isComplete) Icons.Filled.CheckCircle else Icons.Filled.RadioButtonUnchecked,
                contentDescription = null,
                tint = if (isComplete) NovaSuccess else NovaInkMuted,
            )
            Column(Modifier.weight(1f).padding(start = 12.dp)) {
                Text(lesson.title, fontWeight = FontWeight.SemiBold)
                Text("${lesson.completedUnits} of ${lesson.totalUnits} units · ${lesson.completion}%", color = NovaInkMuted, style = MaterialTheme.typography.labelSmall, modifier = Modifier.padding(top = 2.dp))
            }
            Button(onClick = onOpen) { Text("Open") }
        }
    }
}
