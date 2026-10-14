package com.nova.tnpsc

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.nova.tnpsc.navigation.NovaApp
import com.nova.tnpsc.ui.theme.NovaTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            NovaTheme {
                NovaApp()
            }
        }
    }
}
