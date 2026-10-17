package com.nova.tnpsc

import android.Manifest
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import com.nova.tnpsc.navigation.NovaApp
import com.nova.tnpsc.push.ensureNotificationChannel
import com.nova.tnpsc.ui.theme.NovaTheme

class MainActivity : ComponentActivity() {

    private val requestNotificationPermission =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { /* no-op either way -- push just won't show without it */ }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        ensureNotificationChannel(this)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            requestNotificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
        }

        val app = application as TnpscApplication

        setContent {
            NovaTheme {
                NovaApp(
                    authRepository = app.authRepository,
                    onLoggedIn = suspend { app.fcmTokenRegistrar.registerCurrentToken(this) },
                )
            }
        }
    }
}
