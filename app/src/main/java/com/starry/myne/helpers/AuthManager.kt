package com.starry.myne.helpers

import com.google.firebase.auth.FirebaseAuth
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthManager @Inject constructor() {

    private fun authOrNull(): FirebaseAuth? = runCatching {
        FirebaseAuth.getInstance()
    }.getOrNull()

    fun isConfigured(): Boolean = authOrNull() != null

    fun isUserLoggedIn(): Boolean = authOrNull()?.currentUser != null

    fun currentUserEmail(): String? = authOrNull()?.currentUser?.email

    fun currentUserUid(): String? = authOrNull()?.currentUser?.uid

    fun signIn(
        email: String,
        password: String,
        onResult: (Result<Unit>) -> Unit
    ) {
        val auth = authOrNull()
        if (auth == null) {
            onResult(Result.failure(IllegalStateException(FIREBASE_NOT_CONFIGURED_MESSAGE)))
            return
        }

        auth.signInWithEmailAndPassword(email, password)
            .addOnCompleteListener { task ->
                if (task.isSuccessful) {
                    onResult(Result.success(Unit))
                } else {
                    onResult(Result.failure(task.exception ?: Exception(DEFAULT_AUTH_ERROR_MESSAGE)))
                }
            }
    }

    fun register(
        email: String,
        password: String,
        onResult: (Result<Unit>) -> Unit
    ) {
        val auth = authOrNull()
        if (auth == null) {
            onResult(Result.failure(IllegalStateException(FIREBASE_NOT_CONFIGURED_MESSAGE)))
            return
        }

        auth.createUserWithEmailAndPassword(email, password)
            .addOnCompleteListener { task ->
                if (task.isSuccessful) {
                    onResult(Result.success(Unit))
                } else {
                    onResult(Result.failure(task.exception ?: Exception(DEFAULT_AUTH_ERROR_MESSAGE)))
                }
            }
    }

    fun signOut() {
        authOrNull()?.signOut()
    }

    companion object {
        const val FIREBASE_NOT_CONFIGURED_MESSAGE =
            "Firebase is not configured yet. Add google-services.json to the app module and enable Email/Password in Firebase Authentication."

        private const val DEFAULT_AUTH_ERROR_MESSAGE = "Authentication failed."
    }
}
