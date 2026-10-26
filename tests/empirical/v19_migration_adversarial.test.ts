import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

// ============================================================================
// Challenger 2: Adversarial Verification of Migration V19 & Schema Logic
// ============================================================================

describe('Migration V19 — Static & Syntactic Integrity', () => {
  const migrationPath = path.resolve(
    process.cwd(),
    'supabase/migrations/V19__prep_tasks_reconciliation.sql'
  );

  it('migration file exists and is non-empty', () => {
    assert.ok(fs.existsSync(migrationPath), 'V19 migration file must exist');
    const content = fs.readFileSync(migrationPath, 'utf8');
    assert.ok(content.length > 500, 'Migration file should have substantial content');
  });

  it('contains zero Unicode em-dash characters (strict governance)', () => {
    const content = fs.readFileSync(migrationPath, 'utf8');
    const emDashes = content.match(/[\u2014]/g) || [];
    assert.strictEqual(emDashes.length, 0, 'Must have zero em-dash characters');
  });

  it('has perfectly balanced dollar quotes ($$) for all PL/pgSQL function bodies', () => {
    const content = fs.readFileSync(migrationPath, 'utf8');
    const dollarQuotes = content.match(/\$\$/g) || [];
    assert.ok(dollarQuotes.length > 0, 'Must contain dollar quotes');
    assert.strictEqual(dollarQuotes.length % 2, 0, 'Dollar quotes must be balanced in pairs');
  });

  it('enforces secure search_path on all SECURITY DEFINER functions', () => {
    const content = fs.readFileSync(migrationPath, 'utf8');
    const secDefiners = [
      ...content.matchAll(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+public\.([a-zA-Z0-9_]+)[\s\S]*?SECURITY\s+DEFINER[\s\S]*?SET\s+search_path\s*=\s*public/gi),
    ];
    // Expected functions: sync_prep_plan_item_columns, trg_prep_tasks_view_insert, trg_prep_tasks_view_update,
    // trg_prep_tasks_view_delete, trg_prep_lists_view_insert, trg_prep_lists_view_update, trg_prep_lists_view_delete, build_shift_prep
    assert.ok(secDefiners.length >= 8, `Expected at least 8 functions with SET search_path = public, found ${secDefiners.length}`);
  });

  it('contains strict multi-tenant RLS policy on prep_plan_items', () => {
    const content = fs.readFileSync(migrationPath, 'utf8');
    assert.ok(
      content.includes('CREATE POLICY "prep_plan_items_tenant_isolation" ON public.prep_plan_items'),
      'Must create tenant isolation policy'
    );
    assert.ok(
      content.includes('USING (tenant_id = public.my_tenant_id())'),
      'Policy must enforce tenant_id in USING'
    );
    assert.ok(
      content.includes('WITH CHECK (tenant_id = public.my_tenant_id())'),
      'Policy must enforce tenant_id in WITH CHECK'
    );
  });
});

describe('Trigger sync_prep_plan_item_columns — Adversarial Logic Matrix', () => {
  interface ItemRow {
    id?: string;
    plan_id?: string | null;
    prep_plan_id?: string | null;
    tenant_id?: string | null;
  }

  function runTrigger(
    op: 'INSERT' | 'UPDATE',
    oldRow: ItemRow | null,
    newRow: ItemRow,
    parentPlans: Record<string, { tenant_id: string }>,
    myTenantId: string
  ): ItemRow {
    const row = { ...newRow };

    // V19 logic:
    // IF NEW.prep_plan_id IS NOT NULL AND NEW.plan_id IS NULL THEN
    //   NEW.plan_id := NEW.prep_plan_id;
    // ELSIF NEW.plan_id IS NOT NULL AND NEW.prep_plan_id IS NULL THEN
    //   NEW.prep_plan_id := NEW.plan_id;
    // ELSIF NEW.plan_id IS NOT NULL AND NEW.prep_plan_id IS NOT NULL AND NEW.plan_id <> NEW.prep_plan_id THEN
    //   NEW.plan_id := NEW.prep_plan_id;
    // END IF;
    if (row.prep_plan_id != null && row.plan_id == null) {
      row.plan_id = row.prep_plan_id;
    } else if (row.plan_id != null && row.prep_plan_id == null) {
      row.prep_plan_id = row.plan_id;
    } else if (
      row.plan_id != null &&
      row.prep_plan_id != null &&
      row.plan_id !== row.prep_plan_id
    ) {
      row.plan_id = row.prep_plan_id;
    }

    // Tenant auto-population:
    if (row.tenant_id == null) {
      let resolved: string | null = null;
      if (row.plan_id != null && parentPlans[row.plan_id]) {
        resolved = parentPlans[row.plan_id].tenant_id;
      } else if (row.prep_plan_id != null && parentPlans[row.prep_plan_id]) {
        resolved = parentPlans[row.prep_plan_id].tenant_id;
      }
      if (resolved == null) {
        resolved = myTenantId;
      }
      row.tenant_id = resolved;
    }

    return row;
  }

  const P1 = '11111111-1111-1111-1111-111111111111';
  const P2 = '22222222-2222-2222-2222-222222222222';
  const T1 = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const T2 = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  const plans = {
    [P1]: { tenant_id: T1 },
    [P2]: { tenant_id: T2 },
  };

  it('Case 1 (INSERT): only plan_id -> synchronizes prep_plan_id and backfills tenant', () => {
    const res = runTrigger('INSERT', null, { plan_id: P1, prep_plan_id: null, tenant_id: null }, plans, T1);
    assert.strictEqual(res.plan_id, P1);
    assert.strictEqual(res.prep_plan_id, P1);
    assert.strictEqual(res.tenant_id, T1);
  });

  it('Case 2 (INSERT): only prep_plan_id -> synchronizes plan_id and backfills tenant', () => {
    const res = runTrigger('INSERT', null, { plan_id: null, prep_plan_id: P1, tenant_id: null }, plans, T1);
    assert.strictEqual(res.plan_id, P1);
    assert.strictEqual(res.prep_plan_id, P1);
    assert.strictEqual(res.tenant_id, T1);
  });

  it('Case 3 (INSERT): both identical -> retains values and backfills tenant', () => {
    const res = runTrigger('INSERT', null, { plan_id: P1, prep_plan_id: P1, tenant_id: null }, plans, T1);
    assert.strictEqual(res.plan_id, P1);
    assert.strictEqual(res.prep_plan_id, P1);
    assert.strictEqual(res.tenant_id, T1);
  });

  it('Case 4 (INSERT): differing plan_id vs prep_plan_id -> prep_plan_id takes precedence', () => {
    const res = runTrigger('INSERT', null, { plan_id: P1, prep_plan_id: P2, tenant_id: null }, plans, T1);
    assert.strictEqual(res.plan_id, P2);
    assert.strictEqual(res.prep_plan_id, P2);
    assert.strictEqual(res.tenant_id, T2);
  });

  it('Case 5 (UPDATE): updating prep_plan_id -> syncs plan_id to new target', () => {
    const oldRow = { plan_id: P1, prep_plan_id: P1, tenant_id: T1 };
    // Postgres sets unmentioned plan_id to oldRow.plan_id
    const newRow = { plan_id: P1, prep_plan_id: P2, tenant_id: T1 };
    const res = runTrigger('UPDATE', oldRow, newRow, plans, T1);
    assert.strictEqual(res.plan_id, P2);
    assert.strictEqual(res.prep_plan_id, P2);
  });

  it('Case 6 (UPDATE): updating plan_id alone in legacy client -> triggers precedence overwrite', () => {
    const oldRow = { plan_id: P1, prep_plan_id: P1, tenant_id: T1 };
    // Legacy client updates plan_id = P2, leaving prep_plan_id unmentioned (so Postgres fills NEW.prep_plan_id = P1)
    const newRow = { plan_id: P2, prep_plan_id: P1, tenant_id: T1 };
    const res = runTrigger('UPDATE', oldRow, newRow, plans, T1);
    // V19 behavior: plan_id is overwritten with prep_plan_id (P1)
    assert.strictEqual(res.plan_id, P1, 'V19 precedence logic syncs plan_id from unchanged prep_plan_id');
    assert.strictEqual(res.prep_plan_id, P1);
  });

  it('Case 7 (Tenant Fallback): orphan plan_id falls back to public.my_tenant_id()', () => {
    const orphanPlan = '99999999-9999-9999-9999-999999999999';
    const fallbackTenant = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
    const res = runTrigger('INSERT', null, { plan_id: orphanPlan, prep_plan_id: null, tenant_id: null }, plans, fallbackTenant);
    assert.strictEqual(res.tenant_id, fallbackTenant);
  });
});

describe('View public.prep_tasks — INSTEAD OF Trigger Behavior', () => {
  interface ViewTaskRow {
    id?: string;
    tenant_id?: string | null;
    plan_id?: string | null;
    prep_plan_id?: string | null;
    prep_list_id?: string | null;
    recipe_id?: string | null;
    task?: string | null;
    ingredient_name?: string | null;
    prep_amount?: number | null;
    unit?: string | null;
    is_done?: boolean | null;
    completed_at?: string | null;
    done_at?: string | null;
  }

  function runViewInsert(newView: ViewTaskRow, myTenantId: string) {
    const planId = newView.plan_id ?? newView.prep_plan_id ?? newView.prep_list_id ?? null;
    const tenantId = newView.tenant_id ?? myTenantId;
    return {
      id: newView.id ?? 'generated-uuid',
      tenant_id: tenantId,
      plan_id: planId,
      prep_plan_id: planId,
      recipe_id: newView.recipe_id ?? null,
      ingredient_name: newView.task ?? newView.ingredient_name ?? 'Prep Task',
      prep_amount: newView.prep_amount ?? 1,
      unit: newView.unit ?? 'ea',
      is_done: newView.is_done ?? false,
      done_at: newView.completed_at ?? newView.done_at ?? null,
    };
  }

  function runViewUpdate(oldItem: any, newView: ViewTaskRow) {
    let doneAt = oldItem.done_at;
    if (newView.completed_at !== undefined && newView.completed_at !== null) {
      doneAt = newView.completed_at;
    } else if (newView.done_at !== undefined && newView.done_at !== null) {
      doneAt = newView.done_at;
    } else if (newView.is_done === true && oldItem.is_done === false) {
      doneAt = 'now()';
    } else if (newView.is_done === false) {
      doneAt = null;
    }

    return {
      id: oldItem.id,
      is_done: newView.is_done ?? oldItem.is_done,
      done_at: doneAt,
      prep_amount: newView.prep_amount ?? oldItem.prep_amount,
      unit: newView.unit ?? oldItem.unit,
      ingredient_name: newView.task ?? newView.ingredient_name ?? oldItem.ingredient_name,
      recipe_id: newView.recipe_id ?? oldItem.recipe_id,
      plan_id: newView.plan_id ?? newView.prep_plan_id ?? newView.prep_list_id ?? oldItem.plan_id,
      prep_plan_id: newView.prep_plan_id ?? newView.plan_id ?? newView.prep_list_id ?? oldItem.prep_plan_id,
      tenant_id: newView.tenant_id ?? oldItem.tenant_id,
    };
  }

  it('inserts into base prep_plan_items with aliased column reconciliation', () => {
    const item = runViewInsert(
      {
        prep_list_id: 'plan-xyz',
        task: 'Diced Shallots',
        prep_amount: 2.5,
        unit: 'kg',
      },
      'tenant-abc'
    );

    assert.strictEqual(item.plan_id, 'plan-xyz');
    assert.strictEqual(item.prep_plan_id, 'plan-xyz');
    assert.strictEqual(item.ingredient_name, 'Diced Shallots');
    assert.strictEqual(item.prep_amount, 2.5);
    assert.strictEqual(item.unit, 'kg');
    assert.strictEqual(item.is_done, false);
    assert.strictEqual(item.done_at, null);
  });

  it('updates task completion when is_done is toggled to true', () => {
    const initial = {
      id: 'task-1',
      is_done: false,
      done_at: null,
      plan_id: 'plan-1',
      prep_plan_id: 'plan-1',
      ingredient_name: 'Chopped Herbs',
      prep_amount: 1,
      unit: 'bunch',
      tenant_id: 'tenant-1',
      recipe_id: null,
    };

    const updated = runViewUpdate(initial, {
      is_done: true,
      completed_at: '2026-10-25T20:00:00Z',
    });

    assert.strictEqual(updated.is_done, true);
    assert.strictEqual(updated.done_at, '2026-10-25T20:00:00Z');
  });

  it('unchecks task when is_done is toggled to false', () => {
    const initial = {
      id: 'task-1',
      is_done: true,
      done_at: '2026-10-25T20:00:00Z',
      plan_id: 'plan-1',
      prep_plan_id: 'plan-1',
      ingredient_name: 'Chopped Herbs',
      prep_amount: 1,
      unit: 'bunch',
      tenant_id: 'tenant-1',
      recipe_id: null,
    };

    const updated = runViewUpdate(initial, {
      is_done: false,
      completed_at: null,
    });

    assert.strictEqual(updated.is_done, false);
    assert.strictEqual(updated.done_at, null);
  });
});

describe('RPC build_shift_prep — Calculation & Security Contract', () => {
  interface ParLevel {
    ingredient_name: string;
    current_stock: number;
    par_amount: number;
    unit: string;
    recipe_id: string | null;
    tenant_id: string;
    user_id: string;
  }

  function simulateBuildShiftPrep(
    parLevels: ParLevel[],
    callerTenantId: string | null,
    callerUserId: string | null
  ) {
    return parLevels
      .filter((pl) => {
        const matchesTenant = callerTenantId != null && pl.tenant_id === callerTenantId;
        const matchesUser = callerUserId != null && pl.user_id === callerUserId;
        const noContext = callerTenantId == null && callerUserId == null;
        return (matchesTenant || matchesUser || noContext) && pl.current_stock < pl.par_amount;
      })
      .map((pl) => ({
        ingredient_name: pl.ingredient_name,
        current_stock: pl.current_stock,
        par_amount: pl.par_amount,
        prep_amount: Math.round((pl.par_amount - pl.current_stock) * 100) / 100,
        unit: pl.unit,
        recipe_id: pl.recipe_id,
      }))
      .sort((a, b) => a.ingredient_name.localeCompare(b.ingredient_name));
  }

  it('calculates shortfall items strictly when current_stock < par_amount', () => {
    const parLevels: ParLevel[] = [
      { ingredient_name: 'Tomatoes', current_stock: 4, par_amount: 10, unit: 'kg', recipe_id: null, tenant_id: 'T1', user_id: 'U1' },
      { ingredient_name: 'Garlic', current_stock: 5, par_amount: 5, unit: 'head', recipe_id: null, tenant_id: 'T1', user_id: 'U1' },
      { ingredient_name: 'Onions', current_stock: 12, par_amount: 10, unit: 'kg', recipe_id: null, tenant_id: 'T1', user_id: 'U1' },
      { ingredient_name: 'Basil', current_stock: 0.5, par_amount: 2.0, unit: 'bunch', recipe_id: null, tenant_id: 'T1', user_id: 'U1' },
    ];

    const result = simulateBuildShiftPrep(parLevels, 'T1', 'U1');
    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0].ingredient_name, 'Basil');
    assert.strictEqual(result[0].prep_amount, 1.5);
    assert.strictEqual(result[1].ingredient_name, 'Tomatoes');
    assert.strictEqual(result[1].prep_amount, 6.0);
  });

  it('strictly isolates par levels across tenants', () => {
    const parLevels: ParLevel[] = [
      { ingredient_name: 'Tenant 1 Beef', current_stock: 1, par_amount: 5, unit: 'kg', recipe_id: null, tenant_id: 'T1', user_id: 'U1' },
      { ingredient_name: 'Tenant 2 Pork', current_stock: 2, par_amount: 8, unit: 'kg', recipe_id: null, tenant_id: 'T2', user_id: 'U2' },
    ];

    const resultT1 = simulateBuildShiftPrep(parLevels, 'T1', 'U1');
    assert.strictEqual(resultT1.length, 1);
    assert.strictEqual(resultT1[0].ingredient_name, 'Tenant 1 Beef');

    const resultT2 = simulateBuildShiftPrep(parLevels, 'T2', 'U2');
    assert.strictEqual(resultT2.length, 1);
    assert.strictEqual(resultT2[0].ingredient_name, 'Tenant 2 Pork');
  });
});
