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

package com.starry.myne.database

import android.content.Context
import androidx.room.AutoMigration
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import com.starry.myne.database.library.LibraryDao
import com.starry.myne.database.library.LibraryItem
import com.starry.myne.database.progress.ProgressDao
import com.starry.myne.database.progress.ProgressData
import com.starry.myne.database.catalog.CatalogManagementDao
import com.starry.myne.database.catalog.ManagedAuthor
import com.starry.myne.database.catalog.ManagedBook
import com.starry.myne.database.catalog.ManagedCategory
import com.starry.myne.database.review.Review
import com.starry.myne.database.review.ReviewDao
import com.starry.myne.helpers.Constants

@Database(
    entities = [LibraryItem::class, ProgressData::class, Review::class, ManagedBook::class, ManagedCategory::class, ManagedAuthor::class],
    version = 8,
    exportSchema = true,
    autoMigrations = [
        AutoMigration(from = 1, to = 2),
        AutoMigration(from = 2, to = 3),
        AutoMigration(from = 4, to = 5),
    ]
)
abstract class MyneDatabase : RoomDatabase() {

    abstract fun getLibraryDao(): LibraryDao
    abstract fun getReaderDao(): ProgressDao
    abstract fun getReviewDao(): ReviewDao
    abstract fun getCatalogManagementDao(): CatalogManagementDao

    companion object {

        private val migration3to4 = Migration(3, 4) { database ->
            database.execSQL("ALTER TABLE reader_table RENAME COLUMN book_id TO library_item_id")
        }

        private val migration5to6 = Migration(5, 6) { database ->
            database.execSQL(
                "ALTER TABLE book_library ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT false"
            )
        }
        private val migration6to7 = Migration(6, 7) { database ->
            database.execSQL("CREATE TABLE IF NOT EXISTS book_reviews (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, book_id INTEGER NOT NULL, rating INTEGER NOT NULL, body TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)")
            database.execSQL("CREATE UNIQUE INDEX IF NOT EXISTS index_book_reviews_book_id ON book_reviews (book_id)")
        }
        private val migration7to8 = Migration(7, 8) { database ->
            database.execSQL("CREATE TABLE IF NOT EXISTS managed_books (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, title TEXT NOT NULL, author TEXT NOT NULL, description TEXT NOT NULL, coverUri TEXT NOT NULL, fileUri TEXT NOT NULL, priceCents INTEGER NOT NULL, category TEXT NOT NULL, ownerId TEXT NOT NULL, createdAt INTEGER NOT NULL, downloads INTEGER NOT NULL, sales INTEGER NOT NULL)")
            database.execSQL("CREATE TABLE IF NOT EXISTS managed_categories (name TEXT NOT NULL, PRIMARY KEY(name))")
            database.execSQL("CREATE TABLE IF NOT EXISTS managed_authors (name TEXT NOT NULL, PRIMARY KEY(name))")
        }

        @Volatile
        private var INSTANCE: MyneDatabase? = null

        fun getInstance(context: Context): MyneDatabase {
            /*
            if the INSTANCE is not null, then return it,
            if it is, then create the database and save
            in instance variable then return it.
            */
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    MyneDatabase::class.java,
                    Constants.DATABASE_NAME
                ).addMigrations(migration3to4, migration5to6, migration6to7, migration7to8).build()
                INSTANCE = instance
                // return instance
                instance
            }
        }
    }

}
