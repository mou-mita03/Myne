package com.starry.myne.database.catalog

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query

@Dao interface CatalogManagementDao {
    @Query("SELECT * FROM managed_books ORDER BY createdAt DESC") fun books(): List<ManagedBook>
    @Insert fun insertBook(book: ManagedBook)
    @Query("UPDATE managed_books SET title=:title, author=:author, description=:description, coverUri=:coverUri, fileUri=:fileUri, priceCents=:priceCents, category=:category WHERE id=:id")
    fun updateBook(id: Int, title: String, author: String, description: String, coverUri: String, fileUri: String, priceCents: Int, category: String)
    @Delete fun deleteBook(book: ManagedBook)
    @Query("SELECT * FROM managed_categories ORDER BY name") fun categories(): List<ManagedCategory>
    @Insert(onConflict = OnConflictStrategy.IGNORE) fun addCategory(category: ManagedCategory)
    @Query("DELETE FROM managed_categories WHERE name=:name") fun deleteCategory(name: String)
    @Query("SELECT * FROM managed_authors ORDER BY name") fun authors(): List<ManagedAuthor>
    @Insert(onConflict = OnConflictStrategy.IGNORE) fun addAuthor(author: ManagedAuthor)
    @Query("DELETE FROM managed_authors WHERE name=:name") fun deleteAuthor(name: String)
}
