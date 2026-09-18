package com.starry.myne.helpers.book

import androidx.annotation.MainThread
import com.starry.myne.api.models.Book
import com.starry.myne.database.library.LibraryDao
import com.starry.myne.database.library.LibraryItem
import com.starry.myne.helpers.DailyTokenManager
import com.starry.myne.helpers.UserFirestoreRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class BookAccessManager @Inject constructor(
    private val libraryDao: LibraryDao,
    private val bookDownloader: BookDownloader,
    private val dailyTokenManager: DailyTokenManager,
    private val userFirestoreRepository: UserFirestoreRepository
) {

    fun getBookAccessTokenCost(): Int = DailyTokenManager.BOOK_ACCESS_TOKEN_COST
    fun isPremiumUser(): Boolean = userFirestoreRepository.isPremiumUser()

    fun isBookOwned(bookId: Int): Boolean = userFirestoreRepository.isBookOwned(bookId)

    fun acquireBook(
        book: Book,
        downloadProgressListener: (Float, Int) -> Unit = { _, _ -> },
        onInsufficientTokens: () -> Unit = {},
        onReady: (LibraryItem) -> Unit = {}
    ) {
        CoroutineScope(Dispatchers.IO).launch {
            val existingLibraryItem = libraryDao.getItemByBookId(book.id)
            if (existingLibraryItem?.fileExist() == true) {
                withContext(Dispatchers.Main) { onReady(existingLibraryItem) }
                return@launch
            }

            if (!userFirestoreRepository.isBookOwned(book.id)) {
                val hasEnoughTokens = dailyTokenManager.tryConsumeTokens(getBookAccessTokenCost())
                if (!hasEnoughTokens) {
                    withContext(Dispatchers.Main) { onInsufficientTokens() }
                    return@launch
                }
                userFirestoreRepository.markBookOwned(book.id)
            }

            if (bookDownloader.isBookCurrentlyDownloading(book.id)) return@launch

            bookDownloader.downloadBook(
                book = book,
                downloadProgressListener = downloadProgressListener
            ) { filePath ->
                upsertLibraryItem(book, filePath)
                libraryDao.getItemByBookId(book.id)?.let { libraryItem ->
                    notifyReady(libraryItem, onReady)
                }
            }
        }
    }

    @MainThread
    private fun notifyReady(libraryItem: LibraryItem, onReady: (LibraryItem) -> Unit) {
        CoroutineScope(Dispatchers.Main).launch {
            onReady(libraryItem)
        }
    }

    private fun upsertLibraryItem(book: Book, filePath: String) {
        val authors = BookUtils.getAuthorsAsString(book.authors)
        val createdAt = System.currentTimeMillis()
        val updatedCount = libraryDao.updateBookFile(
            bookId = book.id,
            title = book.title,
            authors = authors,
            filePath = filePath,
            createdAt = createdAt
        )

        if (updatedCount == 0) {
            libraryDao.insert(
                LibraryItem(
                    bookId = book.id,
                    title = book.title,
                    authors = authors,
                    filePath = filePath,
                    createdAt = createdAt
                )
            )
        }
    }
}
