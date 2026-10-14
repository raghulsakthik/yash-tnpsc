package com.nova.tnpsc.ui.screens.home

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavHostController
import com.nova.tnpsc.data.learner
import com.nova.tnpsc.data.quickLabModes
import com.nova.tnpsc.data.revisionDue
import com.nova.tnpsc.ui.components.Eyebrow
import com.nova.tnpsc.ui.components.NovaCard
import com.nova.tnpsc.ui.components.NovaStat
import com.nova.tnpsc.ui.theme.NovaInkMuted
import com.nova.tnpsc.ui.theme.NovaPaperSunk
import com.nova.tnpsc.ui.theme.NovaPrimary
import com.nova.tnpsc.ui.theme.NovaSecondaryTint
import com.nova.tnpsc.ui.theme.NovaSuccess
import com.nova.tnpsc.ui.theme.NovaSuccessTint
import com.nova.tnpsc.ui.theme.NovaWarmAccent

@Composable
fun HomeScreen(navController: NavHostController) {
    LazyColumn(
        modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            Text("WEDNESDAY, 14 OCTOBER", style = MaterialTheme.typography.labelMedium, color = NovaInkMuted)
            Spacer(Modifier.height(10.dp))
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(50))
                    .background(NovaSuccessTint)
                    .padding(horizontal = 14.dp, vertical = 6.dp),
            ) {
                Text("● IMPROVING  accuracy up, speed steady", color = NovaSuccess, fontWeight = FontWeight.SemiBold, fontSize = 12.sp)
            }
            Spacer(Modifier.height(14.dp))
            Text("Good morning, ${learner.name}.", style = MaterialTheme.typography.displayLarge)
            Spacer(Modifier.height(8.dp))
            Text(
                "Today's focus is strengthening Fractions — about 18 minutes. Decimal conversion is the one piece still slowing you down.",
                style = MaterialTheme.typography.bodyLarge,
                color = NovaInkMuted,
            )
        }

        item {
            NovaCard {
                Eyebrow("Next small win", color = NovaWarmAccent)
                Spacer(Modifier.height(8.dp))
                Text("Master decimal conversion", style = MaterialTheme.typography.headlineMedium)
                Spacer(Modifier.height(8.dp))
                Text(
                    "Three worked examples, then six questions. This is the last gap between you and Fractions being done.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = NovaInkMuted,
                )
                Spacer(Modifier.height(16.dp))
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                    Button(onClick = { navController.navigate("practice") }, shape = RoundedCornerShape(10.dp)) {
                        Text("Continue")
                    }
                    Text("12 minutes", color = NovaInkMuted)
                }
            }
        }

        item {
            NovaCard(background = NovaSecondaryTint, border = null) {
                Eyebrow("✦ Memory echo", color = MaterialTheme.colorScheme.secondary)
                Spacer(Modifier.height(8.dp))
                Text("HCF and LCM", style = MaterialTheme.typography.titleLarge)
                Spacer(Modifier.height(8.dp))
                Text(
                    "This one gave you trouble three weeks ago. You haven't seen it since — a good moment to find out if it stuck.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = NovaInkMuted,
                )
                Spacer(Modifier.height(12.dp))
                Text("Try one question →", color = MaterialTheme.colorScheme.secondary, fontWeight = FontWeight.SemiBold)
            }
        }

        item {
            NovaCard {
                Eyebrow("Revision due")
                Spacer(Modifier.height(12.dp))
                revisionDue.forEach { r ->
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column {
                            Text(r.name, fontWeight = FontWeight.SemiBold)
                            Text(r.badge, style = MaterialTheme.typography.bodySmall, color = NovaInkMuted)
                        }
                        Text("Review", color = NovaPrimary, fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }

        item {
            NovaCard {
                Eyebrow("Quick Lab · 2 minutes")
                Spacer(Modifier.height(12.dp))
                quickLabModes.take(3).forEach { m ->
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .background(NovaPaperSunk)
                            .clickable { navController.navigate("practice") }
                            .padding(14.dp),
                    ) {
                        Text(m.name, fontWeight = FontWeight.SemiBold)
                        Text(m.stat, style = MaterialTheme.typography.bodySmall, color = NovaInkMuted)
                    }
                    Spacer(Modifier.height(8.dp))
                }
            }
        }

        item {
            NovaCard {
                Eyebrow("This week")
                Spacer(Modifier.height(14.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(20.dp)) {
                    NovaStat("186", "minutes")
                    NovaStat("214", "questions")
                    NovaStat("81%", "accuracy", color = NovaSuccess)
                    NovaStat("12", "day streak", color = NovaWarmAccent)
                }
            }
        }
    }
}
