package com.starry.myne.helpers

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.time.LocalDate
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class DailyTokenManager @Inject constructor(
    private val preferenceUtil: PreferenceUtil,
    private val userFirestoreRepository: UserFirestoreRepository
) {

    fun isPremiumUser(): Boolean = userFirestoreRepository.isPremiumUser()

    fun refreshDailyTokensIfNeeded(): Int {
        if (isPremiumUser()) {
            return preferenceUtil.getInt(PreferenceUtil.TOKEN_BALANCE_INT, DAILY_FREE_TOKENS)
        }

        val today = LocalDate.now().toString()
        val savedDate = preferenceUtil.getString(PreferenceUtil.LAST_TOKEN_RESET_DATE_STR, "").orEmpty()

        if (savedDate != today) {
            preferenceUtil.putInt(PreferenceUtil.TOKEN_BALANCE_INT, DAILY_FREE_TOKENS)
            preferenceUtil.putString(PreferenceUtil.LAST_TOKEN_RESET_DATE_STR, today)
            syncTokenData(DAILY_FREE_TOKENS, today)
            return DAILY_FREE_TOKENS
        }

        return preferenceUtil.getInt(PreferenceUtil.TOKEN_BALANCE_INT, DAILY_FREE_TOKENS)
    }

    fun getTokenBalance(): Int = refreshDailyTokensIfNeeded()

    fun tryConsumeTokens(amount: Int): Boolean {
        if (isPremiumUser()) return true

        val currentBalance = refreshDailyTokensIfNeeded()
        if (currentBalance < amount) return false

        val updatedBalance = currentBalance - amount
        preferenceUtil.putInt(PreferenceUtil.TOKEN_BALANCE_INT, updatedBalance)
        syncTokenData(
            tokenBalance = updatedBalance,
            lastResetDate = preferenceUtil.getString(
                PreferenceUtil.LAST_TOKEN_RESET_DATE_STR,
                ""
            ).orEmpty()
        )
        return true
    }

    fun tryConsumeToken(): Boolean = tryConsumeTokens(1)

    private fun syncTokenData(tokenBalance: Int, lastResetDate: String) {
        CoroutineScope(Dispatchers.IO).launch {
            runCatching {
                userFirestoreRepository.syncTokenData(tokenBalance, lastResetDate)
            }
        }
    }

    companion object {
        const val DAILY_FREE_TOKENS = 100
        const val BOOK_ACCESS_TOKEN_COST = 10
    }
}
