import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

export async function seedNorthernFixins() {
  const { data: company } = await supabase.from('companies').insert({
    name: 'Northern Fixins LLC',
    plan: 'starter',
    stripe_customer_id: null,
  }).select().single();

  const { data: location } = await supabase.from('locations').insert({
    company_id: company.id,
    name: 'Northern Fixins — Bangor Food Truck',
    address: 'Bangor, Maine',
    timezone: 'America/New_York',
    meals_tax_rate: 0.0800,
    currency: 'USD',
    tip_pool_method: 'hours_worked',
  }).select().single();

  const staff = [
    { name: 'Nate C.',   role: 'owner',   pin_hash: null,   hourly_rate_cents: 0    },
    { name: 'Jordan M.', role: 'manager', pin_hash: 'hash', hourly_rate_cents: 1800 },
    { name: 'Sam R.',    role: 'cook',    pin_hash: 'hash', hourly_rate_cents: 1600 },
    { name: 'Alex T.',   role: 'cashier', pin_hash: 'hash', hourly_rate_cents: 1500 },
    { name: 'Casey B.',  role: 'server',  pin_hash: 'hash', hourly_rate_cents: 1465 },
  ];
  for (const s of staff) {
    await supabase.from('employees').insert({ ...s, location_id: location.id });
  }

  await supabase.from('kds_stations').insert([
    { location_id: location.id, name: 'Grill & Smoker', routing_type: 'category', color_hex: '#E53935' },
    { location_id: location.id, name: 'Window / Expo',  routing_type: 'manual',   color_hex: '#43A047' },
  ]);

  const categories = [
    'Smoked & Grilled Plates', 'Burgers & Sandwiches',
    'Wings & Drumsticks', 'Southern Sides', 'Drinks', 'Desserts & Bakery',
  ];
  const catMap: Record<string, string> = {};
  for (const c of categories) {
    const { data } = await supabase.from('menu_categories')
      .insert({ location_id: location.id, name: c }).select().single();
    catMap[c] = data.id;
  }

  const menuItems = [
    { name: '12-Hour Carolina Pulled Pork Plate', price_cents: 1400, category: 'Smoked & Grilled Plates', allergens: ['gluten'] },
    { name: 'Smoked Beef Brisket Plate',          price_cents: 1700, category: 'Smoked & Grilled Plates', allergens: [] },
    { name: 'Flame-Grilled Half Chicken',         price_cents: 1500, category: 'Smoked & Grilled Plates', allergens: ['dairy'] },
    { name: 'Maple Bourbon Chicken & Waffles',    price_cents: 1600, category: 'Smoked & Grilled Plates', allergens: ['gluten','dairy','eggs'] },
    { name: 'Northern Loaded Chili Bowl',         price_cents: 1300, category: 'Smoked & Grilled Plates', allergens: ['dairy'] },
    { name: 'The Smash Burger',                   price_cents: 1600, category: 'Burgers & Sandwiches',    allergens: ['gluten','dairy'] },
    { name: 'The French Dip',                     price_cents: 1600, category: 'Burgers & Sandwiches',    allergens: ['gluten','dairy'] },
    { name: 'Carolina Pulled Pork Sandwich',      price_cents: 1500, category: 'Burgers & Sandwiches',    allergens: ['gluten'] },
    { name: 'Crispy Fried Chicken Sandwich',      price_cents: 1500, category: 'Burgers & Sandwiches',    allergens: ['gluten','dairy','eggs'] },
    { name: 'Southern Brined Wings (8pc)',        price_cents: 1600, category: 'Wings & Drumsticks',      allergens: ['dairy'] },
    { name: 'Smoked Drumsticks (4pc)',            price_cents: 1100, category: 'Wings & Drumsticks',      allergens: [] },
    { name: 'The Fixins Poutine',                 price_cents: 1000, category: 'Southern Sides',          allergens: ['dairy'] },
    { name: 'Baked Mac & Cheese',                 price_cents:  700, category: 'Southern Sides',          allergens: ['gluten','dairy'] },
    { name: 'Maine Blueberry Biscuits',           price_cents:  500, category: 'Southern Sides',          allergens: ['gluten','dairy','eggs'] },
    { name: 'Sweet Tea',                          price_cents:  300, category: 'Drinks',                  allergens: [] },
    { name: 'House Lemonade',                     price_cents:  400, category: 'Drinks',                  allergens: [] },
    { name: 'Bottled Water',                      price_cents:  200, category: 'Drinks',                  allergens: [] },
    { name: 'Maine Blueberry Muffin',             price_cents:  400, category: 'Desserts & Bakery',       allergens: ['gluten','dairy','eggs'] },
    { name: 'Blueberry Blaze Cake Slice',         price_cents:  600, category: 'Desserts & Bakery',       allergens: ['gluten','dairy','eggs'] },
  ];
  for (const item of menuItems) {
    await supabase.from('menu_items').insert({
      location_id: location.id,
      menu_category_id: catMap[item.category],
      name: item.name,
      price_cents: item.price_cents,
      allergens: item.allergens,
      is_86d: false,
    });
  }

  console.log('✅ Northern Fixins demo seeded successfully.');
}
