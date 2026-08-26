import React from 'react';

const DIETARY_MAP: Record<string, { label: string; bg: string; text: string; border: string; icon?: string }> = {
  vegan:        { label: 'Vegan', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: '🌿' },
  vegetarian:   { label: 'Vegetarian', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', icon: '🌱' },
  gluten_free:  { label: 'Gluten-Free', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: '🌾' },
  gluten:       { label: 'Gluten', bg: 'bg-amber-50/60', text: 'text-amber-800', border: 'border-amber-200', icon: '🌾' },
  dairy:        { label: 'Dairy', bg: 'bg-blue-50/60', text: 'text-blue-800', border: 'border-blue-200', icon: '🥛' },
  eggs:         { label: 'Eggs', bg: 'bg-yellow-50/60', text: 'text-yellow-800', border: 'border-yellow-200', icon: '🥚' },
  nuts:         { label: 'Nuts', bg: 'bg-orange-50/60', text: 'text-orange-800', border: 'border-orange-200', icon: '🥜' },
  peanuts:      { label: 'Peanuts', bg: 'bg-orange-50/60', text: 'text-orange-800', border: 'border-orange-200', icon: '🥜' },
  shellfish:    { label: 'Shellfish', bg: 'bg-rose-50/60', text: 'text-rose-800', border: 'border-rose-200', icon: '🦐' },
  fish:         { label: 'Fish', bg: 'bg-sky-50/60', text: 'text-sky-800', border: 'border-sky-200', icon: '🐟' },
  sesame:       { label: 'Sesame', bg: 'bg-stone-50', text: 'text-stone-700', border: 'border-stone-200', icon: '✨' },
  spicy:        { label: 'Spicy', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: '🌶️' },
  popular:      { label: 'Popular', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', icon: '🔥' },
  chef_special: { label: "Chef's Pick", bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', icon: '⭐' },
};

export function AllergenBadge({ allergen }: { allergen: string }) {
  const key = allergen.toLowerCase().replace(/[-\s]/g, '_');
  const info = DIETARY_MAP[key] ?? {
    label: allergen,
    bg: 'bg-gray-50',
    text: 'text-gray-700',
    border: 'border-gray-200',
    icon: '⚠️',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${info.bg} ${info.text} ${info.border} select-none`}
    >
      {info.icon && <span className="text-[10px]">{info.icon}</span>}
      <span>{info.label}</span>
    </span>
  );
}
