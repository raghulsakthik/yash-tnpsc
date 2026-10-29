package com.nova.tnpsc.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.SystemUpdate
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.nova.tnpsc.data.update.AndroidVersionInfo
import com.nova.tnpsc.ui.theme.NovaPrimary

/**
 * Shown when GET /api/app/version reports a versionCode newer than this
 * install's BuildConfig.VERSION_CODE. There's no in-app updater or Play
 * Store listing yet, so "update" opens the real download page (the GitHub
 * release) in a browser rather than claiming a one-tap install that
 * doesn't exist.
 */
@Composable
fun UpdateAvailableBanner(info: AndroidVersionInfo, onDismiss: () -> Unit) {
    val context = LocalContext.current
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .windowInsetsPadding(WindowInsets.statusBars)
            .background(NovaPrimary)
            .padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Icon(Icons.Filled.SystemUpdate, contentDescription = null, tint = androidx.compose.ui.graphics.Color.White)
        Column(Modifier.weight(1f)) {
            Text("Update available: v${info.versionName}", color = androidx.compose.ui.graphics.Color.White, fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.bodyMedium)
            if (info.notes.isNotBlank()) {
                Text(info.notes, color = androidx.compose.ui.graphics.Color.White.copy(alpha = 0.85f), style = MaterialTheme.typography.labelSmall)
            }
        }
        TextButton(onClick = {
            if (info.url.isNotBlank()) {
                context.startActivity(android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(info.url)))
            }
        }) { Text("Get it", color = androidx.compose.ui.graphics.Color.White, fontWeight = FontWeight.Bold) }
        IconButton(onClick = onDismiss) {
            Icon(Icons.Filled.Close, contentDescription = "Dismiss", tint = androidx.compose.ui.graphics.Color.White)
        }
    }
}
