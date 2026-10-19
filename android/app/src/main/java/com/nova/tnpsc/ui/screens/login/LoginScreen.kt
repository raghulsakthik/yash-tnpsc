package com.nova.tnpsc.ui.screens.login

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.nova.tnpsc.data.auth.AuthRepository
import com.nova.tnpsc.data.auth.LoginResult
import com.nova.tnpsc.ui.theme.NovaInkMuted
import com.nova.tnpsc.ui.theme.NovaPrimary
import com.nova.tnpsc.ui.theme.NovaWarmAccent
import kotlinx.coroutines.launch

/**
 * Real login against POST /api/auth/login -- the same three account
 * roles (learner / test / admin) the web app's /login page uses. On
 * success, AuthRepository's state flips to LoggedIn and NovaApp swaps
 * this screen out for the main bottom-nav graph.
 */
@Composable
fun LoginScreen(authRepository: AuthRepository) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var submitting by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            // This screen renders outside MainNavHost's Scaffold (no auth
            // session yet to gate on), so it doesn't inherit that fix for
            // enableEdgeToEdge() -- without its own safeDrawing padding, a
            // tall keyboard-open layout or a small-screen device can still
            // push content under the status/nav bars here specifically.
            .windowInsetsPadding(WindowInsets.safeDrawing)
            .padding(horizontal = 24.dp),
        verticalArrangement = Arrangement.Center,
    ) {
        Text("WELCOME BACK", color = NovaInkMuted, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
        Text(
            "Good to see you.",
            fontSize = 28.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(top = 8.dp, bottom = 24.dp),
        )

        OutlinedTextField(
            value = email,
            onValueChange = { email = it; error = null },
            label = { Text("Email") },
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
            modifier = Modifier.fillMaxWidth(),
        )
        androidx.compose.foundation.layout.Spacer(Modifier.padding(top = 12.dp))
        OutlinedTextField(
            value = password,
            onValueChange = { password = it; error = null },
            label = { Text("Password") },
            singleLine = true,
            visualTransformation = PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
            modifier = Modifier.fillMaxWidth(),
        )

        error?.let {
            Text(it, color = NovaWarmAccent, fontSize = 13.sp, modifier = Modifier.padding(top = 12.dp))
        }

        Button(
            onClick = {
                if (email.isBlank() || password.isBlank() || submitting) return@Button
                submitting = true
                error = null
                scope.launch {
                    when (val result = authRepository.login(email.trim(), password)) {
                        is LoginResult.Success -> Unit // AuthRepository.state flip drives navigation
                        is LoginResult.Failure -> error = result.message
                    }
                    submitting = false
                }
            },
            colors = androidx.compose.material3.ButtonDefaults.buttonColors(containerColor = NovaPrimary),
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 20.dp),
        ) {
            if (submitting) {
                CircularProgressIndicator(modifier = Modifier.padding(2.dp), strokeWidth = 2.dp)
            } else {
                Text("Log in")
            }
        }
    }
}
