/**
 * Kitchen Chit Abbreviation Engine
 * Standardizes item names and modifiers into high-density line cook shorthand
 */

const COMMON_MODIFIER_ABBREVIATIONS: Record<string, string> = {
  'medium rare': 'MR',
  'rare': 'R',
  'medium': 'MED',
  'medium well': 'MW',
  'well done': 'WD',
  'no tomatoes': 'No Tom',
  'no tomato': 'No Tom',
  'no onion': 'No On',
  'no onions': 'No On',
  'no pickles': 'No Pkl',
  'no pickle': 'No Pkl',
  'extra cheese': 'X-Chz',
  'extra bacon': 'X-Bcn',
  'extra basil': 'X-Basil',
  'gluten free': 'GF',
  'gluten-free': 'GF',
  'substitute fries': 'Sub Fry',
  'substitute salad': 'Sub Sld',
  'sauce on side': 'SOS',
  'dressing on side': 'DOS',
};

const COMMON_ITEM_ABBREVIATIONS: Record<string, string> = {
  'Prime Smash Cheeseburger': 'SmashBurger',
  'Classic Double Smash': 'Dbl Smash',
  'Wood-Fired Margherita': 'Margh Pizza',
  'Truffle Fries': 'Truff Fries',
  'New England Clam Chowder': 'Clam Chowder',
  'Crispy Calamari': 'Calamari',
  'Caesar Salad': 'Caesar Sld',
};

export function abbreviateItemName(name: string): string {
  if (!name) return '';
  if (COMMON_ITEM_ABBREVIATIONS[name]) return COMMON_ITEM_ABBREVIATIONS[name];
  return name
    .replace(/\bCheeseburger\b/gi, 'Burger')
    .replace(/\bSandwich\b/gi, 'Sand')
    .replace(/\bChicken\b/gi, 'Chkn')
    .trim();
}

export function abbreviateModifier(mod: string): string {
  if (!mod) return '';
  const lower = mod.toLowerCase().trim();
  if (COMMON_MODIFIER_ABBREVIATIONS[lower]) {
    return COMMON_MODIFIER_ABBREVIATIONS[lower];
  }
  if (lower.startsWith('no ')) {
    const rest = mod.slice(3).trim();
    return 'No ' + (rest.length > 5 ? rest.slice(0, 4) : rest);
  }
  if (lower.startsWith('extra ') || lower.startsWith('x-')) {
    const rest = mod.replace(/^(extra |x-)/i, '').trim();
    return 'X-' + rest;
  }
  return mod;
}
