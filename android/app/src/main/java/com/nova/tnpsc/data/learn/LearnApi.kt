package com.nova.tnpsc.data.learn

import kotlinx.serialization.Serializable
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Path

@Serializable
data class SubjectSummary(
    val slug: String,
    val name: String,
    val topics: Int,
    val mastered: Int,
    val mastery: Int,
    val revisionDue: Int = 0,
    val status: String,
)

@Serializable
data class LearnResponse(val subjects: List<SubjectSummary> = emptyList())

@Serializable
data class TopicSummary(
    val n: Int,
    val slug: String,
    val name: String,
    val state: String,
    val mastery: Int,
    val attemptCount: Int,
)

@Serializable
data class SubjectDetailResponse(
    val slug: String = "",
    val name: String = "",
    val topics: List<TopicSummary> = emptyList(),
    val code: String? = null,
    val message: String? = null,
)

/** Mirrors src/app/api/learn/route.js and src/app/api/learn/[subject]/route.js. */
interface LearnApi {
    @GET("api/learn")
    suspend fun subjects(): Response<LearnResponse>

    @GET("api/learn/{subject}")
    suspend fun subject(@Path("subject") subject: String): Response<SubjectDetailResponse>
}
