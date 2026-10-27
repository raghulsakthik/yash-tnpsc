package com.nova.tnpsc.data.auth

import com.nova.tnpsc.data.network.ApiClient
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

sealed interface AuthState {
    /** Not yet checked whether a saved session cookie is still valid. */
    data object Unknown : AuthState
    data object LoggedOut : AuthState
    data class LoggedIn(val email: String, val role: String) : AuthState
}

sealed interface LoginResult {
    data class Success(val role: String) : LoginResult
    data class Failure(val message: String) : LoginResult
}

sealed interface MessageResult {
    data class Success(val message: String) : MessageResult
    data class Failure(val message: String) : MessageResult
}

/**
 * The single source of truth for "is she logged in, and as whom" --
 * mirrors the web app's three account roles (learner / test / admin, see
 * src/lib/auth.mjs). Every screen that needs to know auth state reads
 * [state] instead of calling the API itself.
 */
class AuthRepository(apiClient: ApiClient) {

    private val api = apiClient.create(AuthApi::class.java)
    private val cookieJar = apiClient.cookieJar

    private val _state = MutableStateFlow<AuthState>(AuthState.Unknown)
    val state: StateFlow<AuthState> = _state.asStateFlow()

    /** Call once at app start: if a saved session cookie is still valid server-side, restores LoggedIn without re-prompting for credentials. */
    suspend fun restoreSession() {
        try {
            val response = api.me()
            val body = response.body()
            if (response.isSuccessful && body?.email != null && body.role != null) {
                _state.value = AuthState.LoggedIn(body.email, body.role)
            } else {
                _state.value = AuthState.LoggedOut
            }
        } catch (_: Exception) {
            // Network unreachable on launch -- treat as logged out rather
            // than hang; she can retry once connectivity is back.
            _state.value = AuthState.LoggedOut
        }
    }

    /** Mirrors AuthModal.tsx's signup path -- POST /api/auth/register, same session cookie mechanism as login. */
    suspend fun register(name: String, email: String, password: String): LoginResult {
        return try {
            val response = api.register(RegisterRequest(name, email, password))
            val body = response.body()
            if (response.isSuccessful && body?.user != null) {
                val role = body.user.role ?: "STUDENT"
                _state.value = AuthState.LoggedIn(body.user.email ?: email, role)
                LoginResult.Success(role)
            } else {
                LoginResult.Failure(body?.message ?: "Could not create your account")
            }
        } catch (e: Exception) {
            LoginResult.Failure(e.message ?: "Could not reach the server")
        }
    }

    suspend fun login(email: String, password: String): LoginResult {
        return try {
            val response = api.login(LoginRequest(email, password))
            val body = response.body()
            if (response.isSuccessful && body?.role != null) {
                _state.value = AuthState.LoggedIn(email, body.role)
                LoginResult.Success(body.role)
            } else {
                LoginResult.Failure(body?.message ?: "Could not log in")
            }
        } catch (e: Exception) {
            LoginResult.Failure(e.message ?: "Could not reach the server")
        }
    }

    /** Always returns Success (the real backend hides whether the email exists, to avoid account enumeration), unless the request itself failed to reach the server. */
    suspend fun requestPasswordReset(email: String): MessageResult {
        return try {
            val response = api.forgotPassword(ForgotPasswordRequest(email))
            val body = response.body()
            if (response.isSuccessful) {
                MessageResult.Success(body?.message ?: "If an account exists for that email, a reset link has been sent.")
            } else {
                MessageResult.Failure(body?.message ?: "Could not send a reset link")
            }
        } catch (e: Exception) {
            MessageResult.Failure(e.message ?: "Could not reach the server")
        }
    }

    suspend fun confirmPasswordReset(token: String, password: String): MessageResult {
        return try {
            val response = api.resetPassword(ResetPasswordRequest(token, password))
            val body = response.body()
            if (response.isSuccessful) {
                MessageResult.Success(body?.message ?: "Password updated.")
            } else {
                MessageResult.Failure(body?.message ?: "Could not reset your password")
            }
        } catch (e: Exception) {
            MessageResult.Failure(e.message ?: "Could not reach the server")
        }
    }

    suspend fun logout() {
        try {
            api.logout()
        } catch (_: Exception) {
            // Even if the network call fails, clear the local cookie below --
            // she expects "log out" to work locally regardless of connectivity.
        }
        cookieJar.clear()
        _state.value = AuthState.LoggedOut
    }
}
