package com.starry.myne.ui.screens.auth.viewmodels

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.starry.myne.helpers.AuthManager
import com.starry.myne.helpers.DailyTokenManager
import com.starry.myne.helpers.PreferenceUtil
import com.starry.myne.helpers.ReadingStreakStore
import com.starry.myne.helpers.UserFirestoreRepository
import com.starry.myne.ui.navigation.BottomBarScreen
import com.starry.myne.ui.navigation.Screens
import com.starry.myne.ui.screens.welcome.viewmodels.WelcomeDataStore
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import javax.inject.Inject

data class AuthUiState(
    val email: String = "",
    val password: String = "",
    val isRegisterMode: Boolean = false,
    val isLoading: Boolean = false,
    val errorMessage: String? = null
)

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val authManager: AuthManager,
    private val dailyTokenManager: DailyTokenManager,
    private val readingStreakStore: ReadingStreakStore,
    private val userFirestoreRepository: UserFirestoreRepository,
    private val welcomeDataStore: WelcomeDataStore,
    private val preferenceUtil: PreferenceUtil
) : ViewModel() {

    var state by mutableStateOf(AuthUiState())
        private set

    fun updateEmail(email: String) {
        state = state.copy(email = email, errorMessage = null)
    }

    fun updatePassword(password: String) {
        state = state.copy(password = password, errorMessage = null)
    }

    fun toggleMode() {
        state = state.copy(
            isRegisterMode = !state.isRegisterMode,
            errorMessage = null
        )
    }

    fun submit(onSuccess: (String) -> Unit) {
        val email = state.email.trim()
        val password = state.password

        when {
            email.isBlank() -> {
                state = state.copy(errorMessage = "Email is required.")
                return
            }

            password.length < 6 -> {
                state = state.copy(errorMessage = "Password must be at least 6 characters.")
                return
            }

            !authManager.isConfigured() -> {
                state = state.copy(errorMessage = AuthManager.FIREBASE_NOT_CONFIGURED_MESSAGE)
                return
            }
        }

        state = state.copy(isLoading = true, errorMessage = null)
        val authAction: (String, String, (Result<Unit>) -> Unit) -> Unit =
            if (state.isRegisterMode) authManager::register else authManager::signIn

        authAction(email, password) { result ->
            result.onSuccess {
                viewModelScope.launch {
                    if (state.isRegisterMode) {
                        val defaultUserData = com.starry.myne.helpers.FirestoreUserData()
                        userFirestoreRepository.initializeCurrentUserData(defaultUserData)
                        readingStreakStore.applyRemoteState(
                            currentStreak = defaultUserData.currentStreak,
                            longestStreak = defaultUserData.longestStreak,
                            lastCompletedDate = defaultUserData.lastCompletedDate
                        )
                    } else {
                        val remoteUserData = userFirestoreRepository.syncCurrentUserDataFromRemote(
                            readingStreakStore.getCurrentSnapshot()
                        )
                        readingStreakStore.applyRemoteState(
                            currentStreak = remoteUserData.currentStreak,
                            longestStreak = remoteUserData.longestStreak,
                            lastCompletedDate = remoteUserData.lastCompletedDate
                        )
                    }
                    dailyTokenManager.refreshDailyTokensIfNeeded()
                    val nextRoute = resolvePostAuthRoute()
                    state = state.copy(isLoading = false)
                    onSuccess(nextRoute)
                }
            }.onFailure { throwable ->
                state = state.copy(
                    isLoading = false,
                    errorMessage = throwable.localizedMessage ?: "Authentication failed."
                )
            }
        }
    }

    private suspend fun resolvePostAuthRoute(): String {
        val completedOnboarding = welcomeDataStore.readOnBoardingState().first()
        if (!completedOnboarding) {
            return Screens.WelcomeScreen.route
        }

        val openLibrary =
            preferenceUtil.getBoolean(PreferenceUtil.OPEN_LIBRARY_AT_START_BOOL, false)
        return if (openLibrary) {
            BottomBarScreen.Library.route
        } else {
            BottomBarScreen.Home.route
        }
    }
}
