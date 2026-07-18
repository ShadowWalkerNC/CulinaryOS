import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:uuid/uuid.dart';
import '../database/app_database.dart';

part 'recipe_repository.g.dart';

@riverpod
RecipeRepository recipeRepository(RecipeRepositoryRef ref) {
  return RecipeRepository(ref.watch(appDatabaseProvider));
}

class RecipeRepository {
  final AppDatabase _db;
  RecipeRepository(this._db);

  /// Live costing: sum all ingredient costs × quantity
  Future<int> calculateRecipeCost(String recipeId) async {
    final ingredients = await (_db.select(_db.recipeIngredients)
      ..where((i) => i.recipeId.equals(recipeId)))
      .get();
    return ingredients.fold(0, (total, i) {
      return total + (i.unitCostAtTime * i.quantity).round();
    });
  }

  /// Batch multiplier: scale all ingredient quantities
  List<RecipeIngredient> scaleRecipe(
      List<RecipeIngredient> ingredients, double multiplier) {
    return ingredients
        .map((i) => i.copyWith(quantity: i.quantity * multiplier))
        .toList();
  }

  /// Hydration calculator: outputs water qty from flour weight
  double calculateHydration(double flourWeightLbs, double hydrationPct) {
    return flourWeightLbs * (hydrationPct / 100);
  }

  /// Save new version — never mutate, always insert new row with version++
  Future<void> saveNewVersion(
      Recipe current, List<RecipeIngredient> updatedIngredients) async {
    final newRecipe = current.copyWith(
      id: const Uuid().v4(),
      version: current.version + 1,
      createdAt: DateTime.now().toUtc(),
    );
    await _db.into(_db.recipes).insert(newRecipe);
    for (final ing in updatedIngredients) {
      await _db.into(_db.recipeIngredients).insert(
            ing.copyWith(id: const Uuid().v4(), recipeId: newRecipe.id));
    }
  }
}
