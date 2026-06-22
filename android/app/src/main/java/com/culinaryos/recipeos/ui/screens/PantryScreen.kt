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
import com.culinaryos.recipeos.viewmodel.RecipeViewModel

@Composable
fun PantryScreen(viewModel: RecipeViewModel) {
    val pantryItems by viewModel.pantryItems.collectAsState(initial = emptyList())

    val criticalItemsCount = pantryItems.count { it.quantityOnHand < it.parLevel * 0.5 }
    val warningItemsCount = pantryItems.count { it.quantityOnHand >= it.parLevel * 0.5 && it.quantityOnHand < it.parLevel }

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
                val ratio = item.quantityOnHand / item.parLevel
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
                        Column(modifier = Modifier.weight(1.5f)) {
                            Text(item.ingredientName, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                            Text("Bin: ${item.binLocation ?: "Main Storage"}", color = TextMuted, fontSize = 12.sp)
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "On-Hand: ${item.quantityOnHand} ${item.quantityUnit} / Par: ${item.parLevel} ${item.quantityUnit}",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Medium
                            )
                        }

                        // Adjustment controls
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Button(
                                onClick = { 
                                    val nextQty = maxOf(0.0, item.quantityOnHand - 1.0)
                                    viewModel.updatePantryStock(item.id, nextQty)
                                },
                                contentPadding = PaddingValues(0.dp),
                                modifier = Modifier.size(36.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                            ) {
                                Text("-", fontSize = 18.sp, fontWeight = FontWeight.Bold)
                            }
                            
                            Button(
                                onClick = { 
                                    val nextQty = item.quantityOnHand + 1.0
                                    viewModel.updatePantryStock(item.id, nextQty)
                                },
                                contentPadding = PaddingValues(0.dp),
                                modifier = Modifier.size(36.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                            ) {
                                Text("+", fontSize = 18.sp, fontWeight = FontWeight.Bold)
                            }
                        }

                        Surface(
                            color = statusColor,
                            shape = MaterialTheme.shapes.medium
                        ) {
                            Text(
                                text = statusText,
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
    }
}
