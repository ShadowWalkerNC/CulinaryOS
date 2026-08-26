import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') ?? '';
  const category = searchParams.get('category');
  const ingredient = searchParams.get('ingredient');

  let query = supabase
    .from('recipes')
    .select('*, category:categories(*), ingredients:recipe_ingredients(*, ingredient:ingredients(*))')
    .order('created_at', { ascending: false });

  if (q) query = query.ilike('name', `%${q}%`);
  if (category) query = query.eq('categories.name', category);
  if (ingredient) {
    query = query.ilike('recipe_ingredients.name_override', `%${ingredient}%`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { name, category_id, description, base_servings, difficulty, tags, yield_amount, yield_unit } = body;

  const { data, error } = await supabase
    .from('recipes')
    .insert({ name, category_id, description, base_servings: base_servings ?? 4, difficulty, tags: tags ?? [], yield_amount, yield_unit, user_id: user.id, is_public: false })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
