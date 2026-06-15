package com.culinaryos.recipeos.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverter
import androidx.room.TypeConverters

class DatabaseConverters {
    @TypeConverter
    fun fromSyncStatus(status: SyncStatus): String = status.name

    @TypeConverter
    fun toSyncStatus(status: String): SyncStatus = SyncStatus.valueOf(status)
}

@Database(
    entities = [
        RecipeEntity::class,
        IngredientEntity::class,
        RecipeIngredientCrossRef::class,
        PantryItemEntity::class,
        PrepListEntity::class,
        PrepItemEntity::class
    ],
    version = 1,
    exportSchema = false
)
@TypeConverters(DatabaseConverters::class)
abstract class AppDatabase : RoomDatabase() {

    abstract fun recipeDao(): RecipeDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getDatabase(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "recipeos_database"
                )
                .fallbackToDestructiveMigration() // Simple migration strategy for Phase 1
                .build()
                INSTANCE = instance
                instance
            }
        }
        
        // Helper for in-memory database configuration used in unit tests
        fun getInMemoryDatabase(context: Context): AppDatabase {
            return Room.inMemoryDatabaseBuilder(
                context.applicationContext,
                AppDatabase::class.java
            )
            .allowMainThreadQueries()
            .build()
        }
    }
}
