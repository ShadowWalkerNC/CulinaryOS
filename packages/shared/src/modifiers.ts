// ============================================================
// CulinaryOS — Hierarchical & Nested Modifier Engine
// Supports min/max validation, nested choices, and first-N free calculations
// ============================================================

import type { ModifierGroup, Modifier, SelectedModifier } from './types/menu.js';

export interface ModifierPriceCalculation {
  modifierId: string;
  name: string;
  originalPriceCents: number;
  effectivePriceCents: number;
  isFree: boolean;
}

export interface FlattenedModifier {
  id: string;
  name: string;
  path: string;
  effectivePriceCents: number;
  level: number;
}

/**
 * Calculates effective pricing for selections within a single modifier group,
 * applying the first-N free allowance rule (freeQuantity).
 */
export function calculateModifierGroupPrices(
  group: ModifierGroup,
  selectedModifierIds: string[]
): ModifierPriceCalculation[] {
  const freeQuantity = Math.max(0, group.freeQuantity ?? 0);
  let freeRemaining = freeQuantity;

  return selectedModifierIds.map((modId) => {
    const mod = group.modifiers.find((m) => m.id === modId);
    const originalPrice = mod ? (mod.priceAdjustmentCents ?? mod.priceAdjustment ?? 0) : 0;
    const name = mod?.name ?? 'Unknown Modifier';

    if (freeRemaining > 0 && originalPrice > 0) {
      freeRemaining--;
      return {
        modifierId: modId,
        name,
        originalPriceCents: originalPrice,
        effectivePriceCents: 0,
        isFree: true,
      };
    } else if (originalPrice === 0) {
      return {
        modifierId: modId,
        name,
        originalPriceCents: 0,
        effectivePriceCents: 0,
        isFree: true,
      };
    } else {
      return {
        modifierId: modId,
        name,
        originalPriceCents: originalPrice,
        effectivePriceCents: originalPrice,
        isFree: false,
      };
    }
  });
}

/**
 * Recursively calculates total modifier upcharges for an item.
 */
export function calculateTotalModifierUpcharge(selectedModifiers: SelectedModifier[] = []): number {
  let total = 0;
  for (const mod of selectedModifiers) {
    total += mod.effectivePriceCents ?? mod.priceAdjustmentCents ?? 0;
    if (mod.subModifiers && mod.subModifiers.length > 0) {
      total += calculateTotalModifierUpcharge(mod.subModifiers);
    }
  }
  return total;
}

/**
 * Calculates final item price: (basePriceCents + total recursive modifier upcharges) * quantity.
 */
export function calculateItemPrice(
  basePriceCents: number,
  selectedModifiers: SelectedModifier[] = [],
  quantity: number = 1
): number {
  const unitPrice = basePriceCents + calculateTotalModifierUpcharge(selectedModifiers);
  return unitPrice * quantity;
}


/**
 * Validates modifier selections against min/max/required rules at root and nested levels.
 */
export function validateModifierSelections(
  groups: ModifierGroup[],
  selections: SelectedModifier[] | Record<string, string[]> | { modifierId: string; parentModifierId?: string }[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Normalize selections to lookup structure
  const selectedModMap = new Map<string, { groupId?: string; subModifiers?: any[] }>();

  if (Array.isArray(selections)) {
    for (const sel of selections as any[]) {
      if ('modifierGroupId' in sel) {
        // SelectedModifier format
        selectedModMap.set(sel.id, { groupId: sel.modifierGroupId, subModifiers: sel.subModifiers });
      } else if ('modifierId' in sel) {
        selectedModMap.set(sel.modifierId, {});
      }
    }
  }

  function validateGroupList(groupList: ModifierGroup[], parentModId?: string) {
    for (const group of groupList) {
      let selectedInGroupCount = 0;
      const selectedModsInGroup: Modifier[] = [];

      if (Array.isArray(selections) && selections.length > 0 && 'modifierGroupId' in (selections[0] as any)) {
        // SelectedModifier[]
        const matching = (selections as SelectedModifier[]).filter(
          (m) => m.modifierGroupId === group.id && (!parentModId || m.parentModifierId === parentModId)
        );
        selectedInGroupCount = matching.length;
        for (const m of matching) {
          const modDef = group.modifiers.find((gMod) => gMod.id === m.id);
          if (modDef) selectedModsInGroup.push(modDef);
        }
      } else if (!Array.isArray(selections)) {
        // Record<string, string[]> format
        const ids = (selections as Record<string, string[]>)[group.id] || [];
        selectedInGroupCount = ids.length;
        for (const id of ids) {
          const modDef = group.modifiers.find((gMod) => gMod.id === id);
          if (modDef) selectedModsInGroup.push(modDef);
        }
      } else {
        // Flat { modifierId } format
        for (const mod of group.modifiers) {
          if (selectedModMap.has(mod.id)) {
            selectedInGroupCount++;
            selectedModsInGroup.push(mod);
          }
        }
      }

      const minRequired = group.required ? Math.max(1, group.minSelections || 1) : (group.minSelections || 0);

      if (selectedInGroupCount < minRequired) {
        errors.push(
          `Group "${group.name}" requires at least ${minRequired} selection(s), but ${selectedInGroupCount} selected.`
        );
      }

      if (group.maxSelections > 0 && selectedInGroupCount > group.maxSelections) {
        errors.push(
          `Group "${group.name}" allows at most ${group.maxSelections} selection(s), but ${selectedInGroupCount} selected.`
        );
      }

      // Check nested groups within selected modifiers
      for (const selectedMod of selectedModsInGroup) {
        if (selectedMod.nestedGroups && selectedMod.nestedGroups.length > 0) {
          validateGroupList(selectedMod.nestedGroups, selectedMod.id);
        }
      }
    }
  }

  validateGroupList(groups);
  return { valid: errors.length === 0, errors };
}

/**
 * Builds a structured SelectedModifier tree from flat selection IDs or group records,
 * computing effective pricing with first-N free rules recursively.
 */
export function buildSelectedModifierTree(
  groups: ModifierGroup[],
  selections:
    | { modifierId: string; parentModifierId?: string }[]
    | Record<string, string[]>
    | string[]
): SelectedModifier[] {
  // Normalize selections to { modifierId, parentModifierId? }[]
  const normalized: { modifierId: string; parentModifierId?: string }[] = [];

  if (Array.isArray(selections)) {
    for (const item of selections) {
      if (typeof item === 'string') {
        normalized.push({ modifierId: item });
      } else if (item && typeof item === 'object' && 'modifierId' in item) {
        normalized.push(item);
      }
    }
  } else if (selections && typeof selections === 'object') {
    for (const [_, modIds] of Object.entries(selections)) {
      if (Array.isArray(modIds)) {
        for (const id of modIds) {
          if (typeof id === 'string') {
            normalized.push({ modifierId: id });
          }
        }
      }
    }
  }

  function processGroups(groupList: ModifierGroup[], parentId?: string, depth = 0): SelectedModifier[] {
    const list: SelectedModifier[] = [];

    for (const group of groupList) {
      // Find all flat selections belonging to this group
      const matchingMods: Modifier[] = [];
      for (const sel of normalized) {
        if (parentId && sel.parentModifierId && sel.parentModifierId !== parentId) continue;
        const mod = group.modifiers.find((m) => m.id === sel.modifierId);
        if (mod && !matchingMods.some((m) => m.id === mod.id)) {
          matchingMods.push(mod);
        }
      }

      // Calculate first-N free pricing for this group
      const priced = calculateModifierGroupPrices(
        group,
        matchingMods.map((m) => m.id)
      );

      for (let i = 0; i < matchingMods.length; i++) {
        const mod = matchingMods[i];
        const p = priced[i];
        if (!mod || !p) continue;

        // Process nested groups if any
        let subModifiers: SelectedModifier[] | undefined;
        if (mod.nestedGroups && mod.nestedGroups.length > 0) {
          subModifiers = processGroups(mod.nestedGroups, mod.id, depth + 1);
        }

        const item: SelectedModifier = {
          id: mod.id,
          modifierGroupId: group.id,
          name: mod.name,
          priceAdjustmentCents: p.originalPriceCents,
          effectivePriceCents: p.effectivePriceCents,
          depth,
        };
        if (parentId !== undefined) {
          item.parentModifierId = parentId;
        }
        if (subModifiers && subModifiers.length > 0) {
          item.subModifiers = subModifiers;
        }

        list.push(item);
      }
    }

    return list;
  }

  return processGroups(groups, undefined, 0);
}


/**
 * Flattens hierarchical modifiers into an indented breadcrumb list for KDS chits and printing.
 */
export function flattenSelectedModifiers(
  selected: SelectedModifier[],
  options: { indent?: string; separator?: string } = {}
): FlattenedModifier[] {
  const indent = options.indent ?? '  ↳ ';
  const separator = options.separator ?? ' > ';
  const result: FlattenedModifier[] = [];

  function traverse(list: SelectedModifier[], parentPath = '', level = 0) {
    for (const mod of list) {
      const currentPath = parentPath ? `${parentPath}${separator}${mod.name}` : mod.name;
      const formattedName = level > 0 ? `${indent.repeat(level)}${mod.name}` : mod.name;

      result.push({
        id: mod.id,
        name: formattedName,
        path: currentPath,
        effectivePriceCents: mod.effectivePriceCents ?? 0,
        level,
      });

      if (mod.subModifiers && mod.subModifiers.length > 0) {
        traverse(mod.subModifiers, currentPath, level + 1);
      }
    }
  }

  traverse(selected, '', 0);
  return result;
}
