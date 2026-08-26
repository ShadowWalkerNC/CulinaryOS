import { NextRequest, NextResponse } from 'next/server';
import { gramsToCups, cupsToGrams } from '@shared/ratio-engine';

export async function POST(req: NextRequest) {
  const { value, fromUnit, toUnit, ingredient } = await req.json();

  if (!value || !fromUnit || !toUnit) {
    return NextResponse.json({ error: 'value, fromUnit, and toUnit are required' }, { status: 400 });
  }

  let result: number | null = null;
  const from = fromUnit.toLowerCase();
  const to = toUnit.toLowerCase();

  if ((from === 'g' || from === 'grams') && (to === 'cups' || to === 'cup')) {
    result = gramsToCups(value, ingredient ?? '');
  } else if ((from === 'cups' || from === 'cup') && (to === 'g' || to === 'grams')) {
    result = cupsToGrams(value, ingredient ?? '');
  }

  if (result === null) {
    return NextResponse.json(
      { error: `Conversion from ${fromUnit} to ${toUnit} not supported${ingredient ? ` for ${ingredient}` : ''}` },
      { status: 422 }
    );
  }

  return NextResponse.json({ value, fromUnit, toUnit, ingredient, result: parseFloat(result.toFixed(3)) });
}
