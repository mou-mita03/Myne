package com.starry.myne.helpers

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.emptyPreferences
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import java.io.IOException
import java.time.LocalDate
import java.util.concurrent.TimeUnit
import javax.inject.Singleton
import kotlin.math.max

private val Context.readingStreakDataStore: DataStore<Preferences> by preferencesDataStore(
    name = "reading_streak_pref"
)
private const val DAILY_GOAL_MINUTES = 5

data class ReadingStreakUiState(
    val currentStreak: Int = 0,
    val longestStreak: Int = 0,
    val lastCompletedDate: String? = null,
    val todayReadingMinutes: Int = 0,
    val dailyGoalMinutes: Int = DAILY_GOAL_MINUTES,
    val isCompletedToday: Boolean = false
)

@Singleton
class ReadingStreakStore(context: Context) {
    private val dataStore = context.readingStreakDataStore

    fun readStreak(): Flow<ReadingStreakUiState> {
        return dataStore.data
            .catch { exception ->
                if (exception is IOException) {
                    emit(emptyPreferences())
                } else {
                    throw exception
                }
            }
            .map { preferences ->
                val today = LocalDate.now().toString()
                val todayReadingDate = preferences[PreferencesKey.todayReadingDate]
                val todayMinutes =
                    if (todayReadingDate == today) {
                        preferences[PreferencesKey.todayReadingMinutes] ?: 0
                    } else {
                        0
                    }
                val lastCompletedDate = preferences[PreferencesKey.lastCompletedDate]
                ReadingStreakUiState(
                    currentStreak = preferences[PreferencesKey.currentStreak] ?: 0,
                    longestStreak = preferences[PreferencesKey.longestStreak] ?: 0,
                    lastCompletedDate = lastCompletedDate,
                    todayReadingMinutes = todayMinutes,
                    isCompletedToday = lastCompletedDate == today && todayMinutes >= DAILY_GOAL_MINUTES
                )
            }
    }

    suspend fun addReadingTime(sessionDurationMillis: Long) {
        val sessionMinutes = TimeUnit.MILLISECONDS.toMinutes(sessionDurationMillis).toInt()
        if (sessionMinutes <= 0) return

        dataStore.edit { preferences ->
            val today = LocalDate.now()
            val todayText = today.toString()

            val storedTodayDate = preferences[PreferencesKey.todayReadingDate]
            val existingTodayMinutes =
                if (storedTodayDate == todayText) {
                    preferences[PreferencesKey.todayReadingMinutes] ?: 0
                } else {
                    0
                }

            val updatedTodayMinutes = existingTodayMinutes + sessionMinutes
            preferences[PreferencesKey.todayReadingDate] = todayText
            preferences[PreferencesKey.todayReadingMinutes] = updatedTodayMinutes

            val lastCompletedDate = preferences[PreferencesKey.lastCompletedDate]
            val alreadyCompletedToday = lastCompletedDate == todayText
            if (alreadyCompletedToday || updatedTodayMinutes < DAILY_GOAL_MINUTES) return@edit

            val currentStreak = preferences[PreferencesKey.currentStreak] ?: 0
            val updatedStreak = when {
                lastCompletedDate == null -> 1
                LocalDate.parse(lastCompletedDate).plusDays(1) == today -> currentStreak + 1
                else -> 1
            }

            preferences[PreferencesKey.currentStreak] = updatedStreak
            preferences[PreferencesKey.longestStreak] = max(
                preferences[PreferencesKey.longestStreak] ?: 0,
                updatedStreak
            )
            preferences[PreferencesKey.lastCompletedDate] = todayText
        }
    }

    suspend fun applyRemoteState(
        currentStreak: Int,
        longestStreak: Int,
        lastCompletedDate: String?
    ) {
        dataStore.edit { preferences ->
            preferences[PreferencesKey.currentStreak] = currentStreak
            preferences[PreferencesKey.longestStreak] = longestStreak
            if (lastCompletedDate.isNullOrBlank()) {
                preferences.remove(PreferencesKey.lastCompletedDate)
            } else {
                preferences[PreferencesKey.lastCompletedDate] = lastCompletedDate
            }
        }
    }

    suspend fun getCurrentSnapshot(): ReadingStreakUiState = readStreak().first()

    private object PreferencesKey {
        val currentStreak = intPreferencesKey(name = "current_streak")
        val longestStreak = intPreferencesKey(name = "longest_streak")
        val lastCompletedDate = stringPreferencesKey(name = "last_completed_date")
        val todayReadingMinutes = intPreferencesKey(name = "today_reading_minutes")
        val todayReadingDate = stringPreferencesKey(name = "today_reading_date")
    }
}
