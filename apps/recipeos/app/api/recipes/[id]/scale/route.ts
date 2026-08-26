import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { scaleIngredients } from '../../../../../../shared/ratio-engine';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const base = parseFloat(searchParams.get('base') ?? '0');
  const target = parseFloat(searchParams.get('target') ?? '0');

  if (!base || !target) {
    return NextResponse.json({ error: 'base and target servings are required' }, { status: 400 });
  }

  const { data: recipe, error } = await supabase
    .from('recipes')
    .select('*, ingredients:recipe_ingredients(*, ingredient:ingredients(*))')
    .eq('id', id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  const ingredients = (recipe.ingredients ?? []).map((i: any) => ({
    name: i.name_override ?? i.ingredient?.name ?? 'Unknown',
    amount: String(i.amount),
    unit: i.unit,
  }));

  const scaled = scaleIngredients(ingredients, base, target);

  return NextResponse.json({
    recipe_id: id,
    name: recipe.name,
    base_servings: base,
    target_servings: target,
    scale_factor: target / base,
    ingredients: scaled,
  });
}
