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
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.nova.tnpsc.ui.screens.home.HomeScreen
import com.nova.tnpsc.ui.screens.journey.JourneyScreen
import com.nova.tnpsc.ui.screens.learn.LearnScreen
import com.nova.tnpsc.ui.screens.learn.SubjectScreen
import com.nova.tnpsc.ui.screens.practice.PracticeScreen
import com.nova.tnpsc.ui.screens.profile.ProfileScreen

sealed class Destination(val route: String, val label: String, val outline: ImageVector, val filled: ImageVector) {
    data object Home : Destination("home", "Home", Icons.Outlined.AutoAwesome, Icons.Filled.AutoAwesome)
    data object Learn : Destination("learn", "Learn", Icons.Outlined.MenuBook, Icons.Filled.MenuBook)
    data object Practice : Destination("practice", "Practice", Icons.Outlined.Bolt, Icons.Filled.Bolt)
    data object Journey : Destination("journey", "Journey", Icons.Outlined.Timeline, Icons.Filled.Timeline)
    data object Profile : Destination("profile", "Profile", Icons.Outlined.Person, Icons.Filled.Person)
}

private val bottomDestinations = listOf(Destination.Home, Destination.Learn, Destination.Practice, Destination.Journey, Destination.Profile)

@Composable
fun NovaApp() {
    val navController = rememberNavController()

    Scaffold(
        bottomBar = { NovaBottomBar(navController) },
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = Destination.Home.route,
            modifier = androidx.compose.ui.Modifier.padding(bottom = innerPadding.calculateBottomPadding()),
        ) {
            composable(Destination.Home.route) { HomeScreen(navController) }
            composable(Destination.Learn.route) { LearnScreen(navController) }
            composable("learn/{subject}") { backStackEntry ->
                val subject = backStackEntry.arguments?.getString("subject") ?: "mathematics"
                SubjectScreen(subject)
            }
            composable(Destination.Practice.route) { PracticeScreen() }
            composable(Destination.Journey.route) { JourneyScreen() }
            composable(Destination.Profile.route) { ProfileScreen() }
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
