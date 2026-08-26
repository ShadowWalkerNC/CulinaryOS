export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; display_name: string | null; avatar_url: string | null; role: 'home_cook' | 'professional' | 'admin'; created_at: string; updated_at: string; };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      categories: {
        Row: { id: string; name: string; icon: string | null; sort_order: number; };
        Insert: Omit<Database['public']['Tables']['categories']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['categories']['Insert']>;
      };
      ratio_blueprints: {
        Row: { id: string; user_id: string; name: string; description: string; category: string; ratio: Json; notes: string; created_at: string; };
        Insert: Omit<Database['public']['Tables']['ratio_blueprints']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['ratio_blueprints']['Insert']>;
      };
      recipes: {
        Row: { id: string; user_id: string; name: string; category_id: string | null; description: string | null; yield_amount: number | null; yield_unit: string | null; base_servings: number; difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | null; source: string | null; notes: string | null; is_public: boolean; tags: string[]; ratio_id: string | null; created_at: string; updated_at: string; };
        Insert: Omit<Database['public']['Tables']['recipes']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['recipes']['Insert']>;
      };
      recipe_steps: {
        Row: { id: string; recipe_id: string; step_number: number; instruction: string; tip: string | null; created_at: string; };
        Insert: Omit<Database['public']['Tables']['recipe_steps']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['recipe_steps']['Insert']>;
      };
      ingredients: {
        Row: { id: string; name: string; default_unit: string; grams_per_cup: number | null; category: string | null; };
        Insert: Omit<Database['public']['Tables']['ingredients']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['ingredients']['Insert']>;
      };
      recipe_ingredients: {
        Row: { id: string; recipe_id: string; ingredient_id: string | null; name_override: string | null; amount: number; unit: string; preparation: string | null; is_optional: boolean; ratio_part: string | null; sort_order: number; };
        Insert: Omit<Database['public']['Tables']['recipe_ingredients']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['recipe_ingredients']['Insert']>;
      };
      pantry_items: {
        Row: { id: string; user_id: string; ingredient_id: string | null; name_override: string | null; quantity: number; unit: string; reorder_at: number | null; location: string | null; updated_at: string; };
        Insert: Omit<Database['public']['Tables']['pantry_items']['Row'], 'id' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['pantry_items']['Insert']>;
      };
      prep_lists: {
        Row: { id: string; user_id: string; name: string; recipe_id: string | null; created_at: string; };
        Insert: Omit<Database['public']['Tables']['prep_lists']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['prep_lists']['Insert']>;
      };
      prep_tasks: {
        Row: { id: string; user_id: string; prep_list_id: string | null; recipe_id: string | null; task: string; station: string | null; estimated_minutes: number | null; scheduled_for: string; is_done: boolean; completed_at: string | null; sort_order: number; created_at: string; };
        Insert: Omit<Database['public']['Tables']['prep_tasks']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['prep_tasks']['Insert']>;
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}
