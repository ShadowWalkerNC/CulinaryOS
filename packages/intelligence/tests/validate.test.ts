import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateInput } from '../src/schemas/validate.ts';
import { getSkill } from '../src/skills/registry.ts';

describe('validateInput', () => {
  const schema = getSkill('recipe-costing')!.definition.schema;

  it('accepts valid input and strips unknown fields', () => {
    const r = validateInput(schema, { recipeId: 'margherita', servings: 4, hacker: 1 });
    assert.equal(r.ok, true);
    assert.deepEqual(r.value, { recipeId: 'margherita', servings: 4 });
  });

  it('rejects wrong types', () => {
    const r = validateInput(schema, { servings: 'four' });
    assert.equal(r.ok, false);
    assert.match(r.errors.join(';'), /servings must be a number/);
  });

  it('enforces enums', () => {
    const sop = getSkill('haccp-sop')!.definition.schema;
    const bad = validateInput(sop, { topic: 'laundry' });
    assert.equal(bad.ok, false);
    const good = validateInput(sop, { topic: 'cooling' });
    assert.equal(good.ok, true);
  });

  it('requires required fields', () => {
    const sop = getSkill('haccp-sop')!.definition.schema;
    const r = validateInput(sop, {});
    assert.equal(r.ok, false);
    assert.match(r.errors.join(';'), /missing required field: topic/);
  });
});
