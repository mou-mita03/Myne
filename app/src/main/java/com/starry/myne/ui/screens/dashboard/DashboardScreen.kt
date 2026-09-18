package com.starry.myne.ui.screens.dashboard

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.navigation.NavController
import com.starry.myne.database.catalog.ManagedBook

@OptIn(ExperimentalMaterial3Api::class)
@Composable fun DashboardScreen(navController: NavController, viewModel: DashboardViewModel = hiltViewModel()) {
    val state = viewModel.state
    if (state.role !in setOf(UserRole.ADMIN, UserRole.AUTHOR)) { AccessDenied(navController); return }
    var editing by remember { mutableStateOf<ManagedBook?>(null) }
    var showForm by remember { mutableStateOf(false) }
    Scaffold(topBar = { TopAppBar(title = { Text(if (state.role == UserRole.ADMIN) "Admin dashboard" else "Author dashboard") }, navigationIcon = { TextButton(onClick = { navController.navigateUp() }) { Text("Back") } }) }, floatingActionButton = { ExtendedFloatingActionButton(onClick = { editing = null; showForm = true }) { Text("Upload book") } }) { padding ->
        LazyColumn(Modifier.fillMaxSize().padding(padding).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            item { Analytics(state.books, state.role) }
            if (state.role == UserRole.ADMIN) item { Taxonomy("Categories", state.categories.map { it.name }, viewModel::addCategory, viewModel::removeCategory); Taxonomy("Authors", state.authors.map { it.name }, viewModel::addAuthor, viewModel::removeAuthor) }
            item { Text("Book management", style = MaterialTheme.typography.titleLarge) }
            items(state.books, key = { it.id }) { book -> Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(12.dp)) { Text(book.title, style = MaterialTheme.typography.titleMedium); Text("${book.author} · ${book.category} · $${"%.2f".format(book.priceCents / 100.0)}"); Row { TextButton(onClick = { editing = book; showForm = true }) { Text("Edit") }; TextButton(onClick = { viewModel.delete(book) }) { Text("Delete") } } } } }
        }
    }
    if (showForm) BookForm(editing, state.categories.map { it.name }, onDismiss = { showForm = false }, onSave = { viewModel.save(it); showForm = false })
}

@Composable private fun AccessDenied(navController: NavController) { Column(Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) { Text("Dashboard access required", style = MaterialTheme.typography.headlineSmall); Text("Only administrator and author accounts can manage books and view analytics."); Button(onClick = { navController.navigateUp() }) { Text("Go back") } } }
@Composable private fun Analytics(books: List<ManagedBook>, role: String) { val sales = books.sumOf { it.sales }; val revenue = books.sumOf { it.sales * it.priceCents } / 100.0; Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) { Text("Analytics", style = MaterialTheme.typography.titleLarge); Text(if (role == UserRole.ADMIN) "Total users: available from server analytics" else "Reader statistics: $sales buyers"); Text("Total books: ${books.size} · Sales: $sales · Downloads: ${books.sumOf { it.downloads }}"); Text("Revenue: $${"%.2f".format(revenue)}"); Text("Popular: ${books.maxByOrNull { it.downloads }?.title ?: "No books yet"}") } } }
@Composable private fun Taxonomy(title: String, values: List<String>, add: (String) -> Unit, remove: (String) -> Unit) { var value by remember { mutableStateOf("") }; Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(12.dp)) { Text("Manage $title", style = MaterialTheme.typography.titleMedium); Row { OutlinedTextField(value, { value = it }, label = { Text(title.dropLast(1)) }, modifier = Modifier.weight(1f)); Button(onClick = { add(value); value = "" }) { Text("Add") } }; values.forEach { Row { Text(it, Modifier.weight(1f)); TextButton(onClick = { remove(it) }) { Text("Remove") } } } } } }
@Composable private fun BookForm(existing: ManagedBook?, categories: List<String>, onDismiss: () -> Unit, onSave: (ManagedBook) -> Unit) { var title by remember { mutableStateOf(existing?.title.orEmpty()) }; var author by remember { mutableStateOf(existing?.author.orEmpty()) }; var description by remember { mutableStateOf(existing?.description.orEmpty()) }; var category by remember { mutableStateOf(existing?.category ?: categories.firstOrNull().orEmpty()) }; var price by remember { mutableStateOf(existing?.priceCents?.div(100.0)?.toString().orEmpty()) }; var cover by remember { mutableStateOf(existing?.coverUri.orEmpty()) }; var file by remember { mutableStateOf(existing?.fileUri.orEmpty()) }; val coverPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { cover = it?.toString().orEmpty() }; val filePicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { file = it?.toString().orEmpty() }; AlertDialog(onDismissRequest = onDismiss, title = { Text(if (existing == null) "Upload book" else "Edit book") }, text = { LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) { item { OutlinedTextField(title, { title = it }, label = { Text("Title") }); OutlinedTextField(author, { author = it }, label = { Text("Author") }); OutlinedTextField(description, { description = it }, label = { Text("Description") }); OutlinedTextField(category, { category = it }, label = { Text("Category") }); OutlinedTextField(price, { price = it }, label = { Text("Price") }); Button(onClick = { coverPicker.launch("image/*") }) { Text(if (cover.isBlank()) "Choose cover" else "Cover selected") }; Button(onClick = { filePicker.launch("application/epub+zip") }) { Text(if (file.isBlank()) "Choose EPUB/PDF" else "Book file selected") } } } }, confirmButton = { Button(onClick = { onSave(ManagedBook(title, author, description, cover, file, ((price.toDoubleOrNull() ?: 0.0) * 100).toInt(), category).also { it.id = existing?.id ?: 0 }) }, enabled = title.isNotBlank() && author.isNotBlank() && category.isNotBlank() && file.isNotBlank()) { Text("Save") } }, dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } }) }
