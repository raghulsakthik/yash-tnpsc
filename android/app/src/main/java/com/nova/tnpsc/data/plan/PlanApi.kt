package com.nova.tnpsc.data.plan

import kotlinx.serialization.Serializable
import retrofit2.Response
import retrofit2.http.GET

@Serializable
data class PlanItem(
    val type: String,
    val estimatedMinutes: Int,
    val count: Int,
    val topicId: String? = null,
    val topicName: String? = null,
)

@Serializable
data class PlanResponse(
    val primaryAction: String = "NONE",
    val topicId: String? = null,
    val reason: String = "",
    val estimatedMinutes: Int = 0,
    val revisionDue: Int = 0,
    val items: List<PlanItem> = emptyList(),
    val code: String? = null,
    val message: String? = null,
)

/** Mirrors src/app/api/plan/today/route.js -- the single "next best action" recommendation. */
interface PlanApi {
    @GET("api/plan/today")
    suspend fun today(): Response<PlanResponse>
}
