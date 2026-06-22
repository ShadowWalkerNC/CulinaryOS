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
import com.culinaryos.recipeos.data.RecipeIngredientWithInfo
import com.culinaryos.recipeos.engine.RatioBlueprintEngine
import com.culinaryos.recipeos.ui.theme.DarkBg
import com.culinaryos.recipeos.ui.theme.SurfaceBg
import com.culinaryos.recipeos.ui.theme.TextMuted
import com.culinaryos.recipeos.viewmodel.RecipeViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RecipeEditorScreen(viewModel: RecipeViewModel) {
    val recipes by viewModel.recipes.collectAsState(initial = emptyList())
    val activeRecipe = recipes.firstOrNull { it.id == "c30f40d8-19b8-4c6e-82d2-8b2b64d420c2" }
    
    val baseIngredients by (activeRecipe?.let { viewModel.getRecipeIngredients(it.id) }
        ?: remember { mutableStateOf(null) })?.collectAsState(initial = emptyList()) ?: remember { mutableStateOf(emptyList()) }

    var totalWeightInput by remember { mutableStateOf("1817.0") }
    var scaleMultiplier by remember { mutableStateOf(1.0f) }
    var scaleByTotalMode by remember { mutableStateOf(true) }

    // Derive scaled ingredients dynamically
    val scaledIngredients = remember(scaleMultiplier, scaleByTotalMode, totalWeightInput, baseIngredients) {
        if (baseIngredients.isEmpty()) emptyList()
        else if (scaleByTotalMode) {
            val targetWeight = totalWeightInput.toDoubleOrNull() ?: 1817.0
            RatioBlueprintEngine.scaleByTargetTotalWeight(baseIngredients, targetWeight)
        } else {
            RatioBlueprintEngine.scaleByFactor(baseIngredients, scaleMultiplier.toDouble())
        }
    }
    
    val totalWeight = scaledIngredients.sumOf { it.scaledWeightGrams }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkBg)
            .padding(16.dp)
    ) {
        Text(
            text = activeRecipe?.name ?: "Loading Formula...",
            style = MaterialTheme.typography.titleLarge,
            color = MaterialTheme.colorScheme.onBackground,
            modifier = Modifier.padding(bottom = 8.dp)
        )
        
        Text(
            text = "Total Yield: ${String.format("%.1f", totalWeight)} g (${String.format("%.2f", totalWeight / 1000.0)} kg)",
            fontSize = 16.sp,
            color = MaterialTheme.colorScheme.primary,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(bottom = 16.dp)
        )

        // Mode Toggles & Inputs Card
        Card(
            colors = CardDefaults.cardColors(containerColor = SurfaceBg),
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 16.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Scale by Target Weight", fontWeight = FontWeight.SemiBold)
                    Switch(
                        checked = scaleByTotalMode,
                        onCheckedChange = { scaleByTotalMode = it }
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                if (scaleByTotalMode) {
                    OutlinedTextField(
                        value = totalWeightInput,
                        onValueChange = { totalWeightInput = it },
                        label = { Text("Target Batch Weight (g)") },
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = MaterialTheme.colorScheme.primary,
                            unfocusedBorderColor = TextMuted
                        )
                    )
                } else {
                    Text("Scale Factor: ${String.format("%.2fx", scaleMultiplier)}", modifier = Modifier.padding(bottom = 8.dp))
                    Slider(
                        value = scaleMultiplier,
                        onValueChange = { scaleMultiplier = it },
                        valueRange = 0.25f..10.0f,
                        steps = 39, // Increments of 0.25
                        colors = SliderDefaults.colors(
                            thumbColor = MaterialTheme.colorScheme.primary,
                            activeTrackColor = MaterialTheme.colorScheme.primary
                        )
                    )
                    
                    Row(
                        horizontalArrangement = Arrangement.SpaceEvenly,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Button(onClick = { scaleMultiplier = 0.5f }) { Text("0.5x") }
                        Button(onClick = { scaleMultiplier = 1.0f }) { Text("1.0x") }
                        Button(onClick = { scaleMultiplier = 2.0f }) { Text("2.0x") }
                        Button(onClick = { scaleMultiplier = 5.0f }) { Text("5.0x") }
                    }
                }
            }
        }

        // Ingredients Table Header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp, vertical = 4.dp),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text("Ingredient", modifier = Modifier.weight(2f), fontWeight = FontWeight.Bold, color = TextMuted)
            Text("Ratio (%)", modifier = Modifier.weight(1f), fontWeight = FontWeight.Bold, color = TextMuted)
            Text("Weight (g)", modifier = Modifier.weight(1f), fontWeight = FontWeight.Bold, color = TextMuted)
        }
        
        Divider(color = TextMuted, thickness = 1.dp, modifier = Modifier.padding(bottom = 8.dp))

        // Ingredients List
        LazyColumn(modifier = Modifier.weight(1f)) {
            items(scaledIngredients) { ingredient ->
                Card(
                    colors = CardDefaults.cardColors(containerColor = SurfaceBg),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(2f)) {
                            Text(ingredient.name, fontWeight = FontWeight.Medium, fontSize = 16.sp)
                            Text(ingredient.category, fontSize = 12.sp, color = TextMuted)
                        }
                        Text(
                            text = "${ingredient.ratioPercentage}%",
                            modifier = Modifier.weight(1f),
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.primary
                        )
                        Text(
                            text = "${String.format("%.1f", ingredient.scaledWeightGrams)} g",
                            modifier = Modifier.weight(1f),
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }
    }
}
