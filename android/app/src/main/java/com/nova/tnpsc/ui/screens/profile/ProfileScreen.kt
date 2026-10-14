package com.nova.tnpsc.ui.screens.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.nova.tnpsc.data.learner
import com.nova.tnpsc.ui.components.Eyebrow
import com.nova.tnpsc.ui.components.NovaCard
import com.nova.tnpsc.ui.components.NovaStat
import com.nova.tnpsc.ui.theme.NovaInkMuted
import com.nova.tnpsc.ui.theme.NovaPrimary
import com.nova.tnpsc.ui.theme.NovaSecondaryTint
import com.nova.tnpsc.ui.theme.NovaWarmAccent
import com.nova.tnpsc.ui.theme.NovaWarmTint

@Composable
fun ProfileScreen() {
    LazyColumn(
        modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            NovaCard {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier.size(56.dp).clip(CircleShape).background(NovaSecondaryTint),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text("Y", color = NovaPrimary, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.headlineMedium)
                    }
                    Spacer(Modifier.width(16.dp))
                    Column {
                        Text(learner.name, style = MaterialTheme.typography.headlineMedium)
                        Text("Preparing for ${learner.exam}", color = NovaInkMuted, style = MaterialTheme.typography.bodyMedium)
                    }
                }
            }
        }

        item {
            NovaCard {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    NovaStat(learner.streak.toString(), "day streak", color = NovaWarmAccent)
                    NovaStat("Lv ${learner.level}", "${learner.xp} XP")
                }
            }
        }

        item {
            NovaCard {
                Eyebrow("How you learn")
                Spacer(Modifier.height(12.dp))
                listOf(
                    "Daily goal" to "30 minutes",
                    "Preferred time" to "Evening · 7pm",
                    "Rest day" to "Sunday",
                    "Difficulty" to "Gentle",
                ).forEach { (label, value) ->
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(label)
                        Text(value, color = NovaPrimary, fontWeight = FontWeight.SemiBold)
                    }
                    Spacer(Modifier.height(10.dp))
                }
            }
        }
    }
}
