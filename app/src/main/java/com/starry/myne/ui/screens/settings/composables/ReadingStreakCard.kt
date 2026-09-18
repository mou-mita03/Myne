package com.starry.myne.ui.screens.settings.composables

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.wrapContentHeight
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.surfaceColorAtElevation
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import com.starry.myne.helpers.ReadingStreakUiState
import com.starry.myne.ui.theme.poppinsFont

@Composable
fun ReadingStreakCard(
    streakState: ReadingStreakUiState
) {
    val progress = (streakState.todayReadingMinutes.toFloat() / streakState.dailyGoalMinutes)
        .coerceIn(0f, 1f)
    val progressText = if (streakState.isCompletedToday) {
        "Done for today"
    } else {
        "Today: ${streakState.todayReadingMinutes}/${streakState.dailyGoalMinutes} min"
    }
    val helperText = if (streakState.isCompletedToday) {
        "Done for today"
    } else {
        "Read ${streakState.dailyGoalMinutes} min today to continue"
    }

    Card(
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceColorAtElevation(3.dp)
        ),
        modifier = Modifier
            .padding(bottom = 8.dp)
            .fillMaxWidth()
            .wrapContentHeight(),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 14.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "Reading Streak",
                    fontFamily = poppinsFont,
                    color = MaterialTheme.colorScheme.onSurface,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                )
                Text(
                    text = "${streakState.currentStreak} Days",
                    fontFamily = poppinsFont,
                    color = MaterialTheme.colorScheme.onSurface,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                )
            }

            Text(
                text = helperText,
                fontFamily = poppinsFont,
                color = Color.Gray,
                fontSize = 13.sp,
                lineHeight = 1.3.em,
                fontWeight = FontWeight.Medium,
            )

            LinearProgressIndicator(
                progress = { progress },
                modifier = Modifier.fillMaxWidth(),
                color = MaterialTheme.colorScheme.primary,
                trackColor = MaterialTheme.colorScheme.surface
            )

            Text(
                text = progressText,
                fontFamily = poppinsFont,
                color = if (streakState.isCompletedToday) {
                    MaterialTheme.colorScheme.primary
                } else {
                    Color.Gray
                },
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
            )
        }
    }
}
