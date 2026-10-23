package com.nova.tnpsc.data.profile

import kotlinx.serialization.Serializable
import retrofit2.Response
import retrofit2.http.GET

@Serializable
data class ProfileResponse(
    val name: String = "",
    val role: String? = null,
    val email: String? = null,
    val since: String? = null,
    val exam: String? = null,
    val language: String? = null,
    val dailyGoalMinutes: Int = 30,
    val onboarded: Boolean = true,
    val streak: Int = 0,
    val longestStreak: Int = 0,
    val questionsSolved: Int = 0,
    val topicsMastered: Int = 0,
    val testsCompleted: Int = 0,
)

/** Mirrors src/app/api/profile/route.js. */
interface ProfileApi {
    @GET("api/profile")
    suspend fun get(): Response<ProfileResponse>
}
