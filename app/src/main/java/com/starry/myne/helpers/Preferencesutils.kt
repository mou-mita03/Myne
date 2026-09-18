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

package com.starry.myne.helpers

import android.content.Context
import android.content.SharedPreferences
import androidx.core.content.edit

/**
 * A helper class to manage shared preferences
 *
 * @param context The context to use
 */
class PreferenceUtil(context: Context) {

    companion object {
        private const val PREFS_NAME = "myne_settings"

        // General settings preference keys
        const val INTERNAL_READER_BOOL = "internal_reader"
        const val USE_GOOGLE_API_BOOL = "use_google_books_api"
        const val OPEN_LIBRARY_AT_START_BOOL = "launch_library_at_start"
        const val PLAY_BACKGROUND_MUSIC_BOOL = "play_background_music"

        // App theme preference keys
        const val APP_THEME_INT = "theme_settings"
        const val AMOLED_THEME_BOOL = "amoled_theme"
        const val MATERIAL_YOU_BOOL = "material_you"

        // Reader preference keys
        const val READER_FONT_SIZE_INT = "reader_font_size"
        const val READER_FONT_STYLE_STR = "reader_font_style"
        const val READER_LINE_HEIGHT_FLOAT = "reader_line_height"

        // Home screen preference keys
        const val PREFERRED_BOOK_LANG_STR = "preferred_book_language"
        const val RECENTLY_VIEWED_BOOK_ID_INT = "recently_viewed_book_id"
        const val RECENTLY_VIEWED_SUBJECTS_STR = "recently_viewed_subjects"
        const val USER_ROLE_STR = "user_role"

        // Token preference keys
        const val TOKEN_BALANCE_INT = "token_balance"
        const val LAST_TOKEN_RESET_DATE_STR = "last_token_reset_date"
        const val LAST_SYNCED_USER_UID_STR = "last_synced_user_uid"
        const val OWNED_BOOK_IDS_STR = "owned_book_ids"
        const val PLAN_TYPE_STR = "plan_type"

        // Temporary preference keys
        const val LIBRARY_ONBOARDING_BOOL = "show_library_onboarding"
        const val LIBRARY_SWIPE_TOOLTIP_BOOL = "show_library_tooltip"
    }

    // SharedPreferences instance
    private val prefs: SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    init {
        // setup default values
        prefs.edit {
            if (!keyExists(INTERNAL_READER_BOOL)) putBoolean(INTERNAL_READER_BOOL, true)
            if (!keyExists(USE_GOOGLE_API_BOOL)) putBoolean(USE_GOOGLE_API_BOOL, true)
            if (!keyExists(OPEN_LIBRARY_AT_START_BOOL)) putBoolean(
                OPEN_LIBRARY_AT_START_BOOL,
                false
            )
            if (!keyExists(PLAY_BACKGROUND_MUSIC_BOOL)) putBoolean(
                PLAY_BACKGROUND_MUSIC_BOOL,
                false
            )
            if (!keyExists(TOKEN_BALANCE_INT)) putInt(TOKEN_BALANCE_INT, 100)
            if (!keyExists(LAST_TOKEN_RESET_DATE_STR)) putString(LAST_TOKEN_RESET_DATE_STR, "")
            if (!keyExists(OWNED_BOOK_IDS_STR)) putString(OWNED_BOOK_IDS_STR, "")
            if (!keyExists(PLAN_TYPE_STR)) putString(PLAN_TYPE_STR, PlanType.FREE)
        }
    }

    /**
     * Check if a key exists in the preferences
     *
     * @param key The key to check
     * @return True if the key exists, false otherwise
     */
    @Suppress("unused")
    fun keyExists(key: String): Boolean = prefs.contains(key)

    /**
     * Insert a string value into the preferences
     *
     * @param key The key to insert the value into
     * @param value The value to insert
     */
    fun putString(key: String, value: String) {
        prefs.edit { putString(key, value) }
    }

    /**
     * Insert an integer value into the preferences
     *
     * @param key The key to insert the value into
     * @param value The value to insert
     */
    fun putInt(key: String, value: Int) {
        prefs.edit { putInt(key, value) }
    }

    /**
     * Insert a boolean value into the preferences
     *
     * @param key The key to insert the value into
     * @param value The value to insert
     */
    fun putBoolean(key: String, value: Boolean) {
        prefs.edit { putBoolean(key, value) }
    }

    /**
     * Insert a float value into the preferences
     *
     * @param key The key to insert the value into
     * @param value The value to insert
     */
    fun putFloat(key: String, value: Float) {
        prefs.edit { putFloat(key, value) }
    }

    /**
     * Get a string value from the preferences
     *
     * @param key The key to get the value from
     * @param defValue The default value to return if the key does not exist
     */
    fun getString(key: String, defValue: String): String? {
        return prefs.getString(key, defValue)
    }

    /**
     * Get an integer value from the preferences
     *
     * @param key The key to get the value from
     * @param defValue The default value to return if the key does not exist
     */
    fun getInt(key: String, defValue: Int): Int {
        return prefs.getInt(key, defValue)
    }

    /**
     * Get a boolean value from the preferences
     *
     * @param key The key to get the value from
     * @param defValue The default value to return if the key does not exist
     */
    fun getBoolean(key: String, defValue: Boolean): Boolean {
        return prefs.getBoolean(key, defValue)
    }

    /**
     * Get a float value from the preferences
     *
     * @param key The key to get the value from
     * @param defValue The default value to return if the key does not exist
     */
    fun getFloat(key: String, defValue: Float): Float {
        return prefs.getFloat(key, defValue)
    }
}
