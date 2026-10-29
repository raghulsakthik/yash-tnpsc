package com.nova.tnpsc.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material.icons.automirrored.outlined.MenuBook
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Timeline
import androidx.compose.material.icons.filled.MoreHoriz
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.outlined.MoreHoriz
import androidx.compose.material.icons.outlined.AutoAwesome
import androidx.compose.material.icons.outlined.Bolt
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Timeline
import androidx.compose.material.icons.outlined.Shield
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.runtime.collectAsState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.nova.tnpsc.data.auth.AuthRepository
import com.nova.tnpsc.data.auth.AuthState
import com.nova.tnpsc.ui.components.YashLoadingScreen
import com.nova.tnpsc.ui.screens.home.HomeScreen
import com.nova.tnpsc.ui.screens.journey.JourneyScreen
import com.nova.tnpsc.ui.screens.courses.CourseDetailScreen
import com.nova.tnpsc.ui.screens.courses.CoursesScreen
import com.nova.tnpsc.ui.screens.lesson.LessonScreen
import com.nova.tnpsc.ui.screens.login.LoginScreen
import com.nova.tnpsc.ui.screens.onboarding.OnboardingScreen
import com.nova.tnpsc.ui.screens.practice.PracticeScreen
import com.nova.tnpsc.ui.screens.profile.ProfileScreen
import com.nova.tnpsc.ui.screens.pyq.PyqPracticeScreen
import com.nova.tnpsc.ui.screens.pyq.PyqScreen
import com.nova.tnpsc.ui.screens.quicklab.QuickLabRoundScreen
import com.nova.tnpsc.ui.screens.quicklab.QuickLabScreen
import com.nova.tnpsc.ui.screens.tests.TestResultScreen
import com.nova.tnpsc.ui.screens.tests.TestRunScreen
import com.nova.tnpsc.ui.screens.tests.TestsScreen
import com.nova.tnpsc.ui.screens.features.*

// The same default used server-side when no topic is specified -- see
// DEFAULT_PRACTICE_TOPIC in the web app's AppShell.
const val DEFAULT_PRACTICE_TOPIC = "aptitude.fractions"

// Labels and the 5-tab set match the Android design package's
// AndroidBottomNav.tsx exactly (Today / Syllabus / Practice / Mocks /
// Progress). Journey and the feature hub ("More") aren't bottom tabs in
// that design either -- they're reached from the Profile tab instead,
// same as the design's drawer puts them under Profile-adjacent links.
sealed class Destination(val route: String, val label: String, val outline: ImageVector, val filled: ImageVector) {
    data object Home : Destination("home", "Today", Icons.Outlined.AutoAwesome, Icons.Filled.AutoAwesome)
    data object Learn : Destination("learn", "Syllabus", Icons.AutoMirrored.Outlined.MenuBook, Icons.AutoMirrored.Filled.MenuBook)
    data object Practice : Destination("practice", "Practice", Icons.Outlined.Bolt, Icons.Filled.Bolt)
    data object Tests : Destination("tests", "Mocks", Icons.Outlined.Shield, Icons.Filled.Shield)
    data object Profile : Destination("profile", "Progress", Icons.Outlined.Person, Icons.Filled.Person)
    data object Journey : Destination("journey", "Journey", Icons.Outlined.Timeline, Icons.Filled.Timeline)
    data object More : Destination("more", "More", Icons.Outlined.MoreHoriz, Icons.Filled.MoreHoriz)
}

/** Builds a route to practice a specific topic, optionally in REVISION or MISTAKES mode. */
fun practiceRoute(topic: String = DEFAULT_PRACTICE_TOPIC, mode: String = "PRACTICE"): String =
    "practice?topic=$topic&mode=$mode"

private val bottomDestinations = listOf(Destination.Home, Destination.Learn, Destination.Practice, Destination.Tests, Destination.Profile)

/**
 * The app's top-level gate: shows a loading spinner while a saved session
 * cookie is checked against the real backend, then either [LoginScreen] or
 * the normal bottom-nav app, driven entirely by [AuthRepository.state].
 */
@Composable
fun NovaApp(authRepository: AuthRepository, onLoggedIn: suspend () -> Unit) {
    val authState by authRepository.state.collectAsState()

    LaunchedEffect(Unit) {
        authRepository.restoreSession()
    }

    LaunchedEffect(authState) {
        if (authState is AuthState.LoggedIn) onLoggedIn()
    }

    when (authState) {
        is AuthState.Unknown -> YashLoadingScreen()
        is AuthState.LoggedOut -> {
            var authScreen by androidx.compose.runtime.remember { androidx.compose.runtime.mutableStateOf("login") }
            when (authScreen) {
                "forgot" -> com.nova.tnpsc.ui.screens.login.ForgotPasswordScreen(
                    authRepository = authRepository,
                    onBackToLogin = { authScreen = "login" },
                    onHaveToken = { authScreen = "reset" },
                )
                "reset" -> com.nova.tnpsc.ui.screens.login.ResetPasswordScreen(
                    authRepository = authRepository,
                    onBackToLogin = { authScreen = "login" },
                )
                else -> LoginScreen(authRepository, onForgotPassword = { authScreen = "forgot" })
            }
        }
        is AuthState.LoggedIn -> {
            var checked by androidx.compose.runtime.remember { androidx.compose.runtime.mutableStateOf(false) }
            var onboarded by androidx.compose.runtime.remember { androidx.compose.runtime.mutableStateOf(true) }
            val app = androidx.compose.ui.platform.LocalContext.current.applicationContext as com.nova.tnpsc.TnpscApplication
            LaunchedEffect(Unit) { onboarded = app.profileApi.get().body()?.onboarded ?: true; checked = true }
            if (!checked) YashLoadingScreen() else if (!onboarded) OnboardingScreen(onComplete = { onboarded = true }) else MainNavHost(authRepository)
        }
    }
}

@Composable
private fun MainNavHost(authRepository: AuthRepository) {
    val navController = rememberNavController()

    Scaffold(
        bottomBar = { NovaBottomBar(navController) },
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = Destination.Home.route,
            // Both edges, not just bottom -- enableEdgeToEdge() (MainActivity)
            // draws the whole app behind the system bars, and Scaffold's
            // innerPadding is what keeps content out from under them. Only
            // applying the bottom inset left every screen's title drawing
            // directly under the status bar/clock -- visible as an overlap
            // on real devices (the emulator's status bar happened to be
            // short enough that it wasn't obvious there).
            modifier = Modifier.padding(innerPadding),
        ) {
            composable(Destination.Home.route) { HomeScreen(navController) }
            composable(Destination.Learn.route) { CoursesScreen(navController) }
            composable("course/{chapterId}") { backStackEntry ->
                val chapterId = backStackEntry.arguments?.getString("chapterId") ?: ""
                CourseDetailScreen(chapterId, navController)
            }
            composable(
                "practice?topic={topic}&mode={mode}",
                arguments = listOf(
                    navArgument("topic") { type = NavType.StringType; defaultValue = DEFAULT_PRACTICE_TOPIC },
                    navArgument("mode") { type = NavType.StringType; defaultValue = "PRACTICE" },
                ),
            ) { backStackEntry ->
                val topic = backStackEntry.arguments?.getString("topic") ?: DEFAULT_PRACTICE_TOPIC
                val mode = backStackEntry.arguments?.getString("mode") ?: "PRACTICE"
                PracticeScreen(topic = topic, mode = mode)
            }
            composable(Destination.Journey.route) { JourneyScreen() }
            composable(Destination.Profile.route) { ProfileScreen(authRepository, navController) }
            composable(Destination.More.route) { FeatureHub(navController) }
            composable("bookmarks") { BookmarksScreen(navController) }
            composable("notifications") { NotificationsScreen() }
            composable("achievements") { AchievementsScreen() }
            composable("mistakes") { MistakesScreen(navController) }
            composable("search") { SearchScreen(navController) }
            composable("progress") { ProgressScreen() }
            composable("weekly-review") { WeeklyReviewScreen() }
            composable("milestones") { MilestonesScreen() }
            composable("notes") { NotesScreen() }
            composable("resources") { ResourcesScreen() }
            composable("admin") {
                val role = (authRepository.state.value as? AuthState.LoggedIn)?.role ?: "ADMIN"
                com.nova.tnpsc.ui.screens.admin.AdminPortalScreen(
                    sessionRole = role,
                    onReturnToLearnerHub = { navController.popBackStack() },
                )
            }
            composable("lesson/{topic}") { backStackEntry ->
                val topic = backStackEntry.arguments?.getString("topic") ?: DEFAULT_PRACTICE_TOPIC
                LessonScreen(topic = topic, navController = navController)
            }
            composable("quicklab") { QuickLabScreen(navController) }
            composable("quicklab/{mode}") { backStackEntry ->
                val mode = backStackEntry.arguments?.getString("mode") ?: "quick-math"
                QuickLabRoundScreen(mode = mode, navController = navController)
            }
            composable("tests") { TestsScreen(navController) }
            composable("tests/{testId}") { backStackEntry ->
                val testId = backStackEntry.arguments?.getString("testId") ?: ""
                TestRunScreen(testId = testId, navController = navController)
            }
            composable("tests/{testId}/result") { backStackEntry ->
                val testId = backStackEntry.arguments?.getString("testId") ?: ""
                TestResultScreen(testId = testId, navController = navController)
            }
            composable("pyq") { PyqScreen(navController) }
            composable(
                "pyq/practice?year={year}&topic={topic}",
                arguments = listOf(
                    navArgument("year") { type = NavType.StringType; nullable = true; defaultValue = null },
                    navArgument("topic") { type = NavType.StringType; nullable = true; defaultValue = null },
                ),
            ) { backStackEntry ->
                val year = backStackEntry.arguments?.getString("year")?.toIntOrNull()
                val topic = backStackEntry.arguments?.getString("topic")
                PyqPracticeScreen(year = year, topic = topic)
            }
        }
    }
}

@Composable
private fun NovaBottomBar(navController: NavHostController) {
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination

    NavigationBar {
        bottomDestinations.forEach { destination ->
            val selected = currentRoute?.hierarchy?.any { it.route == destination.route } == true
            NavigationBarItem(
                selected = selected,
                onClick = {
                    navController.navigate(destination.route) {
                        popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                        launchSingleTop = true
                        restoreState = true
                    }
                },
                icon = { Icon(if (selected) destination.filled else destination.outline, contentDescription = destination.label) },
                label = { Text(destination.label) },
            )
        }
    }
}
