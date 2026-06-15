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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.culinaryos.recipeos.ui.theme.DarkBg
import com.culinaryos.recipeos.ui.theme.DangerRed
import com.culinaryos.recipeos.ui.theme.SuccessGreen
import com.culinaryos.recipeos.ui.theme.SurfaceBg
import com.culinaryos.recipeos.ui.theme.TextMuted
import com.culinaryos.recipeos.ui.theme.WarningAmber

data class MockPantryItem(
    val id: String,
    val name: String,
    val onHand: Double,
    val par: Double,
    val unit: String,
    val binLocation: String
)

@Composable
fun PantryScreen() {
    val pantryItems = remember {
        mutableStateListOf(
            MockPantryItem("1", "Unbleached Bread Flour", 12.0, 50.0, "kg", "Dry Storage A"),
            MockPantryItem("2", "Active Sourdough Starter", 2.5, 5.0, "kg", "Bake Prep Counter"),
            MockPantryItem("3", "Fine Sea Salt", 8.2, 10.0, "kg", "Spices Row C"),
            MockPantryItem("4", "Unsalted Butter", 25.0, 20.0, "kg", "Walk-in Cooler 1"),
            MockPantryItem("5", "Ground Cinnamon", 1.8, 1.0, "kg", "Spices Row A")
        )
    }

    val criticalItemsCount = pantryItems.count { it.onHand < it.par * 0.5 }
    val warningItemsCount = pantryItems.count { it.onHand >= it.par * 0.5 && it.onHand < it.par }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkBg)
            .padding(16.dp)
    ) {
        Text(
            text = "Pantry Inventory",
            style = MaterialTheme.typography.titleLarge,
            modifier = Modifier.padding(bottom = 8.dp)
        )

        // Stock Status Summary
        Card(
            colors = CardDefaults.cardColors(containerColor = SurfaceBg),
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 16.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text("Inventory Status", fontWeight = FontWeight.Bold)
                    Text("Total items tracked: ${pantryItems.size}", color = TextMuted, fontSize = 12.sp)
                }
                
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    if (criticalItemsCount > 0) {
                        Surface(
                            color = DangerRed,
                            shape = MaterialTheme.shapes.small
                        ) {
                            Text(
                                text = "$criticalItemsCount CRIT",
                                color = DarkBg,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }
                    }
                    if (warningItemsCount > 0) {
                        Surface(
                            color = WarningAmber,
                            shape = MaterialTheme.shapes.small
                        ) {
                            Text(
                                text = "$warningItemsCount LOW",
                                color = DarkBg,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }
                    }
                }
            }
        }

        // Pantry List
        LazyColumn(modifier = Modifier.fillMaxSize()) {
            items(pantryItems) { item ->
                val ratio = item.onHand / item.par
                val (statusText, statusColor) = when {
                    ratio < 0.5 -> "CRITICAL" to DangerRed
                    ratio < 1.0 -> "LOW STOCK" to WarningAmber
                    else -> "OPTIMAL" to SuccessGreen
                }

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
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(item.name, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                            Text("Bin: ${item.binLocation}", color = TextMuted, fontSize = 12.sp)
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "On-Hand: ${item.onHand} ${item.unit} / Par: ${item.par} ${item.unit}",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Medium
                            )
                        }

                        Surface(
                            color = statusColor,
                            shape = MaterialTheme.shapes.medium
                        ) {
                            Text(
                                text = statusText,
                                color = DarkBg,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}
