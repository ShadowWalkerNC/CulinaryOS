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
import com.culinaryos.recipeos.ui.screens.PantryScreen
import com.culinaryos.recipeos.ui.screens.PrepListScreen
import com.culinaryos.recipeos.ui.screens.RecipeEditorScreen
import com.culinaryos.recipeos.ui.theme.RecipeOSTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            RecipeOSTheme {
                MainAppLayout()
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainAppLayout() {
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
                            // Simple textual indicator representing an icon for layout demo
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
                0 -> RecipeEditorScreen()
                1 -> PrepListScreen()
                2 -> PantryScreen()
            }
        }
    }
}
