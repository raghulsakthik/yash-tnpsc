package com.nova.tnpsc.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material.icons.filled.MenuBook
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Timeline
import androidx.compose.material.icons.outlined.AutoAwesome
import androidx.compose.material.icons.outlined.Bolt
import androidx.compose.material.icons.outlined.MenuBook
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Timeline
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
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
import com.nova.tnpsc.ui.screens.home.HomeScreen
import com.nova.tnpsc.ui.screens.journey.JourneyScreen
import com.nova.tnpsc.ui.screens.learn.LearnScreen
import com.nova.tnpsc.ui.screens.learn.SubjectScreen
import com.nova.tnpsc.ui.screens.lesson.LessonScreen
import com.nova.tnpsc.ui.screens.login.LoginScreen
import com.nova.tnpsc.ui.screens.practice.PracticeScreen
import com.nova.tnpsc.ui.screens.profile.ProfileScreen
import com.nova.tnpsc.ui.screens.quicklab.QuickLabRoundScreen
import com.nova.tnpsc.ui.screens.quicklab.QuickLabScreen
import com.nova.tnpsc.ui.screens.tests.TestResultScreen
import com.nova.tnpsc.ui.screens.tests.TestRunScreen
import com.nova.tnpsc.ui.screens.tests.TestsScreen

// The same default used server-side when no topic is specified -- see
// DEFAULT_PRACTICE_TOPIC in the web app's AppShell.
const val DEFAULT_PRACTICE_TOPIC = "aptitude.fractions"

sealed class Destination(val route: String, val label: String, val outline: ImageVector, val filled: ImageVector) {
    data object Home : Destination("home", "Home", Icons.Outlined.AutoAwesome, Icons.Filled.AutoAwesome)
    data object Learn : Destination("learn", "Learn", Icons.Outlined.MenuBook, Icons.Filled.MenuBook)
    data object Practice : Destination("practice", "Practice", Icons.Outlined.Bolt, Icons.Filled.Bolt)
    data object Journey : Destination("journey", "Journey", Icons.Outlined.Timeline, Icons.Filled.Timeline)
    data object Profile : Destination("profile", "Profile", Icons.Outlined.Person, Icons.Filled.Person)
}

/** Builds a route to practice a specific topic, optionally in REVISION or MISTAKES mode. */
fun practiceRoute(topic: String = DEFAULT_PRACTICE_TOPIC, mode: String = "PRACTICE"): String =
    "practice?topic=$topic&mode=$mode"

private val bottomDestinations = listOf(Destination.Home, Destination.Learn, Destination.Practice, Destination.Journey, Destination.Profile)

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
        is AuthState.Unknown -> {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        }
        is AuthState.LoggedOut -> LoginScreen(authRepository)
        is AuthState.LoggedIn -> MainNavHost(authRepository)
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
            modifier = Modifier.padding(bottom = innerPadding.calculateBottomPadding()),
        ) {
            composable(Destination.Home.route) { HomeScreen(navController) }
            composable(Destination.Learn.route) { LearnScreen(navController) }
            composable("learn/{subject}") { backStackEntry ->
                val subject = backStackEntry.arguments?.getString("subject") ?: "general-studies"
                SubjectScreen(subject, navController)
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
            composable(Destination.Profile.route) { ProfileScreen(authRepository) }
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
