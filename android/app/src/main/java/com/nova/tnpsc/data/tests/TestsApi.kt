package com.nova.tnpsc.data.tests

import kotlinx.serialization.Serializable
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

@Serializable
data class TestQuestion(
    val questionId: String = "",
    val topicId: String = "",
    val topicName: String? = null,
    val prompt: String = "",
    val options: List<String> = emptyList(),
    val imageData: String? = null,
    val difficulty: String = "",
    val estimatedSeconds: Int = 0,
    val selectedIndex: Int? = null,
    val markedForReview: Boolean = false,
    val correctIndex: Int? = null,
    val explanation: String? = null,
    val trap: String? = null,
)

@Serializable
data class CreateTestRequest(val templateId: String? = null)

@Serializable
data class CreateTestResponse(
    val testId: String = "",
    val questions: List<TestQuestion> = emptyList(),
    val code: String? = null,
    val message: String? = null,
)

@Serializable
data class TestDetailResponse(
    val testId: String = "",
    val status: String = "",
    val questionCount: Int = 0,
    val score: Double? = null,
    val questions: List<TestQuestion> = emptyList(),
    val code: String? = null,
    val message: String? = null,
)

@Serializable
data class AnswerRequest(
    val questionId: String,
    val selectedIndex: Int?,
    val markedForReview: Boolean,
    val timeTakenMs: Long,
)

@Serializable
data class SubmitTestResponse(
    val testId: String = "",
    val score: Double = 0.0,
    val correctCount: Int = 0,
    val questionCount: Int = 0,
    val code: String? = null,
    val message: String? = null,
)

/** Mirrors the tests API routes. */
interface TestsApi {
    @POST("api/tests")
    suspend fun create(@Body body: CreateTestRequest): Response<CreateTestResponse>

    @GET("api/tests/{id}")
    suspend fun get(@Path("id") id: String): Response<TestDetailResponse>

    @POST("api/tests/{id}/answers")
    suspend fun answer(@Path("id") id: String, @Body body: AnswerRequest): Response<Unit>

    @POST("api/tests/{id}/submit")
    suspend fun submit(@Path("id") id: String): Response<SubmitTestResponse>
}
