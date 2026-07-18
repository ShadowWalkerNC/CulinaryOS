import { jsxs as _jsxs } from "react/jsx-runtime";
const ALLERGEN_LABELS = {
    gluten: { label: 'Gluten', emoji: '🌾' },
    dairy: { label: 'Dairy', emoji: '🥛' },
    eggs: { label: 'Eggs', emoji: '🥚' },
    nuts: { label: 'Nuts', emoji: '🥜' },
    peanuts: { label: 'Peanuts', emoji: '🤜' },
    shellfish: { label: 'Shellfish', emoji: '🦐' },
    fish: { label: 'Fish', emoji: '🐟' },
    soy: { label: 'Soy', emoji: '🌱' },
    sesame: { label: 'Sesame', emoji: '⭐' },
    sulphites: { label: 'Sulphites', emoji: '🍷' },
    vegan: { label: 'Vegan', emoji: '🌱' },
    vegetarian: { label: 'Vegetarian', emoji: '🍌' },
};
export function AllergenBadge({ allergen }) {
    const info = ALLERGEN_LABELS[allergen.toLowerCase()] ?? { label: allergen, emoji: '⚠️' };
    return (_jsxs("span", { style: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
            padding: '2px 7px',
            borderRadius: '4px',
            background: '#f59e0b18',
            color: '#f59e0b',
            fontSize: '11px',
            fontWeight: 500,
            letterSpacing: '0.03em',
        }, children: [info.emoji, " ", info.label] }));
}
