/**
 * Copyright (c) [2022 - Present] Stɑrry Shivɑm
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package com.starry.myne.ui.screens.detail.viewmodels

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.starry.myne.api.BookAPI
import com.starry.myne.api.models.Book
import com.starry.myne.api.models.BookSet
import com.starry.myne.api.models.ExtraInfo
import com.starry.myne.database.library.LibraryDao
import com.starry.myne.database.library.LibraryItem
import com.starry.myne.database.review.RatingSummary
import com.starry.myne.database.review.Review
import com.starry.myne.database.review.ReviewDao
import com.starry.myne.helpers.Constants
import com.starry.myne.helpers.DailyTokenManager
import com.starry.myne.helpers.PreferenceUtil
import com.starry.myne.helpers.UserFirestoreRepository
import com.starry.myne.helpers.book.BookAccessManager
import com.starry.myne.helpers.book.BookDownloader
import com.starry.myne.helpers.book.BookUtils
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

data class BookDetailScreenState(
    val isLoading: Boolean = true,
    val bookSet: BookSet = BookSet(0, null, null, emptyList()),
    val extraInfo: ExtraInfo = ExtraInfo(),
    val bookLibraryItem: LibraryItem? = null,
    val review: Review? = null,
    val ratingSummary: RatingSummary = RatingSummary(),
    val error: String? = null
)


@HiltViewModel
class BookDetailViewModel @Inject constructor(
    private val bookAPI: BookAPI,
    val libraryDao: LibraryDao,
    val bookDownloader: BookDownloader,
    private val preferenceUtil: PreferenceUtil,
    private val reviewDao: ReviewDao,
    private val userFirestoreRepository: UserFirestoreRepository,
    private val bookAccessManager: BookAccessManager
) : ViewModel() {
    var state by mutableStateOf(BookDetailScreenState())
        private set

    fun getInternalReaderSetting() = preferenceUtil.getBoolean(
        PreferenceUtil.INTERNAL_READER_BOOL, true
    )

    fun getBookAccessTokenCost(): Int = bookAccessManager.getBookAccessTokenCost()
    fun isPremiumUser(): Boolean = bookAccessManager.isPremiumUser()

    fun isBookOwned(bookId: Int): Boolean = bookAccessManager.isBookOwned(bookId)

    fun getBookDetails(bookId: String) {
        viewModelScope.launch(Dispatchers.IO) {
            try {
                // This method can be called multiple times. like if
                // request fails and user clicks on retry button.
                // So, we are setting isLoading to true before making
                // the request to show the loading indicator in the UI.
                state = state.copy(isLoading = true)
                val bookSet = bookAPI.getBookById(bookId).getOrNull()!!
                val extraInfo = bookAPI.getExtraInfo(bookSet.books.first().title)
                // If API response is cached, it will not show the loading
                // indicator. So, we are adding a delay to show the loading
                // indicator. This is just for better UX.
                if (bookSet.isCached) delay(400)
                state = if (extraInfo != null) {
                    state.copy(bookSet = bookSet, extraInfo = extraInfo)
                } else {
                    state.copy(bookSet = bookSet)
                }
                val libraryItem = libraryDao.getItemByBookId(bookId.toInt())
                if (libraryItem != null && !userFirestoreRepository.isBookOwned(bookId.toInt())) {
                    userFirestoreRepository.markBookOwned(bookId.toInt())
                }
                state = state.copy(bookLibraryItem = libraryItem, isLoading = false, error = null)
                preferenceUtil.putInt(PreferenceUtil.RECENTLY_VIEWED_BOOK_ID_INT, bookId.toInt())
                preferenceUtil.putString(
                    PreferenceUtil.RECENTLY_VIEWED_SUBJECTS_STR,
                    bookSet.books.first().subjects.joinToString("|")
                )
                loadReview(bookId.toInt())
            } catch (exc: Exception) {
                state = state.copy(
                    error = exc.localizedMessage ?: Constants.UNKNOWN_ERR,
                    isLoading = false
                )
            }
        }
    }

    private fun loadReview(bookId: Int) {
        state = state.copy(review = reviewDao.getForBook(bookId), ratingSummary = reviewDao.getSummary(bookId))
    }

    /** Purchased/downloaded books are the sole eligibility criterion for reviewing. */
    fun canReview(bookId: Int) = state.bookLibraryItem != null || userFirestoreRepository.isBookOwned(bookId)

    fun saveReview(bookId: Int, rating: Int, body: String) {
        if (!canReview(bookId) || body.isBlank()) return
        viewModelScope.launch(Dispatchers.IO) {
            val previous = reviewDao.getForBook(bookId)
            val now = System.currentTimeMillis()
            reviewDao.save(Review(bookId, rating.coerceIn(1, 5), body.trim(), previous?.createdAt ?: now, now).also { it.id = previous?.id ?: 0 })
            loadReview(bookId)
        }
    }

    fun deleteReview(bookId: Int) {
        if (!canReview(bookId)) return
        viewModelScope.launch(Dispatchers.IO) { reviewDao.deleteForBook(bookId); loadReview(bookId) }
    }

    fun reFetchLibraryItem(bookId: Int, onComplete: (LibraryItem) -> Unit) {
        viewModelScope.launch(Dispatchers.IO) {
            val libraryItem = libraryDao.getItemByBookId(bookId)
            state = state.copy(bookLibraryItem = libraryItem)
            libraryItem?.let { withContext(Dispatchers.Main) { onComplete(libraryItem) } }
        }
    }

    fun toggleFavorite() {
        val libraryItem = state.bookLibraryItem ?: return
        viewModelScope.launch(Dispatchers.IO) {
            libraryDao.updateFavorite(libraryItem.id, !libraryItem.isFavorite)
            userFirestoreRepository.syncFavoriteBookIdsFromLocal()
            state = state.copy(
                bookLibraryItem = libraryDao.getItemByBookId(libraryItem.bookId)
            )
        }
    }

    fun downloadBook(
        book: Book,
        downloadProgressListener: (Float, Int) -> Unit,
        onInsufficientTokens: () -> Unit = {}
    ) {
        bookAccessManager.acquireBook(
            book = book,
            downloadProgressListener = downloadProgressListener,
            onInsufficientTokens = onInsufficientTokens,
            onReady = { libraryItem ->
                state = state.copy(bookLibraryItem = libraryItem)
            }
        )
    }
}
