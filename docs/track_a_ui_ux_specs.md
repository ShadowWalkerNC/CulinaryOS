# 📐 Track A — UI/UX Design & Spatial Specifications

This document defines the interface design tokens, shadcn/ui component architecture, Three.js 3D spatial dining room specifications, and touch-screen accessibility rules across CulinaryOS applications.

---

## 🎨 Design Tokens & shadcn/ui Theme

The application uses an ergonomic, high-contrast theme built with **Tailwind CSS**, **Radix UI**, and canonical **shadcn/ui** HSL design tokens configured in [`packages/ui/components.json`](../packages/ui/components.json).

### Color Palette (HSL Tokens)

| Token | Semantic Role | HSL Variable | Usage |
| :--- | :--- | :--- | :--- |
| `Background` | App Canvas Background | `hsl(var(--background))` | Base viewport background |
| `Card / Surface` | Elevated Content Surface | `hsl(var(--card))` | POS tiles, KDS cards, modal dialogs |
| `Primary` | Primary Accent & Action | `hsl(var(--primary))` | Key CTAs, active buttons, selected tabs |
| `Secondary` | Subtle Action / Surface | `hsl(var(--secondary))` | Secondary buttons, counter badges |
| `Muted` | Low-emphasis Background | `hsl(var(--muted))` | Table headers, disabled states, borders |
| `Destructive` | High-alert / Void / Danger | `hsl(var(--destructive))` | Void tickets, delete, 86 warnings |
| `Success` | Positive Confirmation | `#10B981` (Emerald) | Available tables, bumped tickets, paid checks |
| `Warning` | Urgent Attention Required | `#F59E0B` (Amber) | Occupied tables, aging tickets (5-10m) |

---

## 🌐 Three.js 3D Spatial Dining Room Floor Plan

The POS system integrates an interactive 3D WebGL spatial floor plan visualizer ([`FloorMap3D.tsx`](../packages/ui/src/components/FloorMap3D.tsx)):

```
+--------------------------------------------------------------+
| [2D Grid View]  [(•) 3D Spatial View]       [Reset Camera] 🎥|
+--------------------------------------------------------------+
|                                                              |
|        [Table 1 (🟢 Avail)]             [Booth 4 (🟠 $84.50)]|
|             (2 Covers)                       (4 Covers)      |
|                                                              |
|                     [VIP 10 (🟣 Reserved)]                   |
|                           (6 Covers)                         |
|                                                              |
|        [Table 2 (🔴 Dirty)]             [Bar 1-4 (🟢 Avail)] |
|             (2 Covers)                       (4 Stools)      |
|                                                              |
+--------------------------------------------------------------+
| Table 4 Details: Occupied · Server: Maria · Active: $84.50  |
| [Start Order]  [Transfer Table]  [Split Check]  [Print Check]|
+--------------------------------------------------------------+
```

### 3D Lighting & Shading Specifications:
1. **Dynamic Glowing Status Halos**:
   - 🟢 **Available (`#10b981`)**: Steady soft green emissive ring.
   - 🟠 **Occupied (`#f59e0b`)**: Amber pulsing animation with active check sum floating HUD.
   - 🟣 **Reserved (`#6366f1`)**: Indigo emissive halo with reservation party notes.
   - 🔴 **Dirty / Bus (`#f43f5e`)**: High-contrast red alert ring signaling floor staff.
2. **Camera Orbit Navigation**:
   - Left-click drag to orbit/rotate around the dining room.
   - Mouse wheel or touch pinch to zoom in/out with boundary limits.
   - Raycasted hover triggers real-time tooltip with table number, section, covers, and server.

---

## 🍽️ FDA FASTER Act Top 9 Dietary & Allergen UI

Every menu item and order card features real-time allergen badges and cross-contact alerts:

| Allergen | Visual Icon | Cross-Contact Risk Detection |
|---|---|---|
| **Milk / Dairy** | 🥛 | Shared griddles, steam wands, butter basting |
| **Eggs** | 🥚 | Shared grill surfaces, unwashed whisks |
| **Fish** | 🐟 | Shared deep fryer oil, cutting boards |
| **Shellfish** | 🦐 | Shared fryers, seafood boil pots, grill tongs |
| **Tree Nuts** | 🌰 | Food processors, salad prep wells, dessert pass |
| **Peanuts** | 🥜 | Deep fryers, baking prep stations |
| **Wheat / Gluten** | 🌾 | Shared deep fryers, bread toasters, pizza peel flour |
| **Soybeans** | 🫘 | Woks, fryers, marinade containers |
| **Sesame** | 🥯 | Bun toasters, garnish stations, tahini squeeze bottles |

---

## 📱 Kitchen & POS Touch Ergonomics

- **Touch Target Minimums**: 48px standard touch targets; 64px for primary POS payment and KDS bump action buttons.
- **Contrast Ratios**: Minimum 4.5:1 text-to-background contrast ratio compliant with WCAG AAA for dim dining room and bright kitchen environments.
- **Haptic & Visual Feedback**: 150ms micro-scale transition (`active:scale-[0.98]`) on all button touches.
