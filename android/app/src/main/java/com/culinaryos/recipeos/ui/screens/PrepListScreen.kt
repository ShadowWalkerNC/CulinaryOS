package com.culinaryos.recipeos.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.culinaryos.recipeos.ui.theme.DarkBg
import com.culinaryos.recipeos.ui.theme.SurfaceBg
import com.culinaryos.recipeos.ui.theme.TextMuted

data class MockPrepTask(
    val id: String,
    val description: String,
    val detail: String,
    var isDone: Boolean = false
)

@Composable
fun PrepListScreen() {
    val tasks = remember {
        mutableStateListOf(
            MockPrepTask("1", "Autolyse Flour + Water (Sourdough)", "Let sit for 45 mins - target temp 76°F"),
            MockPrepTask("2", "Feed Starter (Sourdough)", "Ratio 1:2:2 - need 1000g active starter"),
            MockPrepTask("3", "Scale Dry Spices (Sourdough + Babka)", "Cinnamon, Sea Salt, Sugar batches"),
            MockPrepTask("4", "Consolidate Flour Weights", "Bread Flour: 4,800.0g total"),
            MockPrepTask("5", "Prepare Egg Wash (Babka)", "Whisk 4 eggs with 30ml heavy cream")
        )
    }

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
            text = "Target Date: June 15, 2026",
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
                            checked = task.isDone,
                            onCheckedChange = { isChecked ->
                                val index = tasks.indexOf(task)
                                if (index != -1) {
                                    tasks[index] = task.copy(isDone = isChecked)
                                }
                            },
                            colors = CheckboxDefaults.colors(
                                checkedColor = MaterialTheme.colorScheme.primary,
                                checkmarkColor = DarkBg
                            )
                        )

                        Spacer(modifier = Modifier.width(12.dp))

                        Column {
                            Text(
                                text = task.description,
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 16.sp,
                                textDecoration = if (task.isDone) TextDecoration.LineThrough else TextDecoration.None,
                                color = if (task.isDone) TextMuted else MaterialTheme.colorScheme.onBackground
                            )
                            Text(
                                text = task.detail,
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
