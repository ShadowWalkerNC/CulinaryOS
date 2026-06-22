package com.culinaryos.recipeos

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.lifecycle.lifecycleScope
import com.culinaryos.recipeos.data.*
import com.culinaryos.recipeos.ui.screens.PantryScreen
import com.culinaryos.recipeos.ui.screens.PrepListScreen
import com.culinaryos.recipeos.ui.screens.RecipeEditorScreen
import com.culinaryos.recipeos.ui.theme.RecipeOSTheme
import com.culinaryos.recipeos.viewmodel.RecipeViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.util.UUID

class MainActivity : ComponentActivity() {
    private lateinit var database: AppDatabase
    private lateinit var viewModel: RecipeViewModel

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        database = AppDatabase.getDatabase(this)
        viewModel = RecipeViewModel(database.recipeDao())

        // Seed data asynchronously if empty
        lifecycleScope.launch(Dispatchers.IO) {
            seedDatabaseIfEmpty(database.recipeDao())
        }

        setContent {
            RecipeOSTheme {
                MainAppLayout(viewModel)
            }
        }
    }

    private suspend fun seedDatabaseIfEmpty(dao: RecipeDao) {
        // Simple verification query
        val existing = dao.getRecipesFlow()
        // If no records in database, perform a full transaction seed
        if (dao.getRecipeById("c30f40d8-19b8-4c6e-82d2-8b2b64d420c2") == null) {
            val breadFlour = IngredientEntity("1", "Bread Flour", "Flour", false)
            val wheatFlour = IngredientEntity("2", "Whole Wheat", "Flour", false)
            val water = IngredientEntity("3", "Water", "Liquid", false)
            val starter = IngredientEntity("4", "Sourdough Starter", "Leaven", false)
            val salt = IngredientEntity("5", "Fine Sea Salt", "Spice", false)
            val cinnamon = IngredientEntity("6", "Cinnamon", "Spice", false)

            dao.insertIngredient(breadFlour)
            dao.insertIngredient(wheatFlour)
            dao.insertIngredient(water)
            dao.insertIngredient(starter)
            dao.insertIngredient(salt)
            dao.insertIngredient(cinnamon)

            val recipe = RecipeEntity(
                id = "c30f40d8-19b8-4c6e-82d2-8b2b64d420c2",
                name = "Cinnamon Sourdough",
                description = "Standard sourdough recipe scaled with cinnamon swirls",
                yieldQuantity = 2.0,
                yieldUnit = "Loaves"
            )
            dao.insertRecipe(recipe)

            val items = listOf(
                RecipeIngredientCrossRef(recipe.id, "1", 80.0, 800.0, true, true),
                RecipeIngredientCrossRef(recipe.id, "2", 20.0, 200.0, true, true),
                RecipeIngredientCrossRef(recipe.id, "3", 78.0, 780.0, false, true),
                RecipeIngredientCrossRef(recipe.id, "4", 20.0, 200.0, false, true),
                RecipeIngredientCrossRef(recipe.id, "5", 2.2, 22.0, false, false),
                RecipeIngredientCrossRef(recipe.id, "6", 1.5, 15.0, false, true)
            )
            dao.insertRecipeIngredients(items)

            // Seed mock pantry
            dao.insertPantryItem(PantryItemEntity(UUID.randomUUID().toString(), "1", 12.0, "kg", 50.0, "Dry Storage A"))
            dao.insertPantryItem(PantryItemEntity(UUID.randomUUID().toString(), "2", 2.5, "kg", 5.0, "Bake Prep Counter"))
            dao.insertPantryItem(PantryItemEntity(UUID.randomUUID().toString(), "3", 8.2, "kg", 10.0, "Spices Row C"))
            dao.insertPantryItem(PantryItemEntity(UUID.randomUUID().toString(), "4", 25.0, "kg", 20.0, "Walk-in Cooler 1"))
            
            // Seed mock prep list
            val prepList = PrepListEntity("pl-01", System.currentTimeMillis(), "Cinnamon Sourdough prep batch")
            dao.insertPrepList(prepList)
            dao.insertPrepItems(listOf(
                PrepItemEntity("pi-01", "pl-01", recipe.id, "Autolyse Flour + Water (Sourdough)", 1.0, false, null),
                PrepItemEntity("pi-02", "pl-01", recipe.id, "Feed Starter (Sourdough)", 1.0, false, null),
                PrepItemEntity("pi-03", "pl-01", recipe.id, "Scale Dry Spices (Sourdough + Babka)", 1.0, false, null)
              )
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainAppLayout(viewModel: RecipeViewModel) {
    var currentTab by remember { mutableStateOf(0) }
    val tabs = listOf("Recipe Scale", "Prep List", "Pantry")

    Scaffold(
        topBar = {
            TopAppBar(
                title = { 
                    Text(
                        text = "CulinaryOS Mobile", 
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    ) 
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        },
        bottomBar = {
            NavigationBar(
                containerColor = MaterialTheme.colorScheme.surface
            ) {
                tabs.forEachIndexed { index, label ->
                    NavigationBarItem(
                        selected = currentTab == index,
                        onClick = { currentTab = index },
                        label = { Text(label) },
                        icon = {
                            Text(
                                text = when (index) {
                                    0 -> "📐"
                                    1 -> "📋"
                                    else -> "📦"
                                },
                                fontWeight = FontWeight.Bold
                            )
                        },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = MaterialTheme.colorScheme.primary,
                            selectedTextColor = MaterialTheme.colorScheme.primary,
                            unselectedIconColor = MaterialTheme.colorScheme.onSurface,
                            unselectedTextColor = MaterialTheme.colorScheme.onSurface
                        )
                    )
                }
            }
        }
    ) { innerPadding ->
        Surface(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
            color = MaterialTheme.colorScheme.background
        ) {
            when (currentTab) {
                0 -> RecipeEditorScreen(viewModel)
                1 -> PrepListScreen(viewModel)
                2 -> PantryScreen(viewModel)
            }
        }
    }
}
