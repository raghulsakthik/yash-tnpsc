package com.nova.tnpsc.data.auth

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

/** Mirrors src/app/api/auth/{login,logout,me}/route.js exactly. */
interface AuthApi {
    @POST("api/auth/login")
    suspend fun login(@Body body: LoginRequest): Response<LoginResponse>

    @POST("api/auth/logout")
    suspend fun logout(): Response<LogoutResponse>

    @GET("api/auth/me")
    suspend fun me(): Response<MeResponse>
}
