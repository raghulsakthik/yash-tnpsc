package com.nova.tnpsc.ui.screens.login

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import com.nova.tnpsc.data.auth.MessageResult
import com.nova.tnpsc.ui.theme.NovaInkMuted
import com.nova.tnpsc.ui.theme.NovaPrimary
import com.nova.tnpsc.ui.theme.NovaWarmAccent
import kotlinx.coroutines.launch

/**
 * Real POST /api/auth/reset-password -- mirrors src/app/reset-password/page.js.
 *
 * The web page reads its token from a ?token= URL the reset email links
 * to; this app has no App Links/deep-link handling registered yet (a
 * separate, real piece of work -- domain association file + intent
 * filters), so for now she pastes the token text from the email
 * manually. Functionally identical backend call, just one extra manual
 * step until deep linking is wired up.
 */
@Composable
fun ResetPasswordScreen(authRepository: AuthRepository, onBackToLogin: () -> Unit) {
    var token by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var confirm by remember { mutableStateOf("") }
    var submitting by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var done by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .windowInsetsPadding(WindowInsets.safeDrawing)
            .padding(horizontal = 24.dp),
        verticalArrangement = Arrangement.Center,
    ) {
        Text("RESET PASSWORD", color = NovaInkMuted, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
        Text(
            "Choose a new password.",
            fontSize = 28.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(top = 8.dp, bottom = 8.dp),
        )
        Text(
            "Paste the reset token from the email, then set a new password. This signs you out everywhere else.",
            color = NovaInkMuted,
            fontSize = 13.sp,
            modifier = Modifier.padding(bottom = 24.dp),
        )

        if (done) {
            Text("Password updated. Sign in with your new password.", color = NovaPrimary, fontSize = 14.sp)
            Spacer(Modifier.padding(top = 12.dp))
            TextButton(onClick = onBackToLogin) { Text("Back to sign in") }
        } else {
            OutlinedTextField(
                value = token,
                onValueChange = { token = it; error = null },
                label = { Text("Reset token") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.padding(top = 12.dp))
            OutlinedTextField(
                value = password,
                onValueChange = { password = it; error = null },
                label = { Text("New password") },
                singleLine = true,
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.padding(top = 12.dp))
            OutlinedTextField(
                value = confirm,
                onValueChange = { confirm = it; error = null },
                label = { Text("Confirm new password") },
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
                    if (token.isBlank() || password.length < 8 || submitting) return@Button
                    if (password != confirm) { error = "Passwords do not match."; return@Button }
                    submitting = true
                    error = null
                    scope.launch {
                        when (val result = authRepository.confirmPasswordReset(token.trim(), password)) {
                            is MessageResult.Success -> done = true
                            is MessageResult.Failure -> error = result.message
                        }
                        submitting = false
                    }
                },
                colors = ButtonDefaults.buttonColors(containerColor = NovaPrimary),
                modifier = Modifier.fillMaxWidth().padding(top = 20.dp),
            ) {
                if (submitting) CircularProgressIndicator(modifier = Modifier.padding(2.dp), strokeWidth = 2.dp)
                else Text("Set new password")
            }

            TextButton(onClick = onBackToLogin, modifier = Modifier.padding(top = 8.dp)) {
                Text("Back to sign in")
            }
        }
    }
}
