package com.nova.tnpsc.data.practice

import kotlinx.serialization.Serializable
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Query

@Serializable
data class QuestionResponse(
    val questionId: String = "",
    val topicId: String = "",
    val topicName: String? = null,
    val prompt: String = "",
    val options: List<String> = emptyList(),
    val estimatedSeconds: Int = 0,
    val difficulty: String = "",
    val targetDifficulty: Double = 0.0,
    val attemptCount: Int = 0,
    val code: String? = null,
    val message: String? = null,
)

@Serializable
data class AttemptRequest(
    val attemptId: String,
    val questionId: String,
    val selectedIndex: Int,
    val timeTakenMs: Long,
    val confidence: Int? = null,
    val mode: String = "PRACTICE",
)

@Serializable
data class LearnerStateSnapshot(
    val accuracy: Double = 0.0,
    val speed: Double = 0.0,
    val difficulty: Double = 0.0,
    val attemptCount: Int = 0,
    val mastery: Double = 0.0,
)

@Serializable
data class AchievementUnlock(val id: String, val name: String, val icon: String)

@Serializable
data class AttemptResponse(
    val correct: Boolean = false,
    val correctIndex: Int = -1,
    val explanation: String? = null,
    val trap: String? = null,
    val mistakeType: String? = null,
    val state: LearnerStateSnapshot? = null,
    val nextAction: String? = null,
    val reason: String? = null,
    val newAchievements: List<AchievementUnlock> = emptyList(),
    val duplicate: Boolean = false,
    val code: String? = null,
    val message: String? = null,
)

/** Mirrors src/app/api/questions/next and src/app/api/attempts. */
interface PracticeApi {
    @GET("api/questions/next")
    suspend fun nextQuestion(@Query("topic") topic: String): Response<QuestionResponse>

    @GET("api/revision/next")
    suspend fun nextRevision(): Response<QuestionResponse>

    @GET("api/mistakes/next")
    suspend fun nextMistake(): Response<QuestionResponse>

    @POST("api/attempts")
    suspend fun submit(@Body body: AttemptRequest): Response<AttemptResponse>
}
