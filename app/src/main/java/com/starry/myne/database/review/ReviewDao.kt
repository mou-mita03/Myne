package com.starry.myne.database.review

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query

@Dao
interface ReviewDao {
    @Query("SELECT * FROM book_reviews WHERE book_id = :bookId LIMIT 1")
    fun getForBook(bookId: Int): Review?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    fun save(review: Review)

    @Query("DELETE FROM book_reviews WHERE book_id = :bookId")
    fun deleteForBook(bookId: Int)

    @Query("SELECT COALESCE(AVG(rating), 0.0) AS averageRating, COUNT(*) AS totalReviews, " +
        "COALESCE(SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END), 0) AS oneStar, " +
        "COALESCE(SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END), 0) AS twoStar, " +
        "COALESCE(SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END), 0) AS threeStar, " +
        "COALESCE(SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END), 0) AS fourStar, " +
        "COALESCE(SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END), 0) AS fiveStar " +
        "FROM book_reviews WHERE book_id = :bookId")
    fun getSummary(bookId: Int): RatingSummary
}
