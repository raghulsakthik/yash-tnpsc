package com.nova.tnpsc.data.auth

import kotlinx.serialization.Serializable

@Serializable
data class LoginRequest(val email: String, val password: String)

@Serializable
data class LoginResponse(val role: String? = null, val code: String? = null, val message: String? = null)

@Serializable
data class MeResponse(val email: String? = null, val role: String? = null, val code: String? = null, val message: String? = null)

@Serializable
data class LogoutResponse(val loggedOut: Boolean? = null)

@Serializable
data class ForgotPasswordRequest(val email: String)

@Serializable
data class ResetPasswordRequest(val token: String, val password: String)

@Serializable
data class MessageResponse(val message: String? = null, val code: String? = null)
