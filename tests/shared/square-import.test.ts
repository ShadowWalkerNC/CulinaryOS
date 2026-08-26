import { describe, it, expect } from 'bun:test';
import { transformSquareCatalog, SquareCatalogObject } from '../../scripts/import-square-catalog';

describe('Square Catalog Importer & Converter', () => {
  it('converts Square catalog categories, items, and modifier lists into CulinaryOS structure', () => {
    const squareMockData: SquareCatalogObject[] = [
      {
        type: 'CATEGORY',
        id: 'cat_entrees',
        category_data: {
          name: 'Entrees',
        },
      },
      {
        type: 'MODIFIER_LIST',
        id: 'mod_temp',
        modifier_list_data: {
          name: 'Meat Temperature',
          modifiers: [
            {
              id: 'mod_rare',
              modifier_data: {
                name: 'Medium Rare',
                price_money: { amount: 0 },
                on_by_default: true,
              },
            },
            {
              id: 'mod_well',
              modifier_data: {
                name: 'Well Done',
                price_money: { amount: 0 },
              },
            },
          ],
        },
      },
      {
        type: 'ITEM',
        id: 'item_burger',
        item_data: {
          name: 'Dry-Aged Bistro Burger',
          description: 'Dry-aged beef with cheddar and brioche',
          category_id: 'cat_entrees',
          variations: [
            {
              id: 'var_regular',
              item_variation_data: {
                name: 'Regular',
                price_money: { amount: 1850, currency: 'USD' },
              },
            },
          ],
          modifier_list_info: [
            {
              modifier_list_id: 'mod_temp',
              min_selected_modifiers: 1,
              max_selected_modifiers: 1,
            },
          ],
        },
      },
    ];

    const result = transformSquareCatalog(squareMockData);

    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].name).toBe('Entrees');
    expect(result.sections[0].items).toHaveLength(1);

    const item = result.sections[0].items[0];
    expect(item.name).toBe('Dry-Aged Bistro Burger');
    expect(item.priceCents).toBe(1850);
    expect(item.station).toBe('grill'); // Auto-inferred burger as grill station
    expect(item.modifierGroups).toHaveLength(1);
    expect(item.modifierGroups[0].name).toBe('Meat Temperature');
    expect(item.modifierGroups[0].required).toBe(true);
    expect(item.modifierGroups[0].modifiers).toHaveLength(2);
    expect(item.modifierGroups[0].modifiers[0].isDefault).toBe(true);
  });

  it('handles items without categories or modifiers gracefully', () => {
    const squareMockData: SquareCatalogObject[] = [
      {
        type: 'ITEM',
        id: 'item_soda',
        item_data: {
          name: 'Iced Lemonade',
          variations: [
            {
              id: 'var_regular',
              item_variation_data: {
                name: 'Regular',
                price_money: { amount: 350, currency: 'USD' },
              },
            },
          ],
        },
      },
    ];

    const result = transformSquareCatalog(squareMockData);
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].name).toBe('General Menu');
    expect(result.sections[0].items[0].priceCents).toBe(350);
    expect(result.sections[0].items[0].modifierGroups).toHaveLength(0);
  });
});
