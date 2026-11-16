// packages/shared/src/businessPresets.ts
// Fully absorbed business concept templates (Joes-Tacos, Benjamins Pub, Full-Service, Pizzeria)

export interface ConceptPresetItem {
  id: string;
  name: string;
  category: string;
  station: string;
  priceCents: number;
  description: string;
  tags?: string[];
  allergens?: string[];
}

export interface BusinessConceptPreset {
  id: string;
  name: string;
  tagline: string;
  conceptType: 'food_truck' | 'gastropub' | 'full_service' | 'pizzeria';
  defaultTaxRateBps: number;
  tablesCount: number;
  stations: string[];
  items: ConceptPresetItem[];
}

export const JOES_TACOS_PRESET: BusinessConceptPreset = {
  id: 'food-truck-tacos',
  name: "Joe's Street Tacos",
  tagline: "Authentic Slow-Roasted Mexican Street Food & Tacos",
  conceptType: 'food_truck',
  defaultTaxRateBps: 825,
  tablesCount: 0,
  stations: ['grill', 'prep', 'window'],
  items: [
    {
      id: 'taco-carne-asada',
      name: 'Carne Asada Street Taco',
      category: 'Tacos',
      station: 'grill',
      priceCents: 700,
      description: 'Tender grilled steak, fresh pico de gallo, house guacamole on warm double corn tortillas.',
      tags: ['Beef', 'Best Seller'],
      allergens: [],
    },
    {
      id: 'taco-carnitas',
      name: 'Pork Carnitas Taco',
      category: 'Tacos',
      station: 'prep',
      priceCents: 700,
      description: 'Slow-cooked juicy pulled pork, cilantro-lime rice, and sweet fire-roasted corn salsa.',
      tags: ['Pork', 'Gluten-Free'],
      allergens: [],
    },
    {
      id: 'taco-birria',
      name: 'Quesabirria Taco & Consomé',
      category: 'Tacos',
      station: 'grill',
      priceCents: 850,
      description: 'Braised beef brisket, melted oaxaca cheese in crispy griddled tortilla with rich bone broth consomé.',
      tags: ['Chef Special'],
      allergens: ['Dairy'],
    },
    {
      id: 'taco-pollo',
      name: 'Pollo Asado Taco',
      category: 'Tacos',
      station: 'grill',
      priceCents: 650,
      description: 'Citrus-marinated grilled chicken breast, shredded cabbage, and creamy avocado ranch.',
      tags: ['Poultry'],
      allergens: ['Dairy'],
    },
    {
      id: 'side-street-corn',
      name: 'Elote Street Corn Cup',
      category: 'Sides',
      station: 'prep',
      priceCents: 550,
      description: 'Charred sweet corn kernels, cotija cheese, chile lime tajin, and Mexican crema.',
      tags: ['Vegetarian'],
      allergens: ['Dairy'],
    },
    {
      id: 'drink-horchata',
      name: 'House Rice Horchata',
      category: 'Beverages',
      station: 'window',
      priceCents: 450,
      description: 'Traditional spiced Mexican rice milk with Ceylon cinnamon and Madagascar vanilla.',
      tags: ['Beverage'],
      allergens: [],
    },
  ],
};

export const BENJAMINS_PUB_PRESET: BusinessConceptPreset = {
  id: 'gastropub-benjamins',
  name: "Benjamin's Neighborhood Pub",
  tagline: "Cold Drafts, Scratch Pub Fare, and Craft Burgers",
  conceptType: 'gastropub',
  defaultTaxRateBps: 800,
  tablesCount: 22,
  stations: ['fry', 'grill', 'bar', 'cold'],
  items: [
    {
      id: 'pub-jumbo-wings',
      name: 'Jumbo Bone-In Pub Wings (10ct)',
      category: 'Starters',
      station: 'fry',
      priceCents: 1400,
      description: 'Crispy bone-in jumbo wings tossed in Bourbon Buffalo or Garlic Parmesan with house blue cheese.',
      tags: ['Hot', 'Gluten-Free'],
      allergens: ['Dairy'],
    },
    {
      id: 'pub-potato-balls',
      name: 'Loaded Maine Potato Balls',
      category: 'Starters',
      station: 'fry',
      priceCents: 1000,
      description: 'Crispy panko crust with russet potato, aged cheddar, scallions, and hardwood smoked bacon.',
      tags: ['House Favorite'],
      allergens: ['Gluten', 'Dairy'],
    },
    {
      id: 'pub-smashburger',
      name: 'Double Benjamin Smash Burger',
      category: 'Burgers',
      station: 'grill',
      priceCents: 1650,
      description: 'Two 4oz smash patties, American cheese, grilled onions, house pub sauce on toasted brioche.',
      tags: ['Best Seller'],
      allergens: ['Gluten', 'Dairy'],
    },
    {
      id: 'pub-fish-chips',
      name: 'Haddock Fish & Chips',
      category: 'Mains',
      station: 'fry',
      priceCents: 1850,
      description: 'Beer-battered fresh Atlantic haddock, beef tallow steak fries, tartar sauce, and lemon.',
      tags: ['Seafood'],
      allergens: ['Fish', 'Gluten'],
    },
    {
      id: 'pub-ipa-draft',
      name: 'Maine Craft Hazy IPA Pint',
      category: 'Draft Beer',
      station: 'bar',
      priceCents: 750,
      description: 'Fresh locally brewed double-dry-hopped citrus NEIPA, 6.8% ABV.',
      tags: ['Draft', '21+'],
      allergens: ['Gluten'],
    },
    {
      id: 'pub-stout-draft',
      name: 'Dry Irish Stout on Nitro',
      category: 'Draft Beer',
      station: 'bar',
      priceCents: 700,
      description: 'Velvety nitrogen pour with roasted barley, dark chocolate notes, 4.2% ABV.',
      tags: ['Draft', '21+'],
      allergens: ['Gluten'],
    },
  ],
};

export const FULL_SERVICE_PRESET: BusinessConceptPreset = {
  id: 'full-service',
  name: 'Alley Katz Taproom & Kitchen',
  tagline: 'Wood-Fired Pizza, Prime Steaks, and Craft Cocktails',
  conceptType: 'full_service',
  defaultTaxRateBps: 825,
  tablesCount: 16,
  stations: ['hot', 'grill', 'cold', 'fry', 'bar'],
  items: [
    {
      id: 'item-margherita',
      name: 'Wood-Fired Margherita Pizza',
      category: 'Pizza',
      station: 'hot',
      priceCents: 1800,
      description: 'San Marzano DOP tomatoes, fresh fior di latte mozzarella, basil, extra virgin olive oil.',
      tags: ['Vegetarian'],
      allergens: ['Dairy', 'Gluten'],
    },
    {
      id: 'item-ribeye',
      name: 'Dry-Aged Ribeye 14oz',
      category: 'Entrees',
      station: 'grill',
      priceCents: 4600,
      description: '28-day dry aged certified angus beef, rosemary tallow butter, roasted garlic head.',
      tags: ['Gluten-Free'],
      allergens: ['Dairy'],
    },
    {
      id: 'item-halibut',
      name: 'Pan-Roasted Alaskan Halibut',
      category: 'Entrees',
      station: 'hot',
      priceCents: 3400,
      description: 'Sweet corn velouté, charred baby leeks, crispy speck, herb oil.',
      tags: ['Seafood'],
      allergens: ['Fish', 'Dairy'],
    },
    {
      id: 'item-caesar',
      name: 'Little Gem Caesar',
      category: 'Salads',
      station: 'cold',
      priceCents: 1400,
      description: 'Anchovy garlic dressing, cured egg yolk, sourdough pangrattato, parmigiano.',
      tags: ['Classic'],
      allergens: ['Fish', 'Dairy', 'Gluten', 'Eggs'],
    },
    {
      id: 'item-negroni',
      name: 'Barrel-Aged Negroni',
      category: 'Cocktails',
      station: 'bar',
      priceCents: 1600,
      description: 'Botanical gin, sweet vermouth, Campari, rested in charred American oak cask.',
      tags: ['Cocktail', '21+'],
      allergens: [],
    },
  ],
};

export const BUSINESS_PRESETS = [
  FULL_SERVICE_PRESET,
  JOES_TACOS_PRESET,
  BENJAMINS_PUB_PRESET,
];
