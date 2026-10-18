package com.nova.tnpsc.data.lesson

import kotlinx.serialization.Serializable
import retrofit2.Response
import retrofit2.http.GET
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

/** Mirrors src/app/api/lesson/[topic]/route.js. */
interface LessonApi {
    @GET("api/lesson/{topic}")
    suspend fun lesson(@Path("topic") topic: String): Response<LessonResponse>
}
