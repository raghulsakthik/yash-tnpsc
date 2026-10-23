package com.nova.tnpsc.data.platform
import kotlinx.serialization.Serializable
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Query
@Serializable data class CurriculumExam(val id:String="",val code:String="",val name:String="",val total_questions:Int=0)
@Serializable data class CurriculumSubject(val id:String="",val name:String="",val sortOrder:Int=0)
@Serializable data class CurriculumSection(val id:String="",val code:String="",val name:String="",val sortOrder:Int=0,val subjects:List<CurriculumSubject> = emptyList())
@Serializable data class CurriculumUnitNode(val id:String="",val day_id:String?=null,val topic_id:String?=null,val title:String="",val unit_type:String="",val sort_order:Int=0,val estimated_minutes:Int=0,val required:Boolean=true)
@Serializable data class CurriculumDayNode(val id:String="",val week_id:String="",val day_number:Int=0,val title:String="",val purpose:String?=null,val target_minutes:Int=0,val units:List<CurriculumUnitNode> = emptyList())
@Serializable data class CurriculumWeekNode(val id:String="",val phase_id:String="",val week_number:Int=0,val title:String="",val objective:String?=null,val days:List<CurriculumDayNode> = emptyList())
@Serializable data class CurriculumPhaseNode(val id:String="",val curriculum_id:String="",val code:String="",val name:String="",val description:String?=null,val level:Int=0,val sort_order:Int=0,val duration_weeks:Int=0,val weeks:List<CurriculumWeekNode> = emptyList())
@Serializable data class CurriculumMilestone(val id:String="",val curriculum_id:String="",val phase_id:String?=null,val code:String="",val name:String="",val description:String?=null,val sort_order:Int=0)
@Serializable data class CurriculumDefinition(val id:String="",val examId:String?=null,val name:String?=null,val version:String?=null,val status:String?=null,val sections:List<CurriculumSection> = emptyList(),val phases:List<CurriculumPhaseNode> = emptyList(),val milestones:List<CurriculumMilestone> = emptyList())
@Serializable data class CurriculumResponse(val exams:List<CurriculumExam> = emptyList(),val curricula:List<CurriculumDefinition> = emptyList())
@Serializable data class CurriculumTreeResponse(val curriculum:CurriculumDefinition?=null,val phases:List<CurriculumPhaseNode> = emptyList())
@Serializable data class CurriculumProgressCurrent(val current_phase_id:String?=null,val current_week_id:String?=null,val current_day_id:String?=null,val week_number:Int=0,val day_number:Int=0,val phase_name:String?=null,val week_title:String?=null,val day_title:String?=null)
@Serializable data class CurriculumProgressPhase(val id:String="",val name:String="",val description:String?=null,val level:Int=0,val durationWeeks:Int=0,val status:String="LOCKED",val progress:Int=0,val totalRequired:Int=0,val completedRequired:Int=0)
@Serializable data class CurriculumProgressDay(val id:String="",val dayNumber:Int=0,val title:String="",val purpose:String?=null,val targetMinutes:Int=0,val totalRequired:Int=0,val completedRequired:Int=0,val status:String="UPCOMING")
@Serializable data class CurriculumProgressResponse(val current:CurriculumProgressCurrent?=null,val phases:List<CurriculumProgressPhase> = emptyList(),val weekDays:List<CurriculumProgressDay> = emptyList())
@Serializable data class PlacementQuestion(val questionId:String="",val subjectId:String="",val subjectName:String="",val topicId:String="",val topicName:String="",val prompt:String="",val options:List<String> = emptyList())
@Serializable data class PlacementResponse(val questions:List<PlacementQuestion> = emptyList())
interface CurriculumApi {
 @GET("api/curriculum") suspend fun curriculum():Response<CurriculumResponse>
 @GET("api/curriculum/tree") suspend fun tree(@Query("curriculumId") curriculumId:String?=null):Response<CurriculumTreeResponse>
 @GET("api/curriculum/progress") suspend fun progress():Response<CurriculumProgressResponse>
 @GET("api/onboarding/placement-quiz") suspend fun placementQuiz():Response<PlacementResponse>
}
