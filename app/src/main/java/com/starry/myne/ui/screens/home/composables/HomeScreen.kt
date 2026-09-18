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

package com.starry.myne.ui.screens.home.composables

import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.Crossfade
import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.TextButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.surfaceColorAtElevation
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.MutableState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.res.vectorResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.navigation.NavController
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.starry.myne.R
import com.starry.myne.helpers.NetworkObserver
import com.starry.myne.helpers.book.BookUtils
import com.starry.myne.ui.common.BookItemCard
import com.starry.myne.ui.common.NetworkError
import com.starry.myne.helpers.weakHapticFeedback
import com.starry.myne.ui.navigation.BottomBarScreen
import com.starry.myne.ui.navigation.Screens
import com.starry.myne.ui.screens.home.viewmodels.AllBooksState
import com.starry.myne.ui.screens.home.viewmodels.ContinueReadingState
import com.starry.myne.ui.screens.home.viewmodels.HomeViewModel
import com.starry.myne.ui.screens.home.viewmodels.SearchBarState
import com.starry.myne.ui.screens.home.viewmodels.RecommendedBooksState
import com.starry.myne.ui.screens.home.viewmodels.UserAction
import com.starry.myne.ui.screens.main.bottomNavPadding
import com.starry.myne.ui.theme.poppinsFont
import coil.compose.AsyncImage
import coil.request.ImageRequest
import kotlinx.coroutines.delay


@Composable
fun HomeScreen(navController: NavController, networkStatus: NetworkObserver.Status) {

    val viewModel: HomeViewModel = hiltViewModel()

    // Load the first set of items.
    LaunchedEffect(key1 = true) {
        delay(200)
        viewModel.loadNextItems()
    }

    /*
     Block back button press if search bar is visible to avoid
     app from closing immediately, instead disable search bar
     on first back press, and close app on second.
     */
    val sysBackButtonState = remember { mutableStateOf(false) }
    BackHandler(enabled = sysBackButtonState.value) {
        if (viewModel.searchBarState.isSearchBarVisible) {
            if (viewModel.searchBarState.searchText.isNotEmpty()) {
                viewModel.onAction(UserAction.TextFieldInput("", networkStatus))
            } else {
                viewModel.onAction(UserAction.CloseIconClicked)
            }
        }
    }

    // Close search bar when navigating to other screens.
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentDestination = navBackStackEntry?.destination
    LaunchedEffect(currentDestination) {
        if (currentDestination?.route == BottomBarScreen.Home.route) {
            viewModel.loadContinueReadingItem()
        } else {
            viewModel.onAction(UserAction.TextFieldInput("", networkStatus))
            viewModel.onAction(UserAction.CloseIconClicked)
        }
    }

    HomeScreenScaffold(
        viewModel = viewModel,
        networkStatus = networkStatus,
        navController = navController,
        sysBackButtonState = sysBackButtonState,
    )


}


@Composable
private fun HomeScreenScaffold(
    viewModel: HomeViewModel,
    networkStatus: NetworkObserver.Status,
    navController: NavController,
    sysBackButtonState: MutableState<Boolean>,
) {
    val keyboardController = LocalSoftwareKeyboardController.current
    val focusManager = LocalFocusManager.current
    val topBarState = viewModel.searchBarState

    Scaffold(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(bottom = bottomNavPadding),
        topBar = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(MaterialTheme.colorScheme.background)
                    .padding(start = 20.dp, end = 20.dp, top = 10.dp, bottom = 8.dp)
            ) {
                Crossfade(
                    modifier = Modifier.animateContentSize(),
                    targetState = topBarState.isSearchBarVisible,
                    animationSpec = tween(durationMillis = 200), label = "search cross fade"
                ) {
                    if (it) {
                        SearchAppBar(onCloseIconClicked = {
                            viewModel.onAction(UserAction.CloseIconClicked)
                        }, onInputValueChange = { newText ->
                            viewModel.onAction(
                                UserAction.TextFieldInput(newText, networkStatus)
                            )
                        }, text = topBarState.searchText, onSearchClicked = {
                            keyboardController?.hide()
                            focusManager.clearFocus()
                        })
                        sysBackButtonState.value = true
                    } else {
                        HomeTopAppBar(
                            onSearchIconClicked = {
                                viewModel.onAction(UserAction.SearchIconClicked)
                            })
                        sysBackButtonState.value = false
                    }
                }
                HorizontalDivider(
                    thickness = 2.dp,
                    color = MaterialTheme.colorScheme.surfaceColorAtElevation(4.dp)
                )
            }
        },
    ) { paddingValues ->
        HomeScreenContents(
            viewModel = viewModel,
            networkStatus = networkStatus,
            navController = navController,
            paddingValues = paddingValues
        )
    }
}

@Composable
fun HomeScreenContents(
    viewModel: HomeViewModel,
    networkStatus: NetworkObserver.Status,
    navController: NavController,
    paddingValues: PaddingValues
) {
    val topBarState = viewModel.searchBarState
    val allBooksState = viewModel.allBooksState
    val continueReadingState = viewModel.continueReadingState
    val recommendedBooksState = viewModel.recommendedBooksState


    Column(
        Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(paddingValues)
    ) {

        // If search text is empty show list of all books.
        if (topBarState.searchText.isBlank()) {
            AllBooksList(
                allBooksState = allBooksState,
                continueReadingState = continueReadingState,
                recommendedBooksState = recommendedBooksState,
                networkStatus = networkStatus,
                navController = navController,
                onRetryClicked = { viewModel.reloadItems() },
                onLoadNextItems = { viewModel.loadNextItems() }
            )
        } else {
            SearchBookList(searchBarState = topBarState, navController = navController)
        }
    }
}

@Composable
private fun AllBooksList(
    allBooksState: AllBooksState,
    continueReadingState: ContinueReadingState?,
    recommendedBooksState: RecommendedBooksState,
    networkStatus: NetworkObserver.Status,
    navController: NavController,
    onRetryClicked: () -> Unit,
    onLoadNextItems: () -> Unit
) {
    AnimatedVisibility(
        visible = !allBooksState.isLoading && allBooksState.error != null,
        enter = fadeIn(),
        exit = fadeOut()
    ) {
        NetworkError(onRetryClicked = { onRetryClicked() })
    }

    AnimatedVisibility(
        visible = !allBooksState.isLoading || allBooksState.error == null,
        enter = fadeIn(),
        exit = fadeOut()
    ) {
        LazyVerticalGrid(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .padding(start = 8.dp, end = 8.dp),
            columns = GridCells.Adaptive(295.dp)
        ) {
            items(
                count = if (continueReadingState != null) 1 else 0,
                span = { GridItemSpan(maxLineSpan) }
            ) {
                if (continueReadingState != null) {
                    ContinueReadingCard(
                        state = continueReadingState,
                        onClick = {
                            navController.navigate(
                                Screens.ReaderDetailScreen.withLibraryItemId(
                                    continueReadingState.libraryItemId.toString()
                                )
                            )
                        }
                    )
                }
            }

            items(
                count = if (recommendedBooksState.items.isNotEmpty()) 1 else 0,
                span = { GridItemSpan(maxLineSpan) }
            ) {
                Text(
                    text = "Recommended For You",
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 10.dp),
                    fontFamily = poppinsFont,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 20.sp,
                    color = MaterialTheme.colorScheme.onBackground
                )
            }

            items(count = recommendedBooksState.items.size) { index ->
                val item = recommendedBooksState.items[index]
                Box(modifier = Modifier.padding(4.dp).fillMaxWidth(), contentAlignment = Alignment.Center) {
                    BookItemCard(
                        title = item.title,
                        author = BookUtils.getAuthorsAsString(item.authors),
                        language = BookUtils.getLanguagesAsString(item.languages),
                        subjects = BookUtils.getSubjectsAsString(item.subjects, 3),
                        coverImageUrl = item.formats.imagejpeg
                    ) { navController.navigate(Screens.BookDetailScreen.withBookId(item.id.toString())) }
                }
            }

            items(count = allBooksState.items.size) { i ->
                val item = allBooksState.items[i]
                if (networkStatus == NetworkObserver.Status.Available
                    && i >= allBooksState.items.size - 1
                    && !allBooksState.endReached
                    && !allBooksState.isLoading
                ) {
                    onLoadNextItems()
                }
                Box(
                    modifier = Modifier
                        .padding(4.dp)
                        .fillMaxWidth(),
                    contentAlignment = Alignment.Center
                ) {
                    BookItemCard(
                        title = item.title,
                        author = BookUtils.getAuthorsAsString(item.authors),
                        language = BookUtils.getLanguagesAsString(item.languages),
                        subjects = BookUtils.getSubjectsAsString(
                            item.subjects, 3
                        ),
                        coverImageUrl = item.formats.imagejpeg
                    ) {
                        navController.navigate(
                            Screens.BookDetailScreen.withBookId(
                                item.id.toString()
                            )
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun ContinueReadingCard(
    state: ContinueReadingState,
    onClick: () -> Unit
) {
    val context = LocalContext.current
    val view = LocalView.current

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 4.dp, vertical = 6.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceColorAtElevation(4.dp)
        ),
        shape = RoundedCornerShape(10.dp),
        onClick = {
            view.weakHapticFeedback()
            onClick()
        }
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            AsyncImage(
                model = ImageRequest.Builder(context)
                    .data(state.coverImage)
                    .crossfade(true)
                    .build(),
                placeholder = painterResource(id = R.drawable.placeholder_cat),
                contentDescription = stringResource(id = R.string.cover_image_desc),
                modifier = Modifier
                    .width(64.dp)
                    .height(96.dp)
                    .background(
                        MaterialTheme.colorScheme.surfaceColorAtElevation(2.dp),
                        RoundedCornerShape(8.dp)
                    ),
                contentScale = ContentScale.Crop
            )

            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Text(
                    text = state.title,
                    fontFamily = poppinsFont,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 16.sp,
                    lineHeight = 22.sp,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    color = MaterialTheme.colorScheme.onSurface
                )

                Text(
                    text = state.progressText,
                    fontFamily = poppinsFont,
                    fontSize = 13.sp,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.8f)
                )
            }

            TextButton(onClick = {
                view.weakHapticFeedback()
                onClick()
            }) {
                Text(
                    text = stringResource(id = R.string.home_continue_reading_action),
                    fontFamily = poppinsFont,
                    fontWeight = FontWeight.SemiBold
                )
            }
        }
    }
}

@Composable
private fun SearchBookList(searchBarState: SearchBarState, navController: NavController) {
    LazyVerticalGrid(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(start = 8.dp, end = 8.dp),
        columns = GridCells.Adaptive(295.dp)
    ) {
        items(count = searchBarState.searchResults.size) { i ->
            val item = searchBarState.searchResults[i]
            Box(
                modifier = Modifier
                    .padding(4.dp)
                    .fillMaxWidth(),
                contentAlignment = Alignment.Center
            ) {
                BookItemCard(
                    title = item.title,
                    author = BookUtils.getAuthorsAsString(item.authors),
                    language = BookUtils.getLanguagesAsString(item.languages),
                    subjects = BookUtils.getSubjectsAsString(
                        item.subjects, 3
                    ),
                    coverImageUrl = item.formats.imagejpeg
                ) {
                    navController.navigate(
                        Screens.BookDetailScreen.withBookId(
                            item.id.toString()
                        )
                    )
                }
            }
        }
    }
}

@Composable
private fun HomeTopAppBar(
    onSearchIconClicked: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .windowInsetsPadding(WindowInsets.statusBars),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            text = stringResource(id = R.string.home_header),
            fontSize = 28.sp,
            color = MaterialTheme.colorScheme.onBackground,
            fontFamily = poppinsFont
        )
        Spacer(modifier = Modifier.weight(1f))
        IconButton(onClick = onSearchIconClicked) {
            Icon(
                imageVector = ImageVector.vectorResource(id = R.drawable.ic_search),
                contentDescription = stringResource(id = R.string.home_search_icon_desc),
                tint = MaterialTheme.colorScheme.onBackground,
                modifier = Modifier.size(30.dp)
            )
        }
    }
}


@Composable
private fun SearchAppBar(
    onCloseIconClicked: () -> Unit,
    onInputValueChange: (String) -> Unit,
    text: String,
    onSearchClicked: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .windowInsetsPadding(WindowInsets.statusBars)
    ) {
        val focusRequester = remember { FocusRequester() }
        OutlinedTextField(
            modifier = Modifier
                .fillMaxWidth()
                .focusRequester(focusRequester),
            value = text,
            onValueChange = { onInputValueChange(it) },
            placeholder = {
                Text(
                    text = "Search...",
                    fontFamily = poppinsFont,
                    color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.5f)
                )
            },
            leadingIcon = {
                Icon(
                    imageVector = Icons.Filled.Search,
                    contentDescription = "Search Icon",
                    tint = MaterialTheme.colorScheme.onBackground.copy(
                        alpha = 0.5f
                    )
                )
            },
            trailingIcon = {
                IconButton(onClick = {
                    if (text.isNotEmpty()) {
                        onInputValueChange("")
                    } else {
                        onCloseIconClicked()
                    }
                }) {
                    Icon(
                        imageVector = Icons.Filled.Close,
                        contentDescription = "Close Icon",
                        tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                    )
                }
            },
            colors = OutlinedTextFieldDefaults.colors(
                focusedContainerColor = MaterialTheme.colorScheme.surfaceContainer,
                unfocusedContainerColor = MaterialTheme.colorScheme.surfaceContainer,
                cursorColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.8f),
                focusedTextColor = MaterialTheme.colorScheme.onSurface,
                focusedBorderColor = Color.Transparent,
                unfocusedBorderColor = Color.Transparent
            ),
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
            keyboardActions = KeyboardActions(onSearch = { onSearchClicked() }),
            shape = RoundedCornerShape(24.dp)
        )

        Spacer(modifier = Modifier.height(5.6.dp))

        LaunchedEffect(Unit) { focusRequester.requestFocus() }
    }

}


@Composable
@Preview(showBackground = true)
fun HomeScreenPreview() {
    HomeScreen(navController = rememberNavController(), NetworkObserver.Status.Unavailable)
}
