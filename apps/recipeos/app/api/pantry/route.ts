import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const lowOnly = searchParams.get('filter') === 'low';

  let query = supabase
    .from('pantry_items')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const items = (data ?? []).map((item: any) => ({
    ...item,
    displayName: item.name_override ?? 'Unknown',
    isLow: item.reorder_at != null && item.quantity <= item.reorder_at,
  }));

  return NextResponse.json(lowOnly ? items.filter((i: any) => i.isLow) : items);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { name_override, quantity, unit, reorder_at, location } = body;

  const { data, error } = await supabase
    .from('pantry_items')
    .insert({ name_override, quantity, unit, reorder_at, location, user_id: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
