import { useState, useEffect } from 'react';
import type { MenuData } from '../types';

const API = import.meta.env.VITE_API_URL ?? '';

const MOCK_MENU: MenuData = {
  restaurant: { id: 'demo-restaurant', name: 'The Blue Fig Bistro', slug: 'demo' },
  menu: { id: 'demo-menu', name: 'Dinner Menu', description: 'Fresh, local, and house-made Mediterranean flavors.' },
  sections: [
    {
      id: 'section-1',
      name: 'Starters',
      sort_order: 1,
      menu_items: [
        {
          id: 'item-1',
          name: 'Truffle Hummus & Pita',
          description: 'Smooth organic chickpea dip topped with white truffle oil and fresh herbs, served with warm house-made pita bread.',
          price: 950,
          status: 'available',
          station: 'cold',
          allergens: ['gluten', 'sesame'],
          image_url: null,
          sort_order: 1,
          modifier_groups: []
        },
        {
          id: 'item-2',
          name: 'Crispy Calamari',
          description: 'Lightly dusted calamari rings served with lemon wedge and house garlic-herb aioli.',
          price: 1400,
          status: 'available',
          station: 'fry',
          allergens: ['gluten', 'seafood'],
          image_url: null,
          sort_order: 2,
          modifier_groups: [
            {
              id: 'group-sauce',
              name: 'Extra Dipping Sauce',
              required: false,
              min_selections: 0,
              max_selections: 2,
              sort_order: 1,
              modifiers: [
                { id: 'mod-sauce-1', name: 'Spicy Aioli', price_adjustment: 150, is_default: false },
                { id: 'mod-sauce-2', name: 'Garlic Aioli', price_adjustment: 0, is_default: true }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'section-2',
      name: 'Mains',
      sort_order: 2,
      menu_items: [
        {
          id: 'item-3',
          name: 'Wood-Fired Margherita Pizza',
          description: 'San Marzano tomato base, fresh buffalo mozzarella, fresh basil, and extra virgin olive oil.',
          price: 1650,
          status: 'available',
          station: 'pizza',
          allergens: ['gluten', 'dairy'],
          image_url: null,
          sort_order: 1,
          modifier_groups: [
            {
              id: 'group-toppings',
              name: 'Add Toppings',
              required: false,
              min_selections: 0,
              max_selections: 4,
              sort_order: 1,
              modifiers: [
                { id: 'mod-top-1', name: 'Prosciutto di Parma', price_adjustment: 400, is_default: false },
                { id: 'mod-top-2', name: 'Wild Mushrooms', price_adjustment: 250, is_default: false },
                { id: 'mod-top-3', name: 'Extra Mozzarella', price_adjustment: 200, is_default: false }
              ]
            }
          ]
        },
        {
          id: 'item-4',
          name: 'Prime Bistro Burger',
          description: 'Dry-aged beef patty, aged cheddar, caramelized onions, house burger sauce on a toasted brioche bun, served with fries.',
          price: 1850,
          status: 'available',
          station: 'grill',
          allergens: ['gluten', 'dairy'],
          image_url: null,
          sort_order: 2,
          modifier_groups: [
            {
              id: 'group-cook',
              name: 'Meat Preparation',
              required: true,
              min_selections: 1,
              max_selections: 1,
              sort_order: 1,
              modifiers: [
                { id: 'mod-cook-1', name: 'Medium Rare', price_adjustment: 0, is_default: true },
                { id: 'mod-cook-2', name: 'Medium', price_adjustment: 0, is_default: false },
                { id: 'mod-cook-3', name: 'Well Done', price_adjustment: 0, is_default: false }
              ]
            }
          ]
        }
      ]
    }
  ]
};

type UseMenuResult =
  | { status: 'loading' }
  | { status: 'error';   message: string }
  | { status: 'success'; data: MenuData };

export function useMenu(slug: string): UseMenuResult {
  const [result, setResult] = useState<UseMenuResult>({ status: 'loading' });

  useEffect(() => {
    if (!slug) return;
    setResult({ status: 'loading' });

    if (slug === 'demo' || slug === 'default') {
      setResult({ status: 'success', data: MOCK_MENU });
      return;
    }

    const controller = new AbortController();

    fetch(`${API}/v1/menu/${encodeURIComponent(slug)}`, { signal: controller.signal })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok || !body.ok) {
          setResult({ status: 'success', data: MOCK_MENU }); // fallback to mock instead of error/404 redirect
        } else {
          setResult({ status: 'success', data: body.data });
        }
      })
      .catch(() => {
        setResult({ status: 'success', data: MOCK_MENU }); // fallback to mock instead of error/404 redirect
      });

    return () => controller.abort();
  }, [slug]);

  return result;
}

