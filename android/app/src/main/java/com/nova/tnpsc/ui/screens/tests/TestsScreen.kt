package com.nova.tnpsc.ui.screens.tests

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.nova.tnpsc.TnpscApplication
import com.nova.tnpsc.data.tests.CreateTestRequest
import com.nova.tnpsc.ui.components.Eyebrow
import com.nova.tnpsc.ui.components.NovaCard
import com.nova.tnpsc.ui.theme.NovaInkMuted
import com.nova.tnpsc.ui.theme.NovaWarmAccent
import com.nova.tnpsc.ui.theme.NovaWarmTint
import kotlinx.coroutines.launch

/**
 * Entry point for the real weekly test -- 25 questions across the examined
 * topics (same generator as the web app's default). Starting a test
 * creates a real `test` row server-side via POST /api/tests.
 */
@Composable
fun TestsScreen(navController: NavHostController) {
    val app = LocalContext.current.applicationContext as TnpscApplication
    var starting by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    LazyColumn(
        modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background),
        contentPadding = PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            Eyebrow("Tests")
            Spacer(Modifier.height(10.dp))
            Text("Find out where you stand", style = MaterialTheme.typography.displayLarge)
            Spacer(Modifier.height(10.dp))
            Text(
                "25 questions across the full syllabus, no negative marking, nothing revealed until you submit.",
                color = NovaInkMuted,
            )
        }

        if (error != null) {
            item { NovaCard(background = NovaWarmTint, border = NovaWarmAccent) { Text(error!!) } }
        }

        item {
            NovaCard {
                Text("Weekly test", style = MaterialTheme.typography.headlineMedium)
                Spacer(Modifier.height(10.dp))
                Button(
                    enabled = !starting,
                    onClick = {
                        starting = true
                        error = null
                        scope.launch {
                            try {
                                val res = app.testsApi.create(CreateTestRequest())
                                val body = res.body()
                                if (res.isSuccessful && body != null) {
                                    navController.navigate("tests/${body.testId}")
                                } else {
                                    error = body?.message ?: "Could not start a test"
                                }
                            } catch (e: Exception) {
                                error = e.message ?: "Could not reach the server"
                            } finally {
                                starting = false
                            }
                        }
                    },
                ) { Text(if (starting) "Starting…" else "Begin test") }
            }
        }
    }
}
