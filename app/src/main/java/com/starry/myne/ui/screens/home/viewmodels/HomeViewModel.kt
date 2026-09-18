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

package com.starry.myne.ui.screens.home.viewmodels

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.starry.myne.api.BookAPI
import com.starry.myne.api.models.Book
import com.starry.myne.database.library.LibraryDao
import com.starry.myne.database.library.LibraryItem
import com.starry.myne.database.progress.ProgressDao
import com.starry.myne.database.progress.ProgressData
import com.starry.myne.epub.EpubParser
import com.starry.myne.helpers.Constants
import com.starry.myne.helpers.NetworkObserver
import com.starry.myne.helpers.Paginator
import com.starry.myne.helpers.PreferenceUtil
import com.starry.myne.recommendations.RecommendationEngine
import kotlinx.coroutines.Dispatchers
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import android.util.Log
import javax.inject.Inject

data class AllBooksState(
    val isLoading: Boolean = false,
    val items: List<Book> = emptyList(),
    val error: String? = null,
    val endReached: Boolean = false,
    val page: Long = 1L
)

data class SearchBarState(
    val searchText: String = "",
    val isSearchBarVisible: Boolean = false,
    val isSortMenuVisible: Boolean = false,
    val isSearching: Boolean = false,
    val searchResults: List<Book> = emptyList()
)

data class ContinueReadingState(
    val libraryItemId: Int,
    val title: String,
    val coverImage: Any?,
    val progressText: String,
)

data class RecommendedBooksState(val items: List<Book> = emptyList())

sealed class UserAction {
    data object SearchIconClicked : UserAction()
    data object CloseIconClicked : UserAction()
    data class TextFieldInput(
        val text: String,
        val networkStatus: NetworkObserver.Status
    ) : UserAction()
}

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val bookAPI: BookAPI,
    private val libraryDao: LibraryDao,
    private val progressDao: ProgressDao,
    private val epubParser: EpubParser,
    private val preferenceUtil: PreferenceUtil,
    private val recommendationEngine: RecommendationEngine,
) : ViewModel() {
    var allBooksState by mutableStateOf(AllBooksState())
    var searchBarState by mutableStateOf(SearchBarState())
    var continueReadingState by mutableStateOf<ContinueReadingState?>(null)
        private set
    var recommendedBooksState by mutableStateOf(RecommendedBooksState())
        private set

    private var searchJob: Job? = null

    init {
        loadContinueReadingItem()
    }

    private val pagination = Paginator(initialPage = allBooksState.page, onLoadUpdated = {
        allBooksState = allBooksState.copy(isLoading = it)
    }, onRequest = { nextPage ->
        try {
            // Only add delay when loading first page to show shimmer effect
            // and avoid flickering when navigating to home from welcome screen
            // and immediately loading the first page.
            if (nextPage == 1L) delay(400L)
            bookAPI.getAllBooks(nextPage)
        } catch (exc: Exception) {
            Result.failure(exc)
        }
    }, getNextPage = {
        allBooksState.page + 1L
    }, onError = {
        allBooksState = allBooksState.copy(error = it?.localizedMessage ?: Constants.UNKNOWN_ERR)
    }, onSuccess = { bookSet, newPage ->

        val books = run {
            val books =
                bookSet.books.filter { it.formats.applicationepubzip != null } as ArrayList<Book>
            // Ignore ...
            val index = books.indexOfFirst { it.id == 1513 }
            if (index != -1) {
                books.removeAt(index)
            }
            books // return the list of books
        }

        allBooksState = allBooksState.copy(
            items = (allBooksState.items + books),
            page = newPage,
            endReached = books.isEmpty()
        )
        refreshRecommendations(allBooksState.items)
    })

    fun loadNextItems() {
        viewModelScope.launch {
            pagination.loadNextItems()
        }
    }

    private fun refreshRecommendations(candidates: List<Book>) {
        viewModelScope.launch(Dispatchers.IO) {
            val history = libraryDao.getAllItemsList()
            val recentId = preferenceUtil.getInt(PreferenceUtil.RECENTLY_VIEWED_BOOK_ID_INT, -1).takeIf { it > 0 }
            val recentSubjects = preferenceUtil.getString(PreferenceUtil.RECENTLY_VIEWED_SUBJECTS_STR, "")
                .orEmpty().split("|").filter { it.isNotBlank() }.toSet()
            recommendedBooksState = RecommendedBooksState(
                recommendationEngine.recommend(candidates, history, recentId, recentSubjects)
            )
        }
    }

    fun reloadItems() {
        pagination.reset()
        allBooksState = AllBooksState()
        loadNextItems()
    }

    fun loadContinueReadingItem() {
        viewModelScope.launch(Dispatchers.IO) {
            val recentEntry = progressDao.getAllReaderItems()
                .firstNotNullOfOrNull { progress ->
                    val libraryItem = libraryDao.getItemById(progress.libraryItemId)
                    if (libraryItem != null && libraryItem.fileExist()) {
                        libraryItem to progress
                    } else {
                        null
                    }
                }

            if (recentEntry == null) {
                continueReadingState = null
                return@launch
            }

            val (libraryItem, progressData) = recentEntry
            continueReadingState = buildContinueReadingState(libraryItem, progressData)
        }
    }

    fun onAction(userAction: UserAction) {
        when (userAction) {
            UserAction.CloseIconClicked -> {
                searchBarState = searchBarState.copy(isSearchBarVisible = false)
            }

            UserAction.SearchIconClicked -> {
                searchBarState = searchBarState.copy(isSearchBarVisible = true)
            }

            is UserAction.TextFieldInput -> {
                searchBarState = searchBarState.copy(searchText = userAction.text)
                if (userAction.networkStatus == NetworkObserver.Status.Available) {
                    searchJob?.cancel()
                    searchJob = viewModelScope.launch {
                        if (userAction.text.isNotBlank()) {
                            searchBarState = searchBarState.copy(isSearching = true)
                        }
                        delay(500L)
                        searchBooks(userAction.text)
                    }
                }
            }

        }
    }

    private suspend fun searchBooks(query: String) {
        if (query.isBlank()) return // no need to search for empty query
        val bookSet = bookAPI.searchBooks(query)
        val books = bookSet.getOrNull()?.books?.filter { it.formats.applicationepubzip != null }
        searchBarState = searchBarState.copy(
            searchResults = books ?: emptyList(),
            isSearching = false
        )
    }

    private suspend fun buildContinueReadingState(
        libraryItem: LibraryItem,
        progressData: ProgressData
    ): ContinueReadingState {
        val coverImage = runCatching {
            val isInternalChineseBook =
                !libraryItem.isImported && epubParser.peekLanguage(libraryItem.filePath) == "zh"
            val epubBook = epubParser.createEpubBook(libraryItem.filePath, !isInternalChineseBook)
            val totalChapters = epubBook.chapters.size
            val progressText = if (totalChapters > 0) {
                "${progressData.getProgressPercent(totalChapters)}% completed"
            } else {
                "Chapter ${progressData.lastChapterIndex + 1}"
            }
            val remoteCover = if (!libraryItem.isImported) {
                runCatching { bookAPI.getExtraInfo(libraryItem.title)?.coverImage }.getOrNull()
            } else {
                null
            }

            ContinueReadingState(
                libraryItemId = libraryItem.id,
                title = libraryItem.title,
                coverImage = remoteCover ?: epubBook.coverImage,
                progressText = progressText
            )
        }.getOrElse { exc ->
            Log.e("HomeViewModel", "Failed to load continue reading item.", exc)
            ContinueReadingState(
                libraryItemId = libraryItem.id,
                title = libraryItem.title,
                coverImage = null,
                progressText = "Chapter ${progressData.lastChapterIndex + 1}"
            )
        }

        return coverImage
    }

}
