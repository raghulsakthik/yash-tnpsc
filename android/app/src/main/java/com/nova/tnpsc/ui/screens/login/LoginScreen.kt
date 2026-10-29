package com.nova.tnpsc.ui.screens.login

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
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
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.nova.tnpsc.data.auth.AuthRepository
import com.nova.tnpsc.data.auth.LoginResult
import com.nova.tnpsc.ui.theme.NovaInkMuted
import com.nova.tnpsc.ui.theme.NovaPrimary
import com.nova.tnpsc.ui.theme.NovaWarmAccent
import kotlinx.coroutines.launch

private enum class AuthMode { SIGN_IN, SIGN_UP }

/**
 * Real login/signup against POST /api/auth/{login,register} -- copy,
 * field order and tab order match the Android design package's
 * AuthModal.tsx (.nova-zip-ui/src/android-app/components/AuthModal.tsx)
 * exactly: "Sign In" / "New Enrollment" tabs, "Aspirant Name" / "Security
 * Key / Password" labels, Sign In as the default tab.
 */
@Composable
fun LoginScreen(authRepository: AuthRepository, onForgotPassword: () -> Unit) {
    var mode by remember { mutableStateOf(AuthMode.SIGN_IN) } // Sign In is the default tab in this design
    var name by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var showPassword by remember { mutableStateOf(false) }
    var agreeTerms by remember { mutableStateOf(true) }
    var submitting by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun submit() {
        if (submitting) return
        if (!email.contains("@")) {
            error = "Please provide a valid email address."
            return
        }
        if (password.length < 6) {
            error = "Password must be at least 6 characters."
            return
        }
        if (mode == AuthMode.SIGN_UP && name.isBlank()) {
            error = "Please provide your name."
            return
        }
        error = null
        submitting = true
        scope.launch {
            val result = if (mode == AuthMode.SIGN_UP) {
                authRepository.register(name.trim(), email.trim(), password)
            } else {
                authRepository.login(email.trim(), password)
            }
            when (result) {
                is LoginResult.Success -> Unit // AuthRepository.state flip drives navigation
                is LoginResult.Failure -> error = result.message
            }
            submitting = false
        }
    }

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
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 24.dp, vertical = 16.dp),
    ) {
        Text("YASH", color = NovaInkMuted, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
        Text(
            if (mode == AuthMode.SIGN_UP) "New Aspirant Admission" else "Aspirant Authentication",
            fontSize = 26.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(top = 8.dp, bottom = 20.dp),
        )

        TabRow(selectedTabIndex = mode.ordinal) {
            Tab(selected = mode == AuthMode.SIGN_IN, onClick = { mode = AuthMode.SIGN_IN; error = null }, text = { Text("Sign In") })
            Tab(selected = mode == AuthMode.SIGN_UP, onClick = { mode = AuthMode.SIGN_UP; error = null }, text = { Text("New Enrollment") })
        }

        Spacer(Modifier.height(20.dp))

        if (mode == AuthMode.SIGN_UP) {
            OutlinedTextField(
                value = name,
                onValueChange = { name = it; error = null },
                label = { Text("Aspirant Name") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(12.dp))
        }

        OutlinedTextField(
            value = email,
            onValueChange = { email = it; error = null },
            label = { Text("Email Address") },
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(12.dp))

        OutlinedTextField(
            value = password,
            onValueChange = { password = it; error = null },
            label = { Text("Security Key / Password") },
            singleLine = true,
            visualTransformation = if (showPassword) VisualTransformation.None else PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
            trailingIcon = {
                IconButton(onClick = { showPassword = !showPassword }) {
                    Icon(if (showPassword) Icons.Filled.VisibilityOff else Icons.Filled.Visibility, contentDescription = "Toggle password visibility")
                }
            },
            modifier = Modifier.fillMaxWidth(),
        )

        if (mode == AuthMode.SIGN_UP) {
            Row(
                verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
                modifier = Modifier.padding(top = 8.dp),
            ) {
                Checkbox(checked = agreeTerms, onCheckedChange = { agreeTerms = it })
                Text("I pledge adherence to the Academy Honor Code, exam integrity, and proctoring norms.", color = NovaInkMuted, fontSize = 12.sp)
            }
        } else {
            TextButton(onClick = onForgotPassword, modifier = Modifier.padding(top = 4.dp)) {
                Text("Forgot password?")
            }
        }

        error?.let {
            Text(it, color = NovaWarmAccent, fontSize = 13.sp, modifier = Modifier.padding(top = 12.dp))
        }

        Button(
            onClick = { submit() },
            colors = ButtonDefaults.buttonColors(containerColor = NovaPrimary),
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 20.dp),
        ) {
            if (submitting) {
                CircularProgressIndicator(modifier = Modifier.padding(2.dp), strokeWidth = 2.dp)
            } else {
                Text(if (mode == AuthMode.SIGN_UP) "Enroll & Initiate Diagnostic" else "Sign In to Academy")
            }
        }
    }
}
