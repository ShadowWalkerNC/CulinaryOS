import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';
import 'menu_items.dart';

class Recipes extends Table {
  TextColumn get id => text().clientDefault(() => const Uuid().v4())();
  TextColumn get menuItemId => text().references(MenuItems, #id)();
  TextColumn get name => text()();
  IntColumn get version => integer().withDefault(const Constant(1))();
  IntColumn get batchSize => integer().withDefault(const Constant(1))();
  RealColumn get hydrationPct => real().nullable()();
  TextColumn get notes => text().nullable()();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get deletedAt => dateTime().nullable()();

  @override
  Set<Column> get primaryKey => {id};
}

class RecipeIngredients extends Table {
  TextColumn get id => text().clientDefault(() => const Uuid().v4())();
  TextColumn get recipeId => text().references(Recipes, #id)();
  TextColumn get inventoryItemId => text()();
  RealColumn get quantity => real()();
  TextColumn get unit => text()();
  IntColumn get unitCostAtTime => integer()(); // cents

  @override
  Set<Column> get primaryKey => {id};
}
