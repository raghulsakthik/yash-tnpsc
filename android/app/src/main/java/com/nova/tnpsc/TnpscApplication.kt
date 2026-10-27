package com.nova.tnpsc

import android.app.Application
import com.nova.tnpsc.data.auth.AuthRepository
import com.nova.tnpsc.data.courses.CoursesApi
import com.nova.tnpsc.data.journey.JourneyApi
import com.nova.tnpsc.data.lesson.LessonApi
import com.nova.tnpsc.data.network.ApiClient
import com.nova.tnpsc.data.plan.PlanApi
import com.nova.tnpsc.data.platform.PlatformApi
import com.nova.tnpsc.data.platform.CurriculumApi
import com.nova.tnpsc.data.practice.PracticeApi
import com.nova.tnpsc.data.profile.ProfileApi
import com.nova.tnpsc.data.pyq.PyqApi
import com.nova.tnpsc.data.quicklab.QuickLabApi
import com.nova.tnpsc.data.tests.TestsApi
import com.nova.tnpsc.data.features.FeatureApi
import com.nova.tnpsc.data.proctoring.ProctoringApi
import com.nova.tnpsc.push.FcmTokenRegistrar

/**
 * Holds the app's single [ApiClient], the real-data Retrofit services built
 * on top of it, and [AuthRepository] / [FcmTokenRegistrar] -- one instance
 * each for the life of the process. Plain manual DI -- the app is small
 * enough that a framework (Hilt/Koin) would be more ceremony than the
 * handful of objects it's wiring together.
 */
class TnpscApplication : Application() {

    lateinit var apiClient: ApiClient
        private set
    lateinit var authRepository: AuthRepository
        private set
    lateinit var fcmTokenRegistrar: FcmTokenRegistrar
        private set

    lateinit var planApi: PlanApi
        private set
    lateinit var profileApi: ProfileApi
        private set
    lateinit var coursesApi: CoursesApi
        private set
    lateinit var practiceApi: PracticeApi
        private set
    lateinit var journeyApi: JourneyApi
        private set
    lateinit var lessonApi: LessonApi
        private set
    lateinit var quickLabApi: QuickLabApi
        private set
    lateinit var testsApi: TestsApi
        private set
    lateinit var pyqApi: PyqApi
        private set
    lateinit var featureApi: FeatureApi
        private set
    lateinit var platformApi: PlatformApi
        private set
    lateinit var curriculumApi: CurriculumApi
        private set
    lateinit var proctoringApi: ProctoringApi
        private set

    override fun onCreate() {
        super.onCreate()
        apiClient = ApiClient(this)
        authRepository = AuthRepository(apiClient)
        fcmTokenRegistrar = FcmTokenRegistrar(apiClient)

        planApi = apiClient.create(PlanApi::class.java)
        profileApi = apiClient.create(ProfileApi::class.java)
        coursesApi = apiClient.create(CoursesApi::class.java)
        practiceApi = apiClient.create(PracticeApi::class.java)
        journeyApi = apiClient.create(JourneyApi::class.java)
        lessonApi = apiClient.create(LessonApi::class.java)
        quickLabApi = apiClient.create(QuickLabApi::class.java)
        testsApi = apiClient.create(TestsApi::class.java)
        pyqApi = apiClient.create(PyqApi::class.java)
        featureApi = apiClient.create(FeatureApi::class.java)
        platformApi = apiClient.create(PlatformApi::class.java)
        curriculumApi = apiClient.create(CurriculumApi::class.java)
        proctoringApi = apiClient.create(ProctoringApi::class.java)
    }
}
