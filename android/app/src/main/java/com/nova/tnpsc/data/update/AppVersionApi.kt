package com.nova.tnpsc.data.update

import kotlinx.serialization.Serializable
import retrofit2.Response
import retrofit2.http.GET

@Serializable
data class AndroidVersionInfo(
    val versionCode: Int = 0,
    val versionName: String = "",
    val url: String = "",
    val notes: String = "",
)

@Serializable
data class AppVersionResponse(val android: AndroidVersionInfo? = null)

/** Mirrors src/app/api/app/version/route.js -- no auth required, checked on every app launch. */
interface AppVersionApi {
    @GET("api/app/version")
    suspend fun latest(): Response<AppVersionResponse>
}
