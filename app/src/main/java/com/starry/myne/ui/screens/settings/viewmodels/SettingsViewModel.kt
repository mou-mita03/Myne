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

package com.starry.myne.ui.screens.settings.viewmodels

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.Composable
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.starry.myne.helpers.AuthManager
import com.starry.myne.helpers.DailyTokenManager
import com.starry.myne.helpers.PlanType
import com.starry.myne.helpers.PreferenceUtil
import com.starry.myne.helpers.ReadingStreakStore
import com.starry.myne.helpers.ReadingStreakUiState
import com.starry.myne.helpers.UserFirestoreRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.stateIn
import javax.inject.Inject

enum class ThemeMode {
    Light, Dark, Auto
}

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val preferenceUtil: PreferenceUtil,
    private val authManager: AuthManager,
    private val dailyTokenManager: DailyTokenManager,
    private val userFirestoreRepository: UserFirestoreRepository,
    readingStreakStore: ReadingStreakStore
) : ViewModel() {

    private val _theme = MutableLiveData(ThemeMode.Light)
    private val _amoledTheme = MutableLiveData(false)
    private val _materialYou = MutableLiveData(false)
    private val _internalReader = MutableLiveData(true)
    private val _useGoogleApi = MutableLiveData(true)
    private val _openLibraryAtStart = MutableLiveData(false)
    private val _playBackgroundMusic = MutableLiveData(false)
    private val _userEmail = MutableLiveData<String?>(null)
    private val _tokenBalance = MutableLiveData(0)
    private val _planType = MutableLiveData(PlanType.FREE)

    val theme: LiveData<ThemeMode> = _theme
    val amoledTheme: LiveData<Boolean> = _amoledTheme
    val materialYou: LiveData<Boolean> = _materialYou
    val internalReader: LiveData<Boolean> = _internalReader
    val useGoogleApi: LiveData<Boolean> = _useGoogleApi
    val openLibraryAtStart: LiveData<Boolean> = _openLibraryAtStart
    val playBackgroundMusic: LiveData<Boolean> = _playBackgroundMusic
    val userEmail: LiveData<String?> = _userEmail
    val tokenBalance: LiveData<Int> = _tokenBalance
    val planType: LiveData<String> = _planType
    val readingStreak = readingStreakStore.readStreak().stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = ReadingStreakUiState()
    )

    init {
        _theme.value = ThemeMode.entries.toTypedArray()[getThemeValue()]
        _amoledTheme.value = getAmoledThemeValue()
        _materialYou.value = getMaterialYouValue()
        _internalReader.value = getInternalReaderValue()
        _useGoogleApi.value = getUseGoogleApiValue()
        _openLibraryAtStart.value = getOpenLibraryAtStartValue()
        _playBackgroundMusic.value = getPlayBackgroundMusicValue()
        refreshAccountState()
    }

    // Getters =============================================================================

    fun setTheme(newTheme: ThemeMode) {
        _theme.postValue(newTheme)
        preferenceUtil.putInt(PreferenceUtil.APP_THEME_INT, newTheme.ordinal)
    }

    fun setAmoledTheme(newValue: Boolean) {
        _amoledTheme.postValue(newValue)
        preferenceUtil.putBoolean(PreferenceUtil.AMOLED_THEME_BOOL, newValue)
    }

    fun setMaterialYou(newValue: Boolean) {
        _materialYou.postValue(newValue)
        preferenceUtil.putBoolean(PreferenceUtil.MATERIAL_YOU_BOOL, newValue)
    }

    fun setInternalReaderValue(newValue: Boolean) {
        _internalReader.postValue(newValue)
        preferenceUtil.putBoolean(PreferenceUtil.INTERNAL_READER_BOOL, newValue)
    }

    fun setUseGoogleApiValue(newValue: Boolean) {
        _useGoogleApi.postValue(newValue)
        preferenceUtil.putBoolean(PreferenceUtil.USE_GOOGLE_API_BOOL, newValue)
    }

    fun setOpenLibraryAtStartValue(newValue: Boolean) {
        _openLibraryAtStart.postValue(newValue)
        preferenceUtil.putBoolean(PreferenceUtil.OPEN_LIBRARY_AT_START_BOOL, newValue)
    }

    fun setPlayBackgroundMusic(newValue: Boolean) {
        _playBackgroundMusic.postValue(newValue)
        preferenceUtil.putBoolean(PreferenceUtil.PLAY_BACKGROUND_MUSIC_BOOL, newValue)
    }

    fun refreshAccountState() {
        _userEmail.postValue(authManager.currentUserEmail())
        _planType.postValue(userFirestoreRepository.getCurrentPlanType())
        _tokenBalance.postValue(dailyTokenManager.getTokenBalance())
    }

    fun upgradeToPremium() {
        viewModelScope.launch {
            userFirestoreRepository.updateCurrentPlanType(PlanType.PREMIUM)
            refreshAccountState()
        }
    }

    fun logout() {
        authManager.signOut()
        refreshAccountState()
    }

    // Getters ============================================================================
    // Used only during initialization except getCurrentTheme()
    private fun getThemeValue() = preferenceUtil.getInt(
        PreferenceUtil.APP_THEME_INT, ThemeMode.Light.ordinal
    )

    private fun getAmoledThemeValue() = preferenceUtil.getBoolean(
        PreferenceUtil.AMOLED_THEME_BOOL, false
    )

    private fun getMaterialYouValue() = preferenceUtil.getBoolean(
        PreferenceUtil.MATERIAL_YOU_BOOL, false
    )

    private fun getInternalReaderValue() = preferenceUtil.getBoolean(
        PreferenceUtil.INTERNAL_READER_BOOL, true
    )

    private fun getUseGoogleApiValue() = preferenceUtil.getBoolean(
        PreferenceUtil.USE_GOOGLE_API_BOOL, true
    )

    private fun getOpenLibraryAtStartValue() = preferenceUtil.getBoolean(
        PreferenceUtil.OPEN_LIBRARY_AT_START_BOOL, false
    )

    private fun getPlayBackgroundMusicValue() = preferenceUtil.getBoolean(
        PreferenceUtil.PLAY_BACKGROUND_MUSIC_BOOL, false
    )

    @Composable
    fun getCurrentTheme(): ThemeMode {
        return if (theme.value == ThemeMode.Auto) {
            if (isSystemInDarkTheme()) ThemeMode.Dark else ThemeMode.Light
        } else theme.value!!
    }
}
