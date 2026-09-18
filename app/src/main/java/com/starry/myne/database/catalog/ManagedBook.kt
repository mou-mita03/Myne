package com.starry.myne.database.catalog

import androidx.room.Entity
import androidx.room.PrimaryKey

/** Locally managed catalogue entries. Remote publishing can implement the same contract later. */
@Entity(tableName = "managed_books")
data class ManagedBook(
    val title: String,
    val author: String,
    val description: String,
    val coverUri: String,
    val fileUri: String,
    val priceCents: Int,
    val category: String,
    val ownerId: String = "local-author",
    val createdAt: Long = System.currentTimeMillis(),
    val downloads: Int = 0,
    val sales: Int = 0
) { @PrimaryKey(autoGenerate = true) var id: Int = 0 }

@Entity(tableName = "managed_categories") data class ManagedCategory(@PrimaryKey val name: String)
@Entity(tableName = "managed_authors") data class ManagedAuthor(@PrimaryKey val name: String)
