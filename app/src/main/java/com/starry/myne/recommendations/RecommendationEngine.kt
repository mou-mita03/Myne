package com.starry.myne.recommendations

import com.starry.myne.api.models.Book
import com.starry.myne.database.library.LibraryItem

/** Replace this implementation with an AI-backed provider without changing callers. */
interface RecommendationEngine {
    fun recommend(candidates: List<Book>, library: List<LibraryItem>, recentlyViewedBookId: Int?, recentlyViewedSubjects: Set<String>): List<Book>
}

class MvpRecommendationEngine : RecommendationEngine {
    override fun recommend(candidates: List<Book>, library: List<LibraryItem>, recentlyViewedBookId: Int?, recentlyViewedSubjects: Set<String>): List<Book> {
        val readTitles = library.map { it.title.lowercase() }.toSet()
        val authorTerms = library.flatMap { it.authors.lowercase().split(',', '&') }.map { it.trim() }.filter { it.isNotBlank() }.toSet()
        return candidates.asSequence().filter { it.title.lowercase() !in readTitles }.map { book ->
            val authorScore = book.authors.count { it.name.lowercase() in authorTerms } * 80
            val genreScore = book.subjects.count { subject -> recentlyViewedSubjects.any { it.isNotBlank() && subject.contains(it, ignoreCase = true) } } * 30
            val recentlyViewedScore = if (book.id == recentlyViewedBookId) -1000 else 0
            val popularityScore = (book.downloadCount / 1_000).coerceAtMost(40)
            book to (authorScore + genreScore + popularityScore + recentlyViewedScore)
        }.sortedByDescending { it.second }.map { it.first }.take(8).toList()
    }
}
