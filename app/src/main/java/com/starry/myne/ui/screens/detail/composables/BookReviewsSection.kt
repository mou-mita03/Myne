package com.starry.myne.ui.screens.detail.composables

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.outlined.StarBorder
import androidx.compose.material3.Button
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.starry.myne.database.review.RatingSummary
import com.starry.myne.ui.screens.detail.viewmodels.BookDetailViewModel
import com.starry.myne.ui.theme.poppinsFont

@Composable
fun BookReviewsSection(bookId: Int, viewModel: BookDetailViewModel) {
    val state = viewModel.state
    val canReview = viewModel.canReview(bookId)
    var rating by remember(state.review) { mutableIntStateOf(state.review?.rating ?: 5) }
    var body by remember(state.review) { mutableStateOf(state.review?.body.orEmpty()) }
    var editing by remember(state.review) { mutableStateOf(state.review == null) }

    Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("Ratings & reviews", fontFamily = poppinsFont, fontWeight = FontWeight.SemiBold)
        RatingOverview(state.ratingSummary)
        HorizontalDivider()
        if (!canReview) {
            Text("Only verified readers can review books they have purchased or downloaded.", fontFamily = poppinsFont)
        } else if (editing) {
            Text(if (state.review == null) "Write a review" else "Edit your review", fontFamily = poppinsFont)
            StarPicker(rating) { rating = it }
            OutlinedTextField(value = body, onValueChange = { body = it }, modifier = Modifier.fillMaxWidth(), label = { Text("Your review") }, minLines = 3)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = { viewModel.saveReview(bookId, rating, body); editing = false }, enabled = body.isNotBlank()) { Text("Save review") }
                if (state.review != null) TextButton(onClick = { body = state.review.body; rating = state.review.rating; editing = false }) { Text("Cancel") }
            }
        } else {
            state.review?.let { review ->
                StarPicker(review.rating) {}
                Text(review.body, fontFamily = poppinsFont)
                Row {
                    TextButton(onClick = { editing = true }) { Text("Edit") }
                    TextButton(onClick = { viewModel.deleteReview(bookId); body = ""; rating = 5; editing = true }) { Text("Delete") }
                }
            }
        }
    }
}

@Composable private fun RatingOverview(summary: RatingSummary) {
    Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
        Text("${"%.1f".format(summary.averageRating)} / 5 · ${summary.totalReviews} review${if (summary.totalReviews == 1) "" else "s"}", fontFamily = poppinsFont, fontWeight = FontWeight.SemiBold)
        (5 downTo 1).forEach { rating -> Text("$rating ★  ${summary.countFor(rating)}", fontFamily = poppinsFont) }
    }
}

@Composable private fun StarPicker(rating: Int, onRatingChanged: (Int) -> Unit) {
    Row {
        (1..5).forEach { star -> IconButton(onClick = { onRatingChanged(star) }) {
            Icon(if (star <= rating) Icons.Filled.Star else Icons.Outlined.StarBorder, contentDescription = "$star stars", tint = if (star <= rating) Color(0xFFFFB300) else Color.Unspecified)
        } }
    }
}
