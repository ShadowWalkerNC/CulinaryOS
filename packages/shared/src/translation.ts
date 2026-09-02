// ============================================================
// CulinaryOS — Per-Station Dual-Language Culinary Translation Engine
// Supports bilingual kitchen display cards and ESC/POS thermal printer chits
// Translations between English (EN), Spanish (ES), and French (FR).
// ============================================================

import type { KitchenTicket, TicketItem } from './types/order.js';

export type SupportedLanguage = 'en' | 'es' | 'fr';

export interface TranslatedTicketItem extends TicketItem {
  originalName: string;
  translatedName: string;
  originalModifiers?: string[];
  translatedModifiers?: string[];
  dualLanguageHeader: string;
}

export interface TranslatedKitchenTicket extends KitchenTicket {
  targetLanguage: SupportedLanguage;
  translatedStationName?: string;
  translatedCourseLabel: string;
  items: TranslatedTicketItem[];
}

/**
 * Normalized dictionary mapping lowercase normalized culinary terms to ES and FR.
 */
export const CULINARY_DICTIONARY: Record<string, { es: string; fr: string }> = {
  // Dishes & Proteins
  'ribeye steak': { es: 'Bife de Chorizo', fr: 'Entrecôte Grillée' },
  'ribeye': { es: 'Bife de Chorizo', fr: 'Entrecôte' },
  'ny strip steak': { es: 'Bife de Tira', fr: 'Faux-Filet' },
  'filet mignon': { es: 'Filet Mignon', fr: 'Filet Mignon' },
  'smash burger': { es: 'Hamburguesa Smash', fr: 'Burger Écrasé' },
  'smash burger double': { es: 'Hamburguesa Smash Doble', fr: 'Double Burger Écrasé' },
  'double cheeseburger': { es: 'Hamburguesa Doble con Queso', fr: 'Double Cheeseburger' },
  'cheeseburger': { es: 'Hamburguesa con Queso', fr: 'Cheeseburger' },
  'burger': { es: 'Hamburguesa', fr: 'Burger' },
  'grilled chicken': { es: 'Pollo a la Parrilla', fr: 'Poulet Grillé' },
  'fried chicken': { es: 'Pollo Frito', fr: 'Poulet Frit' },
  'crispy chicken sandwich': { es: 'Sándwich de Pollo Crujiente', fr: 'Sandwich Poulet Croustillant' },
  'salmon': { es: 'Salmón a la Plancha', fr: 'Saumon Grillé' },
  'grilled salmon': { es: 'Salmón a la Plancha', fr: 'Saumon Grillé' },
  'pan-seared salmon': { es: 'Salmón Sellado', fr: 'Pavé de Saumon Poêlé' },
  'halibut': { es: 'Mero / Fletán', fr: 'Flétan' },
  'shrimp scampi': { es: 'Camarones al Ajillo', fr: 'Scampis à l\'Ail' },
  'tuna tartare': { es: 'Tartar de Atún', fr: 'Tartare de Thon' },
  'fish tacos': { es: 'Tacos de Pescado', fr: 'Tacos de Poisson' },
  'carnitas tacos': { es: 'Tacos de Carnitas', fr: 'Tacos de Carnitas' },
  'margherita pizza': { es: 'Pizza Margarita', fr: 'Pizza Margherita' },
  'pepperoni pizza': { es: 'Pizza de Pepperoni', fr: 'Pizza Pepperoni' },
  'caesar salad': { es: 'Ensalada César', fr: 'Salade César' },
  'house salad': { es: 'Ensalada de la Casa', fr: 'Salade Maison' },
  'wedge salad': { es: 'Ensalada Wedge', fr: 'Salade Wedge' },
  'truffle pasta': { es: 'Pasta a la Trufa', fr: 'Pâtes à la Truffe' },
  'fettuccine alfredo': { es: 'Fettuccine Alfredo', fr: 'Fettuccine Alfredo' },
  'french fries': { es: 'Papas Fritas', fr: 'Frites' },
  'fries': { es: 'Papas Fritas', fr: 'Frites' },
  'truffle fries': { es: 'Papas con Trufa', fr: 'Frites à la Truffe' },
  'onion rings': { es: 'Aros de Cebolla', fr: 'Rondelles d\'Oignon' },
  'soup of the day': { es: 'Sopa del Día', fr: 'Soupe du Jour' },
  'clam chowder': { es: 'Crema de Almejas', fr: 'Chaudrée de Palourdes' },
  'chicken wings': { es: 'Alitas de Pollo', fr: 'Ailes de Poulet' },
  'chocolate cake': { es: 'Pastel de Chocolate', fr: 'Gâteau au Chocolat' },
  'lava cake': { es: 'Volcán de Chocolate', fr: 'Fondant au Chocolat' },
  'key lime pie': { es: 'Tarta de Lima', fr: 'Tarte au Citron Vert' },
  'cheesecake': { es: 'Pastel de Queso', fr: 'Gâteau au Fromage' },
  'espresso': { es: 'Café Espresso', fr: 'Café Expresso' },
  'cappuccino': { es: 'Capuchino', fr: 'Cappuccino' },

  // Cooking Temperatures & Doneness
  'rare': { es: 'Poco Hecho / Vuelta y Vuelta', fr: 'Saignant' },
  'medium rare': { es: 'Término Medio / Poco Hecho', fr: 'À Point / Saignant' },
  'med rare': { es: 'Término Medio', fr: 'À Point' },
  'medium': { es: 'Término Medio', fr: 'À Point' },
  'medium well': { es: 'Tres Cuartos', fr: 'Cuit' },
  'med well': { es: 'Tres Cuartos', fr: 'Cuit' },
  'well done': { es: 'Bien Cocido', fr: 'Bien Cuit' },
  'extra crispy': { es: 'Extra Crujiente', fr: 'Très Croustillant' },
  'crispy': { es: 'Crujiente', fr: 'Croustillant' },

  // Modifiers & Modifiers prefixes
  'no onions': { es: 'Sin Cebolla', fr: 'Sans Oignons' },
  'no onion': { es: 'Sin Cebolla', fr: 'Sans Oignon' },
  'sub salad': { es: 'Cambiar por Ensalada', fr: 'Remplacer par Salade' },
  'extra sauce': { es: 'Salsa Extra', fr: 'Sauce Supplémentaire' },
  'sauce on side': { es: 'Salsa Aparte', fr: 'Sauce à Part' },
  'dressing on side': { es: 'Aderezo Aparte', fr: 'Vinaigrette à Part' },
  'on the side': { es: 'Aparte / Al Lado', fr: 'À Part' },
  'no dairy': { es: 'Sin Lácteos', fr: 'Sans Produits Laitiers' },
  'no cheese': { es: 'Sin Queso', fr: 'Sans Fromage' },
  'extra cheese': { es: 'Extra Queso', fr: 'Supplément Fromage' },
  'gluten free': { es: 'Sin Gluten', fr: 'Sans Gluten' },
  'gluten-free bun': { es: 'Pan Sin Gluten', fr: 'Pain Sans Gluten' },
  'dairy free': { es: 'Sin Lácteos', fr: 'Sans Lactose' },
  'nut allergy': { es: 'Alergia a Frutos Secos', fr: 'Allergie aux Fruits à Coque' },
  'shellfish allergy': { es: 'Alergia a Mariscos', fr: 'Allergie aux Crustacés' },
  'peanut allergy': { es: 'Alergia al Maní', fr: 'Allergie aux Arachides' },
  'allergy': { es: 'Alergia', fr: 'Allergie' },
  'no garlic': { es: 'Sin Ajo', fr: 'Sans Ail' },
  'no tomato': { es: 'Sin Tomate', fr: 'Sans Tomate' },
  'no salt': { es: 'Sin Sal', fr: 'Sans Sel' },
  'extra spicy': { es: 'Muy Picante', fr: 'Très Épicé' },
  'mild': { es: 'Suave', fr: 'Doux' },
  'urgent / rush': { es: '¡URGENTE!', fr: 'URGENT' },
  'rush': { es: '¡URGENTE!', fr: 'URGENT' },

  // Stations
  'grill': { es: 'Parrilla', fr: 'Grill' },
  'hot grill': { es: 'Parrilla Caliente', fr: 'Grill Chaud' },
  'fryer': { es: 'Freidora', fr: 'Friteuse' },
  'cold prep': { es: 'Preparación Fría', fr: 'Garde-Manger / Froid' },
  'bar': { es: 'Barra / Bebidas', fr: 'Bar' },
  'expo': { es: 'Pase / Expo', fr: 'Passe / Expo' },
  'pass': { es: 'Pase', fr: 'Passe' },
  'hot': { es: 'Línea Caliente', fr: 'Chaud' },
  'cold': { es: 'Línea Fría', fr: 'Froid' },
  'pastry': { es: 'Pastelería', fr: 'Pâtisserie' },
  'sauce': { es: 'Salsas', fr: 'Saucier' },
};

/**
 * Translates an arbitrary culinary phrase or token into Spanish or French.
 * If no exact match is found, performs prefix/token replacement for common culinary words.
 */
export function translateCulinaryText(
  text: string,
  targetLanguage: SupportedLanguage
): { translated: string; original: string } {
  if (!text || targetLanguage === 'en') {
    return { translated: text, original: text };
  }

  const clean = text.trim();
  const lower = clean.toLowerCase();

  // 1. Direct dictionary match
  if (CULINARY_DICTIONARY[lower]) {
    const direct = CULINARY_DICTIONARY[lower][targetLanguage];
    if (direct) return { translated: direct, original: clean };
  }

  // 2. Pattern matching for common modifiers (e.g. "No X", "Extra X", "Sub X", "Add X")
  let translated = clean;

  if (/^no\s+(.+)$/i.test(clean)) {
    const item = clean.replace(/^no\s+/i, '').trim();
    const itemLower = item.toLowerCase();
    const subTranslation = CULINARY_DICTIONARY[itemLower]?.[targetLanguage] || item;
    translated = targetLanguage === 'es' ? `Sin ${subTranslation}` : `Sans ${subTranslation}`;
    return { translated, original: clean };
  }

  if (/^extra\s+(.+)$/i.test(clean)) {
    const item = clean.replace(/^extra\s+/i, '').trim();
    const itemLower = item.toLowerCase();
    const subTranslation = CULINARY_DICTIONARY[itemLower]?.[targetLanguage] || item;
    translated = targetLanguage === 'es' ? `Extra ${subTranslation}` : `Supplément ${subTranslation}`;
    return { translated, original: clean };
  }

  if (/^sub\s+(.+)$/i.test(clean)) {
    const item = clean.replace(/^sub\s+/i, '').trim();
    const itemLower = item.toLowerCase();
    const subTranslation = CULINARY_DICTIONARY[itemLower]?.[targetLanguage] || item;
    translated = targetLanguage === 'es' ? `Cambiar por ${subTranslation}` : `Remplacer par ${subTranslation}`;
    return { translated, original: clean };
  }

  if (/^add\s+(.+)$/i.test(clean)) {
    const item = clean.replace(/^add\s+/i, '').trim();
    const itemLower = item.toLowerCase();
    const subTranslation = CULINARY_DICTIONARY[itemLower]?.[targetLanguage] || item;
    translated = targetLanguage === 'es' ? `Agregar ${subTranslation}` : `Ajouter ${subTranslation}`;
    return { translated, original: clean };
  }

  // 3. Fallback: check if parts match known dictionary phrases
  for (const [key, value] of Object.entries(CULINARY_DICTIONARY)) {
    const regex = new RegExp(`\\b${key}\\b`, 'i');
    if (regex.test(translated)) {
      translated = translated.replace(regex, value[targetLanguage]);
    }
  }

  return { translated, original: clean };
}

/**
 * Translates a single ticket line item into the target language with original subtitle.
 */
export function translateTicketItem(
  item: TicketItem,
  targetLanguage: SupportedLanguage
): TranslatedTicketItem {
  const transName = translateCulinaryText(item.name, targetLanguage);
  const transMods = (item.modifiers ?? []).map((m) => {
    const t = translateCulinaryText(m, targetLanguage);
    return targetLanguage === 'en' || t.translated === m
      ? m
      : `${t.translated} (${m})`;
  });

  const dualHeader =
    targetLanguage === 'en' || transName.translated === item.name
      ? item.name
      : `${transName.translated} (${item.name})`;

  return {
    ...item,
    originalName: item.name,
    translatedName: transName.translated,
    originalModifiers: item.modifiers ?? [],
    translatedModifiers: transMods,
    dualLanguageHeader: dualHeader,
  };
}

/**
 * Translates an entire Kitchen Ticket into the target language (EN/ES/FR).
 */
export function translateTicket(
  ticket: KitchenTicket,
  targetLanguage: SupportedLanguage = 'en'
): TranslatedKitchenTicket {
  const stationName = ticket.stationName || ticket.station || 'hot';
  const transStation = translateCulinaryText(stationName, targetLanguage).translated;

  const courseLabels: Record<SupportedLanguage, string> = {
    en: `Course ${ticket.courseNumber}`,
    es: `Tiempo ${ticket.courseNumber} (Plato)`,
    fr: `Service ${ticket.courseNumber}`,
  };

  const translatedItems = (ticket.items ?? []).map((item) =>
    translateTicketItem(item, targetLanguage)
  );

  return {
    ...ticket,
    targetLanguage,
    translatedStationName: transStation,
    translatedCourseLabel: courseLabels[targetLanguage] || `Course ${ticket.courseNumber}`,
    items: translatedItems,
  };
}

/**
 * Formats a dual-language string for thermal chit or display rendering.
 * E.g. "Bife de Chorizo\n  (Ribeye Steak)" or "Bife de Chorizo (Ribeye Steak)"
 */
export function formatDualLanguageText(
  text: string,
  targetLanguage: SupportedLanguage,
  mode: 'inline' | 'stacked' = 'inline'
): string {
  if (targetLanguage === 'en') return text;
  const { translated, original } = translateCulinaryText(text, targetLanguage);
  if (translated.toLowerCase() === original.toLowerCase()) return text;
  if (mode === 'stacked') {
    return `${translated}\n  (${original})`;
  }
  return `${translated} (${original})`;
}
