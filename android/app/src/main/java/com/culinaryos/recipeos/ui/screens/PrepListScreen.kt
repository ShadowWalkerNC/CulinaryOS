package com.culinaryos.recipeos.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.culinaryos.recipeos.data.AppDatabase
import com.culinaryos.recipeos.ui.theme.DarkBg
import com.culinaryos.recipeos.ui.theme.SurfaceBg
import com.culinaryos.recipeos.ui.theme.TextMuted
import com.culinaryos.recipeos.viewmodel.RecipeViewModel

@Composable
fun PrepListScreen(viewModel: RecipeViewModel) {
    val context = LocalContext.current
    val db = remember { AppDatabase.getDatabase(context) }
    
    // Flow of active prep items for the seeded prep list "pl-01"
    val tasks by db.recipeDao().getPrepItemsFlow("pl-01").collectAsState(initial = emptyList())

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkBg)
            .padding(16.dp)
    ) {
        Text(
            text = "Consolidated Prep List",
            style = MaterialTheme.typography.titleLarge,
            modifier = Modifier.padding(bottom = 4.dp)
        )
        Text(
            text = "Target Date: June 22, 2026",
            fontSize = 14.sp,
            color = MaterialTheme.colorScheme.primary,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier.padding(bottom = 16.dp)
        )

        LazyColumn(
            modifier = Modifier.fillMaxSize()
        ) {
            item {
                Text(
                    text = "ACTIVE PREP STEPS",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextMuted,
                    modifier = Modifier.padding(vertical = 8.dp)
                )
            }

            if (tasks.isEmpty()) {
                item {
                    Text(
                        text = "No active prep items for today.",
                        color = TextMuted,
                        modifier = Modifier.padding(16.dp)
                    )
                }
            } else {
                items(tasks) { task ->
                    Card(
                        colors = CardDefaults.cardColors(containerColor = SurfaceBg),
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Checkbox(
                                checked = task.isCompleted,
                                onCheckedChange = { isChecked ->
                                    viewModel.togglePrepItem(task.id, isChecked)
                                },
                                colors = CheckboxDefaults.colors(
                                    checkedColor = MaterialTheme.colorScheme.primary,
                                    checkmarkColor = DarkBg
                                )
                            )

                            Spacer(modifier = Modifier.width(12.dp))

                            Column {
                                Text(
                                    text = task.taskDescription,
                                    fontWeight = FontWeight.SemiBold,
                                    fontSize = 16.sp,
                                    textDecoration = if (task.isCompleted) TextDecoration.LineThrough else TextDecoration.None,
                                    color = if (task.isCompleted) TextMuted else MaterialTheme.colorScheme.onBackground
                                )
                                Text(
                                    text = "Batch Size: ${task.scaledBatchSize}x",
                                    fontSize = 12.sp,
                                    color = TextMuted
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
