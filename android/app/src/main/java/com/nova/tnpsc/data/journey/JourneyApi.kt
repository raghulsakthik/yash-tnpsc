package com.nova.tnpsc.data.journey

import kotlinx.serialization.Serializable
import retrofit2.Response
import retrofit2.http.GET

@Serializable
data class OrbitPoint(val name: String, val ring: String, val angleDeg: Float)

@Serializable
data class PersonalRecord(val label: String, val value: String)

@Serializable
data class JourneyResponse(
    val orbit: List<OrbitPoint> = emptyList(),
    val personalRecords: List<PersonalRecord> = emptyList(),
)

/** Mirrors src/app/api/journey/route.js. */
interface JourneyApi {
    @GET("api/journey")
    suspend fun get(): Response<JourneyResponse>
}
