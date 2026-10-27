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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.nova.tnpsc.data.auth.AuthRepository
import com.nova.tnpsc.data.auth.MessageResult
import com.nova.tnpsc.ui.theme.NovaInkMuted
import com.nova.tnpsc.ui.theme.NovaPrimary
import com.nova.tnpsc.ui.theme.NovaWarmAccent
import kotlinx.coroutines.launch

/**
 * Real POST /api/auth/forgot-password -- mirrors src/app/forgot-password/page.js.
 * Always shows the same generic success message regardless of whether the
 * email exists (the backend itself hides that, to avoid account
 * enumeration); this screen never contradicts that.
 */
@Composable
fun ForgotPasswordScreen(authRepository: AuthRepository, onBackToLogin: () -> Unit, onHaveToken: () -> Unit) {
    var email by remember { mutableStateOf("") }
    var submitting by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var message by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .windowInsetsPadding(WindowInsets.safeDrawing)
            .padding(horizontal = 24.dp),
        verticalArrangement = Arrangement.Center,
    ) {
        Text("FORGOT PASSWORD", color = NovaInkMuted, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
        Text(
            "Reset your password.",
            fontSize = 28.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(top = 8.dp, bottom = 8.dp),
        )
        Text(
            "Enter the email on your account and we'll send a reset link if it exists.",
            color = NovaInkMuted,
            fontSize = 13.sp,
            modifier = Modifier.padding(bottom = 24.dp),
        )

        if (message != null) {
            Text(message!!, color = NovaPrimary, fontSize = 14.sp)
            Spacer(Modifier.padding(top = 12.dp))
            TextButton(onClick = onHaveToken) { Text("I have a reset token") }
            TextButton(onClick = onBackToLogin) { Text("Back to sign in") }
        } else {
            OutlinedTextField(
                value = email,
                onValueChange = { email = it; error = null },
                label = { Text("Email") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                modifier = Modifier.fillMaxWidth(),
            )

            error?.let {
                Text(it, color = NovaWarmAccent, fontSize = 13.sp, modifier = Modifier.padding(top = 12.dp))
            }

            Button(
                onClick = {
                    if (email.isBlank() || submitting) return@Button
                    submitting = true
                    error = null
                    scope.launch {
                        when (val result = authRepository.requestPasswordReset(email.trim())) {
                            is MessageResult.Success -> message = result.message
                            is MessageResult.Failure -> error = result.message
                        }
                        submitting = false
                    }
                },
                colors = ButtonDefaults.buttonColors(containerColor = NovaPrimary),
                modifier = Modifier.fillMaxWidth().padding(top = 20.dp),
            ) {
                if (submitting) CircularProgressIndicator(modifier = Modifier.padding(2.dp), strokeWidth = 2.dp)
                else Text("Send reset link")
            }

            TextButton(onClick = onBackToLogin, modifier = Modifier.padding(top = 8.dp)) {
                Text("Back to sign in")
            }
        }
    }
}
