package com.starry.myne.database.review

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

/** A reader's local review. A backend provider can later sync this contract. */
@Entity(tableName = "book_reviews", indices = [Index(value = ["book_id"], unique = true)])
data class Review(
    @ColumnInfo(name = "book_id") val bookId: Int,
    val rating: Int,
    val body: String,
    @ColumnInfo(name = "created_at") val createdAt: Long,
    @ColumnInfo(name = "updated_at") val updatedAt: Long
) {
    @PrimaryKey(autoGenerate = true) var id: Int = 0
}

data class RatingSummary(
    val averageRating: Double = 0.0,
    val totalReviews: Int = 0,
    val oneStar: Int = 0,
    val twoStar: Int = 0,
    val threeStar: Int = 0,
    val fourStar: Int = 0,
    val fiveStar: Int = 0
) {
    fun countFor(rating: Int) = when (rating) {
        1 -> oneStar; 2 -> twoStar; 3 -> threeStar; 4 -> fourStar; 5 -> fiveStar; else -> 0
    }
}
