package com.nova.tnpsc.data.courses

import kotlinx.serialization.Serializable
import retrofit2.Response
import retrofit2.http.GET

@Serializable
data class CourseLesson(
    val id: String = "",
    val title: String = "",
    val totalUnits: Int = 0,
    val completedUnits: Int = 0,
    val completion: Int = 0,
    val pyqUnits: Int = 0,
    val testUnits: Int = 0,
    val href: String = "",
)

@Serializable
data class CourseChapter(
    val id: String = "",
    val name: String = "",
    val lessons: List<CourseLesson> = emptyList(),
    val completion: Int = 0,
)

@Serializable
data class CourseSubject(
    val id: String = "",
    val name: String = "",
    val chapters: List<CourseChapter> = emptyList(),
    val completion: Int = 0,
    val completedUnits: Int = 0,
    val totalUnits: Int = 0,
)

@Serializable
data class CoursesResponse(
    val curriculumId: String = "",
    val exam: String = "",
    val subjects: List<CourseSubject> = emptyList(),
    val overallCompletion: Int = 0,
    val totalUnits: Int = 0,
    val completedUnits: Int = 0,
    val code: String? = null,
    val message: String? = null,
)

/**
 * Mirrors src/app/api/courses/route.js -- the real backend behind the web
 * app's actual Courses view (.nova-zip-ui/src/components/CoursesView.tsx).
 * Replaces the old Learn tab, which called /api/learn -- an endpoint the
 * live web app never calls at all (only the orphaned legacy /learn pages
 * did); Courses/api/courses is what the live app actually shows.
 */
interface CoursesApi {
    @GET("api/courses")
    suspend fun courses(): Response<CoursesResponse>
}
