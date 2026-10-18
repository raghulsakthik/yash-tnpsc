package com.nova.tnpsc.data.pyq

import kotlinx.serialization.Serializable
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Query

@Serializable
data class PyqYearStat(val year: Int = 0, val total: Int = 0, val attempted: Int = 0)

@Serializable
data class PyqTopicStat(
    val topicId: String = "",
    val topicName: String = "",
    val total: Int = 0,
    val attempted: Int = 0,
    val correct: Int = 0,
    val accuracy: Int? = null,
)

/** Mirrors GET /api/pyqs/stats -- real counts only, never a fabricated ranking. */
@Serializable
data class PyqStatsResponse(
    val totalQuestions: Int = 0,
    val attempted: Int = 0,
    val accuracy: Int? = null,
    val byYear: List<PyqYearStat> = emptyList(),
    val byTopic: List<PyqTopicStat> = emptyList(),
    val code: String? = null,
    val message: String? = null,
)

/**
 * Mirrors GET /api/pyqs/next -- same shape as PracticeApi's QuestionResponse
 * plus sourceYear/source, since a PYQ question carries which real paper it
 * came from. A separate response type rather than reusing QuestionResponse
 * because that field has no meaning for a regular practice question.
 */
@Serializable
data class PyqQuestionResponse(
    val questionId: String = "",
    val topicId: String = "",
    val topicName: String? = null,
    val prompt: String = "",
    val options: List<String> = emptyList(),
    val imageData: String? = null,
    val estimatedSeconds: Int = 0,
    val difficulty: String = "",
    val sourceYear: Int? = null,
    val source: String? = null,
    val code: String? = null,
    val message: String? = null,
)

/** Mirrors src/app/api/pyqs/stats and src/app/api/pyqs/next. */
interface PyqApi {
    @GET("api/pyqs/stats")
    suspend fun stats(): Response<PyqStatsResponse>

    @GET("api/pyqs/next")
    suspend fun next(
        @Query("year") year: Int? = null,
        @Query("topic") topic: String? = null,
    ): Response<PyqQuestionResponse>
}
