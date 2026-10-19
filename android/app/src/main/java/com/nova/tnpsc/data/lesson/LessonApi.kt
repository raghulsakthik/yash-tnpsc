package com.nova.tnpsc.data.lesson

import kotlinx.serialization.Serializable
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

@Serializable
data class WorkedExample(
    val problem: String = "",
    val steps: List<String> = emptyList(),
    val answer: String = "",
)

@Serializable
data class LessonResource(
    val title: String = "",
    val body: String = "",
    val imageData: String? = null,
)

/**
 * Mirrors GET /api/lesson/:topic. `title`/`concept`/`example`/`tip` are all
 * nullable -- a brand-new topic (e.g. created via the admin PDF-upload
 * pipeline) can have resources but no written lesson yet, same as on web.
 */
@Serializable
data class LessonResponse(
    val topic: String = "",
    val title: String? = null,
    val concept: String? = null,
    val example: WorkedExample? = null,
    val tip: String? = null,
    val resources: List<LessonResource> = emptyList(),
    val code: String? = null,
    val message: String? = null,
)

/**
 * Mirrors POST /api/lesson/:topic/explain -- an AI-generated alternate
 * explanation of the same concept, cached server-side per topic so every
 * learner who hits it after the first reuses the same cached text.
 * `available = false` is a normal outcome (no AI key configured, or the
 * call failed), never an error -- the deterministic lesson content above
 * is always enough on its own.
 */
@Serializable
data class ExplainResponse(
    val available: Boolean = false,
    val text: String? = null,
    val learnerName: String? = null,
    val cached: Boolean = false,
)

/** Mirrors src/app/api/lesson/[topic]/route.js and its explain/ sub-route. */
interface LessonApi {
    @GET("api/lesson/{topic}")
    suspend fun lesson(@Path("topic") topic: String): Response<LessonResponse>

    @POST("api/lesson/{topic}/explain")
    suspend fun explain(@Path("topic") topic: String): Response<ExplainResponse>
}
