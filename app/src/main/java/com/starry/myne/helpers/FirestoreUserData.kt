package com.starry.myne.helpers

object PlanType {
    const val FREE = "free"
    const val PREMIUM = "premium"
}

data class FirestoreUserData(
    val planType: String = PlanType.FREE,
    val tokenBalance: Int = DailyTokenManager.DAILY_FREE_TOKENS,
    val lastResetDate: String = "",
    val ownedBookIds: List<Int> = emptyList(),
    val currentStreak: Int = 0,
    val longestStreak: Int = 0,
    val favoriteBookIds: List<Int> = emptyList(),
    val lastCompletedDate: String? = null,
    val recentBookId: Int? = null,
    val recentChapterIndex: Int = 0,
    val recentChapterOffset: Int = 0,
    val recentLastReadTime: Long = 0L
)
