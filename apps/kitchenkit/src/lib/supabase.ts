import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;
try {
  const url = import.meta.env.VITE_SUPABASE_URL as string;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  if (url && key && !url.includes('your-project')) {
    supabaseClient = createClient(url, key);
  }
} catch {
  // Gracefully fallback to demo mock client
}

export const configuredSupabase = supabaseClient;

// Demo mock seed data
const MOCK_RECIPES = [
  {
    id: 'demo-recipe-1',
    user_id: '00000000-0000-0000-0000-000000000001',
    name: 'Cheezies Smash Burger',
    description: 'Signature double patty with melted American cheese & smash sauce',
    base_ingredient: 'Ground Beef 80/20',
    yield_unit: 'burgers',
    base_yield_portions: 10,
    station: 'Grill',
    is_public: true,
    tags: ['Grill', 'Signature', 'Beef'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ingredients: [
      { id: 'i1', recipe_id: 'demo-recipe-1', name: 'Ground Chuck 80/20 Fresh', ratio: 0.4, unit: 'lb', sort_order: 1 },
      { id: 'i2', recipe_id: 'demo-recipe-1', name: 'Potato Brioche Buns', ratio: 2, unit: 'ea', sort_order: 2 },
      { id: 'i3', recipe_id: 'demo-recipe-1', name: 'American Cheese Slices', ratio: 2, unit: 'slices', sort_order: 3 },
      { id: 'i4', recipe_id: 'demo-recipe-1', name: 'Secret Smash Sauce', ratio: 0.1, unit: 'cup', sort_order: 4 },
    ],
  },
  {
    id: 'demo-recipe-2',
    user_id: '00000000-0000-0000-0000-000000000001',
    name: 'Crispy Buffalo Wings (12pc)',
    description: 'Double-fried jumbo wings tossed in signature aged cayenne butter',
    base_ingredient: 'Jumbo Chicken Wings',
    yield_unit: 'orders',
    base_yield_portions: 6,
    station: 'Fry',
    is_public: true,
    tags: ['Fry', 'Poultry', 'Spicy'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ingredients: [
      { id: 'i5', recipe_id: 'demo-recipe-2', name: 'Jumbo Chicken Wings', ratio: 12, unit: 'ea', sort_order: 1 },
      { id: 'i6', recipe_id: 'demo-recipe-2', name: "Frank's RedHot Sauce", ratio: 0.5, unit: 'cup', sort_order: 2 },
      { id: 'i7', recipe_id: 'demo-recipe-2', name: 'Clarified Butter', ratio: 0.25, unit: 'cup', sort_order: 3 },
    ],
  },
  {
    id: 'demo-recipe-3',
    user_id: '00000000-0000-0000-0000-000000000001',
    name: 'Craft Beer Cheese Sauce',
    description: 'Sharp cheddar and gruyere emulsion with local IPA',
    base_ingredient: 'Sharp Cheddar',
    yield_unit: 'quarts',
    base_yield_portions: 4,
    station: 'Sauce / Prep',
    is_public: true,
    tags: ['Sauce', 'Prep', 'Dairy'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ingredients: [
      { id: 'i8', recipe_id: 'demo-recipe-3', name: 'Sharp Cheddar Shredded', ratio: 2, unit: 'lb', sort_order: 1 },
      { id: 'i9', recipe_id: 'demo-recipe-3', name: 'Gruyere Cheese', ratio: 0.5, unit: 'lb', sort_order: 2 },
      { id: 'i10', recipe_id: 'demo-recipe-3', name: 'Local IPA Beer', ratio: 12, unit: 'oz', sort_order: 3 },
      { id: 'i11', recipe_id: 'demo-recipe-3', name: 'Heavy Cream 36%', ratio: 1, unit: 'cup', sort_order: 4 },
    ],
  },
];

const MOCK_PAR_LEVELS = [
  { id: 'pl-1', user_id: '00000000-0000-0000-0000-000000000001', ingredient_name: 'Ground Chuck 80/20 Fresh', par_amount: 50, current_stock: 18, unit: 'lb', updated_at: new Date().toISOString() },
  { id: 'pl-2', user_id: '00000000-0000-0000-0000-000000000001', ingredient_name: 'Potato Brioche Buns', par_amount: 100, current_stock: 45, unit: 'ea', updated_at: new Date().toISOString() },
  { id: 'pl-3', user_id: '00000000-0000-0000-0000-000000000001', ingredient_name: 'American Cheese Slices', par_amount: 120, current_stock: 80, unit: 'slices', updated_at: new Date().toISOString() },
  { id: 'pl-4', user_id: '00000000-0000-0000-0000-000000000001', ingredient_name: 'Jumbo Chicken Wings', par_amount: 80, current_stock: 24, unit: 'lb', updated_at: new Date().toISOString() },
  { id: 'pl-5', user_id: '00000000-0000-0000-0000-000000000001', ingredient_name: 'Heavy Cream 36% Grade A', par_amount: 8, current_stock: 6, unit: 'qt', updated_at: new Date().toISOString() },
];

function createMockQueryBuilder(table: string) {
  let tableData: any[] = [];
  if (table === 'recipes') tableData = MOCK_RECIPES;
  else if (table === 'par_levels') tableData = MOCK_PAR_LEVELS;
  else if (table === 'prep_plans') tableData = [{ id: 'pp-1', name: 'Dinner Rush Line Prep', station: 'Line Prep', is_completed: false, created_at: new Date().toISOString() }];

  const builder: any = {
    _data: [...tableData],
    select(_columns?: string, _opts?: { count?: string; head?: boolean }) {
      return builder;
    },
    insert(rows: any | any[]) {
      const arr = Array.isArray(rows) ? rows : [rows];
      tableData.push(...arr);
      return builder;
    },
    update(updates: any) {
      tableData = tableData.map(item => ({ ...item, ...updates }));
      return builder;
    },
    upsert(item: any) {
      tableData.push(item);
      return builder;
    },
    delete() {
      return builder;
    },
    eq(col: string, val: any) {
      if (val !== undefined && val !== null) {
        builder._data = builder._data.filter((item: any) => item[col] === val);
      }
      return builder;
    },
    gte() { return builder; },
    lte() { return builder; },
    ilike() { return builder; },
    order() { return builder; },
    single() {
      return Promise.resolve({ data: builder._data[0] || null, error: null });
    },
    then(resolve: (res: any) => void) {
      return Promise.resolve({
        data: builder._data,
        error: null,
        count: builder._data.length,
      }).then(resolve);
    },
  };
  return builder;
}

const mockClient: any = {
  auth: {
    getUser: async () => ({
      data: {
        user: {
          id: '00000000-0000-0000-0000-000000000001',
          email: 'chef@culinaryos.local',
        },
      },
      error: null,
    }),
    getSession: async () => ({
      data: {
        session: {
          access_token: 'mock-token',
          user: { id: '00000000-0000-0000-0000-000000000001', email: 'chef@culinaryos.local' },
        },
      },
      error: null,
    }),
    onAuthStateChange: (cb: any) => {
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
    signInWithOtp: async () => ({ data: null, error: null }),
  },
  from: (table: string) => createMockQueryBuilder(table),
};

export const supabase: any = {
  get auth() { return configuredSupabase?.auth ?? mockClient.auth; },
  get from() { return configuredSupabase ? configuredSupabase.from.bind(configuredSupabase) : mockClient.from; },
};

