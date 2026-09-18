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

package com.starry.myne.ui.screens.reader.main.activities

import android.content.ContentResolver
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.view.WindowManager
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.snapshotFlow
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.lifecycle.ViewModelProvider
import com.starry.myne.R
import com.starry.myne.epub.asPlainText
import com.starry.myne.helpers.Constants
import com.starry.myne.helpers.toToast
import com.starry.myne.ui.screens.reader.main.composables.ChaptersContent
import com.starry.myne.ui.screens.reader.main.composables.ReaderScreen
import com.starry.myne.ui.screens.reader.main.viewmodel.ReadAloudPlaybackState
import com.starry.myne.ui.screens.reader.main.viewmodel.ReaderViewModel
import com.starry.myne.ui.screens.settings.viewmodels.SettingsViewModel
import com.starry.myne.ui.theme.MyneTheme
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.launch
import java.io.FileInputStream
import java.util.Locale

@AndroidEntryPoint
class ReaderActivity : AppCompatActivity(), TextToSpeech.OnInitListener {

    private lateinit var settingsViewModel: SettingsViewModel
    private val viewModel: ReaderViewModel by viewModels()
    private var textToSpeech: TextToSpeech? = null
    private var isTextToSpeechReady = false
    private var currentSpeechText = ""
    private var activeSpeechChapterId: String? = null
    private var resumeOffset = 0
    private var currentAbsoluteOffset = 0
    private var chunkBaseOffset = 0
    private var speechChunks: List<String> = emptyList()
    private var speechChunkOffsets: List<Int> = emptyList()
    private var currentChunkIndex = 0
    private var pauseRequested = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        textToSpeech = TextToSpeech(this, this)

        setupWindowInsets() // Setup fullscreen mode.

        // Initialize settings view model.
        settingsViewModel = ViewModelProvider(this)[SettingsViewModel::class.java]

        // Set UI contents.
        setContent {
            MyneTheme(settingsViewModel = settingsViewModel) {
                val lazyListState = rememberLazyListState()
                val coroutineScope = rememberCoroutineScope()
                // Handle intent and load epub book.
                val intentData = remember {
                    handleIntent(
                        intent = intent,
                        viewModel = viewModel,
                        contentResolver = contentResolver,
                        scrollToPosition = { index, offset ->
                            coroutineScope.launch {
                                lazyListState.scrollToItem(index, offset)
                            }
                        },
                        onError = {
                            getString(R.string.error).toToast(this)
                            finish()
                        })
                }

                ReaderScreen(
                    viewModel = viewModel,
                    onScrollToChapter = { lazyListState.scrollToItem(it) },
                    onReadAloudPlay = { playCurrentChapter() },
                    onReadAloudPause = { pauseCurrentChapter() },
                    onReadAloudStop = { stopCurrentChapter(resetSession = true) },
                    chaptersContent = {
                        LaunchedEffect(lazyListState) {
                            snapshotFlow { lazyListState.firstVisibleItemIndex }
                                .distinctUntilChanged()
                                .collect { visibleChapterIdx ->
                                    viewModel.setVisibleChapterIndex(visibleChapterIdx)
                                }
                        }

                        LaunchedEffect(lazyListState) {
                            snapshotFlow {
                                lazyListState.layoutInfo.visibleItemsInfo.map { it.index }
                            }.distinctUntilChanged()
                                .collect { indices ->
                                    indices.forEach { idx ->
                                        viewModel.loadChapterBody(idx)
                                        viewModel.loadChapterBody(idx + 1)
                                        viewModel.loadChapterBody(idx - 1)
                                    }
                                }
                        }

                        LaunchedEffect(lazyListState) {
                            snapshotFlow {
                                Pair(
                                    lazyListState.firstVisibleItemIndex,
                                    lazyListState.firstVisibleItemScrollOffset
                                )
                            }.filter { (idx, _) -> idx >= 0 }
                                .collect { (visibleChapterIdx, visibleChapterOffset) ->
                                    viewModel.recordReadingInteraction()
                                    viewModel.setChapterScrollPercent(
                                        calculateChapterPercentage(lazyListState)
                                    )
                                    // If book was not opened from external epub file, update the
                                    // reading progress into the database.
                                    if (!intentData.isExternalFile && intentData.libraryItemId != null) {
                                        viewModel.updateReaderProgress(
                                            libraryItemId = intentData.libraryItemId,
                                            chapterIndex = visibleChapterIdx,
                                            chapterOffset = visibleChapterOffset
                                        )
                                    }
                                }
                        }

                        // Reader content lazy column.
                        val state = viewModel.state.collectAsState().value
                        ChaptersContent(
                            state = state,
                            lazyListState = lazyListState,
                            onToggleReaderMenu = { viewModel.toggleReaderMenu() },
                            onLoadImage = { viewModel.loadImageData(it) },
                            onReadAloudFromSelection = { chapter, selectedText ->
                                playFromSelection(chapter.chapterId, selectedText)
                            }
                        )

                        // Toggle system bars based on reader menu visibility.
                        LaunchedEffect(state.showReaderMenu) {
                            toggleSystemBars(state.showReaderMenu)
                        }
                    })
            }
        }
    }

    override fun onResume() {
        super.onResume()
        viewModel.startReadingSession()
    }

    override fun onPause() {
        stopCurrentChapter(resetSession = true)
        viewModel.stopReadingSession()
        super.onPause()
    }

    override fun onDestroy() {
        textToSpeech?.stop()
        textToSpeech?.shutdown()
        textToSpeech = null
        super.onDestroy()
    }

    override fun onInit(status: Int) {
        isTextToSpeechReady = status == TextToSpeech.SUCCESS
        if (!isTextToSpeechReady) return

        textToSpeech?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
            override fun onStart(utteranceId: String?) = Unit

            override fun onDone(utteranceId: String?) {
                runOnUiThread {
                    if (pauseRequested) return@runOnUiThread
                    if (currentChunkIndex < speechChunks.lastIndex) {
                        currentChunkIndex += 1
                        speakChunk()
                    } else {
                        stopCurrentChapter(resetSession = true, shouldStopEngine = false)
                    }
                }
            }

            override fun onError(utteranceId: String?) {
                runOnUiThread {
                    stopCurrentChapter(resetSession = true)
                    getString(R.string.reader_read_aloud_unavailable).toToast(this@ReaderActivity)
                }
            }

            override fun onRangeStart(utteranceId: String?, start: Int, end: Int, frame: Int) {
                currentAbsoluteOffset =
                    chunkBaseOffset + (speechChunkOffsets.getOrNull(currentChunkIndex) ?: 0) + start
            }
        })
    }


    private fun setupWindowInsets() {
        // Fullscreen mode that ignores any cutout, notch etc.
        WindowCompat.setDecorFitsSystemWindows(window, false)
        val controller = WindowInsetsControllerCompat(window, window.decorView)
        controller.systemBarsBehavior =
            WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        controller.hide(WindowInsetsCompat.Type.systemBars())
        controller.hide(WindowInsetsCompat.Type.displayCutout())

        // Set layout in display cutout mode for Android P and above.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            window.attributes.layoutInDisplayCutoutMode =
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
        }

        // Keep screen on.
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    }

    private fun toggleSystemBars(show: Boolean) {
        when (show) {
            true -> showSystemBars()
            false -> hideSystemBars()
        }
    }

    private fun showSystemBars() {
        val controller = WindowInsetsControllerCompat(window, window.decorView)
        controller.show(WindowInsetsCompat.Type.systemBars())
        controller.show(WindowInsetsCompat.Type.displayCutout())
    }

    private fun hideSystemBars() {
        val controller = WindowInsetsControllerCompat(window, window.decorView)
        controller.hide(WindowInsetsCompat.Type.systemBars())
        controller.hide(WindowInsetsCompat.Type.displayCutout())
    }

    private fun playCurrentChapter() {
        if (!isTextToSpeechReady) {
            getString(R.string.reader_read_aloud_unavailable).toToast(this)
            return
        }

        if (viewModel.state.value.readAloudPlaybackState == ReadAloudPlaybackState.Paused &&
            currentSpeechText.isNotBlank() &&
            activeSpeechChapterId != null
        ) {
            playSpeechSource(currentSpeechText, activeSpeechChapterId, resumeOffset)
            return
        }

        val state = viewModel.state.value
        val chapterText = state.currentChapterTextForSpeech.trim()
        if (chapterText.isEmpty()) {
            getString(R.string.reader_read_aloud_no_text).toToast(this)
            return
        }

        playSpeechSource(chapterText, state.currentChapter.chapterId, 0)
    }

    private fun playFromSelection(chapterId: String, selectedText: String) {
        if (!isTextToSpeechReady) {
            getString(R.string.reader_read_aloud_unavailable).toToast(this)
            return
        }

        val state = viewModel.state.value
        val chapterText = state.loadedChapters[chapterId]?.body?.asPlainText()?.trim().orEmpty()
        val pointerText = selectedText.trim()
        if (chapterText.isEmpty() || pointerText.isEmpty()) {
            getString(R.string.reader_read_aloud_no_text).toToast(this)
            return
        }

        val startOffset = chapterText.indexOf(pointerText).takeIf { it >= 0 } ?: 0
        playSpeechSource(chapterText, chapterId, startOffset)
    }

    private fun playSpeechSource(sourceText: String, chapterId: String?, startOffset: Int) {
        currentSpeechText = sourceText
        activeSpeechChapterId = chapterId
        resumeOffset = startOffset.coerceAtLeast(0)
        currentAbsoluteOffset = resumeOffset

        if (resumeOffset >= currentSpeechText.length) {
            resumeOffset = 0
            currentAbsoluteOffset = 0
        }

        val state = viewModel.state.value
        val bookLocale = Locale.forLanguageTag(
            state.epubBook?.language?.ifBlank { Locale.getDefault().toLanguageTag() }
                ?: Locale.getDefault().toLanguageTag()
        )
        val availability = textToSpeech?.setLanguage(bookLocale)
        if (availability == TextToSpeech.LANG_MISSING_DATA ||
            availability == TextToSpeech.LANG_NOT_SUPPORTED
        ) {
            textToSpeech?.setLanguage(Locale.getDefault())
        }

        val speechPlan = splitTextForSpeech(currentSpeechText.substring(resumeOffset))
        speechChunks = speechPlan.map { it.text }
        speechChunkOffsets = speechPlan.map { it.startOffset }
        if (speechChunks.isEmpty()) {
            getString(R.string.reader_read_aloud_no_text).toToast(this)
            return
        }

        pauseRequested = false
        chunkBaseOffset = resumeOffset
        currentChunkIndex = 0
        currentAbsoluteOffset = resumeOffset
        viewModel.setReadAloudPlaybackState(ReadAloudPlaybackState.Playing)
        speakChunk()
    }

    private fun pauseCurrentChapter() {
        if (viewModel.state.value.readAloudPlaybackState != ReadAloudPlaybackState.Playing) return

        pauseRequested = true
        resumeOffset = currentAbsoluteOffset.coerceAtLeast(0)
        textToSpeech?.stop()
        viewModel.setReadAloudPlaybackState(ReadAloudPlaybackState.Paused)
    }

    private fun stopCurrentChapter(
        resetSession: Boolean,
        shouldStopEngine: Boolean = true
    ) {
        pauseRequested = false
        if (shouldStopEngine) {
            textToSpeech?.stop()
        }
        if (resetSession) {
            currentSpeechText = ""
            activeSpeechChapterId = null
            resumeOffset = 0
            currentAbsoluteOffset = 0
            chunkBaseOffset = 0
            speechChunks = emptyList()
            speechChunkOffsets = emptyList()
            currentChunkIndex = 0
        }
        viewModel.setReadAloudPlaybackState(ReadAloudPlaybackState.Stopped)
    }

    private fun speakChunk() {
        val chunk = speechChunks.getOrNull(currentChunkIndex) ?: return
        textToSpeech?.speak(
            chunk,
            TextToSpeech.QUEUE_FLUSH,
            null,
            "reader_chunk_$currentChunkIndex"
        )
    }

    private data class SpeechChunk(val text: String, val startOffset: Int)

    private fun splitTextForSpeech(text: String, chunkSize: Int = 3000): List<SpeechChunk> {
        val normalizedText = text.trim()
        if (normalizedText.isEmpty()) return emptyList()

        val chunks = mutableListOf<SpeechChunk>()
        var startIndex = 0
        while (startIndex < normalizedText.length) {
            val maxEnd = minOf(startIndex + chunkSize, normalizedText.length)
            if (maxEnd == normalizedText.length) {
                val finalChunk = normalizedText.substring(startIndex).trim()
                if (finalChunk.isNotEmpty()) {
                    chunks += SpeechChunk(finalChunk, startIndex)
                }
                break
            }

            val splitIndex = listOf(
                normalizedText.lastIndexOf("\n\n", maxEnd),
                normalizedText.lastIndexOf(". ", maxEnd),
                normalizedText.lastIndexOf(" ", maxEnd)
            ).firstOrNull { it > startIndex } ?: maxEnd

            val chunk = normalizedText.substring(startIndex, splitIndex).trim()
            if (chunk.isNotEmpty()) {
                chunks += SpeechChunk(chunk, startIndex)
            }
            startIndex = splitIndex.coerceAtLeast(startIndex + 1)
        }

        return chunks
    }
}

object ReaderConstants {
    const val EXTRA_LIBRARY_ITEM_ID = "reader_book_id"
    const val EXTRA_CHAPTER_IDX = "reader_chapter_index"
    const val DEFAULT_NONE = -100000

}

/**
 * Data class to hold intent information for ReaderActivity.
 *
 * @param libraryItemId Library item id.
 * @param chapterIndex Chapter index.
 * @param isExternalFile Is book opened from external file.
 */
data class IntentData(
    val libraryItemId: Int?, val chapterIndex: Int?, val isExternalFile: Boolean
)

/**
 * Handle intent and load epub book from given id or external file.
 *
 * @param intent Intent to handle.
 * @param viewModel ReaderViewModel to load book.
 * @param contentResolver ContentResolver to open input stream.
 * @param scrollToPosition Function to scroll to specific position.
 * @param onError Function to handle error.
 *
 * @return IntentData object containing book id, chapter index and isExternalBook.
 */
fun handleIntent(
    intent: Intent,
    viewModel: ReaderViewModel,
    contentResolver: ContentResolver,
    scrollToPosition: (index: Int, offset: Int) -> Unit,
    onError: () -> Unit
): IntentData {
    val libraryItemId = intent.extras?.getInt(
        ReaderConstants.EXTRA_LIBRARY_ITEM_ID, ReaderConstants.DEFAULT_NONE
    )
    val chapterIndex = intent.extras?.getInt(
        ReaderConstants.EXTRA_CHAPTER_IDX, ReaderConstants.DEFAULT_NONE
    )
    val isExternalFile = intent.type == Constants.EPUB_MIME_TYPE

    // Internal book
    if (libraryItemId != null && libraryItemId != ReaderConstants.DEFAULT_NONE) {
        // Load epub book from library.
        viewModel.loadEpubBook(libraryItemId = libraryItemId, onLoaded = {
            // if there is saved progress for this book, then scroll to
            // last page at exact position were used had left.
            if (it.hasProgressSaved && (chapterIndex == null || chapterIndex == ReaderConstants.DEFAULT_NONE)) {
                scrollToPosition(it.lastChapterIndex, it.lastChapterOffset)
            } else if (chapterIndex != null && chapterIndex != ReaderConstants.DEFAULT_NONE) {
                // if user clicked on specific chapter, then scroll to
                // that chapter directly.
                scrollToPosition(chapterIndex, 0)
            }
        })

    } else if (isExternalFile) {
        // External book from file.
        intent.data?.let {
            contentResolver.openInputStream(it)?.let { ips ->
                viewModel.loadEpubBookExternal(ips as FileInputStream)
            }
        }
    } else {
        onError() // Invalid intent.
    }

    return IntentData(libraryItemId, chapterIndex, isExternalFile)
}

/**
 * Calculate the scroll percentage for the first visible item in a LazyColumn.
 *
 * @param lazyListState The LazyListState of the LazyColumn
 * @return The scroll percentage for the first visible item, or -1 if no item is visible
 */
fun calculateChapterPercentage(lazyListState: LazyListState): Float {
    val firstVisibleItem = lazyListState.layoutInfo.visibleItemsInfo.firstOrNull() ?: return -1f
    val listHeight =
        lazyListState.layoutInfo.viewportEndOffset - lazyListState.layoutInfo.viewportStartOffset

    // Calculate the scroll percentage for the first visible item
    val itemTop = firstVisibleItem.offset.toFloat()
    val itemBottom = itemTop + firstVisibleItem.size.toFloat()

    return if (itemTop >= listHeight || itemBottom <= 0f) {
        1f // Item is completely scrolled out of view
    } else {
        // Calculate the visible portion of the item
        val visiblePortion = if (itemTop < 0f) {
            itemBottom
        } else {
            listHeight - itemTop
        }
        // Calculate the scroll percentage based on the visible portion
        ((1f - visiblePortion / firstVisibleItem.size.toFloat())).coerceIn(0f, 1f)
    }
}
