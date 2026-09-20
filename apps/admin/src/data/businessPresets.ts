export interface BusinessPreset {
  id: string;
  name: string;
  tagline: string;
  icon: string;
  description: string;
  serviceModel: 'table-service' | 'counter-service' | 'hybrid' | 'quick-serve';
  suggestedTaxRatePct: number;
  tipDistributionMethod: 'hours-weighted' | 'keep-your-own' | 'role-points';
  sampleCategories: string[];
  sampleItemsCount: number;
  sampleItems: {
    name: string;
    category: string;
    price: number;
    cost: number;
    station: string;
    description: string;
  }[];
  kitchenStations: { name: string; code: string; color: string }[];
  tablesCount: number;
}

export const BUSINESS_PRESETS: BusinessPreset[] = [
  {
    id: 'cheezies-gourmet',
    name: 'Cheezies Gourmet (Ohio Pilot)',
    tagline: 'Gourmet grilled cheese food truck & catering in Akron / Cuyahoga Falls, OH',
    icon: 'flame',
    description: 'The official live pilot profile for Cheezies Gourmet Ohio. Features handcrafted artisan melts (The Patty Meltdown, The Mac Attack, The Truffle Melt), food-truck order numbering, Summit County 6.75% tax rate, and fast line-expo routing.',
    serviceModel: 'counter-service',
    suggestedTaxRatePct: 6.75,
    tipDistributionMethod: 'keep-your-own',
    sampleCategories: ['Signature Creations', 'Gourmet Melts', 'Sides & Refreshments'],
    sampleItemsCount: 9,
    sampleItems: [
      { name: 'The Patty Meltdown', category: 'Signature Creations', price: 13.0, cost: 4.1, station: 'truck-line', description: 'Smash-seared Prime Rib patty, caramelized onions, Swiss & American, sweet & tangy sauce on sourdough.' },
      { name: 'The Mac Attack', category: 'Signature Creations', price: 12.0, cost: 3.2, station: 'truck-line', description: 'Bacon Mac & Cheese stuffed between thick Texas Toast.' },
      { name: 'The Truffle Melt', category: 'Signature Creations', price: 15.0, cost: 4.8, station: 'truck-line', description: 'Gruyère, sautéed mushrooms, fresh thyme & truffle oil drizzle on golden sourdough.' },
      { name: 'The Classic', category: 'Gourmet Melts', price: 9.0, cost: 2.1, station: 'truck-line', description: 'Aged cheddar & American on buttery sourdough — the grilled cheese that started it all.' },
      { name: 'The Buffalo Chicken', category: 'Gourmet Melts', price: 13.0, cost: 3.9, station: 'truck-line', description: 'Shredded chicken, buffalo sauce, blue cheese crumble & mozzarella on sourdough.' },
      { name: 'Chips & Drink Combo', category: 'Sides & Refreshments', price: 3.5, cost: 0.95, station: 'truck-expo', description: 'Add crispy kettle chips and an ice-cold canned beverage to any sandwich.' },
      { name: 'Tomato Basil Dipping Soup', category: 'Sides & Refreshments', price: 4.5, cost: 1.1, station: 'truck-expo', description: 'Warm, creamy roasted tomato basil soup cup for dunking grilled cheese.' },
      { name: 'Add Applewood Smoked Bacon', category: 'Sides & Refreshments', price: 2.0, cost: 0.65, station: 'truck-line', description: 'Crispy applewood smoked bacon slice added into any sandwich.' },
      { name: 'Ice Cold Can Soda / Water', category: 'Sides & Refreshments', price: 2.0, cost: 0.45, station: 'truck-expo', description: 'Choice of Coca-Cola, Diet Coke, Sprite, or chilled Spring Water.' },
    ],
    kitchenStations: [
      { name: 'Truck Line & Flat Top', code: 'truck-line', color: '#f59e0b' },
      { name: 'Cold Assembly & Expo', code: 'truck-expo', color: '#10b981' },
    ],
    tablesCount: 0,
  },
  {
    id: 'full-service',
    name: 'Full-Service Dining & Bar',
    tagline: 'Multi-course dining, split checks, bar & kitchen routing',
    icon: 'restaurant',
    description: 'Perfect for traditional restaurants, bistros, and steakhouses featuring host seating, server table management, multi-course meal pacing, and dedicated bar tickets.',
    serviceModel: 'table-service',
    suggestedTaxRatePct: 8.25,
    tipDistributionMethod: 'hours-weighted',
    sampleCategories: ['Appetizers', 'Steaks & Chops', 'Fresh Seafood', 'Pasta', 'Desserts', 'Craft Cocktails', 'Wine List'],
    sampleItemsCount: 24,
    sampleItems: [
      { name: 'Prime Bone-In Ribeye 16oz', category: 'Steaks & Chops', price: 54.0, cost: 16.5, station: 'grill', description: 'USDA Prime, rosemary butter, roasted garlic head' },
      { name: 'Pan-Seared Chilean Sea Bass', category: 'Fresh Seafood', price: 44.0, cost: 12.0, station: 'sauté', description: 'Miso glaze, baby bok choy, ginger dashi broth' },
      { name: 'Truffle Tagliatelle', category: 'Pasta', price: 28.0, cost: 5.5, station: 'sauté', description: 'Fresh egg pasta, black truffle butter, aged parmigiano' },
      { name: 'Smoked Old Fashioned', category: 'Craft Cocktails', price: 18.0, cost: 2.8, station: 'bar', description: 'Bourbon, angostura, demerara, applewood smoke' },
      { name: 'Artisan Burrata Salad', category: 'Appetizers', price: 19.0, cost: 4.2, station: 'cold', description: 'Heirloom tomatoes, basil oil, balsamic reduction, sourdough toast' },
    ],
    kitchenStations: [
      { name: 'Grill & Broiler', code: 'grill', color: '#ef4444' },
      { name: 'Sauté & Pasta', code: 'sauté', color: '#f59e0b' },
      { name: 'Raw Bar & Cold Prep', code: 'cold', color: '#06b6d4' },
      { name: 'Main Bar', code: 'bar', color: '#8b5cf6' },
      { name: 'Expo & Pass', code: 'expo', color: '#10b981' },
    ],
    tablesCount: 24,
  },
  {
    id: 'sports-bar',
    name: 'Sports Bar & Casual Grill',
    tagline: 'High volume, fast tabs, craft draft beer & shareables',
    icon: 'sports_bar',
    description: 'Designed for pubs, taprooms, and casual burger joints where speed of service, open bar tabs, and quick kitchen turnarounds are critical.',
    serviceModel: 'hybrid',
    suggestedTaxRatePct: 7.5,
    tipDistributionMethod: 'hours-weighted',
    sampleCategories: ['Shareables & Wings', 'Burgers & Sandwiches', 'Draft Beers', 'Pizzas', 'Cocktails'],
    sampleItemsCount: 18,
    sampleItems: [
      { name: 'Double Bacon Smash Burger', category: 'Burgers & Sandwiches', price: 16.5, cost: 4.2, station: 'grill', description: 'Two smashed patties, American cheese, grilled onions, secret sauce' },
      { name: 'Crispy Buffalo Wings (10ct)', category: 'Shareables & Wings', price: 17.0, cost: 5.0, station: 'fry', description: 'House buffalo sauce, celery, blue cheese dip' },
      { name: 'Hazy IPA Draft Pint', category: 'Draft Beers', price: 8.5, cost: 1.8, station: 'bar', description: 'Local craft IPA with notes of citrus and tropical fruit' },
      { name: 'Loaded Nacho Platter', category: 'Shareables & Wings', price: 15.0, cost: 3.5, station: 'fry', description: 'Queso blanco, jalapeños, pico de gallo, guacamole' },
    ],
    kitchenStations: [
      { name: 'Grill & Flat Top', code: 'grill', color: '#ef4444' },
      { name: 'Fry Station', code: 'fry', color: '#f59e0b' },
      { name: 'Main Bar Taps', code: 'bar', color: '#8b5cf6' },
    ],
    tablesCount: 16,
  },
  {
    id: 'food-truck',
    name: 'Food Truck & Quick Counter',
    tagline: 'Speedy counter orders, order numbers, minimal footprint',
    icon: 'local_shipping',
    description: 'Optimized for food trucks, pop-up stalls, and fast counter setups. Uses customer order numbers/buzzers, rapid contactless checkout, and a single compact prep rail.',
    serviceModel: 'counter-service',
    suggestedTaxRatePct: 6.0,
    tipDistributionMethod: 'keep-your-own',
    sampleCategories: ['Signature Tacos', 'Sides & Dips', 'Beverages'],
    sampleItemsCount: 10,
    sampleItems: [
      { name: 'Birria Taco Trio', category: 'Signature Tacos', price: 14.0, cost: 3.8, station: 'truck-line', description: 'Slow-braised beef, melted cheese, cilantro, rich consommé dip' },
      { name: 'Carne Asada Taco', category: 'Signature Tacos', price: 4.5, cost: 1.2, station: 'truck-line', description: 'Charred skirt steak, salsa verde, diced white onion' },
      { name: 'Fresh Horchata', category: 'Beverages', price: 4.0, cost: 0.6, station: 'truck-line', description: 'House-made rice and cinnamon milk' },
      { name: 'Chips & Fresh Guacamole', category: 'Sides & Dips', price: 6.5, cost: 1.5, station: 'truck-line', description: 'Crispy corn tortilla chips with smashed Hass avocados' },
    ],
    kitchenStations: [
      { name: 'Truck Line & Expo', code: 'truck-line', color: '#f59e0b' },
    ],
    tablesCount: 0,
  },
  {
    id: 'cafe-bakery',
    name: 'Café, Espresso & Bakery',
    tagline: 'Custom drink modifiers, pastry par counts, rapid takeaway',
    icon: 'local_cafe',
    description: 'Built for specialty coffee shops, bakeries, and delis requiring item modifiers (milk types, flavor syrups, temperatures), bakery par counts, and loyalty rewards.',
    serviceModel: 'counter-service',
    suggestedTaxRatePct: 7.0,
    tipDistributionMethod: 'hours-weighted',
    sampleCategories: ['Espresso & Coffee', 'Cold Brew & Tea', 'Artisan Pastries', 'Breakfast Sandwiches'],
    sampleItemsCount: 15,
    sampleItems: [
      { name: 'Oat Milk Honey Latte', category: 'Espresso & Coffee', price: 6.25, cost: 1.1, station: 'barista', description: 'Double espresso shot, steamed oat milk, local wildflower honey' },
      { name: 'Almond Croissant', category: 'Artisan Pastries', price: 4.75, cost: 0.9, station: 'bakery', description: 'Twice-baked flaky croissant with frangipane almond filling' },
      { name: 'Nitro Cold Brew', category: 'Cold Brew & Tea', price: 5.5, cost: 0.7, station: 'barista', description: 'Creamy nitrogen-infused single origin cold brew' },
      { name: 'Avocado Everything Bagel', category: 'Breakfast Sandwiches', price: 9.5, cost: 2.2, station: 'kitchen', description: 'Toasted bagel, smashed avocado, everything spice, microgreens' },
    ],
    kitchenStations: [
      { name: 'Barista Espresso Bar', code: 'barista', color: '#8b5cf6' },
      { name: 'Bakery Case', code: 'bakery', color: '#f59e0b' },
      { name: 'Warm Kitchen', code: 'kitchen', color: '#ef4444' },
    ],
    tablesCount: 8,
  },
];
