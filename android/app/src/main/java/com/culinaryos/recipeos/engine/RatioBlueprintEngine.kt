package com.culinaryos.recipeos.engine

import com.culinaryos.recipeos.data.RecipeIngredientWithInfo
import kotlin.math.pow

data class ScaledIngredient(
    val ingredientId: String,
    val name: String,
    val category: String,
    val isAllergen: Boolean,
    val ratioPercentage: Double,
    val baseWeightGrams: Double,
    val scaledWeightGrams: Double
)

object RatioBlueprintEngine {

    /**
     * Scale a recipe using a simple linear multiplier factor.
     */
    fun scaleByFactor(
        ingredients: List<RecipeIngredientWithInfo>,
        scaleFactor: Double
    ): List<ScaledIngredient> {
        return ingredients.map { ingredient ->
            val finalWeight = if (ingredient.isScalingLinear) {
                ingredient.baseWeightGrams * scaleFactor
            } else {
                // Apply a diminishing return curve for leaveners/yeast/salt to prevent over-seasoning at bulk scales
                // Curve: baseWeight * scaleFactor ^ 0.90 for scale factors > 2.0
                if (scaleFactor > 2.0) {
                    ingredient.baseWeightGrams * scaleFactor.pow(0.90)
                } else {
                    ingredient.baseWeightGrams * scaleFactor
                }
            }
            
            ScaledIngredient(
                ingredientId = ingredient.ingredientId,
                name = ingredient.name,
                category = ingredient.category,
                isAllergen = ingredient.isAllergen,
                ratioPercentage = ingredient.ratioPercentage,
                baseWeightGrams = ingredient.baseWeightGrams,
                scaledWeightGrams = finalWeight
            )
        }
    }

    /**
     * Scale a recipe such that the total sum of all ingredients matches a target yield weight.
     * Often used when a baker needs a precise batch size (e.g. exactly 5000g of total dough).
     */
    fun scaleByTargetTotalWeight(
        ingredients: List<RecipeIngredientWithInfo>,
        targetTotalWeightGrams: Double
    ): List<ScaledIngredient> {
        val baseTotalWeight = ingredients.sumOf { it.baseWeightGrams }
        if (baseTotalWeight <= 0.0) return emptyList()

        val scaleFactor = targetTotalWeightGrams / baseTotalWeight
        return scaleByFactor(ingredients, scaleFactor)
    }

    /**
     * Scale a recipe based on the available weight of a specific ingredient.
     * Useful when a cook only has a limited quantity of one ingredient (e.g. "I only have 450g of Bread Flour").
     */
    fun scaleByTargetIngredientWeight(
        ingredients: List<RecipeIngredientWithInfo>,
        targetIngredientId: String,
        targetWeightGrams: Double
    ): List<ScaledIngredient> {
        val referenceIngredient = ingredients.find { it.ingredientId == targetIngredientId }
        if (referenceIngredient == null || referenceIngredient.baseWeightGrams <= 0.0) {
            // Fallback: if reference not found, return scaled linearly by 1.0x
            return scaleByFactor(ingredients, 1.0)
        }

        val scaleFactor = targetWeightGrams / referenceIngredient.baseWeightGrams
        return scaleByFactor(ingredients, scaleFactor)
    }
    
    /**
     * Recalculate baker's percentages relative to the flour base weight.
     * Flour is always the baseline 100%. If multiple flours are present, their sum is 100%.
     */
    fun calculateBakerPercentages(
        weights: Map<String, Double>, // Map of ingredientId to Weight
        ingredientDetails: List<RecipeIngredientWithInfo>
    ): Map<String, Double> {
        // Find total weight of all base flours
        val flourTotalWeight = ingredientDetails
            .filter { it.isBaseFlour }
            .sumOf { weights[it.ingredientId] ?: 0.0 }
            
        if (flourTotalWeight <= 0.0) return emptyMap()

        return weights.mapValues { entry ->
            (entry.value / flourTotalWeight) * 100.0
        }
    }
}
