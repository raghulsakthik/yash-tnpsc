package com.nova.tnpsc.push

import kotlinx.serialization.Serializable
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST

@Serializable
data class FcmRegisterRequest(val token: String, val deviceInfo: String? = null)

@Serializable
data class FcmRegisterResponse(val registered: Boolean? = null, val code: String? = null, val message: String? = null)

/** Mirrors src/app/api/push/fcm/register/route.js. */
interface FcmApi {
    @POST("api/push/fcm/register")
    suspend fun register(@Body body: FcmRegisterRequest): Response<FcmRegisterResponse>
}
