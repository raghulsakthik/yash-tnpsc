package com.nova.tnpsc.ui.screens.quicklab

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
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
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.nova.tnpsc.TnpscApplication
import com.nova.tnpsc.data.quicklab.QuickLabMode
import com.nova.tnpsc.ui.components.Eyebrow
import com.nova.tnpsc.ui.components.NovaCard
import com.nova.tnpsc.ui.theme.NovaInkMuted
import com.nova.tnpsc.ui.theme.NovaWarmAccent
import com.nova.tnpsc.ui.theme.NovaWarmTint

/**
 * Lists the real, currently-enabled Quick Lab modes (GET /api/quick-lab/modes)
 * -- toggling a mode off, or editing its name/description, in
 * /admin/quicklab shows up here on next load, same list the web app reads.
 */
@Composable
fun QuickLabScreen(navController: NavHostController) {
    val app = LocalContext.current.applicationContext as TnpscApplication
    var modes by remember { mutableStateOf<List<QuickLabMode>?>(null) }
    var error by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        try {
            val res = app.quickLabApi.modes()
            if (res.isSuccessful) modes = res.body()?.modes ?: emptyList()
            else error = "Could not load Quick Lab modes"
        } catch (e: Exception) {
            error = e.message ?: "Could not reach the server"
        }
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background),
        contentPadding = PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Eyebrow("Quick Lab")
            Spacer(Modifier.height(10.dp))
            Text("Two minutes, sharper arithmetic", style = MaterialTheme.typography.displayLarge)
            Spacer(Modifier.height(10.dp))
            Text(
                "Every round generates fresh questions -- 10 questions, timed, scored.",
                color = NovaInkMuted,
                style = MaterialTheme.typography.bodyMedium,
            )
        }

        if (error != null) {
            item { NovaCard(background = NovaWarmTint, border = NovaWarmAccent) { Text(error!!) } }
        } else if (modes == null) {
            item { Text("Loading…", color = NovaInkMuted) }
        } else {
            items(modes!!, key = { it.slug }) { mode ->
                NovaCard(
                    border = if (mode.recommended) NovaWarmAccent else null,
                    modifier = Modifier.clickable { navController.navigate("quicklab/${mode.slug}") },
                ) {
                    Text(mode.name, fontWeight = FontWeight.SemiBold)
                    Spacer(Modifier.height(6.dp))
                    Text(mode.desc, color = NovaInkMuted, style = MaterialTheme.typography.bodySmall)
                }
            }
        }
    }
}
