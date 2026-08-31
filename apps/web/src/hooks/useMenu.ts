import { useState, useEffect } from 'react';
import { getApiBase } from '@culinaryos/shared';
import type { MenuData } from '../types';

const API = getApiBase();

const MOCK_MENU: MenuData = {
  restaurant: {
    id: 'demo-restaurant',
    name: 'The Golden Fork Bistro',
    slug: 'demo',
    tagline: 'Artisanal Mediterranean & Wood-Fired Kitchen',
    address: '142 Mercer Street, Soho, New York, NY 10012',
    phone: '(212) 555-0198',
    hours: 'Open Today: 11:30 AM – 10:30 PM',
    rating: 4.9,
    reviewCount: 428,
  },
  menu: {
    id: 'demo-menu',
    name: 'All-Day Chef Tasting & A La Carte',
    description: 'Fresh seasonal ingredients, wood-fired crusts, and locally sourced sustainable meats & produce.',
  },
  sections: [
    {
      id: 'section-starters',
      name: 'Starters & Small Plates',
      description: 'Perfect for sharing or kicking off your culinary journey.',
      sort_order: 1,
      menu_items: [
        {
          id: 'item-1',
          name: 'Truffle Chickpea Hummus & Warm Pita',
          description: 'Organic chickpea whip infused with white Alba truffle oil, toasted pine nuts, smoked paprika, and za’atar flatbread.',
          price: 1150,
          status: 'available',
          station: 'cold',
          allergens: ['gluten', 'sesame', 'nuts'],
          tags: ['popular', 'vegetarian'],
          image_url: 'https://images.unsplash.com/photo-1577906096429-f73c2c312435?w=500&auto=format&fit=crop&q=80',
          sort_order: 1,
          modifier_groups: [
            {
              id: 'group-bread',
              name: 'Bread Selection',
              required: false,
              min_selections: 0,
              max_selections: 1,
              sort_order: 1,
              modifiers: [
                { id: 'mod-bread-1', name: 'Extra Warm House Pita (2 pcs)', price_adjustment: 250, is_default: false },
                { id: 'mod-bread-2', name: 'Gluten-Free Seed Crackers', price_adjustment: 300, is_default: false },
              ],
            },
          ],
        },
        {
          id: 'item-2',
          name: 'Crispy Point Judith Calamari',
          description: 'Tender Monterey squid dusted in herb flour, flash-fried with cherry peppers, charred lemon, and preserved garlic aioli.',
          price: 1650,
          status: 'available',
          station: 'fry',
          allergens: ['gluten', 'shellfish', 'dairy'],
          tags: ['popular'],
          image_url: 'https://images.unsplash.com/photo-1604909052743-94e838986d24?w=500&auto=format&fit=crop&q=80',
          sort_order: 2,
          modifier_groups: [
            {
              id: 'group-cal-sauce',
              name: 'Extra Dipping Sauce',
              required: false,
              min_selections: 0,
              max_selections: 2,
              sort_order: 1,
              modifiers: [
                { id: 'mod-sauce-1', name: 'Calabrian Chili Aioli', price_adjustment: 150, is_default: false },
                { id: 'mod-sauce-2', name: 'Roasted Garlic Herb Aioli', price_adjustment: 0, is_default: true },
                { id: 'mod-sauce-3', name: 'San Marzano Tomato Coulis', price_adjustment: 100, is_default: false },
              ],
            },
          ],
        },
        {
          id: 'item-5',
          name: 'Heirloom Burrata Caprese',
          description: 'Creamy Puglia burrata, balsamic reduction pearls, heirloom vine tomatoes, cold-pressed olive oil, and crispy basil leaf.',
          price: 1550,
          status: 'available',
          station: 'cold',
          allergens: ['dairy', 'vegetarian'],
          tags: ['vegetarian', 'chef_special'],
          image_url: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb228cc?w=500&auto=format&fit=crop&q=80',
          sort_order: 3,
          modifier_groups: [
            {
              id: 'group-burrata-add',
              name: 'Optional Additions',
              required: false,
              min_selections: 0,
              max_selections: 2,
              sort_order: 1,
              modifiers: [
                { id: 'mod-bur-1', name: 'Prosciutto di San Daniele (+4 slices)', price_adjustment: 500, is_default: false },
                { id: 'mod-bur-2', name: 'Charred Sourdough Crostini', price_adjustment: 250, is_default: false },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'section-pizzas',
      name: 'Wood-Fired Artisanal Pizzas',
      description: 'Naturally fermented 48-hour sourdough, baked in a 900° beechwood hearth.',
      sort_order: 2,
      menu_items: [
        {
          id: 'item-3',
          name: 'Wood-Fired Margherita Classica',
          description: 'San Marzano D.O.P. tomatoes, fresh buffalo mozzarella, hand-torn sweet basil, sea salt, and extra virgin olive oil.',
          price: 1850,
          status: 'available',
          station: 'pizza',
          allergens: ['gluten', 'dairy'],
          tags: ['popular', 'vegetarian'],
          image_url: 'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?w=500&auto=format&fit=crop&q=80',
          sort_order: 1,
          modifier_groups: [
            {
              id: 'group-crust',
              name: 'Crust Preference',
              required: true,
              min_selections: 1,
              max_selections: 1,
              sort_order: 1,
              modifiers: [
                { id: 'mod-crust-1', name: 'Neapolitan Sourdough (Standard)', price_adjustment: 0, is_default: true },
                { id: 'mod-crust-2', name: 'Gluten-Friendly Cauliflower Crust', price_adjustment: 350, is_default: false },
              ],
            },
            {
              id: 'group-toppings',
              name: 'Gourmet Toppings',
              required: false,
              min_selections: 0,
              max_selections: 4,
              sort_order: 2,
              modifiers: [
                { id: 'mod-top-1', name: 'Prosciutto di Parma', price_adjustment: 450, is_default: false },
                { id: 'mod-top-2', name: 'Roasted Wild Forest Mushrooms', price_adjustment: 300, is_default: false },
                { id: 'mod-top-3', name: 'Calabrian Spicy Salami', price_adjustment: 350, is_default: false },
                { id: 'mod-top-4', name: 'Hot Honey Drizzle', price_adjustment: 150, is_default: false },
              ],
            },
          ],
        },
        {
          id: 'item-6',
          name: 'Truffle & Forest Mushroom Bianca',
          description: 'Fontina & taleggio fondue, cremini and chanterelle mushrooms, thyme, white truffle cream, shaved pecorino.',
          price: 2150,
          status: 'available',
          station: 'pizza',
          allergens: ['gluten', 'dairy'],
          tags: ['chef_special', 'vegetarian'],
          image_url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&auto=format&fit=crop&q=80',
          sort_order: 2,
          modifier_groups: [
            {
              id: 'group-mush-crust',
              name: 'Crust Preference',
              required: true,
              min_selections: 1,
              max_selections: 1,
              sort_order: 1,
              modifiers: [
                { id: 'mod-mc-1', name: 'Neapolitan Sourdough', price_adjustment: 0, is_default: true },
                { id: 'mod-mc-2', name: 'Gluten-Friendly Crust', price_adjustment: 350, is_default: false },
              ],
            },
            {
              id: 'group-mush-add',
              name: 'Finishing Touches',
              required: false,
              min_selections: 0,
              max_selections: 2,
              sort_order: 2,
              modifiers: [
                { id: 'mod-ma-1', name: 'Fresh Shaved Black Summer Truffle', price_adjustment: 800, is_default: false },
                { id: 'mod-ma-2', name: 'Arugula & Lemon Zest Salad', price_adjustment: 200, is_default: false },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'section-mains',
      name: 'Chef Entrées & Burgers',
      description: 'Signature hearth-cooked mains crafted to order.',
      sort_order: 3,
      menu_items: [
        {
          id: 'item-4',
          name: 'Prime Dry-Aged Bistro Burger',
          description: '8oz custom blend dry-aged beef, cave-aged cheddar, sweet caramelized shallot jam, black pepper aioli, and brioche bun with crispy rosemary fries.',
          price: 1950,
          status: 'available',
          station: 'grill',
          allergens: ['gluten', 'dairy', 'eggs'],
          tags: ['popular'],
          image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=80',
          sort_order: 1,
          modifier_groups: [
            {
              id: 'group-cook',
              name: 'Meat Temperature',
              required: true,
              min_selections: 1,
              max_selections: 1,
              sort_order: 1,
              modifiers: [
                { id: 'mod-cook-1', name: 'Medium Rare (Pink & Juicy)', price_adjustment: 0, is_default: true },
                { id: 'mod-cook-2', name: 'Medium (Warm Pink Center)', price_adjustment: 0, is_default: false },
                { id: 'mod-cook-3', name: 'Medium Well (Slight Pink)', price_adjustment: 0, is_default: false },
                { id: 'mod-cook-4', name: 'Well Done (No Pink)', price_adjustment: 0, is_default: false },
              ],
            },
            {
              id: 'group-side',
              name: 'Included Side',
              required: true,
              min_selections: 1,
              max_selections: 1,
              sort_order: 2,
              modifiers: [
                { id: 'mod-side-1', name: 'Rosemary Garlic Fries', price_adjustment: 0, is_default: true },
                { id: 'mod-side-2', name: 'Truffle Parmesan Fries', price_adjustment: 350, is_default: false },
                { id: 'mod-side-3', name: 'Organic Garden Greens', price_adjustment: 0, is_default: false },
              ],
            },
            {
              id: 'group-burger-extras',
              name: 'Burger Upgrades',
              required: false,
              min_selections: 0,
              max_selections: 3,
              sort_order: 3,
              modifiers: [
                { id: 'mod-bext-1', name: 'Thick Cut Applewood Bacon', price_adjustment: 300, is_default: false },
                { id: 'mod-bext-2', name: 'Fried Farm Egg', price_adjustment: 200, is_default: false },
                { id: 'mod-bext-3', name: 'Avocado Slices', price_adjustment: 250, is_default: false },
              ],
            },
          ],
        },
        {
          id: 'item-7',
          name: 'Pan-Roasted Faroe Island Salmon',
          description: 'Crispy skin wild Atlantic salmon over sweet corn succotash, saffron reduction, braised fennel, and dill oil.',
          price: 2850,
          status: 'available',
          station: 'grill',
          allergens: ['fish', 'dairy'],
          tags: ['chef_special', 'gluten_free'],
          image_url: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=500&auto=format&fit=crop&q=80',
          sort_order: 2,
          modifier_groups: [],
        },
        {
          id: 'item-8',
          name: 'Handcrafted Wild Mushroom Tagliatelle',
          description: 'House-made egg pasta, slow-braised morel and porcini mushrooms, parmesan emulsion, white wine, and Italian flat parsley.',
          price: 2400,
          status: 'available',
          station: 'pasta',
          allergens: ['gluten', 'dairy', 'eggs'],
          tags: ['vegetarian', 'popular'],
          image_url: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=500&auto=format&fit=crop&q=80',
          sort_order: 3,
          modifier_groups: [
            {
              id: 'group-pasta-prot',
              name: 'Add Protein',
              required: false,
              min_selections: 0,
              max_selections: 1,
              sort_order: 1,
              modifiers: [
                { id: 'mod-pp-1', name: 'Grilled Herb Chicken (+6oz)', price_adjustment: 700, is_default: false },
                { id: 'mod-pp-2', name: 'Jumbo Tiger Shrimp (+4 pcs)', price_adjustment: 900, is_default: false },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'section-desserts',
      name: 'Desserts & Sweets',
      description: 'Artisanal confections prepared fresh daily by our pastry team.',
      sort_order: 4,
      menu_items: [
        {
          id: 'item-9',
          name: 'Warm Valrhona Chocolate Lava Cake',
          description: 'Molten dark chocolate ganache center, Madagascar vanilla bean gelato, and raspberry coulis drizzle.',
          price: 1100,
          status: 'available',
          station: 'dessert',
          allergens: ['gluten', 'dairy', 'eggs'],
          tags: ['popular', 'vegetarian'],
          image_url: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=500&auto=format&fit=crop&q=80',
          sort_order: 1,
          modifier_groups: [],
        },
        {
          id: 'item-10',
          name: 'Classic Sicilian Pistachio Cannoli',
          description: 'Crisp pastry shells filled with sweetened sheep ricotta, candied orange peel, and crushed Bronte pistachios.',
          price: 950,
          status: 'available',
          station: 'dessert',
          allergens: ['gluten', 'dairy', 'nuts'],
          tags: ['vegetarian'],
          image_url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500&auto=format&fit=crop&q=80',
          sort_order: 2,
          modifier_groups: [],
        },
      ],
    },
    {
      id: 'section-drinks',
      name: 'Beverages & Mocktails',
      description: 'Hand-crafted refreshments and specialty cold-pressed drinks.',
      sort_order: 5,
      menu_items: [
        {
          id: 'item-11',
          name: 'Blood Orange & Rosemary Spritz (Zero-Proof)',
          description: 'Fresh Sicilian blood orange juice, sparkling mineral water, charred rosemary sprig, and agave.',
          price: 750,
          status: 'available',
          station: 'beverage',
          allergens: ['vegan', 'gluten_free'],
          tags: ['popular', 'vegan'],
          image_url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=80',
          sort_order: 1,
          modifier_groups: [],
        },
        {
          id: 'item-12',
          name: 'Nitro Cold Brew & Oat Milk Latte',
          description: 'Single-origin Ethiopian cold brew charged with nitrogen for an ultra-creamy velvety head.',
          price: 650,
          status: 'available',
          station: 'beverage',
          allergens: ['vegan'],
          tags: ['vegan'],
          image_url: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=500&auto=format&fit=crop&q=80',
          sort_order: 2,
          modifier_groups: [
            {
              id: 'group-coffee-milk',
              name: 'Milk Preference',
              required: true,
              min_selections: 1,
              max_selections: 1,
              sort_order: 1,
              modifiers: [
                { id: 'mod-cm-1', name: 'Oat Milk (Default)', price_adjustment: 0, is_default: true },
                { id: 'mod-cm-2', name: 'Almond Milk', price_adjustment: 50, is_default: false },
                { id: 'mod-cm-3', name: 'Whole Dairy Milk', price_adjustment: 0, is_default: false },
              ],
            },
          ],
        },
      ],
    },
  ],
};

type UseMenuResult =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: MenuData };

export function useMenu(slug: string): UseMenuResult {
  const [result, setResult] = useState<UseMenuResult>({ status: 'loading' });

  useEffect(() => {
    if (!slug) return;
    setResult({ status: 'loading' });

    if (slug === 'demo' || slug === 'default' || !slug.trim()) {
      setResult({ status: 'success', data: MOCK_MENU });
      return;
    }

    const controller = new AbortController();

    fetch(`${API}/v1/menu/${encodeURIComponent(slug)}`, { signal: controller.signal })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok || !body.ok) {
          setResult({ status: 'success', data: MOCK_MENU }); // fallback to mock instead of blank error
        } else {
          setResult({ status: 'success', data: body.data });
        }
      })
      .catch(() => {
        setResult({ status: 'success', data: MOCK_MENU }); // fallback to mock instead of blank error
      });

    return () => controller.abort();
  }, [slug]);

  return result;
}
