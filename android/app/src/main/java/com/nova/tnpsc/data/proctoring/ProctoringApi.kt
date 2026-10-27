package com.nova.tnpsc.data.proctoring

import kotlinx.serialization.Serializable
import okhttp3.RequestBody
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST
import retrofit2.http.Query

@Serializable data class ProctoringTestIdRequest(val testId: String)
@Serializable data class ProctoringEventRequest(val testId: String, val eventType: String)
@Serializable data class ProctoringMessageResponse(val ok: Boolean = false, val code: String? = null, val message: String? = null)

/** Mirrors src/app/api/proctoring/{start,stop,event,chunk} -- same contract the web client uses. */
interface ProctoringApi {
    @POST("api/proctoring/start")
    suspend fun start(@Body body: ProctoringTestIdRequest): Response<ProctoringMessageResponse>

    @POST("api/proctoring/stop")
    suspend fun stop(@Body body: ProctoringTestIdRequest): Response<ProctoringMessageResponse>

    @POST("api/proctoring/event")
    suspend fun event(@Body body: ProctoringEventRequest): Response<ProctoringMessageResponse>

    @POST("api/proctoring/chunk")
    suspend fun chunk(@Query("testId") testId: String, @Query("stream") stream: String, @Body body: RequestBody): Response<ProctoringMessageResponse>
}
