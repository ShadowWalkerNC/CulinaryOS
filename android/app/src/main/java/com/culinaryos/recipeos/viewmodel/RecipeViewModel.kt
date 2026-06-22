package com.culinaryos.recipeos.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.culinaryos.recipeos.data.*
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class RecipeViewModel(private val recipeDao: RecipeDao) : ViewModel() {

    // Expose Room database flows as Compose-friendly StateFlows
    val recipes = recipeDao.getRecipesFlow()
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    val pantryItems = recipeDao.getPantryItemsFlow()
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    val prepLists = recipeDao.getPrepListsFlow()
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    // Fetch ingredients for a specific recipe
    fun getRecipeIngredients(recipeId: String): Flow<List<RecipeIngredientWithInfo>> {
        return recipeDao.getRecipeIngredientsFlow(recipeId)
    }

    // Toggle KDS/Prep checklist completion in DB
    fun togglePrepItem(itemId: String, isCompleted: Boolean) {
        viewModelScope.launch {
            recipeDao.togglePrepItemCompleted(itemId, isCompleted)
        }
    }

    // Update physical pantry stock levels in DB
    fun updatePantryStock(itemId: String, newQuantity: Double) {
        viewModelScope.launch {
            recipeDao.updatePantryQuantity(itemId, newQuantity)
        }
    }

    // Add a new recipe to SQLite
    fun addRecipe(recipe: RecipeEntity, ingredients: List<RecipeIngredientCrossRef>) {
        viewModelScope.launch {
            recipeDao.insertRecipe(recipe)
            recipeDao.insertRecipeIngredients(ingredients)
        }
    }

    // Delete a recipe in SQLite (Soft delete for sync)
    fun deleteRecipe(recipeId: String) {
        viewModelScope.launch {
            recipeDao.softDeleteRecipe(recipeId)
        }
    }
}
