package com.nova.tnpsc.data.platform
import kotlinx.serialization.Serializable
import retrofit2.Response
import retrofit2.http.*
@Serializable data class DashboardResponse(val greeting:String?=null,val streak:Int=0,val questionsSolved:Int=0,val topicsMastered:Int=0,val testsCompleted:Int=0,val todayLearningMinutes:Int=0,val weeklyGoalMinutes:Int=0)
@Serializable data class AnalyticsResponse(val accuracy:Double=0.0,val mastery:Double=0.0,val studyMinutes:Int=0,val attempts:Int=0,val streak:Int=0)
@Serializable data class ReadinessResponse(val readiness:Double=0.0,val probability:Double?=null,val confidence:Double?=null,val weakTopics:List<String> = emptyList())
@Serializable data class StudyTimeRequest(val minutes:Int,val source:String="ANDROID")
@Serializable data class StudyTimeResponse(val logged:Boolean=false,val todayLearningMinutes:Int=0)
@Serializable data class NoteItem(val id:String="",val courseTitle:String="",val title:String="",val content:String="",val tags:List<String> = emptyList(),val createdAt:String?=null,val updatedAt:String?=null)
@Serializable data class NotesResponse(val notes:List<NoteItem> = emptyList())
@Serializable data class NoteRequest(val courseTitle:String,val title:String,val content:String,val tags:List<String> = emptyList())
@Serializable data class OnboardingPreferencesRequest(val name:String?=null,val phone:String?=null,val language:String?=null,val dailyGoalMinutes:Int?=null)
@Serializable data class InterventionStartRequest(val topicId:String,val action:String,val baselineMastery:Double?=null)
@Serializable data class InterventionResponse(val id:String="",val status:String="ACTIVE",val message:String?=null)
@Serializable data class CompleteUnitRequest(val unitId:String,val score:Double?=null)
@Serializable data class CompleteUnitResponse(val completed:Boolean=false,val nextAction:String?=null)
interface PlatformApi {
 @GET("api/dashboard") suspend fun dashboard():Response<DashboardResponse>
 @GET("api/learning/analytics") suspend fun analytics():Response<AnalyticsResponse>
 @GET("api/learning/readiness") suspend fun readiness():Response<ReadinessResponse>
 @POST("api/progress/study-time") suspend fun logStudyTime(@Body body:StudyTimeRequest):Response<StudyTimeResponse>
 @GET("api/notes") suspend fun notes():Response<NotesResponse>
 @POST("api/notes") suspend fun addNote(@Body body:NoteRequest):Response<NoteItem>
 @DELETE("api/notes/{id}") suspend fun deleteNote(@Path("id") id:String):Response<Unit>
 @POST("api/onboarding/preferences") suspend fun saveOnboarding(@Body body:OnboardingPreferencesRequest):Response<Map<String,Boolean>>
 @POST("api/learning/interventions/start") suspend fun startIntervention(@Body body:InterventionStartRequest):Response<InterventionResponse>
 @POST("api/curriculum/complete") suspend fun completeUnit(@Body body:CompleteUnitRequest):Response<CompleteUnitResponse>
}
