// ============================================================
// CulinaryOS — Square Catalog Importer & Sync Tool
// Imports items, categories, prices, and modifier lists from
// Square's Catalog API export directly into CulinaryOS.
// ============================================================

import * as fs from 'fs';
import * as path from 'path';

export interface SquareCatalogObject {
  type: 'ITEM' | 'CATEGORY' | 'MODIFIER_LIST' | 'MODIFIER';
  id: string;
  is_deleted?: boolean;
  category_data?: {
    name: string;
  };
  item_data?: {
    name: string;
    description?: string;
    category_id?: string;
    variations?: Array<{
      id: string;
      item_variation_data: {
        name: string;
        price_money?: {
          amount: number; // cents
          currency: string;
        };
      };
    }>;
    modifier_list_info?: Array<{
      modifier_list_id: string;
      min_selected_modifiers?: number;
      max_selected_modifiers?: number;
      enabled?: boolean;
    }>;
  };
  modifier_list_data?: {
    name: string;
    modifiers?: Array<{
      id: string;
      modifier_data: {
        name: string;
        price_money?: {
          amount: number; // cents
        };
        on_by_default?: boolean;
      };
    }>;
  };
}

export interface CulinaryOSImportPayload {
  sections: Array<{
    name: string;
    sortOrder: number;
    items: Array<{
      name: string;
      description?: string;
      priceCents: number;
      station: 'grill' | 'fry' | 'cold' | 'pass' | 'bar';
      allergens: string[];
      modifierGroups: Array<{
        name: string;
        required: boolean;
        minSelections: number;
        maxSelections: number;
        modifiers: Array<{
          name: string;
          priceAdjustmentCents: number;
          isDefault: boolean;
        }>;
      }>;
    }>;
  }>;
}

export function transformSquareCatalog(objects: SquareCatalogObject[]): CulinaryOSImportPayload {
  const categories = new Map<string, string>();
  const modifierLists = new Map<string, {
    name: string;
    modifiers: Array<{ name: string; priceAdjustmentCents: number; isDefault: boolean }>;
  }>();

  // 1. Index categories and modifier lists
  for (const obj of objects) {
    if (obj.type === 'CATEGORY' && obj.category_data) {
      categories.set(obj.id, obj.category_data.name);
    } else if (obj.type === 'MODIFIER_LIST' && obj.modifier_list_data) {
      const mods = (obj.modifier_list_data.modifiers ?? []).map(m => ({
        name: m.modifier_data.name,
        priceAdjustmentCents: m.modifier_data.price_money?.amount ?? 0,
        isDefault: m.modifier_data.on_by_default ?? false,
      }));
      modifierLists.set(obj.id, {
        name: obj.modifier_list_data.name,
        modifiers: mods,
      });
    }
  }

  const sectionsMap = new Map<string, CulinaryOSImportPayload['sections'][0]['items']>();

  // 2. Parse Items
  for (const obj of objects) {
    if (obj.type === 'ITEM' && obj.item_data) {
      const categoryName = (obj.item_data.category_id && categories.get(obj.item_data.category_id)) || 'General Menu';
      if (!sectionsMap.has(categoryName)) {
        sectionsMap.set(categoryName, []);
      }

      const primaryVar = obj.item_data.variations?.[0];
      const price = primaryVar?.item_variation_data.price_money?.amount ?? 0;

      const itemModifierGroups: CulinaryOSImportPayload['sections'][0]['items'][0]['modifierGroups'] = [];
      for (const modInfo of obj.item_data.modifier_list_info ?? []) {
        const modDef = modifierLists.get(modInfo.modifier_list_id);
        if (modDef) {
          itemModifierGroups.push({
            name: modDef.name,
            required: (modInfo.min_selected_modifiers ?? 0) > 0,
            minSelections: modInfo.min_selected_modifiers ?? 0,
            maxSelections: modInfo.max_selected_modifiers ?? 1,
            modifiers: modDef.modifiers,
          });
        }
      }

      // Infer default kitchen station based on category name and item name
      const itemText = `${categoryName} ${obj.item_data.name}`.toLowerCase();
      let station: 'grill' | 'fry' | 'cold' | 'pass' | 'bar' = 'pass';
      if (itemText.includes('grill') || itemText.includes('burger') || itemText.includes('steak')) station = 'grill';
      else if (itemText.includes('fry') || itemText.includes('side') || itemText.includes('snack')) station = 'fry';
      else if (itemText.includes('salad') || itemText.includes('cold') || itemText.includes('starter') || itemText.includes('dessert')) station = 'cold';
      else if (itemText.includes('drink') || itemText.includes('bar') || itemText.includes('cocktail') || itemText.includes('beer') || itemText.includes('beverage')) station = 'bar';

      sectionsMap.get(categoryName)!.push({
        name: obj.item_data.name,
        description: obj.item_data.description,
        priceCents: price,
        station,
        allergens: [],
        modifierGroups: itemModifierGroups,
      });
    }
  }

  const sections: CulinaryOSImportPayload['sections'] = [];
  let sortOrder = 1;
  for (const [name, items] of sectionsMap.entries()) {
    sections.push({
      name,
      sortOrder: sortOrder++,
      items,
    });
  }

  return { sections };
}

// CLI Execution Example
if (require.main === module || process.argv[1]?.includes('import-square-catalog')) {
  const filePath = process.argv[2];
  if (!filePath) {
    console.log('Usage: npx tsx scripts/import-square-catalog.ts <path-to-square-catalog.json>');
    console.log('\nExample: npx tsx scripts/import-square-catalog.ts square_export.json');
    process.exit(0);
  }

  const fullPath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    console.error(`Error: File not found at ${fullPath}`);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
  const catalogObjects: SquareCatalogObject[] = Array.isArray(raw) ? raw : raw.objects ?? [];

  const result = transformSquareCatalog(catalogObjects);
  console.log(`✅ Successfully parsed ${catalogObjects.length} Square catalog objects into ${result.sections.length} CulinaryOS menu sections.`);
  console.log(`Total menu items converted: ${result.sections.reduce((acc, s) => acc + s.items.length, 0)}`);

  const outPath = path.resolve(process.cwd(), 'square_converted_menu.json');
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf-8');
  console.log(`Saved CulinaryOS menu format to: ${outPath}`);
}
