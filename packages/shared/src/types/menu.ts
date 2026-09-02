// ============================================================
// CulinaryOS — Canonical Menu Type
// Shared between POS (sells), RecipeOS (links recipes), CulinaryOS (manages)
// ============================================================

import type { KitchenStation } from './events';

export type MenuStatus = 'draft' | 'active' | 'archived';
export type MenuItemStatus = 'available' | 'unavailable' | '86d';

export interface Menu {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  status: MenuStatus;
  sections: MenuSection[];
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MenuSection {
  id: string;
  menuId: string;
  name: string;              // 'Starters', 'Mains', 'Desserts'
  sortOrder: number;
  items: MenuItem[];
}

export interface MenuItem {
  id: string;
  sectionId: string;
  name: string;
  description?: string;
  price: number;             // cents
  status: MenuItemStatus;
  recipeId?: string;         // RecipeOS link
  station: KitchenStation;
  allergens: Allergen[];
  modifierGroups: ModifierGroup[];
  sortOrder: number;
  imageUrl?: string;
}

export type Allergen =
  | 'gluten' | 'dairy' | 'eggs' | 'nuts' | 'peanuts'
  | 'shellfish' | 'fish' | 'soy' | 'sesame';

export interface ModifierGroup {
  id: string;
  menuItemId?: string;
  parentModifierId?: string;
  name: string;              // 'Temperature', 'Add-ons', 'Sides'
  required: boolean;
  minSelections: number;
  maxSelections: number;
  freeQuantity?: number;     // First N selections in group are free ($0)
  nestedGroups?: ModifierGroup[];
  modifiers: Modifier[];
}

export interface Modifier {
  id: string;
  modifierGroupId?: string;
  name: string;
  priceAdjustment: number;   // cents
  priceAdjustmentCents?: number; // cents alias
  isDefault: boolean;
  nestedGroups?: ModifierGroup[]; // nested groups when this modifier is picked
}

export interface SelectedModifier {
  id: string;
  modifierGroupId: string;
  parentModifierId?: string;
  name: string;
  priceAdjustmentCents: number;
  effectivePriceCents: number;
  subModifiers?: SelectedModifier[];
  depth?: number;
}

