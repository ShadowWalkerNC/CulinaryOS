/**
 * Minimal zero-dependency schema validation.
 * Every skill input is validated against its SkillSchema before execution.
 */
import type { FieldSchema, SkillSchema } from './types.ts';

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  /** Input with unknown fields stripped. */
  value: Record<string, unknown>;
}

function checkField(field: FieldSchema, value: unknown): string | null {
  if (value === undefined || value === null) {
    return field.required ? `missing required field: ${field.name}` : null;
  }
  switch (field.type) {
    case 'string':
      if (typeof value !== 'string') return `${field.name} must be a string`;
      if (field.enum && !field.enum.includes(value)) {
        return `${field.name} must be one of: ${field.enum.join(', ')}`;
      }
      return null;
    case 'number':
      if (typeof value !== 'number' || Number.isNaN(value)) {
        return `${field.name} must be a number`;
      }
      return null;
    case 'boolean':
      return typeof value === 'boolean' ? null : `${field.name} must be a boolean`;
    case 'string[]':
      if (!Array.isArray(value) || !value.every((v) => typeof v === 'string')) {
        return `${field.name} must be a string array`;
      }
      return null;
    case 'object':
      if (typeof value !== 'object' || Array.isArray(value)) {
        return `${field.name} must be an object`;
      }
      return null;
  }
}

export function validateInput(
  schema: SkillSchema,
  input: Record<string, unknown>,
): ValidationResult {
  const errors: string[] = [];
  const value: Record<string, unknown> = {};
  for (const field of schema.input) {
    const err = checkField(field, input[field.name]);
    if (err) errors.push(err);
    else if (input[field.name] !== undefined) value[field.name] = input[field.name];
  }
  return { ok: errors.length === 0, errors, value };
}
