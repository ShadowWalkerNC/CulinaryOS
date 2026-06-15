package com.culinaryos.recipeos.data

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey
import java.util.UUID

enum class SyncStatus {
    SYNCED,
    PENDING,
    ERROR
}

interface SyncableEntity {
    val id: String
    val updatedAt: Long
    val syncStatus: SyncStatus
    val isDeleted: Boolean
}

@Entity(
    tableName = "recipes",
    indices = [Index(value = ["updated_at"]), Index(value = ["is_deleted"])]
)
data class RecipeEntity(
    @PrimaryKey
    override val id: String = UUID.randomUUID().toString(),
    val name: String,
    val description: String?,
    @ColumnInfo(name = "yield_quantity")
    val yieldQuantity: Double,
    @ColumnInfo(name = "yield_unit")
    val yieldUnit: String,
    
    @ColumnInfo(name = "updated_at")
    override val updatedAt: Long = System.currentTimeMillis(),
    @ColumnInfo(name = "sync_status")
    override val syncStatus: SyncStatus = SyncStatus.PENDING,
    @ColumnInfo(name = "is_deleted")
    override val isDeleted: Boolean = false
) : SyncableEntity

@Entity(
    tableName = "ingredients",
    indices = [Index(value = ["name"], unique = true)]
)
data class IngredientEntity(
    @PrimaryKey
    override val id: String = UUID.randomUUID().toString(),
    val name: String,
    val category: String, // e.g. "Flour", "Liquid", "Leaven", "Fat", "Spice"
    @ColumnInfo(name = "is_allergen")
    val isAllergen: Boolean = false,
    
    @ColumnInfo(name = "updated_at")
    override val updatedAt: Long = System.currentTimeMillis(),
    @ColumnInfo(name = "sync_status")
    override val syncStatus: SyncStatus = SyncStatus.PENDING,
    @ColumnInfo(name = "is_deleted")
    override val isDeleted: Boolean = false
) : SyncableEntity

@Entity(
    tableName = "recipe_ingredients",
    primaryKeys = ["recipe_id", "ingredient_id"],
    foreignKeys = [
        ForeignKey(
            entity = RecipeEntity::class,
            parentColumns = ["id"],
            childColumns = ["recipe_id"],
            onDelete = ForeignKey.CASCADE
        ),
        ForeignKey(
            entity = IngredientEntity::class,
            parentColumns = ["id"],
            childColumns = ["ingredient_id"],
            onDelete = ForeignKey.RESTRICT
        )
    ],
    indices = [Index(value = ["recipe_id"]), Index(value = ["ingredient_id"])]
)
data class RecipeIngredientCrossRef(
    @ColumnInfo(name = "recipe_id")
    val recipeId: String,
    @ColumnInfo(name = "ingredient_id")
    val ingredientId: String,
    
    @ColumnInfo(name = "ratio_percentage")
    val ratioPercentage: Double, // Baker's percentage, relative to flour base (100.0)
    @ColumnInfo(name = "base_weight_grams")
    val baseWeightGrams: Double, // The reference weight at 1.0x batch scale
    
    @ColumnInfo(name = "is_base_flour")
    val isBaseFlour: Boolean = false, // If true, this ingredient forms the 100% baseline
    @ColumnInfo(name = "is_scaling_linear")
    val isScalingLinear: Boolean = true // If false, yeast/salt formulas use adjusted curves
)

@Entity(
    tableName = "pantry_items",
    foreignKeys = [
        ForeignKey(
            entity = IngredientEntity::class,
            parentColumns = ["id"],
            childColumns = ["ingredient_id"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [Index(value = ["ingredient_id"], unique = true)]
)
data class PantryItemEntity(
    @PrimaryKey
    override val id: String = UUID.randomUUID().toString(),
    @ColumnInfo(name = "ingredient_id")
    val ingredientId: String,
    
    @ColumnInfo(name = "quantity_on_hand")
    val quantityOnHand: Double,
    @ColumnInfo(name = "quantity_unit")
    val quantityUnit: String,
    @ColumnInfo(name = "par_level")
    val parLevel: Double,
    @ColumnInfo(name = "bin_location")
    val binLocation: String?,
    
    @ColumnInfo(name = "updated_at")
    override val updatedAt: Long = System.currentTimeMillis(),
    @ColumnInfo(name = "sync_status")
    override val syncStatus: SyncStatus = SyncStatus.PENDING,
    @ColumnInfo(name = "is_deleted")
    override val isDeleted: Boolean = false
) : SyncableEntity

@Entity(tableName = "prep_lists")
data class PrepListEntity(
    @PrimaryKey
    override val id: String = UUID.randomUUID().toString(),
    @ColumnInfo(name = "target_date")
    val targetDate: Long, // Epoch timestamp for the prep day
    val notes: String?,
    
    @ColumnInfo(name = "updated_at")
    override val updatedAt: Long = System.currentTimeMillis(),
    @ColumnInfo(name = "sync_status")
    override val syncStatus: SyncStatus = SyncStatus.PENDING,
    @ColumnInfo(name = "is_deleted")
    override val isDeleted: Boolean = false
) : SyncableEntity

@Entity(
    tableName = "prep_items",
    foreignKeys = [
        ForeignKey(
            entity = PrepListEntity::class,
            parentColumns = ["id"],
            childColumns = ["prep_list_id"],
            onDelete = ForeignKey.CASCADE
        ),
        ForeignKey(
            entity = RecipeEntity::class,
            parentColumns = ["id"],
            childColumns = ["recipe_id"],
            onDelete = ForeignKey.SET_NULL
        )
    ],
    indices = [Index(value = ["prep_list_id"]), Index(value = ["recipe_id"])]
)
data class PrepItemEntity(
    @PrimaryKey
    override val id: String = UUID.randomUUID().toString(),
    @ColumnInfo(name = "prep_list_id")
    val prepListId: String,
    @ColumnInfo(name = "recipe_id")
    val recipeId: String?,
    
    @ColumnInfo(name = "task_description")
    val taskDescription: String,
    @ColumnInfo(name = "scaled_batch_size")
    val scaledBatchSize: Double, // The multiplier applied (e.g. 2.5x)
    @ColumnInfo(name = "is_completed")
    val isCompleted: Boolean = false,
    @ColumnInfo(name = "completed_by_staff_id")
    val completedByStaffId: String?,
    
    @ColumnInfo(name = "updated_at")
    override val updatedAt: Long = System.currentTimeMillis(),
    @ColumnInfo(name = "sync_status")
    override val syncStatus: SyncStatus = SyncStatus.PENDING,
    @ColumnInfo(name = "is_deleted")
    override val isDeleted: Boolean = false
) : SyncableEntity
