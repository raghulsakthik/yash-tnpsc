package com.nova.tnpsc.data.quicklab

import kotlinx.serialization.Serializable
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

/** One entry from GET /api/quick-lab/modes -- admin-editable via /admin/quicklab. */
@Serializable
data class QuickLabMode(
    val slug: String = "",
    val name: String = "",
    val desc: String = "",
    val recommended: Boolean = false,
)

@Serializable
data class QuickLabModesResponse(val modes: List<QuickLabMode> = emptyList())

@Serializable
data class QuickLabQuestion(
    val token: String = "",
    val prompt: String = "",
    val revealPrompt: String? = null,
    val hint: String? = null,
    val options: List<String> = emptyList(),
    val memorize: Boolean = false,
    val code: String? = null,
    val message: String? = null,
)

@Serializable
data class QuickLabSubmitRequest(
    val token: String,
    val selectedIndex: Int,
    val mode: String,
    val timeTakenMs: Long,
)

@Serializable
data class QuickLabSubmitResponse(
    val correct: Boolean = false,
    val correctIndex: Int = -1,
    val code: String? = null,
    val message: String? = null,
)

/** Mirrors the quick-lab API routes. */
interface QuickLabApi {
    @GET("api/quick-lab/modes")
    suspend fun modes(): Response<QuickLabModesResponse>

    @GET("api/quick-lab/{mode}/next")
    suspend fun next(@Path("mode") mode: String): Response<QuickLabQuestion>

    @POST("api/quick-lab/submit")
    suspend fun submit(@Body body: QuickLabSubmitRequest): Response<QuickLabSubmitResponse>
}
