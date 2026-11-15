// Native menu adapter: maps the flat native GET /menu/items rows onto the
// sectioned menu shape the POS views consume. The native API carries no
// sections, descriptions, allergens, or modifiers, so items are presented in a
// single section with empty modifier groups (the views render those as a
// direct "Add to Seat" action).

export interface NativeMenuItemRow {
  id: string;
  tenant_id: string;
  name: string;
  price: number;
  status: string;
  station: string;
  recipe_id: string | null;
}

export interface PosMenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  status: string;
  station: string;
  allergens: string[];
  sort_order: number;
  modifier_groups: unknown[];
}

export interface PosMenuSection {
  id: string;
  name: string;
  sort_order: number;
  items: PosMenuItem[];
}

export interface PosMenu {
  id: string;
  name: string;
  sections: PosMenuSection[];
}

export function adaptNativeMenuItems(rows: NativeMenuItemRow[]): PosMenu {
  const items = (Array.isArray(rows) ? rows : []).map((row, index) => ({
    id: String(row.id),
    name: String(row.name),
    description: '',
    price: row.price,
    status: String(row.status),
    station: String(row.station),
    allergens: [] as string[],
    sort_order: index + 1,
    modifier_groups: [] as unknown[],
  }));
  return {
    id: 'native-menu',
    name: 'Menu',
    sections: [{ id: 'native-all-items', name: 'Menu', sort_order: 1, items }],
  };
}
