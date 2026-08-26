// ============================================================
// RecipeOS — Shared TypeScript types (single source of truth)
// All surfaces import from here: web/, cli/, mcp/, mobile/
// Mirrors Supabase schema exactly.
// ============================================================

export type UserRole = 'home_cook' | 'professional' | 'admin';
export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';
export type ScanStatus = 'pending' | 'confirmed' | 'rejected';

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string | null;
  sort_order: number;
}

export interface Recipe {
  id: string;
  user_id: string;
  name: string;
  category_id: string | null;
  description: string | null;
  yield_amount: number | null;
  yield_unit: string | null;
  base_servings: number;
  difficulty: Difficulty | null;
  source: string | null;
  notes: string | null;
  is_public: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
  // joined
  category?: Category;
  steps?: RecipeStep[];
  ingredients?: RecipeIngredient[];
}

export interface RecipeStep {
  id: string;
  recipe_id: string;
  step_number: number;
  instruction: string;
  tip: string | null;
  created_at: string;
}

export interface Ingredient {
  id: string;
  name: string;
  default_unit: string;
  grams_per_cup: number | null;
  category: string | null;
}

export interface RecipeIngredient {
  id: string;
  recipe_id: string;
  ingredient_id: string | null;
  name_override: string | null;
  amount: number;
  unit: string;
  preparation: string | null;
  is_optional: boolean;
  sort_order: number;
  // joined
  ingredient?: Ingredient;
  // computed display name
  displayName: string;
}

export interface PantryItem {
  id: string;
  user_id: string;
  ingredient_id: string | null;
  name_override: string | null;
  quantity: number;
  unit: string;
  reorder_at: number | null;
  location: string | null;
  updated_at: string;
  // computed
  displayName: string;
  isLow: boolean;
}

export interface PrepTask {
  id: string;
  user_id: string;
  recipe_id: string | null;
  task: string;
  station: string | null;
  estimated_minutes: number | null;
  scheduled_for: string;
  is_done: boolean;
  completed_at: string | null;
  sort_order: number;
  created_at: string;
}

export interface PrepList {
  id: string;
  user_id: string;
  name: string;
  recipe_id: string | null;
  created_at: string;
  tasks?: PrepTask[];
}

export interface RecipeScan {
  id: string;
  user_id: string;
  image_url: string;
  raw_text: string | null;
  parsed_json: Record<string, unknown> | null;
  status: ScanStatus;
  recipe_id: string | null;
  created_at: string;
}

export interface RatioPart {
  part: string;  // e.g. "fat" | "acid" | "emulsifier"
  ratio: number; // relative weight
}

export interface RatioBlueprint {
  id: string;
  user_id: string;
  name: string;        // e.g. "Basic Vinaigrette"
  description: string;
  category: string;    // e.g. "Dressing" | "Bread" | "Pastry" | "Sauce"
  ratio: RatioPart[];
  notes: string;
  created_at: string;
}
