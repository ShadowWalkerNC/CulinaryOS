const fs = require('fs');
const path = require('path');

const dirs = ['bakery','bar','cafe','catering','food-stand','food-truck','ghost-kitchen','restaurant'];
const catalog = {};
for (const d of dirs) {
  const p = path.join(__dirname, '..', 'packages', 'template-engine', 'templates', d, 'plated.template.json');
  catalog[d] = JSON.parse(fs.readFileSync(p, 'utf8'));
}

const header = `// Auto-generated & typed catalog of Plated restaurant templates for CulinaryOS Web
import type { TemplateManifest, BusinessType } from '@culinaryos/types';

export const BUILTIN_TEMPLATES: Record<string, TemplateManifest> = `;

const footer = ` as Record<string, TemplateManifest>;

export function getTemplateManifest(businessType: BusinessType | string): TemplateManifest | undefined {
  return BUILTIN_TEMPLATES[businessType];
}

export const TEMPLATE_NAMES: Array<{ id: BusinessType; name: string; description: string; icon: string; defaultStyle: string }> = [
  { id: 'restaurant', name: 'Dine-In Restaurant', description: 'Full-service restaurant with multi-page menu, reservations & private dining', icon: 'restaurant', defaultStyle: 'hearth' },
  { id: 'bakery', name: 'Artisan Bakery', description: 'Pastry shop & patisserie with pre-orders, daily bakes & cake gallery', icon: 'bakery_dining', defaultStyle: 'market' },
  { id: 'cafe', name: 'Specialty Cafe', description: 'Third-wave coffeehouse, espresso bar & light breakfast fare', icon: 'local_cafe', defaultStyle: 'canvas' },
  { id: 'bar', name: 'Craft Bar & Taphouse', description: 'Cocktail lounge, craft beer tap list & late-night bar bites', icon: 'local_bar', defaultStyle: 'midnight' },
  { id: 'food-truck', name: 'Street Food Truck', description: 'Mobile truck with live location tracker, schedule stops & fast ordering', icon: 'local_shipping', defaultStyle: 'ember' },
  { id: 'catering', name: 'Catering & Events', description: 'Banquets, corporate catering, package menus & quote inquiries', icon: 'dinner_dining', defaultStyle: 'coast' },
  { id: 'ghost-kitchen', name: 'Virtual Ghost Kitchen', description: 'Multi-concept delivery-only kitchen with DoorDash & UberEats integration', icon: 'delivery_dining', defaultStyle: 'midnight' },
  { id: 'food-stand', name: 'Quick-Service Food Stand', description: 'Fast casual counter service, boardwalk stand or food hall stall', icon: 'fastfood', defaultStyle: 'market' },
];
`;

const fullTs = header + JSON.stringify(catalog, null, 2) + footer;
const targetPath = path.join(__dirname, '..', 'packages', 'template-engine', 'src', 'catalog.ts');
fs.writeFileSync(targetPath, fullTs, 'utf8');
console.log('Successfully wrote catalog.ts to', targetPath);
