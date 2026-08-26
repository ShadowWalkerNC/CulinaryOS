import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

let supabaseUrl = 'http://127.0.0.1:54321';
let supabaseKey = '';

try {
  const rootEnvPath = path.resolve('.env'); // wait, if we are in apps/web, the root is '../../.env'
  const rootEnvPathParent = path.resolve('../../.env');
  
  console.log('Checking root env at:', rootEnvPathParent);
  if (fs.existsSync(rootEnvPathParent)) {
    console.log('Root env found!');
    const envContent = fs.readFileSync(rootEnvPathParent, 'utf8');
    const urlMatch = envContent.match(/KITCHENKIT_SUPABASE_URL=(.*)/);
    const keyMatch = envContent.match(/KITCHENKIT_SUPABASE_SERVICE_KEY=(.*)/);
    if (urlMatch) supabaseUrl = urlMatch[1].replace(/[\r\n]/g, '').trim();
    if (keyMatch) supabaseKey = keyMatch[1].replace(/[\r\n]/g, '').trim();
  }
} catch (err) {
  console.log('Error reading root env:', err.message);
}

if (!supabaseKey) {
  try {
    const localEnvPath = path.resolve('.env');
    console.log('Checking local env at:', localEnvPath);
    if (fs.existsSync(localEnvPath)) {
      console.log('Local env found!');
      const envContent = fs.readFileSync(localEnvPath, 'utf8');
      const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.*)/);
      const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/);
      if (urlMatch) supabaseUrl = urlMatch[1].replace(/[\r\n]/g, '').trim();
      if (keyMatch) supabaseKey = keyMatch[1].replace(/[\r\n]/g, '').trim();
    }
  } catch (e) {
    console.log('Error reading local env:', e.message);
  }
}

console.log('Using Supabase URL:', supabaseUrl);
console.log('Using Key (first 15 chars):', supabaseKey ? supabaseKey.substring(0, 15) + '...' : 'none');

if (!supabaseKey) {
  console.error('No Supabase key found.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const userId = '00000000-0000-0000-0000-000000000001';

const recipes = [
  {
    name: 'Classic Sourdough Bread',
    description: 'Traditional wild-ferment sourdough. hydration 70%, starter 20%, salt 2%.',
    base_ingredient: 'flour',
    yield_unit: 'g',
    tags: ['bread', 'fermented', 'wild-yeast'],
    ingredients: [
      { name: 'flour', ratio: 1.00, unit: 'g', sort_order: 1 },
      { name: 'water', ratio: 0.70, unit: 'g', sort_order: 2 },
      { name: 'sourdough_starter', ratio: 0.20, unit: 'g', sort_order: 3 },
      { name: 'salt', ratio: 0.02, unit: 'g', sort_order: 4 },
    ]
  },
  {
    name: 'KitchenKit Mayonnaise',
    description: 'Classic cold emulsion sauce. Enriched egg yolk base.',
    base_ingredient: 'egg_yolk',
    yield_unit: 'g',
    tags: ['sauce', 'emulsion', 'cold-kitchen'],
    ingredients: [
      { name: 'egg_yolk', ratio: 1.00, unit: 'g', sort_order: 1 },
      { name: 'neutral_oil', ratio: 8.00, unit: 'g', sort_order: 2 },
      { name: 'lemon_juice', ratio: 0.50, unit: 'g', sort_order: 3 },
      { name: 'dijon_mustard', ratio: 0.20, unit: 'g', sort_order: 4 },
      { name: 'salt', ratio: 0.05, unit: 'g', sort_order: 5 },
    ]
  },
  {
    name: 'Choux Pastry (Pâte à Choux)',
    description: 'Light pastry dough used for profiteroles, eclairs, and gougères.',
    base_ingredient: 'flour',
    yield_unit: 'g',
    tags: ['pastry', 'dough', 'french'],
    ingredients: [
      { name: 'flour', ratio: 1.00, unit: 'g', sort_order: 1 },
      { name: 'water_or_milk', ratio: 1.60, unit: 'g', sort_order: 2 },
      { name: 'unsalted_butter', ratio: 0.80, unit: 'g', sort_order: 3 },
      { name: 'whole_eggs', ratio: 1.60, unit: 'g', sort_order: 4 },
      { name: 'salt', ratio: 0.02, unit: 'g', sort_order: 5 },
    ]
  },
  {
    name: 'Crème Brûlée Custard',
    description: 'Rich custard base baked with a caramelized sugar top.',
    base_ingredient: 'heavy_cream',
    yield_unit: 'ml',
    tags: ['dessert', 'custard', 'french'],
    ingredients: [
      { name: 'heavy_cream', ratio: 1.00, unit: 'ml', sort_order: 1 },
      { name: 'egg_yolks', ratio: 0.25, unit: 'g', sort_order: 2 },
      { name: 'granulated_sugar', ratio: 0.20, unit: 'g', sort_order: 3 },
      { name: 'vanilla_bean', ratio: 0.01, unit: 'pcs', sort_order: 4 },
    ]
  }
];

async function seed() {
  for (const recipe of recipes) {
    const { data: existing } = await supabase
      .from('recipes')
      .select('id')
      .eq('user_id', userId)
      .eq('name', recipe.name)
      .maybeSingle();

    if (existing) {
      console.log(`Recipe "${recipe.name}" already exists, skipping.`);
      continue;
    }

    const { data: newRecipe, error: recipeError } = await supabase
      .from('recipes')
      .insert({
        user_id: userId,
        name: recipe.name,
        description: recipe.description,
        base_ingredient: recipe.base_ingredient,
        yield_unit: recipe.yield_unit,
        tags: recipe.tags,
        is_public: true
      })
      .select()
      .single();

    if (recipeError) {
      console.error(`Error inserting recipe ${recipe.name}:`, recipeError.message);
      continue;
    }

    console.log(`Inserted recipe: ${recipe.name} (${newRecipe.id})`);

    const ingredientsToInsert = recipe.ingredients.map(ing => ({
      recipe_id: newRecipe.id,
      name: ing.name,
      ratio: ing.ratio,
      unit: ing.unit,
      sort_order: ing.sort_order
    }));

    const { error: ingError } = await supabase
      .from('ingredients')
      .insert(ingredientsToInsert);

    if (ingError) {
      console.error(`Error inserting ingredients for ${recipe.name}:`, ingError.message);
    } else {
      console.log(`Inserted ${ingredientsToInsert.length} ingredients for ${recipe.name}`);
    }
  }

  console.log('Done seeding!');
}

seed().catch(err => console.error('Seed script failed:', err));
