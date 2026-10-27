package com.nova.tnpsc.data.features

import kotlinx.serialization.Serializable
import retrofit2.Response
import retrofit2.http.*

@Serializable data class BookmarkItem(val questionId: String = "", val savedAt: String? = null, val topicId: String = "", val topicName: String = "", val prompt: String = "", val options: List<String> = emptyList(), val correctIndex: Int = 0, val explanation: String? = null, val trap: String? = null)
@Serializable data class BookmarksResponse(val bookmarks: List<BookmarkItem> = emptyList(), val message: String? = null)
@Serializable data class NotificationItem(val type: String = "", val icon: String = "🔔", val title: String = "", val body: String? = null, val at: String? = null)
@Serializable data class NotificationsResponse(val items: List<NotificationItem> = emptyList())
@Serializable data class MistakeResponse(val questionId: String = "", val topicId: String = "", val topicName: String? = null, val prompt: String = "", val options: List<String> = emptyList(), val imageData: String? = null, val estimatedSeconds: Int = 0, val difficulty: String = "", val code: String? = null, val message: String? = null)
@Serializable data class AchievementItem(val id: String = "", val name: String = "", val description: String = "", val icon: String = "✦", val unlocked: Boolean = false, val unlockedAt: String? = null)
@Serializable data class AchievementsResponse(val achievements: List<AchievementItem> = emptyList(), val unlockedCount: Int = 0, val totalCount: Int = 0)
@Serializable data class CalendarDay(val date: String = "", val count: Int = 0)
@Serializable data class CalendarResponse(val year: Int = 0, val month: Int = 0, val days: List<CalendarDay> = emptyList())
@Serializable data class TopicDay(val topicId: String = "", val topicName: String = "", val attempts: Int = 0, val correct: Int = 0)
@Serializable data class DayProgressResponse(val date: String = "", val totalQuestions: Int = 0, val correctCount: Int = 0, val topics: List<TopicDay> = emptyList())
@Serializable data class StatusCount(val status: String = "", val count: Int = 0)
@Serializable data class StatusBreakdownResponse(val breakdown: List<StatusCount> = emptyList(), val totalTopics: Int = 0)
@Serializable data class SearchTopic(val topicId: String = "", val name: String = "", val chapterName: String = "", val subjectName: String = "")
@Serializable data class SearchLesson(val topicId: String = "", val title: String = "", val snippet: String = "")
@Serializable data class SearchQuestion(val questionId: String = "", val topicId: String = "", val topicName: String = "", val prompt: String = "")
@Serializable data class SearchResponse(val topics: List<SearchTopic> = emptyList(), val lessons: List<SearchLesson> = emptyList(), val questions: List<SearchQuestion> = emptyList())
@Serializable data class ReportRequest(val reason: String, val description: String? = null)
@Serializable data class ReportResponse(val reported: Boolean = false, val message: String? = null)
@Serializable data class ActiveCurriculumCurrent(val status: String = "ACTIVE", val phaseName: String? = null, val phaseLevel: Int = 0, val weekNumber: Int = 0, val weekTitle: String? = null, val weekObjective: String? = null, val dayNumber: Int = 0, val dayTitle: String? = null, val dayPurpose: String? = null, val targetMinutes: Int? = null)
@Serializable data class CurriculumUnit(val id: String = "", val topicId: String? = null, val title: String = "", val unitType: String = "", val estimatedMinutes: Int? = null, val required: Boolean = true, val progressStatus: String = "NOT_STARTED", val score: Double? = null, val attempts: Int = 0, val topicName: String? = null)
@Serializable data class ActiveCurriculumResponse(val curriculumId: String = "", val current: ActiveCurriculumCurrent? = null, val units: List<CurriculumUnit> = emptyList())
@Serializable data class NoteItem(val id: String = "", val courseTitle: String? = null, val title: String = "", val content: String = "", val tags: List<String> = emptyList(), val date: String = "")
@Serializable data class NotesResponse(val notes: List<NoteItem> = emptyList())
@Serializable data class CreateNoteRequest(val title: String, val content: String, val courseTitle: String? = null, val tags: List<String> = emptyList())
@Serializable data class CreateNoteResponse(val note: NoteItem? = null, val code: String? = null, val message: String? = null)
@Serializable data class DeleteNoteResponse(val deleted: Boolean = false, val code: String? = null)

interface FeatureApi {
    @GET("api/bookmarks") suspend fun bookmarks(): Response<BookmarksResponse>
    @POST("api/bookmarks") suspend fun addBookmark(@Body body: Map<String, String>): Response<Map<String, Boolean>>
    @DELETE("api/bookmarks/{questionId}") suspend fun removeBookmark(@Path("questionId") questionId: String): Response<Map<String, Boolean>>
    @GET("api/notifications") suspend fun notifications(): Response<NotificationsResponse>
    @GET("api/mistakes/next") suspend fun nextMistake(): Response<MistakeResponse>
    @GET("api/achievements") suspend fun achievements(): Response<AchievementsResponse>
    @GET("api/progress/calendar") suspend fun calendar(@Query("month") month: String? = null): Response<CalendarResponse>
    @GET("api/progress/day") suspend fun day(@Query("date") date: String): Response<DayProgressResponse>
    @GET("api/progress/status-breakdown") suspend fun statusBreakdown(): Response<StatusBreakdownResponse>
    @GET("api/search") suspend fun search(@Query("q") query: String): Response<SearchResponse>
    @POST("api/questions/{id}/report") suspend fun report(@Path("id") questionId: String, @Body body: ReportRequest): Response<ReportResponse>
    @GET("api/curriculum/active") suspend fun activeCurriculum(): Response<ActiveCurriculumResponse>
    @GET("api/notes") suspend fun notes(): Response<NotesResponse>
    @POST("api/notes") suspend fun createNote(@Body body: CreateNoteRequest): Response<CreateNoteResponse>
    @DELETE("api/notes/{id}") suspend fun deleteNote(@Path("id") id: String): Response<DeleteNoteResponse>
}
