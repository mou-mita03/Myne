package com.starry.myne.helpers

import com.google.firebase.firestore.FirebaseFirestore
import com.starry.myne.database.library.LibraryDao
import com.starry.myne.database.progress.ProgressDao
import com.starry.myne.database.progress.ProgressData
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class UserFirestoreRepository @Inject constructor(
    private val authManager: AuthManager,
    private val firestore: FirebaseFirestore,
    private val preferenceUtil: PreferenceUtil,
    private val libraryDao: LibraryDao,
    private val progressDao: ProgressDao
) {

    fun getCurrentPlanType(): String {
        return preferenceUtil.getString(PreferenceUtil.PLAN_TYPE_STR, PlanType.FREE)
            .orEmpty()
            .ifBlank { PlanType.FREE }
    }

    fun isPremiumUser(): Boolean = getCurrentPlanType() == PlanType.PREMIUM

    suspend fun updateCurrentPlanType(planType: String) {
        withContext(Dispatchers.IO) {
            preferenceUtil.putString(PreferenceUtil.PLAN_TYPE_STR, planType)
            saveCurrentUserFields(mapOf("planType" to planType))
        }
    }

    suspend fun initializeCurrentUserData(userData: FirestoreUserData = FirestoreUserData()) {
        withContext(Dispatchers.IO) {
            saveCurrentUserData(userData, merge = false)
            applyRemoteDataToLocal(userData)
        }
    }

    suspend fun syncCurrentUserDataFromRemote(
        localStreakState: ReadingStreakUiState
    ): FirestoreUserData = withContext(Dispatchers.IO) {
        val document = currentUserDocument() ?: return@withContext FirestoreUserData()
        val currentUid = authManager.currentUserUid().orEmpty()
        val lastSyncedUid = preferenceUtil.getString(
            PreferenceUtil.LAST_SYNCED_USER_UID_STR,
            ""
        ).orEmpty()
        val isUserSwitch = lastSyncedUid.isNotBlank() && lastSyncedUid != currentUid

        if (isUserSwitch) {
            clearAccountScopedLocalState()
        }

        val snapshot = document.get().await()
        val userData = if (snapshot.exists()) {
            snapshot.toObject(FirestoreUserData::class.java) ?: FirestoreUserData()
        } else {
            if (isUserSwitch) buildDefaultSnapshot(localStreakState)
            else buildLocalSnapshot(localStreakState)
        }
        val resolvedUserData = resolveTokenState(userData)

        if (!snapshot.exists()) {
            saveCurrentUserData(resolvedUserData, merge = false)
        } else if (!snapshot.contains("planType")) {
            saveCurrentUserFields(mapOf("planType" to resolvedUserData.planType))
        } else if (
            resolvedUserData.tokenBalance != userData.tokenBalance ||
            resolvedUserData.lastResetDate != userData.lastResetDate
        ) {
            saveCurrentUserFields(
                mapOf(
                    "tokenBalance" to resolvedUserData.tokenBalance,
                    "lastResetDate" to resolvedUserData.lastResetDate
                )
            )
        }

        applyRemoteDataToLocal(resolvedUserData)
        preferenceUtil.putString(PreferenceUtil.LAST_SYNCED_USER_UID_STR, currentUid)
        return@withContext resolvedUserData
    }

    suspend fun syncTokenData(tokenBalance: Int, lastResetDate: String) {
        withContext(Dispatchers.IO) {
            saveCurrentUserFields(
                mapOf(
                    "tokenBalance" to tokenBalance,
                    "lastResetDate" to lastResetDate
                )
            )
        }
    }

    fun isBookOwned(bookId: Int): Boolean = getOwnedBookIds().contains(bookId)

    suspend fun markBookOwned(bookId: Int) {
        withContext(Dispatchers.IO) {
            val updatedOwnedBookIds = (getOwnedBookIds() + bookId).sorted()
            saveOwnedBookIdsLocally(updatedOwnedBookIds)
            saveCurrentUserFields(mapOf("ownedBookIds" to updatedOwnedBookIds))
        }
    }

    suspend fun syncReadingStreak(
        currentStreak: Int,
        longestStreak: Int,
        lastCompletedDate: String?
    ) {
        withContext(Dispatchers.IO) {
            saveCurrentUserFields(
                mapOf(
                    "currentStreak" to currentStreak,
                    "longestStreak" to longestStreak,
                    "lastCompletedDate" to lastCompletedDate
                )
            )
        }
    }

    suspend fun syncFavoriteBookIdsFromLocal() {
        withContext(Dispatchers.IO) {
            val favoriteBookIds = libraryDao.getAllItemsList()
                .filter { it.isFavorite && it.bookId > 0 }
                .map { it.bookId }

            saveCurrentUserFields(mapOf("favoriteBookIds" to favoriteBookIds))
        }
    }

    suspend fun syncRecentReading(
        bookId: Int,
        chapterIndex: Int,
        chapterOffset: Int,
        lastReadTime: Long
    ) {
        withContext(Dispatchers.IO) {
            saveCurrentUserFields(
                mapOf(
                    "recentBookId" to bookId,
                    "recentChapterIndex" to chapterIndex,
                    "recentChapterOffset" to chapterOffset,
                    "recentLastReadTime" to lastReadTime
                )
            )
        }
    }

    private suspend fun applyRemoteDataToLocal(userData: FirestoreUserData) {
        preferenceUtil.putString(PreferenceUtil.PLAN_TYPE_STR, userData.planType)
        preferenceUtil.putInt(PreferenceUtil.TOKEN_BALANCE_INT, userData.tokenBalance)
        preferenceUtil.putString(PreferenceUtil.LAST_TOKEN_RESET_DATE_STR, userData.lastResetDate)
        saveOwnedBookIdsLocally(userData.ownedBookIds)

        libraryDao.clearFavorites()
        userData.favoriteBookIds.forEach { bookId ->
            libraryDao.updateFavoriteByBookId(bookId, true)
        }

        progressDao.clearAll()
        val recentBookId = userData.recentBookId
        if (recentBookId != null) {
            val libraryItem = libraryDao.getItemByBookId(recentBookId)
            if (libraryItem != null) {
                progressDao.insert(
                    ProgressData(
                        libraryItemId = libraryItem.id,
                        lastChapterIndex = userData.recentChapterIndex,
                        lastChapterOffset = userData.recentChapterOffset,
                        lastReadTime = userData.recentLastReadTime
                    )
                )
            }
        }
    }

    private suspend fun buildLocalSnapshot(streakState: ReadingStreakUiState): FirestoreUserData {
        val localLibraryItems = libraryDao.getAllItemsList()
        val favoriteBookIds = localLibraryItems
            .filter { it.isFavorite && it.bookId > 0 }
            .map { it.bookId }
        val ownedBookIds = (getOwnedBookIds() + localLibraryItems
            .filter { it.bookId > 0 }
            .map { it.bookId }).sorted()
        val recentProgress = progressDao.getAllReaderItems().firstOrNull()
        val recentBookId = recentProgress?.let { progress ->
            libraryDao.getItemById(progress.libraryItemId)?.bookId?.takeIf { it > 0 }
        }

        saveOwnedBookIdsLocally(ownedBookIds)

        return FirestoreUserData(
            planType = getCurrentPlanType(),
            tokenBalance = preferenceUtil.getInt(
                PreferenceUtil.TOKEN_BALANCE_INT,
                DailyTokenManager.DAILY_FREE_TOKENS
            ),
            lastResetDate = preferenceUtil.getString(
                PreferenceUtil.LAST_TOKEN_RESET_DATE_STR,
                ""
            ).orEmpty(),
            ownedBookIds = ownedBookIds,
            currentStreak = streakState.currentStreak,
            longestStreak = streakState.longestStreak,
            favoriteBookIds = favoriteBookIds,
            lastCompletedDate = streakState.lastCompletedDate,
            recentBookId = recentBookId,
            recentChapterIndex = recentProgress?.lastChapterIndex ?: 0,
            recentChapterOffset = recentProgress?.lastChapterOffset ?: 0,
            recentLastReadTime = recentProgress?.lastReadTime ?: 0L
        )
    }

    private fun buildDefaultSnapshot(streakState: ReadingStreakUiState) = FirestoreUserData(
        planType = PlanType.FREE,
        tokenBalance = DailyTokenManager.DAILY_FREE_TOKENS,
        lastResetDate = "",
        ownedBookIds = emptyList(),
        currentStreak = streakState.currentStreak,
        longestStreak = streakState.longestStreak,
        favoriteBookIds = emptyList(),
        lastCompletedDate = streakState.lastCompletedDate
    )

    private suspend fun saveCurrentUserData(userData: FirestoreUserData, merge: Boolean = true) {
        val document = currentUserDocument() ?: return
        if (merge) {
            document.set(userData, com.google.firebase.firestore.SetOptions.merge()).await()
        } else {
            document.set(userData).await()
        }
    }

    private suspend fun saveCurrentUserFields(fields: Map<String, Any?>) {
        val document = currentUserDocument() ?: return
        document.set(fields, com.google.firebase.firestore.SetOptions.merge()).await()
    }

    private fun resolveTokenState(userData: FirestoreUserData): FirestoreUserData {
        val localTokenBalance = preferenceUtil.getInt(
            PreferenceUtil.TOKEN_BALANCE_INT,
            DailyTokenManager.DAILY_FREE_TOKENS
        )
        val localLastResetDate = preferenceUtil.getString(
            PreferenceUtil.LAST_TOKEN_RESET_DATE_STR,
            ""
        ).orEmpty()
        val remoteLastResetDate = userData.lastResetDate

        val resolvedLastResetDate = when {
            localLastResetDate.isBlank() -> remoteLastResetDate
            remoteLastResetDate.isBlank() -> localLastResetDate
            localLastResetDate >= remoteLastResetDate -> localLastResetDate
            else -> remoteLastResetDate
        }

        val resolvedTokenBalance = when {
            resolvedLastResetDate.isBlank() -> userData.tokenBalance
            localLastResetDate == remoteLastResetDate -> minOf(
                localTokenBalance,
                userData.tokenBalance
            )
            resolvedLastResetDate == localLastResetDate -> localTokenBalance
            else -> userData.tokenBalance
        }

        return userData.copy(
            planType = userData.planType.ifBlank { PlanType.FREE },
            tokenBalance = resolvedTokenBalance,
            lastResetDate = resolvedLastResetDate
        )
    }

    private fun currentUserDocument() = authManager.currentUserUid()
        ?.let { firestore.collection(USERS_COLLECTION).document(it) }

    private fun clearAccountScopedLocalState() {
        libraryDao.clearFavorites()
        progressDao.clearAll()
        preferenceUtil.putInt(PreferenceUtil.TOKEN_BALANCE_INT, DailyTokenManager.DAILY_FREE_TOKENS)
        preferenceUtil.putString(PreferenceUtil.LAST_TOKEN_RESET_DATE_STR, "")
        preferenceUtil.putString(PreferenceUtil.OWNED_BOOK_IDS_STR, "")
        preferenceUtil.putString(PreferenceUtil.PLAN_TYPE_STR, PlanType.FREE)
    }

    private fun getOwnedBookIds(): Set<Int> {
        return preferenceUtil.getString(PreferenceUtil.OWNED_BOOK_IDS_STR, "")
            .orEmpty()
            .split(",")
            .mapNotNull { it.toIntOrNull() }
            .toSet()
    }

    private fun saveOwnedBookIdsLocally(bookIds: List<Int>) {
        preferenceUtil.putString(
            PreferenceUtil.OWNED_BOOK_IDS_STR,
            bookIds.distinct().sorted().joinToString(",")
        )
    }

    companion object {
        private const val USERS_COLLECTION = "users"
    }
}
