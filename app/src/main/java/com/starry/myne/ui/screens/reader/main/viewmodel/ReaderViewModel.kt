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


package com.starry.myne.ui.screens.reader.main.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.starry.myne.database.library.LibraryDao
import com.starry.myne.database.progress.ProgressDao
import com.starry.myne.database.progress.ProgressData
import com.starry.myne.epub.EpubParser
import com.starry.myne.epub.asPlainText
import com.starry.myne.epub.models.EpubBook
import com.starry.myne.epub.models.EpubChapter
import com.starry.myne.helpers.PreferenceUtil
import com.starry.myne.helpers.ReadingStreakStore
import com.starry.myne.helpers.UserFirestoreRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.io.FileInputStream
import java.util.concurrent.ConcurrentHashMap
import javax.inject.Inject

enum class ReadAloudPlaybackState {
    Stopped,
    Playing,
    Paused
}

data class ReaderScreenState(
    // Screen state
    val isLoading: Boolean = true,
    val shouldShowLoader: Boolean = false,
    val showReaderMenu: Boolean = false,
    val currentChapterIndex: Int = 0,
    val currentChapter: EpubChapter = EpubChapter("", "", "", emptyList()),
    val chapterScrollPercent: Float = 0f,
    // Book data
    val epubBook: EpubBook? = null,
    val chapters: List<EpubChapter> = emptyList(),
    // Loaded chapter content map: chapterId -> ChapterContent
    val loadedChapters: Map<String, EpubParser.ChapterContent> = emptyMap(),
    // Loaded images map: imagePath -> imageData
    val loadedImages: Map<String, ByteArray> = emptyMap(),
    // Read aloud
    val currentChapterTextForSpeech: String = "",
    val readAloudPlaybackState: ReadAloudPlaybackState = ReadAloudPlaybackState.Stopped,
    // Reader data
    val hasProgressSaved: Boolean = false,
    val lastChapterIndex: Int = 0,
    val lastChapterOffset: Int = 0,
    // Typography
    val fontSize: Int = 100,
    val fontFamily: ReaderFont = ReaderFont.System,
    val lineHeight: Float = 1.2f,
)

@HiltViewModel
class ReaderViewModel @Inject constructor(
    private val libraryDao: LibraryDao,
    private val progressDao: ProgressDao,
    private val preferenceUtil: PreferenceUtil,
    private val readingStreakStore: ReadingStreakStore,
    private val userFirestoreRepository: UserFirestoreRepository,
    private val epubParser: EpubParser
) : ViewModel() {
    companion object {
        private const val MAX_READING_IDLE_GAP_MILLIS = 30_000L
    }

    // Mutable state flow to update the state.
    private val _state = MutableStateFlow(ReaderScreenState())
    val state = _state.asStateFlow()

    // Tracking currently loading items to prevent duplicate requests.
    private val loadingChapterIds = ConcurrentHashMap.newKeySet<String>()
    private val loadingImagePaths = ConcurrentHashMap.newKeySet<String>()
    private var sessionStartTime: Long? = null
    private var lastReadingInteractionTime: Long? = null
    private var accumulatedReadingTimeMillis: Long = 0L

    init {
        viewModelScope.launch {
            _state.update {
                it.copy(
                    fontSize = preferenceUtil.getInt(PreferenceUtil.READER_FONT_SIZE_INT, 100),
                    fontFamily = ReaderFont.getFontById(
                        preferenceUtil.getString(
                            PreferenceUtil.READER_FONT_STYLE_STR,
                            ReaderFont.System.id
                        )!!
                    ),
                    lineHeight = preferenceUtil.getFloat(PreferenceUtil.READER_LINE_HEIGHT_FLOAT, 1.2f)
                )
            }
            // Collect the state to update the current chapter.
            _state.collect {
                if (state.value.isLoading) return@collect
                if (state.value.chapters.isEmpty()) return@collect
                val currentChapter = state.value.chapters.getOrNull(state.value.currentChapterIndex)
                if (currentChapter != null && state.value.currentChapter != currentChapter) {
                    _state.update {
                        it.copy(
                            currentChapter = currentChapter,
                            currentChapterTextForSpeech = it.loadedChapters[currentChapter.chapterId]
                                ?.body
                                ?.asPlainText()
                                .orEmpty()
                        )
                    }
                }
            }
        }
    }

    fun loadEpubBook(libraryItemId: Int, onLoaded: (ReaderScreenState) -> Unit) {
        viewModelScope.launch(Dispatchers.IO) {
            val libraryItem = libraryDao.getItemById(libraryItemId)
            _state.update { it.copy(shouldShowLoader = true) }
            val readerData = progressDao.getReaderData(libraryItemId)

            // Gutenberg for some reason don't include proper navMap for chinese books
            // in toc file, so we need to parse the book based on spine, instead of toc.
            // This is special case for Chinese books.
            val isInternalChineseBook =
                !libraryItem!!.isImported && epubParser.peekLanguage(libraryItem.filePath) == "zh"
            val shouldUseToc = !isInternalChineseBook

            val epubBook = epubParser.createEpubBook(libraryItem.filePath, shouldUseToc)

            val initialChapterIndex = readerData?.lastChapterIndex ?: 0
            _state.update {
                it.copy(
                    epubBook = epubBook,
                    chapters = epubBook.chapters,
                    hasProgressSaved = readerData != null,
                    lastChapterIndex = readerData?.lastChapterIndex ?: 0,
                    lastChapterOffset = readerData?.lastChapterOffset ?: 0,
                    currentChapterIndex = initialChapterIndex
                )
            }
            onLoaded(state.value)
            // Load the initial chapter
            loadChapterBody(initialChapterIndex)

            // Added some delay to avoid choppy animation.
            delay(200L)
            _state.update {
                it.copy(
                    isLoading = false,
                    shouldShowLoader = false
                )
            }
        }
    }

    // Load epub book from file stream, used when opening books via file picker/intent
    fun loadEpubBookExternal(fileStream: FileInputStream) {
        viewModelScope.launch(Dispatchers.IO) {
            fileStream.use { fis ->
                // parse and create epub book
                val epubBook = epubParser.createEpubBook(fis, shouldUseToc = true)
                _state.update {
                    it.copy(
                        epubBook = epubBook,
                        chapters = epubBook.chapters,
                        hasProgressSaved = false,
                        lastChapterIndex = 0,
                        lastChapterOffset = 0,
                        currentChapterIndex = 0
                    )
                }
                // Load the initial chapter
                loadChapterBody(0)

                // Added some delay to avoid choppy animation.
                delay(200L)
                _state.update {
                    it.copy(
                        isLoading = false,
                        shouldShowLoader = false
                    )
                }
            }
        }
    }

    fun loadChapterBody(index: Int) {
        val currentState = state.value
        val chapter = currentState.chapters.getOrNull(index) ?: return
        if (currentState.loadedChapters.containsKey(chapter.chapterId)) return
        if (loadingChapterIds.contains(chapter.chapterId)) return

        loadingChapterIds.add(chapter.chapterId)
        viewModelScope.launch(Dispatchers.IO) {
            try {
                val content = epubParser.getChapterBody(state.value.epubBook?.filePath ?: "", chapter)
                _state.update {
                    val updatedState =
                        it.copy(loadedChapters = it.loadedChapters + (chapter.chapterId to content))
                    if (updatedState.currentChapter.chapterId == chapter.chapterId) {
                        updatedState.copy(currentChapterTextForSpeech = content.body.asPlainText())
                    } else {
                        updatedState
                    }
                }
            } finally {
                loadingChapterIds.remove(chapter.chapterId)
            }
        }
    }

    fun loadImageData(imagePath: String) {
        if (state.value.loadedImages.containsKey(imagePath)) return
        if (loadingImagePaths.contains(imagePath)) return

        loadingImagePaths.add(imagePath)
        viewModelScope.launch(Dispatchers.IO) {
            try {
                val data = epubParser.getImageData(state.value.epubBook?.filePath ?: "", imagePath)
                if (data != null) {
                    _state.update {
                        it.copy(loadedImages = it.loadedImages + (imagePath to data))
                    }
                }
            } finally {
                loadingImagePaths.remove(imagePath)
            }
        }
    }

    fun updateReaderProgress(libraryItemId: Int, chapterIndex: Int, chapterOffset: Int) {
        viewModelScope.launch(Dispatchers.IO) {
            val isLastChapter = chapterIndex == state.value.chapters.size - 1
            val progressData = progressDao.getReaderData(libraryItemId)
            val lastReadTime = System.currentTimeMillis()

            when {
                // Update progress for existing book
                progressData != null && !isLastChapter -> {
                    val updatedProgress = progressData.copy(
                        lastChapterIndex = chapterIndex,
                        lastChapterOffset = chapterOffset,
                        lastReadTime = lastReadTime
                    )
                    updatedProgress.id = progressData.id
                    progressDao.update(updatedProgress)
                    _state.update { it.copy(hasProgressSaved = true) }
                }

                isLastChapter -> {
                    // Delete progress for completed book
                    progressData?.let { it ->
                        progressDao.delete(it.libraryItemId)
                        _state.update { it.copy(hasProgressSaved = false) }
                    }
                }

                else -> {
                    // Insert new progress for new book
                    progressDao.insert(
                        ProgressData(
                            libraryItemId = libraryItemId,
                            lastChapterIndex = chapterIndex,
                            lastChapterOffset = chapterOffset,
                            lastReadTime = lastReadTime
                        )
                    )
                    _state.update { it.copy(hasProgressSaved = true) }
                }
            }

            val libraryItem = libraryDao.getItemById(libraryItemId)
            if (!isLastChapter && libraryItem != null && libraryItem.bookId > 0) {
                userFirestoreRepository.syncRecentReading(
                    bookId = libraryItem.bookId,
                    chapterIndex = chapterIndex,
                    chapterOffset = chapterOffset,
                    lastReadTime = lastReadTime
                )
            }
        }
    }

    fun startReadingSession() {
        if (sessionStartTime == null) {
            sessionStartTime = System.currentTimeMillis()
        }
    }

    fun recordReadingInteraction() {
        val now = System.currentTimeMillis()
        if (sessionStartTime == null) {
            sessionStartTime = now
        }

        val previousInteractionTime = lastReadingInteractionTime
        if (previousInteractionTime != null) {
            accumulatedReadingTimeMillis += (now - previousInteractionTime)
                .coerceAtLeast(0L)
                .coerceAtMost(MAX_READING_IDLE_GAP_MILLIS)
        }

        lastReadingInteractionTime = now
    }

    fun stopReadingSession() {
        val startedAt = sessionStartTime ?: return
        sessionStartTime = null
        val now = System.currentTimeMillis()
        val previousInteractionTime = lastReadingInteractionTime
        if (previousInteractionTime != null) {
            accumulatedReadingTimeMillis += (now - previousInteractionTime)
                .coerceAtLeast(0L)
                .coerceAtMost(MAX_READING_IDLE_GAP_MILLIS)
        }

        val elapsedTime = accumulatedReadingTimeMillis
        accumulatedReadingTimeMillis = 0L
        lastReadingInteractionTime = null
        if (elapsedTime <= 0L || now < startedAt) return

        viewModelScope.launch(Dispatchers.IO) {
            readingStreakStore.addReadingTime(elapsedTime)
            val updatedStreak = readingStreakStore.getCurrentSnapshot()
            userFirestoreRepository.syncReadingStreak(
                currentStreak = updatedStreak.currentStreak,
                longestStreak = updatedStreak.longestStreak,
                lastCompletedDate = updatedStreak.lastCompletedDate
            )
        }
    }


    fun setChapterScrollPercent(percent: Float) {
        _state.update { it.copy(chapterScrollPercent = percent) }
    }

    fun setVisibleChapterIndex(index: Int) {
        if (index >= 0 && index < state.value.chapters.size) {
            if (index != state.value.currentChapterIndex) {
                _state.update { it.copy(currentChapterIndex = index) }
            }
            // Always ensure current and adjacent chapters are loading/loaded.
            loadChapterBody(index)
            loadChapterBody(index + 1)
            loadChapterBody(index - 1)
        }
    }

    fun toggleReaderMenu() {
        _state.update { it.copy(showReaderMenu = !it.showReaderMenu) }
    }

    fun hideReaderInfo() {
        _state.update { it.copy(showReaderMenu = false) }
    }

    fun setFontFamily(font: ReaderFont) {
        preferenceUtil.putString(PreferenceUtil.READER_FONT_STYLE_STR, font.id)
        _state.update { it.copy(fontFamily = font) }
    }

    fun setFontSize(newValue: Int) {
        preferenceUtil.putInt(PreferenceUtil.READER_FONT_SIZE_INT, newValue)
        _state.update { it.copy(fontSize = newValue) }
    }

    fun setLineHeight(newValue: Float) {
        preferenceUtil.putFloat(PreferenceUtil.READER_LINE_HEIGHT_FLOAT, newValue)
        _state.update { it.copy(lineHeight = newValue) }
    }

    fun setReadAloudPlaybackState(playbackState: ReadAloudPlaybackState) {
        _state.update { it.copy(readAloudPlaybackState = playbackState) }
    }

}
