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

package com.starry.myne.ui.screens.settings.composables

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Contrast
import androidx.compose.material.icons.filled.MusicNote
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.livedata.observeAsState
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavController
import com.starry.myne.MainActivity
import com.starry.myne.R
import com.starry.myne.helpers.BackgroundMusicPlayer
import com.starry.myne.helpers.PlanType
import com.starry.myne.helpers.getActivity
import com.starry.myne.ui.common.CustomTopAppBar
import com.starry.myne.ui.navigation.Screens
import com.starry.myne.ui.screens.main.bottomNavPadding
import com.starry.myne.ui.screens.settings.viewmodels.SettingsViewModel
import com.starry.myne.ui.theme.poppinsFont

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(navController: NavController) {
    val context = LocalContext.current
    val viewModel = (context.getActivity() as MainActivity).settingsViewModel
    val readingStreakState = viewModel.readingStreak.collectAsStateWithLifecycle()
    val userEmail = viewModel.userEmail.observeAsState()
    val tokenBalance = viewModel.tokenBalance.observeAsState(initial = 0)
    val planType = viewModel.planType.observeAsState(initial = PlanType.FREE)

    val snackBarHostState = remember { SnackbarHostState() }

    LaunchedEffect(Unit) {
        viewModel.refreshAccountState()
    }

    Scaffold(
        modifier = Modifier.padding(bottom = bottomNavPadding),
        snackbarHost = { SnackbarHost(snackBarHostState) },
        topBar = {
            CustomTopAppBar(
                headerText = stringResource(id = R.string.settings_header),
                iconRes = R.drawable.ic_nav_settings
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .padding(paddingValues)
        ) {
            Column(modifier = Modifier.verticalScroll(rememberScrollState())) {
                SettingsCard()
                AccountCard(
                    viewModel = viewModel,
                    email = userEmail.value,
                    planType = planType.value,
                    tokenBalance = tokenBalance.value,
                    onLogoutClick = {
                        viewModel.logout()
                        navController.navigate(Screens.AuthScreen.route) {
                            popUpTo(navController.graph.findStartDestination().id) {
                                inclusive = true
                            }
                            launchSingleTop = true
                        }
                    }
                )
                Card(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp)) {
                    Row(modifier = Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Text("Author / admin tools", modifier = Modifier.weight(1f), fontFamily = poppinsFont)
                        TextButton(onClick = { navController.navigate(Screens.DashboardScreen.route) }) { Text("Open") }
                    }
                }
                DisplayOptionsUI(
                    viewModel = viewModel,
                    showReadingStreak = {
                        ReadingStreakCard(streakState = readingStreakState.value)
                    }
                )
            }
        }
    }
}

@Composable
private fun AccountCard(
    viewModel: SettingsViewModel,
    email: String?,
    planType: String,
    tokenBalance: Int,
    onLogoutClick: () -> Unit
) {
    var showPlanDialog by remember { mutableStateOf(false) }
    val isPremiumPlan = planType == PlanType.PREMIUM

    Card(
        modifier = Modifier
            .padding(horizontal = 10.dp, vertical = 4.dp)
            .fillMaxWidth(),
        shape = RoundedCornerShape(6.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp)
        ) {
            Text(
                text = stringResource(id = R.string.settings_account_header),
                fontFamily = poppinsFont,
                color = MaterialTheme.colorScheme.onSurface,
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
            )

            Spacer(modifier = Modifier.height(10.dp))

            Text(
                text = email ?: stringResource(id = R.string.settings_no_logged_in_user),
                fontFamily = poppinsFont,
                color = MaterialTheme.colorScheme.onSurface
            )

            Spacer(modifier = Modifier.height(6.dp))

            Text(
                text = if (isPremiumPlan) {
                    stringResource(id = R.string.settings_premium_access)
                } else {
                    stringResource(id = R.string.settings_tokens_left, tokenBalance)
                },
                fontFamily = poppinsFont,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Spacer(modifier = Modifier.height(12.dp))

            SettingItem(
                icon = Icons.Filled.Star,
                mainText = stringResource(id = R.string.settings_plan_title),
                subText = if (isPremiumPlan) {
                    stringResource(id = R.string.settings_plan_premium)
                } else {
                    stringResource(id = R.string.settings_plan_free)
                },
                onClick = { showPlanDialog = true }
            )

            Spacer(modifier = Modifier.height(14.dp))

            Button(onClick = onLogoutClick) {
                Text(text = stringResource(id = R.string.settings_logout), fontFamily = poppinsFont)
            }
        }
    }

    if (showPlanDialog) {
        AlertDialog(
            onDismissRequest = { showPlanDialog = false },
            title = {
                Text(
                    text = if (isPremiumPlan) {
                        stringResource(id = R.string.settings_plan_premium)
                    } else {
                        stringResource(id = R.string.settings_plan_dialog_title)
                    },
                    fontFamily = poppinsFont
                )
            },
            text = {
                Text(
                    text = if (isPremiumPlan) {
                        stringResource(id = R.string.settings_plan_dialog_premium_message)
                    } else {
                        stringResource(id = R.string.settings_plan_dialog_free_message)
                    },
                    fontFamily = poppinsFont
                )
            },
            confirmButton = {
                if (isPremiumPlan) {
                    TextButton(onClick = { showPlanDialog = false }) {
                        Text(
                            text = stringResource(id = R.string.ok),
                            fontFamily = poppinsFont
                        )
                    }
                } else {
                    TextButton(
                        onClick = {
                            viewModel.upgradeToPremium()
                            showPlanDialog = false
                        }
                    ) {
                        Text(
                            text = stringResource(id = R.string.settings_plan_buy_premium),
                            fontFamily = poppinsFont
                        )
                    }
                }
            },
            dismissButton = {
                if (!isPremiumPlan) {
                    TextButton(onClick = { showPlanDialog = false }) {
                        Text(
                            text = stringResource(id = R.string.cancel),
                            fontFamily = poppinsFont
                        )
                    }
                }
            }
        )
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun SettingsCard() {
    Card(
        modifier = Modifier
            .padding(10.dp)
            .fillMaxWidth(),
        shape = RoundedCornerShape(6.dp)
    ) {
        FlowRow(
            modifier = Modifier
                .padding(20.dp)
                .fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalArrangement = Arrangement.Center,
            maxItemsInEachRow = Int.MAX_VALUE
        ) {
            Column(
                modifier = Modifier
                .weight(1f, fill = false)
                    .padding(bottom = 2.dp)
            ) {
                Text(
                    text = stringResource(id = R.string.app_name),
                    fontFamily = poppinsFont,
                    color = MaterialTheme.colorScheme.onSurface,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                )

                Text(
                    text = "Ebook Downloader and reader",
                    fontFamily = poppinsFont,
                    color = MaterialTheme.colorScheme.onSurface,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.SemiBold,
                )

                Text(
                    text = "One Day One Page",
                    fontFamily = poppinsFont,
                    color = MaterialTheme.colorScheme.onSurface,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier.padding(top = 6.dp)
                )
            }

            Box(
                modifier = Modifier
                    .size(90.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.surface),
                contentAlignment = Alignment.Center
            ) {
                Image(
                    painter = painterResource(id = R.drawable.ic_launcher_foreground_image),
                    contentDescription = null,
                    modifier = Modifier.size(110.dp)
                )
            }
        }
    }
}


@Composable
private fun DisplayOptionsUI(
    viewModel: SettingsViewModel,
    showReadingStreak: @Composable () -> Unit,
) {
    // Display settings for the amoled theme
    val amoledState = viewModel.amoledTheme.observeAsState(initial = false)
    val playMusicState = viewModel.playBackgroundMusic.observeAsState(initial = false)
    val context = LocalContext.current
    val amoledDesc = if (amoledState.value) {
        stringResource(id = R.string.amoled_theme_setting_enabled_desc)
    } else {
        stringResource(id = R.string.amoled_theme_setting_disabled_desc)
    }
    val playMusicDesc = stringResource(id = R.string.play_music_setting_desc)

    LaunchedEffect(playMusicState.value) {
        BackgroundMusicPlayer.syncPlayback(context, playMusicState.value)
    }

    Column(
        modifier = Modifier
            .padding(horizontal = 14.dp)
            .padding(top = 2.dp)
    ) {
        Text(
            text = stringResource(id = R.string.display_setting_header),
            fontFamily = poppinsFont,
            color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.8f),
            fontSize = 14.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(vertical = 8.dp)
        )
        SettingItemWIthSwitch(
            icon = Icons.Filled.Contrast,
            mainText = stringResource(id = R.string.amoled_theme_setting),
            subText = amoledDesc,
            switchState = amoledState,
            onCheckChange = {
                viewModel.setAmoledTheme(it)
            })
        SettingItemWIthSwitch(
            icon = Icons.Filled.MusicNote,
            mainText = stringResource(id = R.string.play_music_setting),
            subText = playMusicDesc,
            switchState = playMusicState,
            onCheckChange = {
                viewModel.setPlayBackgroundMusic(it)
            })
        showReadingStreak()
    }
}

@Composable
@Preview
fun SettingsScreenPreview() {
    SettingsCard()
}
