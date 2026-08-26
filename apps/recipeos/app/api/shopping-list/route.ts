import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('pantry_items')
    .select('*')
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const lowStock = (data ?? []).filter(
    (item: any) => item.reorder_at != null && item.quantity <= item.reorder_at
  ).map((item: any) => ({
    id: item.id,
    name: item.name_override ?? 'Unknown',
    current_quantity: item.quantity,
    unit: item.unit,
    reorder_at: item.reorder_at,
  }));

  return NextResponse.json({ items: lowStock, count: lowStock.length });
}
