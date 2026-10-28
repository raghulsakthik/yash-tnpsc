package com.nova.tnpsc.data.admin

import kotlinx.serialization.Serializable
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

@Serializable
data class AdminBroadcastItem(
    val id: String = "",
    val title: String = "",
    val message: String = "",
    val targetAudience: String = "",
    val recipientCount: Int = 0,
    val createdAt: String = "",
)

@Serializable data class AdminBroadcastsResponse(val broadcasts: List<AdminBroadcastItem> = emptyList())
@Serializable data class AdminBroadcastRequest(val title: String, val message: String, val targetAudience: String = "ALL_LEARNERS")
@Serializable data class AdminBroadcastCreateResponse(val broadcast: AdminBroadcastItem? = null, val code: String? = null, val message: String? = null)

/** Mirrors src/app/api/admin/notifications/{,broadcast}/route.js -- the real backend behind Admin Portal's Notifications section. */
interface AdminNotificationsApi {
    @GET("api/admin/notifications")
    suspend fun broadcasts(): Response<AdminBroadcastsResponse>

    @POST("api/admin/notifications/broadcast")
    suspend fun sendBroadcast(@Body body: AdminBroadcastRequest): Response<AdminBroadcastCreateResponse>
}
