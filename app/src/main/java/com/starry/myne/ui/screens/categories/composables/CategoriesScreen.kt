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

package com.starry.myne.ui.screens.categories.composables

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.surfaceColorAtElevation
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.navigation.NavController
import androidx.navigation.compose.rememberNavController
import coil.compose.AsyncImage
import com.starry.myne.R
import com.starry.myne.helpers.book.BookUtils
import com.starry.myne.helpers.toToast
import com.starry.myne.helpers.weakHapticFeedback
import com.starry.myne.ui.common.CustomTopAppBar
import com.starry.myne.ui.navigation.Screens
import com.starry.myne.ui.screens.categories.viewmodels.CategoryViewModel
import com.starry.myne.ui.screens.main.bottomNavPadding
import com.starry.myne.ui.theme.poppinsFont
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch


@Composable
fun CategoriesScreen(navController: NavController) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val viewModel: CategoryViewModel = hiltViewModel()
    var showMoodSheet by remember { mutableStateOf(false) }

    Scaffold(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
        floatingActionButton = {
            FloatingActionButton(
                onClick = {
                    showMoodSheet = true
                },
                modifier = Modifier.padding(bottom = bottomNavPadding),
                shape = CircleShape,
                containerColor = MaterialTheme.colorScheme.primaryContainer,
                contentColor = MaterialTheme.colorScheme.onPrimaryContainer
            ) {
                Text(
                    text = stringResource(id = R.string.mood_match_fab_label),
                    fontFamily = poppinsFont,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 16.sp
                )
            }
        },
        topBar = {
            CustomTopAppBar(
                headerText = stringResource(id = R.string.categories_header),
                iconRes = R.drawable.ic_nav_categories
            )
        }, content = { paddingValues ->
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .background(MaterialTheme.colorScheme.background)
                    .padding(paddingValues)
            ) {
                LazyVerticalGrid(
                    columns = GridCells.Adaptive(168.dp),
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(start = 8.dp, end = 8.dp, bottom = bottomNavPadding),
                    content = {
                        items(BookCategories.ALL.size) { idx ->
                            val category = BookCategories.ALL[idx]
                            CategoriesItem(
                                category = stringResource(id = category.nameRes),
                                onClick = {
                                    navController.navigate(
                                        Screens.CategoryDetailScreen.withCategory(category.category)
                                    )
                                }
                            )
                        }
                    },
                )
            }
        })

    MoodMatchSheet(
        showSheet = showMoodSheet,
        onDismiss = { showMoodSheet = false },
        isBookOwned = viewModel::isBookOwned,
        isPremiumUser = viewModel.isPremiumUser(),
        tokenCost = viewModel.getBookAccessTokenCost(),
        onReadThis = { bookId ->
            viewModel.acquireRecommendedBook(
                bookId = bookId,
                onInsufficientTokens = {
                    context.getString(R.string.tokens_exhausted_message).toToast(context)
                },
                onReady = { libraryItem ->
                    BookUtils.openBookFile(
                        context = context,
                        internalReader = viewModel.getInternalReaderSetting(),
                        libraryItem = libraryItem,
                        navController = navController
                    )
                }
            )
            showMoodSheet = false
        }
    )
}


@Composable
private fun CategoriesItem(category: String, onClick: () -> Unit) {
    val view = LocalView.current
    Card(
        modifier = Modifier
            .height(90.dp)
            .width(160.dp)
            .padding(6.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceColorAtElevation(3.dp)
        ),
        shape = RoundedCornerShape(6.dp),
        onClick = {
            view.weakHapticFeedback()
            onClick()
        }
    ) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text(
                modifier = Modifier.padding(2.dp),
                text = category,
                fontSize = 17.sp,
                fontStyle = MaterialTheme.typography.headlineMedium.fontStyle,
                fontFamily = poppinsFont,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                color = MaterialTheme.colorScheme.onSurface,
            )
        }
    }
}

@ExperimentalMaterial3Api
@Composable
@Preview(showBackground = true)
fun CategoriesScreenPreview() {
    CategoriesScreen(rememberNavController())
}

private enum class MoodMatchStep {
    Mood,
    FollowUp,
    Energy,
    Loading,
    Result
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun MoodMatchSheet(
    showSheet: Boolean,
    onDismiss: () -> Unit,
    isBookOwned: (Int) -> Boolean,
    isPremiumUser: Boolean,
    tokenCost: Int,
    onReadThis: (Int) -> Unit
) {
    if (!showSheet) return

    val coroutineScope = rememberCoroutineScope()
    var step by remember(showSheet) { mutableStateOf(MoodMatchStep.Mood) }
    var selectedMood by remember(showSheet) { mutableStateOf<MoodOption?>(null) }
    var selectedFollowUp by remember(showSheet) { mutableStateOf<MoodFollowUpOption?>(null) }
    var selectedEnergy by remember(showSheet) { mutableStateOf<ReadingEnergyOption?>(null) }
    var recommendationOffset by remember(showSheet) { mutableIntStateOf(0) }

    val currentSelection = remember(selectedMood, selectedFollowUp, selectedEnergy) {
        if (selectedMood != null && selectedFollowUp != null && selectedEnergy != null) {
            MoodMatchSelection(
                mood = selectedMood!!,
                followUp = selectedFollowUp!!,
                readingEnergy = selectedEnergy!!
            )
        } else {
            null
        }
    }
    val recommendation = remember(currentSelection, recommendationOffset) {
        currentSelection?.let { MoodMatchEngine.nextMatch(it, recommendationOffset) }
    }
    val recommendationReason = remember(currentSelection, recommendation) {
        if (currentSelection != null && recommendation != null) {
            MoodMatchEngine.buildReason(currentSelection, recommendation)
        } else {
            ""
        }
    }

    LaunchedEffect(step, currentSelection) {
        if (step == MoodMatchStep.Loading && currentSelection != null) {
            delay(1100)
            step = MoodMatchStep.Result
        }
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 16.dp, end = 16.dp, top = 4.dp, bottom = 24.dp)
                .verticalScroll(rememberScrollState())
        ) {
            MoodMatchHeader()

            MoodMatchAssistantBubble(
                text = stringResource(id = R.string.mood_match_sheet_subtitle)
            )

            selectedMood?.let {
                MoodMatchUserBubble(text = it.toLabel())
            }

            selectedFollowUp?.let {
                MoodMatchUserBubble(text = it.toLabel())
            }

            selectedEnergy?.let {
                MoodMatchUserBubble(text = it.toLabel())
            }

            when (step) {
                MoodMatchStep.Mood -> {
                    MoodMatchAssistantBubble(
                        text = stringResource(id = R.string.mood_match_question_mood)
                    )
                    MoodMatchQuickReplies {
                        MoodOption.entries.forEach { mood ->
                            MoodMatchChoiceChip(
                                label = mood.toLabel(),
                                selected = selectedMood == mood,
                                onClick = {
                                    selectedMood = mood
                                    step = MoodMatchStep.FollowUp
                                }
                            )
                        }
                    }
                }

                MoodMatchStep.FollowUp -> {
                    MoodMatchAssistantBubble(
                        text = stringResource(id = R.string.mood_match_question_follow_up)
                    )
                    MoodMatchQuickReplies {
                        MoodFollowUpOption.entries.forEach { followUp ->
                            MoodMatchChoiceChip(
                                label = followUp.toLabel(),
                                selected = selectedFollowUp == followUp,
                                onClick = {
                                    selectedFollowUp = followUp
                                    step = MoodMatchStep.Energy
                                }
                            )
                        }
                    }
                    MoodMatchBackButton { step = MoodMatchStep.Mood }
                }

                MoodMatchStep.Energy -> {
                    MoodMatchAssistantBubble(
                        text = stringResource(id = R.string.mood_match_question_energy)
                    )
                    MoodMatchQuickReplies {
                        ReadingEnergyOption.entries.forEach { energy ->
                            MoodMatchChoiceChip(
                                label = energy.toLabel(),
                                selected = selectedEnergy == energy,
                                onClick = {
                                    selectedEnergy = energy
                                    recommendationOffset = 0
                                    step = MoodMatchStep.Loading
                                }
                            )
                        }
                    }
                    MoodMatchBackButton { step = MoodMatchStep.FollowUp }
                }

                MoodMatchStep.Loading -> {
                    MoodMatchTypingBubble(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 4.dp),
                        text = stringResource(id = R.string.mood_match_loading)
                    )
                }

                MoodMatchStep.Result -> {
                    if (recommendation != null) {
                        MoodMatchResultCard(
                            book = recommendation,
                            reason = recommendationReason
                        )

                        FilledTonalButton(
                            onClick = {
                                coroutineScope.launch {
                                    onReadThis(recommendation.id)
                                }
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 18.dp),
                            colors = ButtonDefaults.filledTonalButtonColors(
                                containerColor = MaterialTheme.colorScheme.primaryContainer,
                                contentColor = MaterialTheme.colorScheme.onPrimaryContainer
                            )
                        ) {
                            Text(
                                text = if (isBookOwned(recommendation.id) || isPremiumUser) {
                                    stringResource(id = R.string.mood_match_read_now)
                                } else {
                                    stringResource(
                                        id = R.string.mood_match_unlock_with_tokens,
                                        tokenCost
                                    )
                                }
                            )
                        }

                        OutlinedButton(
                            onClick = {
                                recommendationOffset += 1
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 10.dp)
                        ) {
                            Text(stringResource(id = R.string.mood_match_pick_another))
                        }

                        MoodMatchBackButton {
                            step = MoodMatchStep.Energy
                        }
                    }
                }
            }

            MoodMatchComposerHint()
        }
    }
}

@Composable
private fun MoodMatchHeader() {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceColorAtElevation(3.dp)
        ),
        shape = RoundedCornerShape(18.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 14.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.primaryContainer)
                    .padding(horizontal = 12.dp, vertical = 8.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = stringResource(id = R.string.mood_match_fab_label),
                    fontFamily = poppinsFont,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onPrimaryContainer
                )
            }
            Column(modifier = Modifier.padding(start = 12.dp)) {
                Text(
                    text = stringResource(id = R.string.mood_match_sheet_title),
                    fontFamily = poppinsFont,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 20.sp,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = "online now",
                    fontFamily = poppinsFont,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                    fontSize = 12.sp
                )
            }
        }
    }
}

@Composable
private fun MoodMatchAssistantBubble(text: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 12.dp)
    ) {
        Card(
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surfaceColorAtElevation(2.dp)
            ),
            shape = RoundedCornerShape(topStart = 8.dp, topEnd = 18.dp, bottomEnd = 18.dp, bottomStart = 18.dp)
        ) {
            Text(
                text = text,
                modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp),
                fontFamily = poppinsFont,
                fontWeight = FontWeight.Medium,
                fontSize = 16.sp,
                color = MaterialTheme.colorScheme.onSurface
            )
        }
    }
}

@Composable
private fun MoodMatchUserBubble(text: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 10.dp)
    ) {
        Spacer(modifier = Modifier.weight(1f))
        Card(
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.primaryContainer
            ),
            shape = RoundedCornerShape(topStart = 18.dp, topEnd = 8.dp, bottomEnd = 18.dp, bottomStart = 18.dp)
        ) {
            Text(
                text = text,
                modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp),
                fontFamily = poppinsFont,
                fontWeight = FontWeight.SemiBold,
                fontSize = 15.sp,
                color = MaterialTheme.colorScheme.onPrimaryContainer
            )
        }
    }
}

@Composable
private fun MoodMatchQuickReplies(content: @Composable () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 12.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceColorAtElevation(1.dp)
        ),
        shape = RoundedCornerShape(20.dp)
    ) {
        FlowRow(
            modifier = Modifier.padding(10.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            content()
        }
    }
}

@Composable
private fun MoodMatchTypingBubble(modifier: Modifier = Modifier, text: String) {
    Row(
        modifier = modifier
    ) {
        Card(
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surfaceColorAtElevation(2.dp)
            ),
            shape = RoundedCornerShape(topStart = 8.dp, topEnd = 18.dp, bottomEnd = 18.dp, bottomStart = 18.dp)
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                CircularProgressIndicator(
                    modifier = Modifier.width(18.dp),
                    strokeWidth = 2.dp
                )
                Text(
                    text = text,
                    modifier = Modifier.padding(start = 10.dp),
                    fontFamily = poppinsFont,
                    fontWeight = FontWeight.Medium,
                    color = MaterialTheme.colorScheme.onSurface
                )
            }
        }
    }
}

@Composable
private fun MoodMatchChoiceChip(
    label: String,
    selected: Boolean,
    onClick: () -> Unit
) {
    val view = LocalView.current
    Card(
        onClick = {
            view.weakHapticFeedback()
            onClick()
        },
        modifier = Modifier
            .padding(end = 2.dp, bottom = 2.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (selected) {
                MaterialTheme.colorScheme.primaryContainer
            } else {
                MaterialTheme.colorScheme.surfaceColorAtElevation(4.dp)
            }
        ),
        shape = RoundedCornerShape(18.dp)
    ) {
        Text(
            text = label,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 9.dp),
            fontFamily = poppinsFont,
            fontWeight = FontWeight.Medium,
            fontSize = 13.sp,
            maxLines = 1,
            color = if (selected) {
                MaterialTheme.colorScheme.onPrimaryContainer
            } else {
                MaterialTheme.colorScheme.onSurface
            }
        )
    }
}

@Composable
private fun MoodMatchResultCard(book: MoodMatchBook, reason: String) {
    Column(modifier = Modifier.padding(top = 12.dp)) {
        MoodMatchAssistantBubble(text = stringResource(id = R.string.mood_match_result_title))
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 10.dp),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surfaceColorAtElevation(2.dp)
            ),
            shape = RoundedCornerShape(topStart = 8.dp, topEnd = 18.dp, bottomEnd = 18.dp, bottomStart = 18.dp)
        ) {
            Column(modifier = Modifier.padding(14.dp)) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(170.dp)
                        .clip(RoundedCornerShape(14.dp))
                        .background(MaterialTheme.colorScheme.surfaceColorAtElevation(5.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    AsyncImage(
                        model = book.coverUrl,
                        contentDescription = stringResource(id = R.string.cover_image_desc),
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop,
                        placeholder = painterResource(id = R.drawable.placeholder_cat),
                        error = painterResource(id = R.drawable.placeholder_cat)
                    )
                }

                Text(
                    text = book.title,
                    modifier = Modifier.padding(top = 14.dp),
                    fontFamily = poppinsFont,
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = book.author,
                    modifier = Modifier.padding(top = 2.dp),
                    fontFamily = poppinsFont,
                    fontWeight = FontWeight.Medium,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.82f)
                )
                HorizontalDivider(
                    modifier = Modifier.padding(vertical = 12.dp),
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.08f)
                )
                Text(
                    text = reason,
                    fontFamily = poppinsFont,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.84f)
                )
            }
        }
    }
}

@Composable
private fun MoodMatchBackButton(onClick: () -> Unit) {
    FilledTonalButton(
        onClick = onClick,
        modifier = Modifier.padding(top = 12.dp),
        colors = ButtonDefaults.filledTonalButtonColors(
            containerColor = MaterialTheme.colorScheme.surfaceColorAtElevation(2.dp),
            contentColor = MaterialTheme.colorScheme.onSurface
        )
    ) {
        Text(stringResource(id = R.string.mood_match_back))
    }
}

@Composable
private fun MoodMatchComposerHint() {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 16.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceColorAtElevation(2.dp)
        ),
        shape = RoundedCornerShape(24.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 14.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Choose a reply above",
                modifier = Modifier.weight(1f),
                fontFamily = poppinsFont,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.55f)
            )
            Icon(
                painter = painterResource(id = R.drawable.ic_right_arrow),
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.45f)
            )
        }
    }
}

private fun MoodOption.toLabel(): String {
    return when (this) {
        MoodOption.Calm -> "Calm"
        MoodOption.Emotional -> "Emotional"
        MoodOption.Thoughtful -> "Thoughtful"
        MoodOption.Light -> "Light"
        MoodOption.Inspiring -> "Inspiring"
        MoodOption.SurpriseMe -> "Surprise me"
    }
}

private fun MoodFollowUpOption.toLabel(): String {
    return when (this) {
        MoodFollowUpOption.QuietEscape -> "Quiet escape"
        MoodFollowUpOption.HumanConnection -> "Human connection"
        MoodFollowUpOption.BigIdeas -> "Big ideas"
        MoodFollowUpOption.PlayfulTurn -> "Playful turn"
    }
}

private fun ReadingEnergyOption.toLabel(): String {
    return when (this) {
        ReadingEnergyOption.TenMinutes -> "10 min"
        ReadingEnergyOption.TwentyMinutes -> "20 min"
        ReadingEnergyOption.ShortRead -> "Short read"
        ReadingEnergyOption.SinkIn -> "I want to sink in"
    }
}
