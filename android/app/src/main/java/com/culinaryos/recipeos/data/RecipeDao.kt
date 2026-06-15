package com.culinaryos.recipeos.data

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import androidx.room.Update
import kotlinx.coroutines.flow.Flow

data class RecipeIngredientWithInfo(
    val ingredientId: String,
    val name: String,
    val category: String,
    val isAllergen: Boolean,
    val ratioPercentage: Double,
    val baseWeightGrams: Double,
    val isBaseFlour: Boolean,
    val isScalingLinear: Boolean
)

data class PantryItemWithInfo(
    val id: String,
    val ingredientId: String,
    val ingredientName: String,
    val ingredientCategory: String,
    val quantityOnHand: Double,
    val quantityUnit: String,
    val parLevel: Double,
    val binLocation: String?
)

@Dao
interface RecipeDao {

    // --- Recipes ---
    @Query("SELECT * FROM recipes WHERE is_deleted = 0 ORDER BY name ASC")
    fun getRecipesFlow(): Flow<List<RecipeEntity>>

    @Query("SELECT * FROM recipes WHERE id = :id AND is_deleted = 0")
    suspend fun getRecipeById(id: String): RecipeEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertRecipe(recipe: RecipeEntity)

    @Update
    suspend fun updateRecipe(recipe: RecipeEntity)

    @Query("UPDATE recipes SET is_deleted = 1, updated_at = :timestamp, sync_status = 'PENDING' WHERE id = :recipeId")
    suspend fun softDeleteRecipe(recipeId: String, timestamp: Long = System.currentTimeMillis())

    // --- Recipe Ingredients ---
    @Query("""
        SELECT ri.ingredient_id as ingredientId, i.name, i.category, i.is_allergen as isAllergen, 
               ri.ratio_percentage as ratioPercentage, ri.base_weight_grams as baseWeightGrams, 
               ri.is_base_flour as isBaseFlour, ri.is_scaling_linear as isScalingLinear
        FROM recipe_ingredients ri
        INNER JOIN ingredients i ON ri.ingredient_id = i.id
        WHERE ri.recipe_id = :recipeId AND i.is_deleted = 0
    """)
    fun getRecipeIngredientsFlow(recipeId: String): Flow<List<RecipeIngredientWithInfo>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertRecipeIngredients(ingredients: List<RecipeIngredientCrossRef>)

    @Query("DELETE FROM recipe_ingredients WHERE recipe_id = :recipeId")
    suspend fun clearRecipeIngredients(recipeId: String)

    // --- Ingredients Directory ---
    @Query("SELECT * FROM ingredients WHERE is_deleted = 0 ORDER BY name ASC")
    fun getIngredientsFlow(): Flow<List<IngredientEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertIngredient(ingredient: IngredientEntity)

    // --- Pantry ---
    @Query("""
        SELECT p.id, p.ingredient_id as ingredientId, i.name as ingredientName, i.category as ingredientCategory,
               p.quantity_on_hand as quantityOnHand, p.quantity_unit as quantityUnit, 
               p.par_level as parLevel, p.bin_location as binLocation
        FROM pantry_items p
        INNER JOIN ingredients i ON p.ingredient_id = i.id
        WHERE p.is_deleted = 0 AND i.is_deleted = 0
    """)
    fun getPantryItemsFlow(): Flow<List<PantryItemWithInfo>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPantryItem(pantryItem: PantryItemEntity)

    @Query("UPDATE pantry_items SET quantity_on_hand = :qty, updated_at = :timestamp, sync_status = 'PENDING' WHERE id = :id")
    suspend fun updatePantryQuantity(id: String, qty: Double, timestamp: Long = System.currentTimeMillis())

    // --- Prep Lists ---
    @Query("SELECT * FROM prep_lists WHERE is_deleted = 0 ORDER BY target_date DESC")
    fun getPrepListsFlow(): Flow<List<PrepListEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPrepList(prepList: PrepListEntity)

    @Query("SELECT * FROM prep_items WHERE prep_list_id = :prepListId AND is_deleted = 0")
    fun getPrepItemsFlow(prepListId: String): Flow<List<PrepItemEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPrepItems(items: List<PrepItemEntity>)

    @Query("UPDATE prep_items SET is_completed = :completed, updated_at = :timestamp, sync_status = 'PENDING' WHERE id = :itemId")
    suspend fun togglePrepItemCompleted(itemId: String, completed: Boolean, timestamp: Long = System.currentTimeMillis())

    // --- Sync Operations ---
    @Query("SELECT * FROM recipes WHERE sync_status = 'PENDING'")
    suspend fun getPendingRecipes(): List<RecipeEntity>

    @Query("SELECT * FROM pantry_items WHERE sync_status = 'PENDING'")
    suspend fun getPendingPantryItems(): List<PantryItemEntity>

    @Query("SELECT * FROM prep_lists WHERE sync_status = 'PENDING'")
    suspend fun getPendingPrepLists(): List<PrepListEntity>

    @Query("SELECT * FROM prep_items WHERE sync_status = 'PENDING'")
    suspend fun getPendingPrepItems(): List<PrepItemEntity>

    @Transaction
    suspend fun markSynced(recipeIds: List<String>, pantryIds: List<String>, prepListIds: List<String>, prepItemIds: List<String>) {
        // Multi-table sync marker updates
        if (recipeIds.isNotEmpty()) updateRecipeSyncStatus(recipeIds, "SYNCED")
        if (pantryIds.isNotEmpty()) updatePantrySyncStatus(pantryIds, "SYNCED")
        if (prepListIds.isNotEmpty()) updatePrepListSyncStatus(prepListIds, "SYNCED")
        if (prepItemIds.isNotEmpty()) updatePrepItemSyncStatus(prepItemIds, "SYNCED")
    }

    @Query("UPDATE recipes SET sync_status = :status WHERE id IN (:ids)")
    suspend fun updateRecipeSyncStatus(ids: List<String>, status: String)

    @Query("UPDATE pantry_items SET sync_status = :status WHERE id IN (:ids)")
    suspend fun updatePantrySyncStatus(ids: List<String>, status: String)

    @Query("UPDATE prep_lists SET sync_status = :status WHERE id IN (:ids)")
    suspend fun updatePrepListSyncStatus(ids: List<String>, status: String)

    @Query("UPDATE prep_items SET sync_status = :status WHERE id IN (:ids)")
    suspend fun updatePrepItemSyncStatus(ids: List<String>, status: String)
}
