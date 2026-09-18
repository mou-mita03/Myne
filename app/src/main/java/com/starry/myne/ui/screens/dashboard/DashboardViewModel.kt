package com.starry.myne.ui.screens.dashboard

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.starry.myne.database.catalog.CatalogManagementDao
import com.starry.myne.database.catalog.ManagedAuthor
import com.starry.myne.database.catalog.ManagedBook
import com.starry.myne.database.catalog.ManagedCategory
import com.starry.myne.helpers.PreferenceUtil
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import javax.inject.Inject

object UserRole { const val READER = "reader"; const val AUTHOR = "author"; const val ADMIN = "admin" }
data class DashboardState(val books: List<ManagedBook> = emptyList(), val categories: List<ManagedCategory> = emptyList(), val authors: List<ManagedAuthor> = emptyList(), val role: String = UserRole.READER)

@HiltViewModel class DashboardViewModel @Inject constructor(
    private val dao: CatalogManagementDao, private val preferences: PreferenceUtil
) : ViewModel() {
    var state by mutableStateOf(DashboardState()); private set
    init { refresh() }
    fun refresh() = viewModelScope.launch(Dispatchers.IO) { state = DashboardState(dao.books(), dao.categories(), dao.authors(), preferences.getString(PreferenceUtil.USER_ROLE_STR, UserRole.READER).orEmpty()) }
    fun save(book: ManagedBook) = viewModelScope.launch(Dispatchers.IO) { if (book.id == 0) dao.insertBook(book) else dao.updateBook(book.id, book.title, book.author, book.description, book.coverUri, book.fileUri, book.priceCents, book.category); dao.addAuthor(ManagedAuthor(book.author)); dao.addCategory(ManagedCategory(book.category)); refresh() }
    fun delete(book: ManagedBook) = viewModelScope.launch(Dispatchers.IO) { dao.deleteBook(book); refresh() }
    fun addCategory(name: String) = viewModelScope.launch(Dispatchers.IO) { if (name.isNotBlank()) dao.addCategory(ManagedCategory(name.trim())); refresh() }
    fun removeCategory(name: String) = viewModelScope.launch(Dispatchers.IO) { dao.deleteCategory(name); refresh() }
    fun addAuthor(name: String) = viewModelScope.launch(Dispatchers.IO) { if (name.isNotBlank()) dao.addAuthor(ManagedAuthor(name.trim())); refresh() }
    fun removeAuthor(name: String) = viewModelScope.launch(Dispatchers.IO) { dao.deleteAuthor(name); refresh() }
}
